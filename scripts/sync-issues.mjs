import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function parseEnvText(text) {
  const env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function loadEnvFile(filePath) {
  try {
    const text = await readFile(filePath, "utf8");
    return parseEnvText(text);
  } catch {
    return {};
  }
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function toDateString(input) {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function toExcerpt(body, fallback) {
  const plainText = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]+\]\([^)]*\)/g, " ")
    .replace(/[>#*_~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!plainText) return fallback;
  if (plainText.length <= 140) return plainText;
  return `${plainText.slice(0, 140).trim()}...`;
}

function yamlString(value) {
  return JSON.stringify(String(value ?? ""));
}

function issueToMarkdown(issue, owner, repo) {
  const issueNumber = issue.number;
  const title = issue.title || `Issue #${issueNumber}`;
  const date = toDateString(issue.created_at);
  const body = (issue.body || "").trim();
  const tags = (issue.labels || [])
    .map((label) => (typeof label?.name === "string" ? label.name : ""))
    .filter(Boolean);
  const description = toExcerpt(body, `Synced from GitHub Issue #${issueNumber}`);
  const issueUrl = `https://github.com/${owner}/${repo}/issues/${issueNumber}`;

  const tagLines = tags.length > 0 ? tags.map((tag) => `  - ${yamlString(tag)}`).join("\n") : "  - \"GitHub\"";

  return `---\ntitle: ${yamlString(title)}\ndate: ${yamlString(date)}\ndescription: ${yamlString(description)}\ntags:\n${tagLines}\nsource: \"github\"\nissue_number: ${issueNumber}\nissue_url: ${yamlString(issueUrl)}\n---\n\n${body || "(No content)"}\n`;
}

async function fetchJsonWithRetry(url, headers, retries = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, { headers });
      const text = await response.text();
      let data = null;

      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message = data && data.message ? data.message : `${response.status} ${response.statusText}`;
        const canRetry = response.status >= 500 || response.status === 429;
        if (canRetry && attempt < retries) {
          await sleep(600 * attempt);
          continue;
        }

        return {
          ok: false,
          status: response.status,
          message,
          data,
        };
      }

      return {
        ok: true,
        status: response.status,
        message: "",
        data,
      };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(700 * attempt);
      }
    }
  }

  return {
    ok: false,
    status: 0,
    message: lastError instanceof Error ? lastError.message : "Unknown network error",
    data: null,
  };
}

async function fetchAllIssues({ owner, repo, state, label, headers }) {
  const allIssues = [];
  let page = 1;

  while (page <= 10) {
    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/issues`);
    url.searchParams.set("state", state);
    url.searchParams.set("sort", "created");
    url.searchParams.set("direction", "desc");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    if (label) {
      url.searchParams.set("labels", label);
    }

    const result = await fetchJsonWithRetry(url, headers, 3);
    if (!result.ok) {
      return result;
    }

    const batch = Array.isArray(result.data) ? result.data : [];
    allIssues.push(...batch);

    if (batch.length < 100) {
      break;
    }

    page += 1;
  }

  return {
    ok: true,
    status: 200,
    message: "",
    data: allIssues,
  };
}

async function main() {
  const rootDir = process.cwd();
  const envFromDotEnv = await loadEnvFile(resolve(rootDir, ".env"));
  const envFromDotEnvLocal = await loadEnvFile(resolve(rootDir, ".env.local"));

  const env = {
    ...envFromDotEnv,
    ...envFromDotEnvLocal,
    ...process.env,
  };

  const repoInput = (env.GITHUB_REPO || "").trim();
  if (!repoInput || !repoInput.includes("/")) {
    console.log("[sync-issues] Skip: GITHUB_REPO is missing (expected owner/repo).");
    return;
  }

  const [owner, repo] = repoInput.split("/");
  const token = (env.GITHUB_TOKEN || "").trim();
  const label = (env.GITHUB_ISSUES_LABEL || "").trim();
  const state = (env.GITHUB_ISSUES_STATE || "all").trim() || "all";

  const baseHeaders = {
    Accept: "application/vnd.github+json",
    "User-Agent": "nuxt-blog-issues-sync",
  };

  let result;
  if (token) {
    result = await fetchAllIssues({
      owner,
      repo,
      state,
      label,
      headers: {
        ...baseHeaders,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!result.ok && result.status === 401) {
      console.warn("[sync-issues] Token unauthorized, retrying without token...");
    }
  }

  if (!result || (!result.ok && result.status === 401)) {
    result = await fetchAllIssues({
      owner,
      repo,
      state,
      label,
      headers: baseHeaders,
    });
  }

  if (!result.ok) {
    console.warn(`[sync-issues] Failed: ${result.status} ${result.message}`);
    console.warn("[sync-issues] Keep existing local issue markdown files.");
    return;
  }

  const issuesOnly = result.data.filter((issue) => !issue.pull_request);

  const blogDir = resolve(rootDir, "content/blog");
  await mkdir(blogDir, { recursive: true });

  const keepFileSet = new Set();
  for (const issue of issuesOnly) {
    const fileName = `issue-${issue.number}.md`;
    keepFileSet.add(fileName);
    const markdown = issueToMarkdown(issue, owner, repo);
    await writeFile(resolve(blogDir, fileName), markdown, "utf8");
  }

  const existingFiles = await readdir(blogDir);
  let removedCount = 0;

  for (const fileName of existingFiles) {
    if (!/^issue-\d+\.md$/.test(fileName)) continue;
    if (keepFileSet.has(fileName)) continue;

    const fullPath = resolve(blogDir, fileName);
    try {
      const text = await readFile(fullPath, "utf8");
      if (!text.includes('source: "github"') || !text.includes("issue_number:")) {
        continue;
      }
    } catch {
      continue;
    }

    await rm(fullPath, { force: true });
    removedCount += 1;
  }

  console.log(`[sync-issues] Synced ${issuesOnly.length} issues -> content/blog/*.md (removed ${removedCount}).`);
}

main().catch((error) => {
  console.error("[sync-issues] Unexpected error:", error);
  process.exit(1);
});
