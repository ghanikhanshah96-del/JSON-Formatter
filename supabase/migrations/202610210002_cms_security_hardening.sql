alter function public.touch_updated_at() set search_path = '';

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated;

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
    where user_id = (select auth.uid()) and active = true and role = 'owner'
  ) and coalesce((select auth.jwt()->>'aal'), '') = 'aal2';
$$;

revoke all on function private.is_blog_editor() from public;
revoke all on function private.is_blog_owner() from public;
grant execute on function private.is_blog_editor() to anon, authenticated;
grant execute on function private.is_blog_owner() to anon, authenticated;

create or replace function public.is_blog_editor()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.is_blog_editor(); $$;

create or replace function public.is_blog_owner()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.is_blog_owner(); $$;

revoke all on function public.is_blog_editor() from public;
revoke all on function public.is_blog_owner() from public;
grant execute on function public.is_blog_editor() to anon, authenticated;
grant execute on function public.is_blog_owner() to anon, authenticated;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select to authenticated
using (user_id = (select auth.uid()) or public.is_blog_owner());

drop policy if exists posts_editor_insert on public.blog_posts;
create policy posts_editor_insert on public.blog_posts for insert to authenticated
with check (public.is_blog_editor() and created_by = (select auth.uid()) and updated_by = (select auth.uid()));

drop policy if exists posts_editor_update on public.blog_posts;
create policy posts_editor_update on public.blog_posts for update to authenticated
using (public.is_blog_editor()) with check (public.is_blog_editor() and updated_by = (select auth.uid()));

drop policy if exists assets_editor_insert on public.blog_assets;
create policy assets_editor_insert on public.blog_assets for insert to authenticated
with check (public.is_blog_editor() and created_by = (select auth.uid()));

drop policy if exists revisions_editor_insert on public.blog_revisions;
create policy revisions_editor_insert on public.blog_revisions for insert to authenticated
with check (public.is_blog_editor() and created_by = (select auth.uid()));

drop policy if exists audit_editor_insert on public.audit_events;
create policy audit_editor_insert on public.audit_events for insert to authenticated
with check (public.is_blog_editor() and actor_id = (select auth.uid()));

drop policy if exists categories_editor_write on public.blog_categories;
create policy categories_editor_insert on public.blog_categories for insert to authenticated with check (public.is_blog_editor());
create policy categories_editor_update on public.blog_categories for update to authenticated using (public.is_blog_editor()) with check (public.is_blog_editor());
create policy categories_editor_delete on public.blog_categories for delete to authenticated using (public.is_blog_editor());

drop policy if exists post_tools_editor_write on public.blog_post_tools;
create policy post_tools_editor_insert on public.blog_post_tools for insert to authenticated with check (public.is_blog_editor());
create policy post_tools_editor_update on public.blog_post_tools for update to authenticated using (public.is_blog_editor()) with check (public.is_blog_editor());
create policy post_tools_editor_delete on public.blog_post_tools for delete to authenticated using (public.is_blog_editor());

drop policy if exists faqs_editor_write on public.blog_faqs;
create policy faqs_editor_insert on public.blog_faqs for insert to authenticated with check (public.is_blog_editor());
create policy faqs_editor_update on public.blog_faqs for update to authenticated using (public.is_blog_editor()) with check (public.is_blog_editor());
create policy faqs_editor_delete on public.blog_faqs for delete to authenticated using (public.is_blog_editor());
