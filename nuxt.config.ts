import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fetchGithubIssuePosts } from "./utils/github-issues";

export default defineNuxtConfig({
 modules: ["@nuxt/content", "nuxt-windicss"],
 devtools: { enabled: false },

 routeRules: {
   "/**": { prerender: true },
 },

 nitro: {
   prerender: {
     routes: ["/", "/blog"],
   },
 },

 hooks: {
   async "nitro:config"(nitroConfig) {
     const staticRoutes = new Set<string>(nitroConfig.prerender?.routes || ["/", "/blog"]);

     const blogDir = resolve(process.cwd(), "content/blog");
     try {
       const files = await readdir(blogDir, { withFileTypes: true });
       const markdownRoutes = files
         .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
         .map((entry) => entry.name.replace(/\.md$/, ""))
         .map((slug) => `/blog/${slug}`);

       for (const route of markdownRoutes) {
         staticRoutes.add(route);
       }
     } catch {
       // No local markdown posts; continue with other sources.
     }

     try {
       const githubIssueRoutes = (await fetchGithubIssuePosts()).map((post) => post._path);
       for (const route of githubIssueRoutes) {
         staticRoutes.add(route);
       }
     } catch {
       // GitHub sync is optional; ignore fetch failure.
     }

     nitroConfig.prerender = nitroConfig.prerender || {};
     nitroConfig.prerender.routes = Array.from(staticRoutes);
   },
 },

 content: {
   documentDriven: false,
 },

 compatibilityDate: "2026-04-16",
});