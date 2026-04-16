<script setup lang="ts">
import { mergeAndSortPosts } from "~/utils/blog-posts";
import { fetchGithubIssuePosts } from "~/utils/github-issues";

const mergedPostsState = useState<Array<Record<string, unknown>>>("merged-posts", () => []);

const { data: latestPosts } = await useAsyncData("latest-posts", async () => {
  const [localPosts, githubPosts] = await Promise.all([
    queryContent("/blog").find(),
    fetchGithubIssuePosts(),
  ]);

  const mergedPosts = mergeAndSortPosts(localPosts as Array<{ _path: string }>, githubPosts);
  mergedPostsState.value = mergedPosts as Array<Record<string, unknown>>;

  return mergedPosts.slice(0, 3);
});
</script>

<template>
  <div class="space-y-10">
    <VantaHero>
      <p class="mb-3 text-sm uppercase tracking-[0.2em] text-amber-300/90">
        技术栈：Nuxt3 + Content + SSG + vue
      </p>
      <h1 class="text-4xl font-bold leading-tight text-white md:text-5xl">
        缘缘的个人博客
      </h1>
      <p class="mt-4 max-w-2xl text-zinc-200">
      本地 Markdown 文件：GitHub Issues：从你配置的仓库里读取Issues作为文章
      </p>
      <div class="mt-8">
        <NuxtLink
          to="/blog"
          class="rounded-md border border-amber-300/50 bg-amber-300/10 px-5 py-2.5 text-sm text-amber-200 hover:bg-amber-300/20"
        >
          阅读全部文章
        </NuxtLink>
      </div>
    </VantaHero>

    <section class="space-y-5">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-zinc-100">最新动态</h2>
        <NuxtLink to="/blog" class="text-sm text-amber-300 hover:text-amber-200">
          所有文章
        </NuxtLink>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <article
          v-for="post in latestPosts"
          :key="post._path"
          class="rounded-xl border border-zinc-700/60 bg-zinc-900/70 p-4"
        >
          <p class="text-xs text-zinc-400">{{ post.date }}</p>
          <h3 class="mt-2 text-base font-semibold text-zinc-100">
            <NuxtLink :to="post._path" class="hover:text-amber-300">
              {{ post.title }}
            </NuxtLink>
          </h3>
          <p class="mt-2 text-sm text-zinc-300">
            {{ post.description }}
          </p>
        </article>
      </div>
    </section>
  </div>
</template>
