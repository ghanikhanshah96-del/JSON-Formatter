alter table public.profiles
  add column if not exists password_set_at timestamptz;

-- Only established password users are grandfathered. Invite and magic-link-only
-- users remain incomplete until the application successfully changes a password.
update public.profiles as profile
set password_set_at = coalesce(profile.updated_at, now())
where profile.password_set_at is null
  and exists (
    select 1
    from auth.users as auth_user
    where auth_user.id = profile.user_id
      and nullif(auth_user.encrypted_password, '') is not null
  );

create or replace function private.is_blog_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where user_id = (select auth.uid())
      and active = true
      and password_set_at is not null
      and role in ('owner', 'editor')
  ) and coalesce((select auth.jwt()->>'aal'), '') = 'aal2';
$$;

create or replace function private.is_blog_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where user_id = (select auth.uid())
      and active = true
      and password_set_at is not null
      and role = 'owner'
  ) and coalesce((select auth.jwt()->>'aal'), '') = 'aal2';
$$;

-- Media writes must pass through the server-side image validation pipeline.
revoke insert, update, delete on public.blog_assets from authenticated;
drop policy if exists assets_editor_insert on public.blog_assets;
drop policy if exists assets_editor_update on public.blog_assets;
drop policy if exists assets_owner_delete on public.blog_assets;
drop policy if exists blog_media_editor_insert on storage.objects;
drop policy if exists blog_media_editor_update on storage.objects;
drop policy if exists blog_media_editor_delete on storage.objects;

create or replace function private.guard_blog_asset_availability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cover_asset_id is not null and exists (
    select 1 from public.blog_assets
    where id = new.cover_asset_id and deleted_at is not null
    for share
  ) then
    raise exception 'The selected cover image has been removed';
  end if;

  if exists (
    select 1 from public.blog_assets
    where public_url = new.image_url and deleted_at is not null
    for share
  ) then
    raise exception 'The selected image has been removed';
  end if;
  return new;
end;
$$;

drop trigger if exists blog_posts_guard_asset_availability on public.blog_posts;
create trigger blog_posts_guard_asset_availability
before insert or update of cover_asset_id, image_url on public.blog_posts
for each row execute function private.guard_blog_asset_availability();

create or replace function private.guard_blog_asset_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null and exists (
    select 1 from public.blog_posts
    where cover_asset_id = new.id or image_url = new.public_url
  ) then
    raise exception 'This image is used by a blog post';
  end if;
  return new;
end;
$$;

drop trigger if exists blog_assets_guard_references on public.blog_assets;
create trigger blog_assets_guard_references
before update of deleted_at on public.blog_assets
for each row execute function private.guard_blog_asset_deletion();

create or replace function public.cms_update_profile_access(
  p_user_id uuid,
  p_role public.app_role,
  p_active boolean
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_before public.profiles%rowtype;
  v_after public.profiles%rowtype;
  v_active_owner_count integer;
begin
  if not private.is_blog_owner() then
    raise exception 'Owner access is required';
  end if;

  if p_user_id = v_actor_id and (p_role <> 'owner' or not p_active) then
    raise exception 'You cannot remove your own owner access';
  end if;

  -- Serialize owner-roster changes so two requests cannot remove the final owner.
  perform pg_advisory_xact_lock(hashtextextended('codeformattertools-owner-roster', 0));

  select * into v_before
  from public.profiles
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'User profile not found';
  end if;

  if v_before.active and v_before.role = 'owner' and (not p_active or p_role <> 'owner') then
    select count(*) into v_active_owner_count
    from public.profiles
    where active = true and role = 'owner';
    if v_active_owner_count <= 1 then
      raise exception 'The final active owner cannot be demoted or deactivated';
    end if;
  end if;

  update public.profiles
  set role = p_role, active = p_active
  where user_id = p_user_id
  returning * into v_after;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, metadata)
  values (
    v_actor_id,
    case when p_active then 'user.access_updated' else 'user.access_revoked' end,
    'profile',
    p_user_id::text,
    jsonb_build_object(
      'previous_role', v_before.role,
      'previous_active', v_before.active,
      'role', v_after.role,
      'active', v_after.active
    )
  );

  return v_after;
end;
$$;

revoke all on function public.cms_update_profile_access(uuid, public.app_role, boolean) from public;
grant execute on function public.cms_update_profile_access(uuid, public.app_role, boolean) to authenticated;
