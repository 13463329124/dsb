<script setup lang="ts">
import { fetchGithubIssuePosts } from "~/utils/github-issues";

type AnyPost = Record<string, unknown> & { _path?: string; slug?: string; source?: string; body?: string };

const route = useRoute();
const slug = computed(() => String(route.params.slug || ""));
const mergedPostsState = useState<AnyPost[]>("merged-posts", () => []);

const { data: post } = await useAsyncData(
  `post-${slug.value}`,
  async () => {
    const fullPath = `/blog/${slug.value}`;

    // Local markdown detail must always load full content AST from @nuxt/content.
    const localPost = await queryContent(fullPath).findOne();
    if (localPost) {
      return {
        ...localPost,
        source: "content" as const,
      };
    }

    // Cache is only safe for GitHub posts, because local list data is summary-only.
    const cachedGithubPost = mergedPostsState.value.find(
      (item) => (item?._path === fullPath || item?.slug === slug.value) && item?.source === "github"
    );
    if (cachedGithubPost) {
      return cachedGithubPost;
    }

    const githubPosts = await fetchGithubIssuePosts();
    const githubPost = githubPosts.find((item) => item.slug === slug.value) ?? null;
    if (githubPost) {
      mergedPostsState.value = [...mergedPostsState.value, githubPost as unknown as AnyPost];
    }

    return githubPost;
  }
);

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: "Post not found" });
}

const isGithubPost = computed(() => post.value?.source === "github");
</script>

<template>
  <article class="mx-auto max-w-3xl rounded-2xl border border-zinc-700/60 bg-zinc-900/70 p-6 md:p-10">
    <header class="mb-8 border-b border-zinc-700/60 pb-6">
      <p class="text-xs uppercase tracking-[0.15em] text-amber-300">
        {{ post?.date }}
      </p>
      <h1 class="mt-3 text-3xl font-bold text-white md:text-4xl">
        {{ post?.title }}
      </h1>
      <p class="mt-3 text-zinc-300">{{ post?.description }}</p>
    </header>

    <div v-if="post" class="space-y-4 leading-7 text-zinc-200">
      <MDC v-if="isGithubPost" :value="String(post.body || '')" tag="article" />
      <ContentRenderer v-else :value="post" />
    </div>
  </article>
</template>
