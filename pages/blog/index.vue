<script setup lang="ts">
import { mergeAndSortPosts } from "~/utils/blog-posts";
import { fetchGithubIssuePosts } from "~/utils/github-issues";

const mergedPostsState = useState<Array<Record<string, unknown>>>("merged-posts", () => []);

const { data: posts } = await useAsyncData("posts", async () => {
  const [localPosts, githubPosts] = await Promise.all([
    queryContent("/blog").find(),
    fetchGithubIssuePosts(),
  ]);

  const mergedPosts = mergeAndSortPosts(localPosts as Array<{ _path: string }>, githubPosts);
  mergedPostsState.value = mergedPosts as Array<Record<string, unknown>>;

  return mergedPosts;
});
</script>

<template>
  <section class="space-y-6">
    <header>
      <h1 class="text-3xl font-bold text-white">Blog Posts</h1>
      <p class="mt-2 text-zinc-300">Posts are loaded from `content/blog/*.md` and GitHub Issues.</p>
    </header>

    <div class="grid gap-4">
      <article
        v-for="post in posts"
        :key="post._path"
        class="rounded-xl border border-zinc-700/60 bg-zinc-900/70 p-5"
      >
        <p class="text-xs text-zinc-400">{{ post.date }}</p>
        <h2 class="mt-1 text-xl font-semibold text-zinc-100">
          <NuxtLink :to="post._path" class="hover:text-amber-300">
            {{ post.title }}
          </NuxtLink>
        </h2>
        <p class="mt-3 text-sm text-zinc-300">
          {{ post.description }}
        </p>
        <div class="mt-4 flex flex-wrap gap-2" v-if="post.tags?.length">
          <span
            v-for="tag in post.tags"
            :key="tag"
            class="rounded-md border border-zinc-700 bg-zinc-800/80 px-2 py-1 text-xs text-amber-300"
          >
            #{{ tag }}
          </span>
        </div>
      </article>
    </div>
  </section>
</template>
