import Image from "next/image";
import Link from "next/link";
import { formatEditorialShortDate } from "@/lib/editorial-team";
import { BLOG_PAGE_SIZE } from "@/lib/blog-repository";
import type { BlogPost } from "@/lib/learn-guides";

function pageHref(page: number) {
  return page === 1 ? "/blog" : `/blog/page/${page}`;
}

function BlogCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  return <Link
    className={`learn-card blog-card ${featured ? "blog-card-featured" : "blog-card-regular"}`}
    href={`/blog/${post.slug}`}
  >
    <div className="blog-card-media">
      <Image
        src={post.image}
        alt=""
        aria-hidden="true"
        fill
        priority={featured}
        sizes={featured
          ? "(max-width: 1100px) calc(100vw - 28px), 56vw"
          : "(max-width: 680px) calc(100vw - 28px), (max-width: 1100px) 50vw, 33vw"}
        style={{ objectPosition: post.imagePosition ?? "center center" }}
      />
    </div>
    <div className="blog-card-body">
      <div className="learn-card-meta">
        <span className="card-eyebrow">{post.eyebrow}</span>
        <span className="learn-minutes">
          <time dateTime={post.datePublished}>{formatEditorialShortDate(post.datePublished)}</time>
          <span aria-hidden="true"> · </span>{post.readMinutes} min
        </span>
      </div>
      <h2>{post.title}</h2>
      <p>{post.description}</p>
      <span className="card-link">Read article <span aria-hidden="true">→</span></span>
    </div>
  </Link>;
}

export function BlogIndex({ posts, page = 1, pageCount }: { posts: BlogPost[]; page?: number; pageCount: number }) {
  const start = (page - 1) * BLOG_PAGE_SIZE;
  const pagePosts = posts.slice(start, start + BLOG_PAGE_SIZE);
  const featuredPost = page === 1 ? pagePosts[0] : undefined;
  const regularPosts = featuredPost ? pagePosts.slice(1) : pagePosts;

  return <main className="learn-page blog-page container" id="main-content">
    <header className="blog-index-hero">
      <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><strong>Blog</strong></div>
      <div className="blog-index-hero-grid">
        <div>
          <div className="eyebrow">BLOG · {posts.length} GUIDES</div>
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

    {pageCount > 1 ? <nav className="blog-pagination" aria-label="Blog pages">
      {page > 1 ? <Link className="blog-pagination-direction" href={pageHref(page - 1)}>← Previous</Link> : <span />}
      <div className="blog-pagination-pages">
        {Array.from({ length: pageCount }, (_, index) => index + 1).map(pageNumber => <Link
          aria-current={pageNumber === page ? "page" : undefined}
          className={pageNumber === page ? "is-active" : undefined}
          href={pageHref(pageNumber)}
          key={pageNumber}
        >{pageNumber}</Link>)}
      </div>
      {page < pageCount ? <Link className="blog-pagination-direction" href={pageHref(page + 1)}>Next →</Link> : <span />}
    </nav> : null}
  </main>;
}
