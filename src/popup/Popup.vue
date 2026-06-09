<script setup lang="ts">
import { sendMessage } from 'webext-bridge/popup'
import { validateInstagramProfileUrl } from '~/features/profileDownload/domain/profileDownload'
import {
  createIdleProgress,
  isActiveScrapePhase,
} from '~/features/profileDownload/presentation/scrapeState'
import type { ScrapeDebugEntry, ScrapeProgress } from '~/features/profileDownload/presentation/scrapeState'
import { extensionMessage } from '~/features/profileDownload/contracts/messages'

const progress = ref(createIdleProgress('Checking active tab.'))
const debugLog = ref<ScrapeDebugEntry[]>([])
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

const hasProgressCounts = computed(() => {
  return progress.value.discoveredPostCount > 0 || progress.value.queuedFileCount > 0 || progress.value.downloadedFileCount > 0
})

const visibleDebugLog = computed(() => {
  return [...debugLog.value].reverse().slice(0, 12)
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
      debugLog.value = []
      return
    }

    const response = await sendMessage(
      extensionMessage.getScrapeStatus,
      { tabId: tab.id },
      { context: 'content-script', tabId: tab.id },
    )

    applyScrapeState(response.progress, response.debugLog, validation.profileName)
  }
  catch (error) {
    progress.value = {
      ...createIdleProgress(),
      phase: 'failed',
      message: error instanceof Error ? error.message : 'Could not load the tab status.',
    }
    debugLog.value = []
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

    applyScrapeState(response.progress, response.debugLog, progress.value.profileName)
  }
  catch {
  }
}

async function handleAction() {
  if (!activeTabId.value) {
    progress.value = createIdleProgress('Open a public Instagram profile first.')
    debugLog.value = []
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
      debugLog.value = []
      return
    }

    const response = await sendMessage(
      extensionMessage.startProfileDownload,
      { profileUrl: validation.profileUrl },
      { context: 'content-script', tabId },
    )

    applyScrapeState(response.progress, response.debugLog, validation.profileName)
  }
  catch (error) {
    progress.value = {
      ...createIdleProgress(),
      phase: 'failed',
      message: error instanceof Error ? error.message : 'Could not start the download session.',
    }
    debugLog.value = []
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

    applyScrapeState(response.progress, response.debugLog, currentProgress.profileName)
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

function applyScrapeState(currentProgress: ScrapeProgress, currentDebugLog: ScrapeDebugEntry[], profileName: string | null) {
  progress.value = normalizeProgress(currentProgress, profileName)
  debugLog.value = currentDebugLog
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

    <div v-if="hasProgressCounts" class="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-slate-600">
      <div class="rounded bg-slate-100 px-2 py-2">
        <p class="font-semibold text-slate-900">
          {{ progress.discoveredPostCount }}
        </p>
        <p>posts</p>
      </div>
      <div class="rounded bg-slate-100 px-2 py-2">
        <p class="font-semibold text-slate-900">
          {{ progress.queuedFileCount }}
        </p>
        <p>queued</p>
      </div>
      <div class="rounded bg-slate-100 px-2 py-2">
        <p class="font-semibold text-slate-900">
          {{ progress.downloadedFileCount }}
        </p>
        <p>saved</p>
      </div>
    </div>

    <section class="mt-4">
      <h2 class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        System log
      </h2>

      <div class="mt-2 max-h-56 overflow-y-auto rounded bg-slate-950 px-3 py-2 font-mono text-[11px] leading-4 text-slate-200">
        <p v-if="visibleDebugLog.length === 0" class="text-slate-400">
          No session logs yet.
        </p>

        <div v-for="entry in visibleDebugLog" :key="entry.id" class="border-b border-slate-800 py-2 last:border-b-0">
          <p>
            [{{ entry.level }}][{{ entry.scope }}] {{ entry.message }}
          </p>
          <p class="text-slate-400">
            {{ new Date(entry.timestamp).toLocaleTimeString() }}
          </p>
          <p v-if="entry.details" class="mt-1 break-words text-slate-400">
            {{ entry.details }}
          </p>
        </div>
      </div>
    </section>

    <button class="btn mt-4 w-full" :class="actionClass" :disabled="isBusy" @click="handleAction">
      {{ actionLabel }}
    </button>
  </main>
</template>
