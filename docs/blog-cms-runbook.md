# Blog CMS operations runbook

The blog dashboard is available at `/admin`. It uses Supabase Auth, Postgres, and Storage while the public website continues to render the same blog URLs and design.

## Production setup

1. Create a Supabase project and save its project reference.
2. Link this repository and apply the checked-in database migration:

   ```powershell
   pnpm dlx supabase@2.121.0 login
   pnpm dlx supabase@2.121.0 link --project-ref <project-ref>
   pnpm dlx supabase@2.121.0 db push
   ```

3. Add these variables to the Vercel Production, Preview, and Development environments:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose it with a `NEXT_PUBLIC_` prefix)
   - `BLOG_MEDIA_BUCKET=blog-media`
   - `NEXT_PUBLIC_SITE_URL=https://www.codeformattertools.com`
   - `BLOG_SOURCE=static` for the first deployment

4. Deploy once with `BLOG_SOURCE=static`. This keeps the existing articles live while the database is prepared.
5. Bootstrap the first owner from a trusted workstation. Use a long temporary password and change it after the first login:

   ```powershell
   $env:CMS_OWNER_EMAIL='owner@example.com'
   $env:CMS_OWNER_DISPLAY_NAME='CodeFormatterTools Editorial Team'
   pnpm --filter web cms:bootstrap
   ```

6. Open the invitation email, set the account password through the emailed flow, complete TOTP enrollment, and confirm that `/admin` opens. Use the Users screen to invite editors; public sign-up is disabled. `CMS_OWNER_EMAIL` and `CMS_OWNER_DISPLAY_NAME` are needed only in the trusted shell that runs the bootstrap command and should not be stored in Vercel.

## Content migration and rollout

Run the migration with production Supabase variables loaded in the current shell:

```powershell
pnpm --filter web cms:migrate
pnpm --filter web cms:verify
```

The migration is idempotent: it upserts the four existing posts, relations, FAQs, and media instead of producing duplicates.

Use this rollout order:

1. Set `BLOG_SOURCE=shadow` and deploy. Public pages still use checked-in content while database reads are exercised by the application.
2. Verify the blog index, every article, sitemap, RSS feed, editorial profile, and admin preview.
3. Set `BLOG_SOURCE=supabase` and deploy. Publish a disposable test draft, verify its public page, then archive it.
4. Keep the static article data in the repository during the initial rollout. To roll back instantly, set `BLOG_SOURCE=static` and redeploy; no database restore is required.

## Publishing workflow

- Editors can create drafts, upload optimized cover images, preview, publish, update, and archive posts.
- Owners can also invite or disable users and review the audit trail.
- Every save uses an expected revision number. If two people edit the same post, the stale save is rejected rather than overwriting newer work.
- Publishing or archiving invalidates the blog index, article, sitemap, RSS, and editorial profile caches.
- Changing a published slug creates a permanent redirect from the old URL.
- Article HTML is generated only by the structured block renderer. The dashboard does not accept arbitrary HTML.

## Security and maintenance

- Require TOTP MFA for every dashboard user and remove accounts that no longer need access.
- Keep the service-role key only in Vercel/server environments. Rotate it immediately if it is exposed.
- Supabase row-level security limits unpublished content and write operations to authorized, MFA-verified users.
- Uploaded images are signature-checked, bounded by size and pixel count, stripped of metadata, converted to WebP, and stored under randomized paths.
- Enable Supabase database backups and test a restore before relying on the CMS for business-critical content.
- Review `/admin/audit` periodically and after any unexpected publishing change.

## Release verification

Before each CMS release, run:

```powershell
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
pnpm dlx supabase@2.121.0 test db
pnpm --filter web build
pnpm exec playwright test --project=chromium
```

For the authenticated CMS browser test, start local Supabase and run Playwright with `CMS_E2E=1` plus the local Supabase variables. The test creates and removes its own editor and post, and verifies MFA, draft preview, publishing, media upload, authorization, and archiving.
