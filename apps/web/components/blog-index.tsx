import Link from "next/link";
import { BLOG_PAGE_SIZE, blogPosts, type BlogPost } from "@/lib/learn-guides";

export const blogPageCount = Math.max(1, Math.ceil(blogPosts.length / BLOG_PAGE_SIZE));

function pageHref(page: number) {
  return page === 1 ? "/blog" : `/blog/page/${page}`;
}

function BlogCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  return <Link
    className={`learn-card blog-card ${featured ? "blog-card-featured" : "blog-card-regular"}`}
    href={`/blog/${post.slug}`}
  >
    <div className="blog-card-media">
      <img
        src={post.image}
        alt={post.imageAlt}
        width={1200}
        height={675}
        loading={featured ? "eager" : "lazy"}
        fetchPriority={featured ? "high" : "auto"}
        decoding="async"
      />
    </div>
    <div className="blog-card-body">
      <div className="learn-card-meta">
        <span className="card-eyebrow">{post.eyebrow}</span>
        <span className="learn-minutes">{post.readMinutes} min</span>
      </div>
      <h2>{post.title}</h2>
      <p>{post.description}</p>
      <span className="card-link">Read article <span aria-hidden="true">→</span></span>
    </div>
  </Link>;
}

export function BlogIndex({ page = 1 }: { page?: number }) {
  const start = (page - 1) * BLOG_PAGE_SIZE;
  const pagePosts = blogPosts.slice(start, start + BLOG_PAGE_SIZE);
  const featuredPost = page === 1 ? pagePosts[0] : undefined;
  const regularPosts = featuredPost ? pagePosts.slice(1) : pagePosts;

  return <main className="learn-page blog-page container">
    <header className="blog-index-hero">
      <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><strong>Blog</strong></div>
      <div className="blog-index-hero-grid">
        <div>
          <div className="eyebrow">BLOG · GUIDE</div>
          <h1>Learn JSON, then open the tools<span className="title-accent">.</span></h1>
        </div>
        <p className="learn-lead">
          Practical, beginner-friendly guides for creating, viewing, downloading, sorting, and checking JSON files.
        </p>
      </div>
    </header>

    <div className="blog-grid">
      {featuredPost ? <BlogCard post={featuredPost} featured /> : null}
      {regularPosts.length > 0 ? <div className="blog-card-list">
        {regularPosts.map(post => <BlogCard post={post} key={post.slug} />)}
      </div> : null}
    </div>

    {blogPageCount > 1 ? <nav className="blog-pagination" aria-label="Blog pages">
      {page > 1 ? <Link className="blog-pagination-direction" href={pageHref(page - 1)}>← Previous</Link> : <span />}
      <div className="blog-pagination-pages">
        {Array.from({ length: blogPageCount }, (_, index) => index + 1).map(pageNumber => <Link
          aria-current={pageNumber === page ? "page" : undefined}
          className={pageNumber === page ? "is-active" : undefined}
          href={pageHref(pageNumber)}
          key={pageNumber}
        >{pageNumber}</Link>)}
      </div>
      {page < blogPageCount ? <Link className="blog-pagination-direction" href={pageHref(page + 1)}>Next →</Link> : <span />}
    </nav> : null}
  </main>;
}
