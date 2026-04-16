import type { GithubIssuePost } from "./github-issues";

export type BlogPost = {
  _path: string;
  title?: string;
  date?: string;
  description?: string;
  tags?: string[];
  body?: string;
  source: "content" | "github";
  [key: string]: unknown;
};

type LocalPost = {
  _path: string;
  title?: string;
  date?: string;
  description?: string;
  tags?: string[];
  [key: string]: unknown;
};

function toTimestamp(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

export function normalizeLocalPosts(posts: LocalPost[] = []): BlogPost[] {
  return posts.map((post) => ({
    ...post,
    source: "content",
  }));
}

export function mergeAndSortPosts(localPosts: LocalPost[] = [], githubPosts: GithubIssuePost[] = []): BlogPost[] {
  const mergedByPath = new Map<string, BlogPost>();

  for (const localPost of normalizeLocalPosts(localPosts)) {
    if (localPost._path) {
      mergedByPath.set(localPost._path, localPost);
    }
  }

  // Keep GitHub API result as higher priority than synced local markdown.
  for (const githubPost of githubPosts) {
    mergedByPath.set(githubPost._path, githubPost);
  }

  return Array.from(mergedByPath.values()).sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));
}
