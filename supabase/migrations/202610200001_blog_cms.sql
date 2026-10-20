create extension if not exists citext with schema extensions;

create type public.app_role as enum ('owner', 'editor');
create type public.blog_post_status as enum ('draft', 'published', 'archived');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email extensions.citext not null,
  display_name text not null check (char_length(display_name) between 2 and 100),
  role public.app_role not null default 'editor',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.blog_categories (
  slug extensions.citext primary key,
  name text not null unique,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.blog_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  public_url text not null,
  original_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  width integer not null check (width > 0 and width <= 12000),
  height integer not null check (height > 0 and height <= 12000),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  sha256 text not null,
  default_alt text not null default '',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug extensions.citext not null unique check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 10 and 140),
  meta_title text check (meta_title is null or char_length(meta_title) <= 70),
  description text not null check (char_length(description) between 40 and 220),
  eyebrow text not null check (char_length(eyebrow) between 3 and 80),
  category_slug extensions.citext not null references public.blog_categories(slug),
  author_id text not null default 'codeformattertools-editorial',
  content_json jsonb not null check (jsonb_typeof(content_json) = 'object'),
  content_version integer not null default 1 check (content_version > 0),
  cover_asset_id uuid references public.blog_assets(id) on delete set null,
  image_url text not null,
  image_alt text not null check (char_length(image_alt) between 8 and 240),
  image_position text not null default 'center center',
  read_minutes integer not null check (read_minutes between 1 and 180),
  status public.blog_post_status not null default 'draft',
  noindex boolean not null default false,
  date_published date,
  date_modified timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  published_by uuid references auth.users(id),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_date_required check (status <> 'published' or date_published is not null)
);

create index blog_posts_public_order_idx on public.blog_posts(status, date_published desc, date_modified desc);
create index blog_posts_category_idx on public.blog_posts(category_slug, status);

create table public.blog_post_tools (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  tool_id text not null,
  sort_order integer not null default 0,
  primary key (post_id, tool_id)
);

create table public.blog_faqs (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  question text not null check (char_length(question) between 5 and 240),
  answer text not null check (char_length(answer) between 10 and 3000),
  sort_order integer not null default 0
);

create index blog_faqs_post_order_idx on public.blog_faqs(post_id, sort_order);

create table public.blog_revisions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  revision_no integer not null,
  snapshot jsonb not null,
  change_summary text not null default '',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(post_id, revision_no)
);

