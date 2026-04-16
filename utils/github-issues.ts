export type GithubIssueState = "open" | "closed" | "all";

type GithubIssueLabel = {
  name?: string;
};

type GithubIssue = {
  number: number;
  title: string;
  body: string | null;
  created_at: string;
  labels: GithubIssueLabel[];
  pull_request?: unknown;
};

export type GithubIssuePost = {
  _path: string;
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  body: string;
  source: "github";
  issueNumber: number;
  issueUrl: string;
};

type FetchGithubIssuePostsOptions = {
  repo?: string;
  token?: string;
  label?: string;
  state?: GithubIssueState;
  perPage?: number;
};

function parseRepo(input: string | undefined): { owner: string; repo: string } | null {
  if (!input) {
    return null;
  }

  const [owner, repo] = input.split("/");
  if (!owner || !repo) {
    return null;
  }

  return { owner, repo };
}

function toDateString(input: string): string {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function toExcerpt(body: string, fallback: string): string {
  const plainText = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]+\]\([^)]*\)/g, " ")
    .replace(/[>#*_~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!plainText) {
    return fallback;
  }

  if (plainText.length <= 140) {
    return plainText;
  }

  return `${plainText.slice(0, 140).trim()}...`;
}

function toIssueSlug(issueNumber: number): string {
  return `issue-${issueNumber}`;
}

export async function fetchGithubIssuePosts(options: FetchGithubIssuePostsOptions = {}): Promise<GithubIssuePost[]> {
  const repoInput =
    options.repo ?? process.env.GITHUB_REPO ?? process.env.NUXT_PUBLIC_GITHUB_REPO;
  const repoInfo = parseRepo(repoInput);

  if (!repoInfo) {
    return [];
  }

  const token = options.token ?? process.env.GITHUB_TOKEN;
  const state = options.state ?? (process.env.GITHUB_ISSUES_STATE as GithubIssueState | undefined) ?? "all";
  const label = options.label ?? process.env.GITHUB_ISSUES_LABEL;
  const perPage = Math.min(Math.max(options.perPage ?? 100, 1), 100);

  const url = new URL(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/issues`);
  url.searchParams.set("state", state);
  url.searchParams.set("sort", "created");
  url.searchParams.set("direction", "desc");
  url.searchParams.set("per_page", String(perPage));

  if (label) {
    url.searchParams.set("labels", label);
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "nuxt-blog-issues-sync",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.warn(`[github-issues] Request failed: ${response.status} ${response.statusText}`);
      return [];
    }

    const issues = (await response.json()) as GithubIssue[];

    return issues
      .filter((issue) => !issue.pull_request)
      .map((issue) => {
        const slug = toIssueSlug(issue.number);
        const body = (issue.body ?? "").trim();
        const tags = issue.labels
          .map((labelItem) => (typeof labelItem?.name === "string" ? labelItem.name : ""))
          .filter(Boolean);

        return {
          _path: `/blog/${slug}`,
          slug,
          title: issue.title,
          date: toDateString(issue.created_at),
          description: toExcerpt(body, `Synced from GitHub Issue #${issue.number}`),
          tags,
          body,
          source: "github",
          issueNumber: issue.number,
          issueUrl: `https://github.com/${repoInfo.owner}/${repoInfo.repo}/issues/${issue.number}`,
        };
      });
  } catch (error) {
    console.warn("[github-issues] Failed to fetch issues", error);
    return [];
  }
}
