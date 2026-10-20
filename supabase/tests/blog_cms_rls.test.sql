begin;
select plan(11);

insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'editor-test@example.com', crypt('test-password', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'outsider-test@example.com', crypt('test-password', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.profiles(user_id, email, display_name, role, active)
values ('10000000-0000-0000-0000-000000000001', 'editor-test@example.com', 'Editor Test', 'editor', true);

insert into public.blog_posts(id, slug, title, description, eyebrow, category_slug, content_json, image_url, image_alt, read_minutes, status, date_published, created_by, updated_by, published_by)
values
  ('20000000-0000-0000-0000-000000000001', 'public-rls-test', 'Published RLS test article', 'A published article used to prove public read policies return only published records.', 'JSON · TEST', 'json', '{"version":1,"intro":["Public"],"sections":[]}', '/public.png', 'Public RLS test image', 1, 'published', current_date, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'draft-rls-test', 'Private draft RLS test article', 'A private article used to prove public read policies never disclose editorial drafts.', 'JSON · TEST', 'json', '{"version":1,"intro":["Draft"],"sections":[]}', '/draft.png', 'Private RLS test image', 1, 'draft', null, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', null);

set local role anon;
select results_eq($$select slug::text from public.blog_posts where slug::text like '%-rls-test' order by slug$$, array['public-rls-test'], 'anonymous visitors see only published posts');
select throws_ok($$insert into public.blog_posts(slug,title,description,eyebrow,category_slug,content_json,image_url,image_alt,read_minutes,created_by,updated_by) values ('anon-write','Anonymous write rejected','A description long enough for an anonymous security policy test payload.','JSON · TEST','json','{}','/x.png','Anonymous blocked image',1,'10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001')$$, '42501', null, 'anonymous inserts are denied');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select is(public.is_blog_editor(), false, 'AAL1 session is not an editor session');
select results_eq($$update public.blog_posts set title = 'AAL1 must fail' where id = '20000000-0000-0000-0000-000000000002' returning title$$, array[]::text[], 'AAL1 mutation affects no rows');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
select is(public.is_blog_editor(), true, 'active editor with AAL2 is authorized');
select lives_ok($$update public.blog_posts set title = 'Authorized editor update' where id = '20000000-0000-0000-0000-000000000002'$$, 'AAL2 editor may update a draft');
select lives_ok($$
  select * from public.cms_save_post(
    '{"id":"20000000-0000-0000-0000-000000000002","expectedRevision":1,"slug":"draft-rls-test","title":"Saved through the CMS transaction","metaTitle":"CMS transaction test","description":"A private article used to prove the transactional save function works with an authorized editor.","eyebrow":"JSON · TEST","category":"json","authorId":"codeformattertools-editorial","datePublished":"","relatedTools":[],"readMinutes":1,"image":"/draft.png","imageAlt":"Private RLS test image","imagePosition":"center center","intro":["Draft introduction"],"sections":[{"heading":"Test section","blocks":[{"type":"paragraph","text":"Saved safely."}]}],"faqs":[],"noindex":false,"changeSummary":"RLS test save"}'::jsonb,
    'save'
  )
$$, 'transactional CMS save succeeds for an AAL2 editor');
select results_eq($$select revision from public.blog_posts where id = '20000000-0000-0000-0000-000000000002'$$, array[2], 'CMS save increments the optimistic-lock revision');
select results_eq($$select count(*)::integer from public.blog_revisions where post_id = '20000000-0000-0000-0000-000000000002'$$, array[1], 'CMS save records an immutable prior revision');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal2"}', true);
select is(public.is_blog_editor(), false, 'authenticated user without an active profile is denied');
select results_eq($$select slug::text from public.blog_posts where slug::text like '%-rls-test' order by slug$$, array['public-rls-test'], 'outsider still sees only published posts');

select * from finish();
rollback;
