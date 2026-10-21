alter table public.blog_posts
  add column if not exists draft_payload jsonb;

comment on column public.blog_posts.draft_payload is
  'Exact editor state for incomplete drafts. Cleared when the post is published.';

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
  v_slug text;
  v_tool jsonb;
  v_faq jsonb;
begin
  if not public.is_blog_editor() then raise exception 'Not authorized'; end if;
  if p_action not in ('draft', 'save', 'publish') then raise exception 'Invalid action'; end if;
  v_id := nullif(p_payload->>'id', '')::uuid;

  if v_id is null then
    v_id := gen_random_uuid();
    v_status := case when p_action = 'publish' then 'published'::public.blog_post_status else 'draft'::public.blog_post_status end;
    v_slug := nullif(trim(p_payload->>'slug'), '');
    if v_slug is null and v_status <> 'published' then
      v_slug := 'draft-' || replace(v_id::text, '-', '');
    end if;

    insert into public.blog_posts (
      id, slug, title, meta_title, description, eyebrow, category_slug, author_id, content_json,
      draft_payload, image_url, image_alt, image_position, read_minutes, status, noindex, date_published,
      created_by, updated_by, published_by
    ) values (
      v_id,
      v_slug,
      case when v_status = 'published' or char_length(trim(coalesce(p_payload->>'title', ''))) between 10 and 140
        then p_payload->>'title' else 'Untitled draft' end,
      nullif(p_payload->>'metaTitle',''),
      case when v_status = 'published' or char_length(trim(coalesce(p_payload->>'description', ''))) between 40 and 220
        then p_payload->>'description' else 'This draft is incomplete and is not publicly visible.' end,
      case when v_status = 'published' or char_length(trim(coalesce(p_payload->>'eyebrow', ''))) between 3 and 80
        then p_payload->>'eyebrow' else 'DRAFT' end,
      lower(coalesce(nullif(p_payload->>'category', ''), 'json')),
      coalesce(p_payload->>'authorId','codeformattertools-editorial'),
      jsonb_build_object('version', 1, 'intro', coalesce(p_payload->'intro', '[]'::jsonb), 'sections', coalesce(p_payload->'sections', '[]'::jsonb)),
      case when v_status = 'published' then null else p_payload end,
      coalesce(p_payload->>'image', ''),
      case when v_status = 'published' or char_length(trim(coalesce(p_payload->>'imageAlt', ''))) between 8 and 240
        then p_payload->>'imageAlt' else 'Draft image' end,
      coalesce(nullif(p_payload->>'imagePosition',''), 'center center'),
      greatest(1, least(180, coalesce(nullif(p_payload->>'readMinutes','')::integer, 1))),
      v_status,
      coalesce((p_payload->>'noindex')::boolean, false),
      case when v_status = 'published' then coalesce(nullif(p_payload->>'datePublished','')::date, current_date) else null end,
      auth.uid(), auth.uid(), case when v_status = 'published' then auth.uid() else null end
    ) returning revision into v_revision;
  else
    select * into v_existing from public.blog_posts where id = v_id for update;
    if not found then raise exception 'Post not found'; end if;
    if v_existing.revision <> (p_payload->>'expectedRevision')::integer then raise exception 'Revision conflict'; end if;
    v_status := case when p_action = 'publish' then 'published'::public.blog_post_status when p_action = 'draft' then 'draft'::public.blog_post_status else v_existing.status end;
    v_slug := coalesce(nullif(trim(p_payload->>'slug'), ''), v_existing.slug::text);

    insert into public.blog_revisions(post_id, revision_no, snapshot, change_summary, created_by)
    values (v_id, v_existing.revision, to_jsonb(v_existing), coalesce(p_payload->>'changeSummary',''), auth.uid());
    if v_existing.slug::text <> v_slug then
      insert into public.blog_redirects(from_slug, post_id) values (v_existing.slug, v_id)
      on conflict (from_slug) do update set post_id = excluded.post_id;
    end if;

    update public.blog_posts set
      slug = v_slug,
      title = case when v_status = 'published' or char_length(trim(coalesce(p_payload->>'title', ''))) between 10 and 140
        then p_payload->>'title' else 'Untitled draft' end,
      meta_title = nullif(p_payload->>'metaTitle',''),
      description = case when v_status = 'published' or char_length(trim(coalesce(p_payload->>'description', ''))) between 40 and 220
        then p_payload->>'description' else 'This draft is incomplete and is not publicly visible.' end,
      eyebrow = case when v_status = 'published' or char_length(trim(coalesce(p_payload->>'eyebrow', ''))) between 3 and 80
        then p_payload->>'eyebrow' else 'DRAFT' end,
      category_slug = lower(coalesce(nullif(p_payload->>'category', ''), 'json')),
      content_json = jsonb_build_object('version', 1, 'intro', coalesce(p_payload->'intro', '[]'::jsonb), 'sections', coalesce(p_payload->'sections', '[]'::jsonb)),
      draft_payload = case when v_status = 'published' then null else p_payload end,
      image_url = coalesce(p_payload->>'image', ''),
      image_alt = case when v_status = 'published' or char_length(trim(coalesce(p_payload->>'imageAlt', ''))) between 8 and 240
        then p_payload->>'imageAlt' else 'Draft image' end,
      image_position = coalesce(nullif(p_payload->>'imagePosition',''), 'center center'),
      read_minutes = greatest(1, least(180, coalesce(nullif(p_payload->>'readMinutes','')::integer, 1))),
      status = v_status,
      noindex = coalesce((p_payload->>'noindex')::boolean, false),
      date_published = case when v_status = 'published' then coalesce(v_existing.date_published, nullif(p_payload->>'datePublished','')::date, current_date) else v_existing.date_published end,
      date_modified = now(),
      updated_by = auth.uid(),
      published_by = case when v_status = 'published' then auth.uid() else v_existing.published_by end,
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
    if char_length(trim(coalesce(v_faq->>'question', ''))) between 5 and 240
      and char_length(trim(coalesce(v_faq->>'answer', ''))) between 10 and 3000 then
      insert into public.blog_faqs(post_id, question, answer, sort_order)
      values (v_id, v_faq->>'question', v_faq->>'answer', (select count(*) from public.blog_faqs as ordered_faqs where ordered_faqs.post_id = v_id));
    end if;
  end loop;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), case when p_action = 'publish' then 'post.published' else 'post.saved' end, 'blog_post', v_id::text, jsonb_build_object('revision', v_revision));

  return query select v_id, v_revision, v_status;
end;
$$;

revoke all on function public.cms_save_post(jsonb, text) from public;
grant execute on function public.cms_save_post(jsonb, text) to authenticated;
