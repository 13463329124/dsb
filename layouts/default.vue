<template>
  <div class="min-h-screen bg-zinc-900 text-zinc-100">
    <header class="border-b border-zinc-700/60 bg-zinc-900/85 backdrop-blur">
      <nav class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <NuxtLink to="/" class="text-lg font-semibold tracking-wide text-amber-300">
          Blog
        </NuxtLink>
        <div class="flex items-center gap-4 text-sm text-zinc-300">
          <NuxtLink to="/" class="hover:text-amber-300">主页</NuxtLink>
          <NuxtLink to="/blog" class="hover:text-amber-300">博客文章</NuxtLink>
        </div>
      </nav>
    </header>

    <main class="mx-auto max-w-5xl px-6 py-8">
      <slot />
    </main>
  </div>
</template>
