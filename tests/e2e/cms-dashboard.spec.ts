import { createHmac } from "node:crypto";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const enabled = process.env.CMS_E2E === "1";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const siteUrl = (process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const testEmail = `cms-e2e-${Date.now()}@example.com`;
const testPassword = "Local-CMS-test-password-2026";
const updatedTestPassword = "Updated-local-CMS-password-2026";
const slug = `cms-e2e-${Date.now()}`;
let userId = "";

function serviceHeaders(extra: Record<string, string> = {}) {
  return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", ...extra };
}

function decodeBase32(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of value.replace(/=+$/g, "").toUpperCase()) bits += alphabet.indexOf(character).toString(2).padStart(5, "0");
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

function totp(secret: string) {
  const counter = Math.floor(Date.now() / 30_000);
  const buffer = Buffer.alloc(8); buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 15;
  const number = ((digest[offset] & 127) << 24) | ((digest[offset + 1] & 255) << 16) | ((digest[offset + 2] & 255) << 8) | (digest[offset + 3] & 255);
  return String(number % 1_000_000).padStart(6, "0");
}

test.describe("blog dashboard", () => {
  test.skip(!enabled || !supabaseUrl || !serviceKey, "Set CMS_E2E=1 and local Supabase environment values.");
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test.beforeAll(async () => {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, { method: "POST", headers: serviceHeaders(), body: JSON.stringify({ email: testEmail, password: testPassword, email_confirm: true }) });
    const user = await userResponse.json() as { id?: string; message?: string };
    if (!userResponse.ok || !user.id) throw new Error(user.message ?? "Unable to create CMS test user.");
    userId = user.id;
    const profile = await fetch(`${supabaseUrl}/rest/v1/profiles`, { method: "POST", headers: serviceHeaders({ Prefer: "resolution=merge-duplicates" }), body: JSON.stringify({ user_id: userId, email: testEmail, display_name: "CMS E2E Editor", role: "editor", active: true }) });
    if (!profile.ok) throw new Error(await profile.text());
  });

  test.afterAll(async () => {
    if (userId) {
      const postLookup = await fetch(`${supabaseUrl}/rest/v1/blog_posts?created_by=eq.${userId}&select=id`, { headers: serviceHeaders() });
      if (!postLookup.ok) throw new Error(`Unable to find CMS test post for cleanup: ${await postLookup.text()}`);
      const posts = await postLookup.json() as Array<{ id: string }>;
      for (const post of posts) {
        const postCleanup = await fetch(`${supabaseUrl}/rest/v1/blog_posts?id=eq.${post.id}`, {
          method: "DELETE",
          headers: serviceHeaders({ Prefer: "return=representation" }),
        });
        if (!postCleanup.ok) throw new Error(`Unable to remove CMS test post: ${await postCleanup.text()}`);
        const deleted = await postCleanup.json() as unknown[];
        if (deleted.length !== 1) throw new Error("CMS test post cleanup did not delete exactly one row.");
      }
    }
    if (userId) {
      const assetResponse = await fetch(`${supabaseUrl}/rest/v1/blog_assets?created_by=eq.${userId}&select=storage_path`, { headers: serviceHeaders() });
      if (assetResponse.ok) {
        const assets = await assetResponse.json() as Array<{ storage_path: string }>;
        for (const asset of assets) {
          const encodedPath = asset.storage_path.split("/").map(encodeURIComponent).join("/");
          await fetch(`${supabaseUrl}/storage/v1/object/blog-media/${encodedPath}`, { method: "DELETE", headers: serviceHeaders() });
        }
      }
      await fetch(`${supabaseUrl}/rest/v1/blog_assets?created_by=eq.${userId}`, { method: "DELETE", headers: serviceHeaders() });
      const auditCleanup = await fetch(`${supabaseUrl}/rest/v1/audit_events?actor_id=eq.${userId}`, { method: "DELETE", headers: serviceHeaders() });
      if (!auditCleanup.ok) throw new Error(`Unable to remove CMS test audit events: ${await auditCleanup.text()}`);
    }
    if (userId) {
      const userCleanup = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: serviceHeaders() });
      if (!userCleanup.ok) throw new Error(`Unable to remove CMS test user: ${await userCleanup.text()}`);
    }
  });

  test("editor enrolls MFA, imports a Word article, previews, publishes, uploads media, and archives", async ({ page, request }, testInfo) => {
    await page.goto("/auth/session?code=invalid-regression-code");
    await expect(page).toHaveURL(/\/admin\/login\?error=invalid_or_expired_link$/);
    await expect(page.locator(".admin-error")).toContainText("invalid or has expired");

    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const link = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: testEmail,
      options: { redirectTo: `${siteUrl}/auth/session` },
    });
    if (link.error || !link.data.properties?.action_link) throw new Error(link.error?.message ?? "Unable to create CMS sign-in link.");
    await page.goto(link.data.properties.action_link);
    await expect(page).toHaveURL(/\/admin\/account$/, { timeout: 20_000 });
    await page.getByLabel("New password").fill(updatedTestPassword);
    await page.getByLabel("Confirm password").fill(updatedTestPassword);
    await page.getByRole("button", { name: "Save password and continue" }).click();
    await expect(page).toHaveURL(/\/admin\/mfa$/, { timeout: 20_000 });
    const manual = page.locator(".admin-code");
    await expect(manual).toBeVisible({ timeout: 20_000 });
    const secret = (await manual.textContent())?.trim() ?? "";
    await page.getByLabel("Authentication code").fill(totp(secret));
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // A draft must be recoverable before it is complete enough to publish.
    await page.goto("/admin/posts/new");
    await page.getByRole("button", { name: "SEO" }).click();
    await page.getByLabel("Article title").fill("Incomplete CMS regression draft");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]+\/edit\?saved=1$/, { timeout: 20_000 });
    await page.getByRole("button", { name: "SEO" }).click();
    await expect(page.getByLabel("Article title")).toHaveValue("Incomplete CMS regression draft");
    await page.reload();
    await page.getByRole("button", { name: "SEO" }).click();
    await expect(page.getByLabel("Article title")).toHaveValue("Incomplete CMS regression draft");
    await page.getByLabel("Article title").fill("Incomplete CMS regression draft updated");
    await expect(page.getByText("Draft autosaved.")).toBeVisible({ timeout: 15_000 });
    await page.reload();
    await page.getByRole("button", { name: "SEO" }).click();
    await expect(page.getByLabel("Article title")).toHaveValue("Incomplete CMS regression draft updated");
    await page.goto("/admin/posts?status=draft");
    await expect(page.getByRole("row").filter({ hasText: "Incomplete CMS regression draft updated" })).toBeVisible();

    const richImportCases = [
      {
        title: "How to View a JSON File on Windows, Mac, and Online",
        slug: "how-to-view-a-json-file",
        category: "json",
        codeCount: 2,
        slugLabel: "Suggested URL slug",
        body: `<h2>How to View a JSON File: Quick Methods</h2><table><tr><td>Method</td><td>Use</td></tr><tr><td>Notepad on Windows</td><td>Read a small JSON file</td></tr><tr><td>Online JSON formatter</td><td>Make compressed JSON readable</td></tr></table><h2>How to View a JSON File Online for Free</h2><p>For example, you might have JSON that looks like this:</p><p>{&quot;name&quot;:&quot;Alex&quot;,&quot;active&quot;:true}</p><p>After formatting, the same information becomes:</p><p>{</p><p>&quot;name&quot;: &quot;Alex&quot;,</p><p>&quot;active&quot;: true</p><p>}</p>`,
      },
      {
        title: "How to Download a JSON File: A Simple Step-by-Step Guide",
        slug: "how-to-download-a-json-file",
        category: "json",
        codeCount: 0,
        slugLabel: "URL Slug",
        body: `<h2>How to Download a JSON File From a Website</h2><p>If a website provides a JSON download link, follow these steps:</p><ol><li>Open the website containing the JSON file.</li><li>Click the download option.</li></ol>`,
      },
      {
        title: "How to Sort JSON File Online: A Simple Step-by-Step Guide",
        slug: "how-to-sort-json-file",
        category: "json",
        codeCount: 2,
        slugLabel: "SEO-Friendly URL Slug",
        body: `<h2>How to Sort JSON Keys Alphabetically</h2><p>Open the<a href="https://codeformattertools.com/json-sorter">JSON Sorter</a>.</p><p>For example, consider this unsorted JSON:</p><p>{</p><p>&quot;name&quot;: &quot;Alex&quot;,</p><p>&quot;age&quot;: 28</p><p>}</p><p>After sorting the keys alphabetically, it becomes:</p><p>{</p><p>&quot;age&quot;: 28,</p><p>&quot;name&quot;: &quot;Alex&quot;</p><p>}</p>`,
      },
      {
        title: "How to Format an SQL Query Online: Easy Step-by-Step Guide",
        slug: "how-to-format-an-sql-query",
        category: "sql",
        codeCount: 1,
        slugLabel: "SEO-Friendly URL Slug",
        body: `<h2>How to Format an SQL Query Online for Free</h2><p>For example:</p><p>select name,email from customers where status='active';</p>`,
      },
    ];
    await page.goto("/admin/posts/new");
    await expect(page.locator("#article-source")).toBeEditable();
    for (const [caseIndex, item] of richImportCases.entries()) {
      const toolPath = item.category === "sql" ? "sql-formatter" : "json-formatter";
      const richCaseHtml = `<h2>SEO details</h2><p>SEO Meta Title: ${item.title}</p><p>Meta Description: This complete browser-based guide explains the workflow clearly with practical instructions and readable examples.</p><p>${item.slugLabel}: ${item.slug}</p><h1>${item.title}</h1><p>This introduction explains the complete workflow clearly enough to produce a useful article summary for readers.</p>${item.body}<h2>Best Practices</h2><p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">• Use consistent formatting.</p><p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">• Review the generated result.</p><h2>Frequently Asked Questions</h2><h3>Can I complete this workflow online?</h3><p>Yes. Use the <a href="\u200bhttps://codeformattertools.com/${toolPath}\ufeff">online tool</a> without installing software.</p>`;
      if (caseIndex > 0) {
        await page.getByRole("button", { name: "Quick Paste" }).click();
        await page.getByRole("button", { name: "Clear pasted source" }).click();
        await expect(page.locator("#article-source")).toHaveValue("");
      }
      await page.locator("#article-source").evaluate((element, payload) => {
        const transfer = new DataTransfer();
        transfer.setData("text/plain", payload.title);
        transfer.setData("text/html", payload.html);
        element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: transfer }));
      }, { title: item.title, html: richCaseHtml });
      await expect(page.getByText("Rich document formatting detected.")).toBeVisible();
      await expect(page.locator("#article-source")).toHaveValue(item.title);
      await page.getByRole("button", { name: "Format article" }).click();
      await expect(page.getByRole("heading", { name: item.title })).toBeVisible();
      await expect(page.locator(".admin-live-preview pre.blog-code")).toHaveCount(item.codeCount);
      await expect(page.locator(".admin-live-preview li").filter({ hasText: "Use consistent formatting." })).toHaveText("Use consistent formatting.");
      await expect(page.locator(".admin-warning-list")).not.toContainText("unsafe link destination");
      if (item.slug === "how-to-view-a-json-file") await expect(page.getByText("Notepad on Windows | Read a small JSON file")).toBeVisible();
      if (item.slug === "how-to-sort-json-file") await expect(page.getByText("Open the JSON Sorter.")).toBeVisible();
      await page.getByRole("button", { name: "SEO" }).click();
      await expect(page.locator("#seo-slug-main")).toHaveValue(item.slug);
      await expect(page.locator("#seo-category-main")).toHaveValue(item.category);
    }

    await page.getByRole("button", { name: "Quick Paste" }).click();
    await page.getByRole("button", { name: "Clear pasted source" }).click();
    await expect(page.getByRole("button", { name: "Quick Paste" })).toHaveAttribute("aria-current", "page");
    const richHtml = `<h2>SEO details</h2>
      <p>SEO Meta Title: How to Format an SQL Query Online: Step-by-Step Guide</p>
      <p>Meta Description: Learn how to format an SQL query online for free. Follow simple steps to organize SQL code with proper indentation, spacing, and readable clauses.</p>
      <p>SEO-Friendly URL Slug: how-to-format-an-sql-query</p>
      <p>Primary Keyword: how to format an sql query</p>
      <p>Secondary Keywords: format SQL query online, SQL formatter online, SQL query formatting, SQL beautifier, format SQL code, SQL indentation, make SQL query readable.</p>
      <h1>How to Format an SQL Query Online: Easy Step-by-Step Guide</h1>
      <p>Wondering how to format an SQL query that's difficult to read? You can use an online SQL formatter to organize your code with proper indentation, spacing, and line breaks. This makes long queries easier to understand, review, and debug without manually adjusting every line.</p>
      <p>Whether you're working with a simple SELECT statement or a query containing multiple JOIN and WHERE clauses, here's how to format SQL code quickly.</p>
      <h2>How to Format an SQL Query Online for Free</h2>
      <p>You can format SQL queries directly in your browser using a free SQL formatter.</p>
      <h3>Step 1: Open the SQL Formatter</h3><p>Visit the <a href="https://codeformattertools.com/sql-formatter">free online SQL Formatter</a>.</p><p>The tool works in your browser without requiring software installation or account registration.</p>
      <h3>Step 2: Paste Your SQL Query</h3><p>Copy the SQL statement you want to format and paste it into the input area.</p><p>For example:</p><p>select name,email from customers where status='active' order by name;</p>
      <h3>Step 3: Format the SQL Code</h3><p>Click Format SQL.</p><p>The formatter organizes the statement with line breaks, indentation, and consistent spacing.</p><p>If your query uses database-specific syntax, select the appropriate SQL dialect if that option is available.</p>
      <h3>Step 4: Copy the Formatted Query</h3><p>Review the output and copy the formatted SQL.</p><p>You can paste it into your SQL editor, project files, or documentation.</p>
      <h2>SQL Query Formatting Example: Before and After</h2><p>A properly formatted query is easier to follow, especially when it contains several clauses.</p>
      <p>Before formatting:</p><p>select id,name,email from users where status='active' and age&gt;18 order by name asc;</p>
      <p>After formatting:</p><p>SELECT</p><p>    id,</p><p>    name,</p><p>    email</p><p>FROM</p><p>    users</p><p>WHERE</p><p>    status = 'active'</p><p>    AND age &gt; 18</p><p>ORDER BY</p><p>    name ASC;</p>
      <p>The formatted version separates the SELECT, FROM, WHERE, and ORDER BY clauses, making the query structure clearer.</p><p>Formatting is intended to improve readability rather than change what the query does. However, you should still review the output before running it, particularly when using database-specific syntax or comments.</p>
      <h2>Best Practices for Formatting SQL Queries</h2><p>You can make SQL code easier to read by following a few simple conventions:</p>
      <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">Use consistent keyword capitalization: Write keywords such as SELECT, FROM, WHERE, and JOIN in uppercase if that matches your team's style.</p>
      <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">Separate major clauses: Put important SQL clauses on their own lines.</p>
      <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">Use indentation: Indent nested queries and related conditions consistently.</p>
      <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">Keep spacing readable: Add spaces around operators such as = and &gt;.</p>
      <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">Follow one style: Use the same formatting conventions throughout your SQL project.</p><p>A consistent structure is especially helpful when reviewing queries written by different developers.</p>
      <h2>Why Is My SQL Query Not Formatting?</h2><p>If a formatter cannot process your query, check these common issues.</p>
      <h3>Incorrect SQL Dialect</h3><p>MySQL, PostgreSQL, SQL Server, and other databases have syntax differences.</p><p>Choose a matching SQL dialect when the formatter provides that setting.</p>
      <h3>Incomplete SQL Statement</h3><p>Missing quotation marks, unclosed parentheses, or unfinished comments may prevent the formatter from processing your code.</p><p>Check the query for incomplete syntax and try again.</p>
      <h3>Unsupported Template Syntax</h3><p>Some applications use placeholders or template expressions that are not standard SQL.</p><p>You may need to process those templates before using a SQL formatter.</p>
      <h2>Frequently Asked Questions</h2>
      <h3>Can I format an SQL query online for free?</h3><p>Yes. You can use an <a href="https://codeformattertools.com/sql-formatter">online SQL Formatter</a> to organize SQL queries without installing software.</p>
      <h3>Does SQL formatting change query results?</h3><p>Formatting normally changes whitespace, indentation, and keyword presentation rather than query logic. Always review database-specific syntax and comments before executing the formatted statement.</p>
      <h3>Can I format complex SQL queries?</h3><p>Yes. SQL formatters can make queries containing JOIN, WHERE, ORDER BY, and nested statements easier to read. Support for particular syntax depends on the formatter and SQL dialect.</p>
      <h3>Is an SQL formatter the same as an SQL validator?</h3><p>No. A SQL formatter improves code readability, while a validator checks syntax. A properly formatted query can still contain errors.</p>
      <h2>Conclusion</h2><p>Learning how to format an SQL query is straightforward with an online formatter. Paste your code, format it, and copy the cleaner version into your project.</p><p>For quick SQL query formatting, use the <a href="https://codeformattertools.com/sql-formatter">CodeFormatterTools SQL Formatter</a> to organize your statements with consistent spacing and indentation.</p>`;
    const plainText = "How to Format an SQL Query Online: Easy Step-by-Step Guide\n\nWondering how to format an SQL query that's difficult to read? You can use an online SQL formatter to organize your code with proper indentation, spacing, and line breaks.";
    await page.locator("#article-source").evaluate((element, payload) => {
      const transfer = new DataTransfer();
      transfer.setData("text/plain", payload.plainText);
      transfer.setData("text/html", payload.richHtml);
      element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: transfer }));
    }, { richHtml, plainText });
    await expect(page.getByText("Rich document formatting detected.")).toBeVisible();
    await expect(page.locator("#article-source")).toHaveValue(plainText);
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem("codeformattertools:blog-import:new") ?? "")).toContain("How to Format an SQL Query Online");
    await page.reload();
    await expect(page.locator("#article-source")).toHaveValue(/How to Format an SQL Query Online/);
    await page.getByRole("button", { name: "Format article" }).click();
    await expect(page.getByRole("heading", { name: "How to Format an SQL Query Online: Easy Step-by-Step Guide" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "How to Format an SQL Query Online for Free" })).toBeVisible();
    await expect(page.getByText(/SEO details before the H1 were applied/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "SEO details" })).toHaveCount(0);
    await expect(page.locator(".admin-live-preview pre")).toHaveCount(3);
    await expect(page.locator(".admin-live-preview").getByText(/SELECT\s+id,\s+name,\s+email/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Frequently Asked Questions" })).toBeVisible();
    await expect(page.locator('.admin-live-preview a[href="/sql-formatter"]')).toHaveCount(2);
    const previewToolLink = page.locator('.admin-live-preview a[href="/sql-formatter"]').first();
    await expect(previewToolLink).toHaveCSS("text-decoration-line", "underline");
    await expect(previewToolLink).not.toHaveCSS("color", await previewToolLink.locator("xpath=parent::*").evaluate(element => getComputedStyle(element).color));
    await expect(page.locator(".admin-warning-list")).not.toContainText("unsafe link destination");
    await expect(page.locator(".admin-live-preview li").filter({ hasText: "Use consistent keyword capitalization" })).toHaveText(/^Use consistent keyword capitalization:/);
    await expect(page.getByText(/Links in the FAQ answer/)).toBeVisible();

    await page.getByRole("button", { name: "Advanced" }).click();
    await expect(page.getByLabel("Article title")).toHaveValue("How to Format an SQL Query Online: Easy Step-by-Step Guide");
    await expect(page.getByLabel("Section 1 heading")).toHaveValue("How to Format an SQL Query Online for Free");
    await expect(page.getByLabel("Code language")).toHaveCount(3);
    await expect(page.getByLabel("Code language").first()).toHaveValue("sql");
    await expect(page.getByLabel("Code", { exact: true }).nth(2)).toHaveValue("SELECT\n    id,\n    name,\n    email\nFROM\n    users\nWHERE\n    status = 'active'\n    AND age > 18\nORDER BY\n    name ASC;");
    await page.getByRole("button", { name: "SEO" }).click();
    await expect(page.locator("#seo-slug-main")).toHaveValue("how-to-format-an-sql-query");
    await expect(page.locator("#seo-meta-title-main")).toHaveValue("How to Format an SQL Query Online: Step-by-Step Guide");
    await expect(page.locator("#seo-description-main")).toHaveValue(/Learn how to format an SQL query online for free/);
    await expect(page.locator("#seo-category-main")).toHaveValue("sql");
    await page.locator("#seo-slug-main").fill(slug);
    await expect(page.getByRole("button", { name: "Publish", exact: true })).toBeDisabled();
    await page.getByLabel("Alt text").fill("SQL query formatting workflow with unformatted and formatted code");
    await page.getByLabel("Upload cover image").setInputFiles(process.env.CMS_E2E_BLOG_IMAGE ?? path.resolve("apps/web/public/blog/how-to-download-a-json-file.jpg"));
    await expect(page.getByText("Image uploaded.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Publish", exact: true })).toBeEnabled();
    await page.getByLabel("Change summary").fill("Created by automated browser verification");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]+\/edit\?saved=1$/, { timeout: 20_000 });
    await expect(page.getByText(/Draft saved|Draft autosaved/)).toBeVisible();
    const postId = page.url().match(/\/admin\/posts\/([0-9a-f-]+)\/edit/)?.[1];
    expect(postId).toBeTruthy();

    const preview = page.getByRole("link", { name: "Open private preview" });
    const previewPagePromise = page.context().waitForEvent("page");
    await preview.click();
    const previewPage = await previewPagePromise;
    await previewPage.waitForLoadState();
    await expect(previewPage.getByText("Private preview")).toBeVisible();
    await expect(previewPage.getByRole("heading", { name: "How to Format an SQL Query Online: Easy Step-by-Step Guide" })).toBeVisible();
    await expect(previewPage.locator("pre.blog-code")).toHaveCount(3);
    await previewPage.close();

    await page.getByLabel("Publication date").fill("2099-12-31");
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.locator(".admin-error")).toContainText("Publication date cannot be in the future");
    await page.getByLabel("Publication date").fill(new Date().toISOString().slice(0, 10));
    await expect(page.locator(".admin-error")).toHaveCount(0);
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Published successfully.")).toBeVisible();
    await page.goto(`/blog/${slug}`);
    await expect(page.getByRole("heading", { name: "How to Format an SQL Query Online: Easy Step-by-Step Guide" })).toBeVisible();
    await expect(page).toHaveTitle("How to Format an SQL Query Online: Step-by-Step Guide");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Learn how to format an SQL query online for free/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/blog/${slug}$`));
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    const structuredData = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "{}") as { image?: string[] };
    expect(structuredData.image?.[0]).toMatch(/^https:\/\//);
    expect(structuredData.image?.[0]).not.toContain("codeformattertools.comhttps://");
    await expect(page.locator("pre.blog-code")).toHaveCount(3);
    await expect(page.getByText("Can I format an SQL query online for free?")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("blog5-published-page.png"), fullPage: true });
    await page.goto("/blog");
    await expect(page.getByRole("link").filter({ hasText: "How to Format an SQL Query Online: Easy Step-by-Step Guide" })).toBeVisible();
    await expect.poll(async () => (await request.get("/sitemap.xml")).text()).toContain(`/blog/${slug}`);
    await expect.poll(async () => (await request.get("/blog/rss.xml")).text()).toContain(`/blog/${slug}`);

    await page.goto(`/admin/posts/${postId}/edit`);
    await page.getByRole("button", { name: "SEO" }).click();
    const updatedDescription = "Learn how to format an SQL query online for free with verified steps, readable clauses, and a production-tested editing workflow.";
    await page.locator("#seo-description-main").fill(updatedDescription);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Published successfully.")).toBeVisible();
    await page.goto(`/blog/${slug}`);
    await expect(page.getByText(updatedDescription)).toBeVisible();

    await page.goto("/admin/media");
    await expect(page.getByText(process.env.CMS_E2E_BLOG_IMAGE ? /blog5-image\.jpg/ : /how-to-download-a-json-file\.jpg/).first()).toBeVisible();

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/posts");
    const row = page.getByRole("row").filter({ hasText: slug });
    await row.getByRole("button", { name: "Archive" }).click();
    await expect(page).toHaveURL(/\/admin\/posts\?archived=1$/);
    await page.goto(`/blog/${slug}`);
    await expect(page).toHaveTitle(/404|not found/i);

    await page.goto(`/admin/posts/${postId}/edit`);
    await expect(page.getByRole("button", { name: "Restore as draft" })).toBeVisible();
    await page.getByRole("button", { name: "Restore as draft" }).click();
    await expect(page.getByText("Draft saved.")).toBeVisible();
    await expect(page.locator(".admin-badge.draft")).toBeVisible();
    await page.goto(`/blog/${slug}`);
    await expect(page).toHaveTitle(/404|not found/i);
    await page.goto(`/admin/posts/${postId}/edit`);
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByText("Published successfully.")).toBeVisible();
    await page.goto(`/blog/${slug}`);
    await expect(page.getByRole("heading", { name: "How to Format an SQL Query Online: Easy Step-by-Step Guide" })).toBeVisible();
    await page.goto("/admin/posts");
    await page.getByRole("row").filter({ hasText: slug }).getByRole("button", { name: "Archive" }).click();
    await expect(page).toHaveURL(/\/admin\/posts\?archived=1$/);
  });
});
