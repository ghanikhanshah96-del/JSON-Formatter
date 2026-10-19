import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig, siteOrigin } from "@codeformattools/seo";
import { defaultEditorialProfile, formatEditorialDate } from "@/lib/editorial-team";
import { blogPosts } from "@/lib/learn-guides";

const profile = defaultEditorialProfile;
const profileUrl = `${siteOrigin()}${profile.path}`;
const profileDescription = `${profile.description} Learn how our guides are reviewed and browse articles from the team.`;

export const metadata: Metadata = {
  title: `${profile.name} | ${siteConfig.name}`,
  description: profileDescription,
  alternates: { canonical: profile.path },
  openGraph: {
    title: `${profile.name} | ${siteConfig.name}`,
    description: profileDescription,
    url: profileUrl,
    siteName: siteConfig.name,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: profile.name }]
  }
};

export default function EditorialTeamPage() {
  const editorialEntityId = `${profileUrl}#editorial-team`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: profile.name,
    description: profile.description,
    url: profileUrl,
    dateCreated: "2026-10-20",
    dateModified: "2026-10-20",
    mainEntity: {
      "@type": "Organization",
      "@id": editorialEntityId,
      name: profile.name,
      description: profile.description,
      url: profileUrl,
      logo: { "@type": "ImageObject", url: `${siteOrigin()}/icon-192.png` },
      knowsAbout: profile.expertise,
      parentOrganization: {
        "@type": "Organization",
        name: siteConfig.name,
        url: siteOrigin()
      }
    },
    hasPart: blogPosts.map(post => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: `${siteOrigin()}/blog/${post.slug}`,
      datePublished: post.datePublished,
      dateModified: post.dateModified,
      author: { "@id": editorialEntityId }
    }))
  };

  return (
    <main className="editorial-profile-page container">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />

      <header className="editorial-profile-hero">
        <div className="breadcrumbs">
          <Link href="/">Home</Link><span>/</span>
          <span>Team</span><span>/</span>
          <strong>{profile.name}</strong>
        </div>
        <div className="eyebrow">EDITORIAL &amp; TEAM</div>
        <h1>{profile.name}<span className="title-accent">.</span></h1>
        <p className="editorial-profile-role">{profile.role}</p>
      </header>

      <section className="editorial-profile-summary" aria-labelledby="editorial-team-overview">
        <span className="editorial-profile-mark" aria-hidden="true">{"{ }"}</span>
        <div>
          <h2 id="editorial-team-overview">About the editorial team</h2>
          <p>{profile.description}</p>
          <p>{profile.reviewStatement}</p>
        </div>
      </section>

      <div className="editorial-profile-details">
        <section aria-labelledby="editorial-expertise">
          <h2 id="editorial-expertise">Editorial expertise</h2>
          <ul className="editorial-expertise-list">
            {profile.expertise.map(item => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section aria-labelledby="editorial-links">
          <h2 id="editorial-links">Editorial standards and contact</h2>
          <p>
            Our public policies explain how content is prepared, corrected, and kept separate from advertising or other commercial considerations.
          </p>
          <nav className="editorial-profile-links" aria-label="Editorial team links">
            {profile.links.map(link => <Link href={link.href} key={link.href}>{link.label} <span aria-hidden="true">→</span></Link>)}
          </nav>
        </section>
      </div>

      <section className="editorial-profile-articles" aria-labelledby="editorial-articles">
        <div className="editorial-profile-section-heading">
          <div>
            <div className="eyebrow">FROM THE TEAM</div>
            <h2 id="editorial-articles">Articles by {profile.name}</h2>
          </div>
          <Link href="/blog">View all blog articles <span aria-hidden="true">→</span></Link>
        </div>
        <div className="editorial-article-list">
          {blogPosts.map(post => <Link className="editorial-article-card" href={`/blog/${post.slug}`} key={post.slug}>
            <div className="editorial-article-meta">
              <span>{post.category}</span>
              <time dateTime={post.datePublished}>{formatEditorialDate(post.datePublished)}</time>
            </div>
            <h3>{post.title}</h3>
            <p>{post.description}</p>
            <span className="card-link">Read article <span aria-hidden="true">→</span></span>
          </Link>)}
        </div>
      </section>
    </main>
  );
}
