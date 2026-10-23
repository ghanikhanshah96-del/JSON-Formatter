begin;
select plan(10);

insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('30000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner-security@example.com', crypt('test-password', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('30000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'editor-security@example.com', crypt('test-password', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.profiles(user_id, email, display_name, role, active, password_set_at)
values
  ('30000000-0000-0000-0000-000000000001', 'owner-security@example.com', 'Owner Security', 'owner', true, now()),
  ('30000000-0000-0000-0000-000000000002', 'editor-security@example.com', 'Editor Security', 'editor', true, null);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal2"}', true);
select is(public.is_blog_editor(), false, 'MFA cannot bypass incomplete password setup');

reset role;
update public.profiles set password_set_at = now() where user_id = '30000000-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal2"}', true);
select is(public.is_blog_editor(), true, 'password completion plus MFA authorizes an active editor');
select is(has_table_privilege('authenticated', 'public.blog_assets', 'INSERT'), false, 'authenticated users cannot bypass server media insertion');
select is(has_table_privilege('authenticated', 'public.blog_assets', 'UPDATE'), false, 'authenticated users cannot bypass server media updates');
select is(has_table_privilege('authenticated', 'public.blog_assets', 'DELETE'), false, 'authenticated users cannot bypass server media deletion');
select is((select count(*)::integer from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'blog_media_editor_%'), 0, 'direct editor storage policies are removed');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
select lives_ok($$select public.cms_update_profile_access('30000000-0000-0000-0000-000000000002', 'editor', false)$$, 'owner can revoke editor access');
select is((select active from public.profiles where user_id = '30000000-0000-0000-0000-000000000002'), false, 'revocation is persisted');
select throws_ok($$select public.cms_update_profile_access('30000000-0000-0000-0000-000000000001', 'editor', true)$$, 'P0001', 'You cannot remove your own owner access', 'owner cannot demote self');
select is((select count(*)::integer from public.audit_events where action = 'user.access_revoked' and entity_id = '30000000-0000-0000-0000-000000000002'), 1, 'revocation is audited');

select * from finish();
rollback;
