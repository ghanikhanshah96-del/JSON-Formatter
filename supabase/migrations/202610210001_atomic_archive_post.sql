create or replace function public.cms_archive_post(p_id uuid, p_expected_revision integer)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_existing public.blog_posts%rowtype;
  v_new_revision integer;
begin
  if not public.is_blog_editor() then raise exception 'Not authorized'; end if;

  select * into v_existing
  from public.blog_posts
  where id = p_id
  for update;

  if not found then raise exception 'Post not found'; end if;
  if v_existing.revision <> p_expected_revision then raise exception 'Revision conflict'; end if;

  insert into public.blog_revisions(post_id, revision_no, snapshot, change_summary, created_by)
  values (p_id, v_existing.revision, to_jsonb(v_existing), 'Archived', auth.uid());

  update public.blog_posts
  set status = 'archived', updated_by = auth.uid(), date_modified = now(), revision = revision + 1
  where id = p_id
  returning revision into v_new_revision;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'post.archived', 'blog_post', p_id::text, jsonb_build_object('revision', v_new_revision));

  return v_new_revision;
end;
$$;

revoke all on function public.cms_archive_post(uuid, integer) from public;
grant execute on function public.cms_archive_post(uuid, integer) to authenticated;
