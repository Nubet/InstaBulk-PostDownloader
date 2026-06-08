<script setup lang="ts">
import { sendMessage } from 'webext-bridge/popup'
import { createIdleProgress } from '~/application/createIdleProgress'
import { isActiveScrapePhase } from '~/application/isActiveScrapePhase'
import { validateInstagramProfileUrl } from '~/application/validateInstagramProfileUrl'
import type { ScrapeProgress } from '~/domain/download'
import { extensionMessage } from '~/shared/messages'

const progress = ref(createIdleProgress('Checking active tab.'))
const activeTabId = ref<number | null>(null)
const isBusy = ref(false)
let statusPollTimer: number | null = null

const hasActiveSession = computed(() => {
  return !!progress.value.sessionId && isActiveScrapePhase(progress.value.phase)
})

const actionLabel = computed(() => {
  if (isBusy.value)
    return hasActiveSession.value ? 'Stopping...' : 'Starting...'

  return hasActiveSession.value ? 'Stop download' : 'Start download'
})

const actionClass = computed(() => {
  return hasActiveSession.value
    ? 'bg-slate-800 hover:bg-slate-900'
    : 'bg-pink-600 hover:bg-pink-700'
})

async function refreshPopupState() {
  if (!hasActiveSession.value)
    isBusy.value = true

  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    activeTabId.value = tab?.id ?? null

    const validation = validateInstagramProfileUrl(tab?.url)

    if (!tab?.id || !validation.valid) {
      progress.value = createIdleProgress(validation.reason)
      return
    }

    const response = await sendMessage(
      extensionMessage.getScrapeStatus,
      { tabId: tab.id },
      { context: 'content-script', tabId: tab.id },
    )

    progress.value = normalizeProgress(response.progress, validation.profileName)
  }
  catch (error) {
    progress.value = {
      ...createIdleProgress(),
      phase: 'failed',
      message: error instanceof Error ? error.message : 'Could not load the tab status.',
    }
  }
  finally {
    isBusy.value = false
  }
}

async function pollActiveSession() {
  if (!activeTabId.value || !hasActiveSession.value)
    return

  try {
    const response = await sendMessage(
      extensionMessage.getScrapeStatus,
      { tabId: activeTabId.value },
      { context: 'content-script', tabId: activeTabId.value },
    )

    progress.value = normalizeProgress(response.progress, progress.value.profileName)
  }
  catch {
  }
}

async function handleAction() {
  if (!activeTabId.value) {
    progress.value = createIdleProgress('Open a public Instagram profile first.')
    return
  }

  if (hasActiveSession.value) {
    await stopProfileDownload(activeTabId.value, progress.value)
    return
  }

  await startProfileDownload(activeTabId.value)
}

async function startProfileDownload(tabId: number) {
  isBusy.value = true
  progress.value = {
    ...progress.value,
    phase: 'validating-tab',
    message: 'Starting download.',
  }

  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    const validation = validateInstagramProfileUrl(tab?.url)

    if (!tab?.id || tab.id !== tabId || !validation.valid) {
      progress.value = createIdleProgress(validation.valid ? 'Open a public Instagram profile first.' : validation.reason)
      return
    }

    const response = await sendMessage(
      extensionMessage.startProfileDownload,
      { profileUrl: validation.profileUrl },
      { context: 'content-script', tabId },
    )

    progress.value = normalizeProgress(response.progress, validation.profileName)
  }
  catch (error) {
    progress.value = {
      ...createIdleProgress(),
      phase: 'failed',
      message: error instanceof Error ? error.message : 'Could not start the download session.',
    }
  }
  finally {
    isBusy.value = false
  }
}

async function stopProfileDownload(tabId: number, currentProgress: ScrapeProgress) {
  if (!currentProgress.sessionId)
    return

  isBusy.value = true

  try {
    const response = await sendMessage(
      extensionMessage.stopProfileDownload,
      { sessionId: currentProgress.sessionId },
      { context: 'content-script', tabId },
    )

    progress.value = normalizeProgress(response.progress, currentProgress.profileName)
  }
  catch (error) {
    progress.value = {
      ...currentProgress,
      phase: 'failed',
      message: error instanceof Error ? error.message : 'Could not stop the content script.',
    }
  }
  finally {
    isBusy.value = false
  }
}

function normalizeProgress(currentProgress: ScrapeProgress, profileName: string | null): ScrapeProgress {
  if (currentProgress.phase !== 'idle')
    return currentProgress

  return {
    ...currentProgress,
    profileName,
    message: profileName ? `Ready to download @${profileName}.` : 'Ready to start.',
  }
}

onMounted(async () => {
  await refreshPopupState()

  statusPollTimer = window.setInterval(() => {
    void pollActiveSession()
  }, 2000)
})

onBeforeUnmount(() => {
  if (statusPollTimer !== null)
    window.clearInterval(statusPollTimer)
})
</script>

<template>
  <main class="w-[320px] px-5 py-5 text-left text-slate-900">
    <h1 class="text-lg font-semibold leading-tight">
      InstaBulk Profile Downloader
    </h1>

    <p class="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
      {{ progress.phase }}
    </p>

    <p class="mt-2 rounded bg-slate-100 px-3 py-2 text-sm leading-5 text-slate-700">
      {{ progress.message }}
    </p>

    <button class="btn mt-4 w-full" :class="actionClass" :disabled="isBusy" @click="handleAction">
      {{ actionLabel }}
    </button>
  </main>
</template>