create table public.blog_redirects (
  from_slug extensions.citext primary key check (from_slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles(user_id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_created_idx on public.audit_events(created_at desc);
create index audit_events_entity_idx on public.audit_events(entity_type, entity_id);

insert into public.blog_categories(slug, name, sort_order) values
  ('json', 'JSON', 10),
  ('yaml', 'YAML', 20),
  ('xml', 'XML', 30),
  ('sql', 'SQL', 40),
  ('csv', 'CSV', 50),
  ('development', 'Development', 60)
on conflict (slug) do nothing;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger blog_categories_touch before update on public.blog_categories for each row execute function public.touch_updated_at();
create trigger blog_posts_touch before update on public.blog_posts for each row execute function public.touch_updated_at();

create or replace function public.is_blog_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and active = true
      and role in ('owner', 'editor')
  ) and coalesce(auth.jwt()->>'aal', '') = 'aal2';
$$;

create or replace function public.is_blog_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and active = true and role = 'owner'
  ) and coalesce(auth.jwt()->>'aal', '') = 'aal2';
$$;

revoke all on function public.is_blog_editor() from public;
revoke all on function public.is_blog_owner() from public;
grant execute on function public.is_blog_editor() to anon, authenticated;
grant execute on function public.is_blog_owner() to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.blog_categories enable row level security;
alter table public.blog_assets enable row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_post_tools enable row level security;
alter table public.blog_faqs enable row level security;
alter table public.blog_revisions enable row level security;
alter table public.blog_redirects enable row level security;
alter table public.audit_events enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.blog_categories, public.blog_posts, public.blog_post_tools, public.blog_faqs, public.blog_redirects to anon, authenticated;
grant select on public.profiles, public.blog_assets, public.blog_revisions, public.audit_events to authenticated;
grant insert, update, delete on public.blog_categories, public.blog_assets, public.blog_posts, public.blog_post_tools, public.blog_faqs to authenticated;
grant insert on public.blog_revisions, public.audit_events, public.blog_redirects to authenticated;
grant update on public.profiles to authenticated;

create policy profiles_self_select on public.profiles for select to authenticated using (user_id = auth.uid() or public.is_blog_owner());
create policy profiles_owner_update on public.profiles for update to authenticated using (public.is_blog_owner()) with check (public.is_blog_owner());

create policy categories_public_select on public.blog_categories for select to anon, authenticated using (active = true or public.is_blog_editor());
create policy categories_editor_write on public.blog_categories for all to authenticated using (public.is_blog_editor()) with check (public.is_blog_editor());

create policy posts_public_select on public.blog_posts for select to anon, authenticated
  using (status = 'published' or public.is_blog_editor());
create policy posts_editor_insert on public.blog_posts for insert to authenticated with check (public.is_blog_editor() and created_by = auth.uid() and updated_by = auth.uid());
create policy posts_editor_update on public.blog_posts for update to authenticated using (public.is_blog_editor()) with check (public.is_blog_editor() and updated_by = auth.uid());
create policy posts_owner_delete on public.blog_posts for delete to authenticated using (public.is_blog_owner());

create policy assets_editor_select on public.blog_assets for select to authenticated using (public.is_blog_editor());
create policy assets_editor_insert on public.blog_assets for insert to authenticated with check (public.is_blog_editor() and created_by = auth.uid());
create policy assets_editor_update on public.blog_assets for update to authenticated using (public.is_blog_editor()) with check (public.is_blog_editor());
create policy assets_owner_delete on public.blog_assets for delete to authenticated using (public.is_blog_owner());

create policy post_tools_public_select on public.blog_post_tools for select to anon, authenticated using (
  exists (select 1 from public.blog_posts p where p.id = post_id and (p.status = 'published' or public.is_blog_editor()))
);
create policy post_tools_editor_write on public.blog_post_tools for all to authenticated using (public.is_blog_editor()) with check (public.is_blog_editor());

create policy faqs_public_select on public.blog_faqs for select to anon, authenticated using (
  exists (select 1 from public.blog_posts p where p.id = post_id and (p.status = 'published' or public.is_blog_editor()))
);
create policy faqs_editor_write on public.blog_faqs for all to authenticated using (public.is_blog_editor()) with check (public.is_blog_editor());

create policy revisions_editor_select on public.blog_revisions for select to authenticated using (public.is_blog_editor());
create policy revisions_editor_insert on public.blog_revisions for insert to authenticated with check (public.is_blog_editor() and created_by = auth.uid());
create policy redirects_public_select on public.blog_redirects for select to anon, authenticated using (true);
create policy redirects_editor_insert on public.blog_redirects for insert to authenticated with check (public.is_blog_editor());
create policy audit_owner_select on public.audit_events for select to authenticated using (public.is_blog_owner());
create policy audit_editor_insert on public.audit_events for insert to authenticated with check (public.is_blog_editor() and actor_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-media', 'blog-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy blog_media_editor_insert on storage.objects for insert to authenticated
with check (bucket_id = 'blog-media' and public.is_blog_editor());
create policy blog_media_editor_update on storage.objects for update to authenticated
using (bucket_id = 'blog-media' and public.is_blog_editor()) with check (bucket_id = 'blog-media' and public.is_blog_editor());
create policy blog_media_editor_delete on storage.objects for delete to authenticated
using (bucket_id = 'blog-media' and public.is_blog_editor());

create or replace function public.cms_save_post(p_payload jsonb, p_action text default 'draft')
returns table(post_id uuid, new_revision integer, saved_status public.blog_post_status)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_existing public.blog_posts%rowtype;
  v_revision integer;
  v_status public.blog_post_status;
  v_tool jsonb;
  v_faq jsonb;
begin
  if not public.is_blog_editor() then raise exception 'Not authorized'; end if;
  if p_action not in ('draft', 'save', 'publish') then raise exception 'Invalid action'; end if;
  v_id := nullif(p_payload->>'id', '')::uuid;

  if v_id is null then
    v_status := case when p_action = 'publish' then 'published'::public.blog_post_status else 'draft'::public.blog_post_status end;
    insert into public.blog_posts (
      slug, title, meta_title, description, eyebrow, category_slug, author_id, content_json,
      image_url, image_alt, image_position, read_minutes, status, noindex, date_published,
      created_by, updated_by, published_by
    ) values (
      p_payload->>'slug', p_payload->>'title', nullif(p_payload->>'metaTitle',''), p_payload->>'description',
      p_payload->>'eyebrow', lower(p_payload->>'category'), coalesce(p_payload->>'authorId','codeformattertools-editorial'),
      jsonb_build_object('version', 1, 'intro', p_payload->'intro', 'sections', p_payload->'sections'),
      p_payload->>'image', p_payload->>'imageAlt', coalesce(p_payload->>'imagePosition','center center'),
      (p_payload->>'readMinutes')::integer, v_status, coalesce((p_payload->>'noindex')::boolean, false),
      case when v_status = 'published' then coalesce(nullif(p_payload->>'datePublished','')::date, current_date) else null end,
      auth.uid(), auth.uid(), case when v_status = 'published' then auth.uid() else null end
    ) returning id, revision into v_id, v_revision;
  else
    select * into v_existing from public.blog_posts where id = v_id for update;
    if not found then raise exception 'Post not found'; end if;
    if v_existing.revision <> (p_payload->>'expectedRevision')::integer then raise exception 'Revision conflict'; end if;
    v_status := case when p_action = 'publish' then 'published'::public.blog_post_status when p_action = 'draft' then 'draft'::public.blog_post_status else v_existing.status end;
    insert into public.blog_revisions(post_id, revision_no, snapshot, change_summary, created_by)
    values (v_id, v_existing.revision, to_jsonb(v_existing), coalesce(p_payload->>'changeSummary',''), auth.uid());
    if v_existing.slug::text <> p_payload->>'slug' then
      insert into public.blog_redirects(from_slug, post_id) values (v_existing.slug, v_id)
      on conflict (from_slug) do update set post_id = excluded.post_id;
    end if;
    update public.blog_posts set
      slug = p_payload->>'slug', title = p_payload->>'title', meta_title = nullif(p_payload->>'metaTitle',''),
      description = p_payload->>'description', eyebrow = p_payload->>'eyebrow', category_slug = lower(p_payload->>'category'),
      content_json = jsonb_build_object('version', 1, 'intro', p_payload->'intro', 'sections', p_payload->'sections'),
      image_url = p_payload->>'image', image_alt = p_payload->>'imageAlt', image_position = coalesce(p_payload->>'imagePosition','center center'),
      read_minutes = (p_payload->>'readMinutes')::integer, status = v_status, noindex = coalesce((p_payload->>'noindex')::boolean, false),
      date_published = case when v_status = 'published' then coalesce(v_existing.date_published, nullif(p_payload->>'datePublished','')::date, current_date) else v_existing.date_published end,
      date_modified = now(), updated_by = auth.uid(), published_by = case when v_status = 'published' then auth.uid() else v_existing.published_by end,
      revision = revision + 1
    where id = v_id returning revision into v_revision;
  end if;

  delete from public.blog_post_tools as existing_tools where existing_tools.post_id = v_id;
  for v_tool in select value from jsonb_array_elements(coalesce(p_payload->'relatedTools','[]'::jsonb)) loop
    insert into public.blog_post_tools(post_id, tool_id, sort_order)
    values (v_id, v_tool#>>'{}', (select count(*) from public.blog_post_tools as ordered_tools where ordered_tools.post_id = v_id));
  end loop;

  delete from public.blog_faqs as existing_faqs where existing_faqs.post_id = v_id;
  for v_faq in select value from jsonb_array_elements(coalesce(p_payload->'faqs','[]'::jsonb)) loop
    insert into public.blog_faqs(post_id, question, answer, sort_order)
    values (v_id, v_faq->>'question', v_faq->>'answer', (select count(*) from public.blog_faqs as ordered_faqs where ordered_faqs.post_id = v_id));
  end loop;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), case when p_action = 'publish' then 'post.published' else 'post.saved' end, 'blog_post', v_id::text, jsonb_build_object('revision', v_revision));

  return query select v_id, v_revision, v_status;
end;
$$;

revoke all on function public.cms_save_post(jsonb, text) from public;
grant execute on function public.cms_save_post(jsonb, text) to authenticated;
