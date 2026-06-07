<script setup lang="ts">
import { sendMessage } from 'webext-bridge/popup'
import { validateInstagramProfileUrl } from '~/application/validateInstagramProfileUrl'

const status = ref('Open a public Instagram profile and start the setup check.')
const isBusy = ref(false)

async function startProfileDownload() {
  isBusy.value = true
  status.value = 'Checking active tab...'

  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    const validation = validateInstagramProfileUrl(tab?.url)

    if (!tab?.id || !validation.valid) {
      status.value = validation.reason
      return
    }

    const response = await sendMessage(
      'start-profile-download',
      { profileUrl: validation.url },
      { context: 'content-script', tabId: tab.id },
    )

    status.value = response.message
  }
  catch (error) {
    status.value = error instanceof Error ? error.message : 'Could not start the content script.'
  }
  finally {
    isBusy.value = false
  }
}
</script>

<template>
  <main class="w-[320px] px-5 py-5 text-left text-slate-800">
    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">
      InstaBulk
    </p>
    <h1 class="mt-2 text-xl font-bold leading-tight">
      Profile Downloader
    </h1>
    <p class="mt-2 text-sm leading-5 text-slate-600">
      MV3 setup is ready. The real scraping and download use cases can now be implemented cleanly.
    </p>

    <button class="btn mt-4 w-full" :disabled="isBusy" @click="startProfileDownload">
      {{ isBusy ? 'Checking...' : 'Start profile download' }}
    </button>

    <p class="mt-3 rounded bg-slate-100 px-3 py-2 text-xs leading-5 text-slate-600">
      {{ status }}
    </p>
  </main>
</template>
