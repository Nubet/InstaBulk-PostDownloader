<template>
  <main class="min-h-screen px-5 py-6 text-left text-slate-800">
    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">
      InstaBulk
    </p>
    <h1 class="mt-2 text-2xl font-bold leading-tight">
      Profile Downloader Panel
    </h1>
    <p class="mt-3 text-sm leading-6 text-slate-600">
      This panel is reserved for long-running profile download progress, queue state, anti-ban pauses, and per-post errors.
    </p>

    <div class="mt-5 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      Clean Architecture boundary: this view should only send user intents and render state. Scraping and downloads belong outside UI components.
    </div>
  </main>
</template>
