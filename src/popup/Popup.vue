<script setup lang="ts">
import { sendMessage } from 'webext-bridge/popup'
import { createIdleProgress } from '~/application/createIdleProgress'
import { validateInstagramProfileUrl } from '~/application/validateInstagramProfileUrl'
import { extensionMessage } from '~/shared/messages'

const progress = ref(createIdleProgress('Open a public Instagram profile first.'))
const isBusy = ref(false)

async function startProfileDownload() {
  isBusy.value = true
  progress.value = {
    ...progress.value,
    phase: 'validating-tab',
    message: 'Checking active tab.',
  }

  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    const validation = validateInstagramProfileUrl(tab?.url)

    if (!tab?.id || !validation.valid) {
      progress.value = createIdleProgress(validation.reason)
      return
    }

    const response = await sendMessage(
      extensionMessage.startProfileDownload,
      { profileUrl: validation.profileUrl },
      { context: 'content-script', tabId: tab.id },
    )

    progress.value = response.progress
  }
  catch (error) {
    progress.value = {
      ...createIdleProgress(),
      phase: 'failed',
      message: error instanceof Error ? error.message : 'Could not start the content script.',
    }
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
      {{ isBusy ? 'Checking...' : 'Start download' }}
    </button>

    <p class="mt-3 rounded bg-slate-100 px-3 py-2 text-xs leading-5 text-slate-600">
      {{ progress.message }}
    </p>
  </main>
</template>
