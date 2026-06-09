<script setup lang="ts">
import { sendMessage } from 'webext-bridge/popup'
import { selectScrapedPosts } from '~/features/profileDownload/application/selectScrapedPosts'
import type { DownloadPostSelection } from '~/features/profileDownload/application/selectScrapedPosts'
import { extensionMessage } from '~/features/profileDownload/contracts/messages'
import { validateInstagramProfileUrl } from '~/features/profileDownload/domain/profileDownload'
import type { ScrapedPost } from '~/features/profileDownload/domain/profileDownload'
import {
  createIdleProgress,
  isActiveScrapePhase,
} from '~/features/profileDownload/presentation/scrapeState'
import type { ScrapeDebugEntry, ScrapeProgress } from '~/features/profileDownload/presentation/scrapeState'

const progress = ref(createIdleProgress('Checking active tab.'))
const posts = ref<ScrapedPost[]>([])
const debugLog = ref<ScrapeDebugEntry[]>([])
const activeTabId = ref<number | null>(null)
const isBusy = ref(false)
const selectionMode = ref<'all' | 'range' | 'manual'>('all')
const rangeStart = ref('1')
const rangeEnd = ref('')
const manuallySelectedPostIds = ref<string[]>([])
let statusPollTimer: number | null = null

const hasActiveSession = computed(() => {
  return !!progress.value.sessionId && isActiveScrapePhase(progress.value.phase)
})

const hasFetchedPosts = computed(() => posts.value.length > 0)

const canShowSelectionPanel = computed(() => {
  return hasFetchedPosts.value && !hasActiveSession.value
})

const actionLabel = computed(() => {
  if (isBusy.value)
    return hasActiveSession.value ? 'Stopping fetch...' : 'Fetching posts...'

  if (hasActiveSession.value)
    return 'Stop fetch'

  return hasFetchedPosts.value ? 'Fetch fresh snapshot' : 'Fetch all posts'
})

const actionClass = computed(() => {
  return hasActiveSession.value
    ? 'btn-secondary'
    : 'btn-primary'
})

const hasProgressCounts = computed(() => {
  return progress.value.discoveredPostCount > 0 || progress.value.queuedFileCount > 0 || progress.value.downloadedFileCount > 0
})

const visibleDebugLog = computed(() => {
  return [...debugLog.value].reverse().slice(0, 12)
})

const manualSelectionSet = computed(() => new Set(manuallySelectedPostIds.value))

const rangeSelectionError = computed(() => {
  if (selectionMode.value !== 'range')
    return null

  const start = Number.parseInt(rangeStart.value, 10)
  const end = Number.parseInt(rangeEnd.value, 10)

  if (!Number.isInteger(start) || !Number.isInteger(end))
    return 'Enter whole numbers for the range.'

  if (start < 1 || end < 1)
    return 'Range starts at post 1.'

  if (start > end)
    return 'Range start cannot be greater than range end.'

  if (end > posts.value.length)
    return `This profile snapshot has ${posts.value.length} post${posts.value.length === 1 ? '' : 's'}.`

  return null
})

const activeSelection = computed<DownloadPostSelection>(() => {
  if (selectionMode.value === 'manual') {
    return {
      type: 'ids',
      postIds: [...manuallySelectedPostIds.value],
    }
  }

  if (selectionMode.value === 'range') {
    return {
      type: 'range',
      startIndex: Number.parseInt(rangeStart.value, 10),
      endIndex: Number.parseInt(rangeEnd.value, 10),
    }
  }

  return { type: 'all' }
})

const selectedPosts = computed(() => {
  if (selectionMode.value === 'range' && rangeSelectionError.value)
    return []

  return selectScrapedPosts(posts.value, activeSelection.value)
})

const selectedPostCount = computed(() => selectedPosts.value.length)

const selectedFileCount = computed(() => {
  return selectedPosts.value.reduce((count, post) => count + (post.caption.trim() ? 2 : 1), 0)
})

const selectionSummary = computed(() => {
  if (!hasFetchedPosts.value)
    return 'Fetch the profile first to choose posts.'

  if (selectionMode.value === 'range')
    return rangeSelectionError.value ?? `Posts ${rangeStart.value}-${rangeEnd.value} will be saved.`

  if (selectionMode.value === 'manual') {
    return selectedPostCount.value > 0
      ? `${selectedPostCount.value} manually selected post${selectedPostCount.value === 1 ? '' : 's'} ready to save.`
      : 'Pick at least one post from the grid.'
  }

  return `All ${selectedPostCount.value} fetched post${selectedPostCount.value === 1 ? '' : 's'} will be saved.`
})

const downloadSelectionLabel = computed(() => {
  if (selectionMode.value === 'all')
    return 'Download all'

  return `Download ${selectedPostCount.value} post${selectedPostCount.value === 1 ? '' : 's'}`
})

const canDownloadSelection = computed(() => {
  if (isBusy.value || hasActiveSession.value || !progress.value.sessionId || !hasFetchedPosts.value)
    return false

  if (selectionMode.value === 'range' && !!rangeSelectionError.value)
    return false

  return selectedPostCount.value > 0
})

watch(() => posts.value.map(post => post.id).join(','), () => {
  resetSelectionState(posts.value)
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
      posts.value = []
      debugLog.value = []
      return
    }

    const response = await sendMessage(
      extensionMessage.getScrapeStatus,
      { tabId: tab.id },
      { context: 'content-script', tabId: tab.id },
    )

    applyScrapeState(response.progress, response.debugLog, response.posts, validation.profileName)
  }
  catch (error) {
    progress.value = {
      ...createIdleProgress(),
      phase: 'failed',
      message: error instanceof Error ? error.message : 'Could not load the tab status.',
    }
    posts.value = []
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

    applyScrapeState(response.progress, response.debugLog, response.posts, progress.value.profileName)
  }
  catch {
  }
}

async function handleAction() {
  if (!activeTabId.value) {
    progress.value = createIdleProgress('Open a public Instagram profile first.')
    posts.value = []
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
    message: 'Fetching every post from the profile.',
  }

  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    const validation = validateInstagramProfileUrl(tab?.url)

    if (!tab?.id || tab.id !== tabId || !validation.valid) {
      progress.value = createIdleProgress(validation.valid ? 'Open a public Instagram profile first.' : validation.reason)
      posts.value = []
      debugLog.value = []
      return
    }

    const response = await sendMessage(
      extensionMessage.startProfileDownload,
      { profileUrl: validation.profileUrl },
      { context: 'content-script', tabId },
    )

    applyScrapeState(response.progress, response.debugLog, response.posts, validation.profileName)
  }
  catch (error) {
    progress.value = {
      ...createIdleProgress(),
      phase: 'failed',
      message: error instanceof Error ? error.message : 'Could not start the profile fetch.',
    }
    posts.value = []
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

    applyScrapeState(response.progress, response.debugLog, response.posts, currentProgress.profileName)
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

async function downloadSelectedPosts() {
  if (!activeTabId.value || !progress.value.sessionId || !canDownloadSelection.value)
    return

  isBusy.value = true
  const selection = toMessageSelection(activeSelection.value)

  try {
    const response = await sendMessage(
      extensionMessage.downloadSelectedPosts,
      {
        sessionId: progress.value.sessionId,
        selection,
      },
      { context: 'content-script', tabId: activeTabId.value },
    )

    applyScrapeState(response.progress, response.debugLog, response.posts, progress.value.profileName)
  }
  catch (error) {
    progress.value = {
      ...progress.value,
      phase: 'failed',
      message: error instanceof Error ? error.message : 'Could not save the selected posts.',
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
    message: profileName ? `Ready to fetch @${profileName}.` : 'Ready to start.',
  }
}

function applyScrapeState(currentProgress: ScrapeProgress, currentDebugLog: ScrapeDebugEntry[], currentPosts: ScrapedPost[], profileName: string | null) {
  progress.value = normalizeProgress(currentProgress, profileName)
  debugLog.value = currentDebugLog
  posts.value = currentPosts
}

function toMessageSelection(selection: DownloadPostSelection): DownloadPostSelection {
  switch (selection.type) {
    case 'all':
      return selection

    case 'range':
      return {
        type: 'range',
        startIndex: selection.startIndex,
        endIndex: selection.endIndex,
      }

    case 'ids':
      return {
        type: 'ids',
        postIds: [...selection.postIds],
      }
  }
}

function resetSelectionState(currentPosts: ScrapedPost[]) {
  selectionMode.value = 'all'
  rangeStart.value = currentPosts.length > 0 ? '1' : ''
  rangeEnd.value = currentPosts.length > 0 ? String(currentPosts.length) : ''
  manuallySelectedPostIds.value = []
}

function setSelectionMode(mode: 'all' | 'range' | 'manual') {
  selectionMode.value = mode

  if (mode === 'range' && posts.value.length > 0 && !rangeEnd.value) {
    rangeStart.value = '1'
    rangeEnd.value = String(posts.value.length)
  }

  if (mode === 'manual' && manuallySelectedPostIds.value.length === 0)
    manuallySelectedPostIds.value = posts.value.slice(0, Math.min(posts.value.length, 12)).map(post => post.id)
}

function toggleManualPost(postId: string) {
  manuallySelectedPostIds.value = manualSelectionSet.value.has(postId)
    ? manuallySelectedPostIds.value.filter(id => id !== postId)
    : [...manuallySelectedPostIds.value, postId]
}

function selectAllManualPosts() {
  manuallySelectedPostIds.value = posts.value.map(post => post.id)
}

function clearManualSelection() {
  manuallySelectedPostIds.value = []
}

function formatCaptionPreview(caption: string) {
  const normalized = caption.replace(/\s+/g, ' ').trim()

  if (!normalized)
    return 'No caption fetched.'

  return normalized.length > 88 ? `${normalized.slice(0, 85)}...` : normalized
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
  <main class="w-[392px] bg-[#edf0f4] p-3 text-left text-[#1f2937]">
    <section class="rounded-[22px] border border-black/6 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6b7280]">
            Instagram Downloader
          </p>
          <h1 class="mt-1 text-[22px] font-semibold leading-none text-[#111827]">
            InstaBulk
          </h1>
          <p class="mt-2 text-sm leading-5 text-[#6b7280]">
            Fetch every post once, then decide exactly what gets saved.
          </p>
        </div>

        <div class="rounded-full border border-black/6 bg-[#f6f7f9] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
          {{ progress.phase }}
        </div>
      </div>

      <div class="mt-4 rounded-[18px] border border-black/6 bg-[#f7f8fa] p-3">
        <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
          Status
        </p>
        <p class="mt-2 text-sm leading-5 text-[#111827]">
          {{ progress.message }}
        </p>
      </div>

      <div v-if="hasProgressCounts" class="mt-3 grid grid-cols-3 gap-2 text-center">
        <div class="rounded-[18px] border border-black/6 bg-[#f7f8fa] px-2 py-3">
          <p class="text-lg font-semibold text-[#111827]">
            {{ progress.discoveredPostCount }}
          </p>
          <p class="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#6b7280]">
            Found
          </p>
        </div>
        <div class="rounded-[18px] border border-black/6 bg-[#f7f8fa] px-2 py-3">
          <p class="text-lg font-semibold text-[#111827]">
            {{ progress.queuedFileCount }}
          </p>
          <p class="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#6b7280]">
            Queued
          </p>
        </div>
        <div class="rounded-[18px] border border-black/6 bg-[#f7f8fa] px-2 py-3">
          <p class="text-lg font-semibold text-[#111827]">
            {{ progress.downloadedFileCount }}
          </p>
          <p class="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#6b7280]">
            Saved
          </p>
        </div>
      </div>

      <button class="btn mt-4 w-full rounded-[16px] px-4 py-3 text-sm font-semibold transition-colors" :class="actionClass" :disabled="isBusy" @click="handleAction">
        {{ actionLabel }}
      </button>

      <section v-if="canShowSelectionPanel" class="mt-4 rounded-[20px] border border-black/6 bg-[#f7f8fa] p-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold text-[#111827]">
              Download Scope
            </h2>
            <p class="mt-1 text-xs leading-5 text-[#6b7280]">
              {{ selectionSummary }}
            </p>
          </div>

          <div class="rounded-[16px] border border-black/6 bg-white px-3 py-2 text-right text-[11px] text-[#6b7280] shadow-[0_1px_1px_rgba(15,23,42,0.04)]">
            <p class="font-semibold uppercase tracking-[0.14em] text-[#111827]">
              Selection
            </p>
            <p class="mt-1">
              {{ selectedPostCount }} posts
            </p>
            <p>
              {{ selectedFileCount }} files
            </p>
          </div>
        </div>

        <div class="mt-3 rounded-[16px] border border-black/6 bg-white p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
          <div class="grid grid-cols-3 gap-1">
            <button
              class="rounded-[12px] px-3 py-2 text-xs font-semibold text-[#4b5563] transition-colors"
              :class="selectionMode === 'all' ? 'bg-[#111827] text-white shadow-[0_1px_2px_rgba(15,23,42,0.18)]' : 'hover:bg-[#f3f4f6]'"
              @click="setSelectionMode('all')"
            >
              All
            </button>
            <button
              class="rounded-[12px] px-3 py-2 text-xs font-semibold text-[#4b5563] transition-colors"
              :class="selectionMode === 'range' ? 'bg-[#111827] text-white shadow-[0_1px_2px_rgba(15,23,42,0.18)]' : 'hover:bg-[#f3f4f6]'"
              @click="setSelectionMode('range')"
            >
              Range
            </button>
            <button
              class="rounded-[12px] px-3 py-2 text-xs font-semibold text-[#4b5563] transition-colors"
              :class="selectionMode === 'manual' ? 'bg-[#111827] text-white shadow-[0_1px_2px_rgba(15,23,42,0.18)]' : 'hover:bg-[#f3f4f6]'"
              @click="setSelectionMode('manual')"
            >
              Manual
            </button>
          </div>
        </div>

        <div v-if="selectionMode === 'range'" class="mt-3 rounded-[16px] border border-black/6 bg-white p-3">
          <div class="grid grid-cols-2 gap-3">
            <label class="text-xs text-[#6b7280]">
              <span class="mb-1 block font-semibold uppercase tracking-[0.12em]">Start</span>
              <input v-model="rangeStart" type="number" min="1" :max="posts.length" class="w-full rounded-[12px] border border-black/8 bg-[#f9fafb] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#9ca3af]">
            </label>
            <label class="text-xs text-[#6b7280]">
              <span class="mb-1 block font-semibold uppercase tracking-[0.12em]">End</span>
              <input v-model="rangeEnd" type="number" min="1" :max="posts.length" class="w-full rounded-[12px] border border-black/8 bg-[#f9fafb] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#9ca3af]">
            </label>
          </div>

          <p class="mt-2 text-xs" :class="rangeSelectionError ? 'text-[#b45309]' : 'text-[#6b7280]'">
            {{ rangeSelectionError ?? `Use profile order. Post 1 is the newest visible post in the fetched snapshot.` }}
          </p>
        </div>

        <div v-if="selectionMode === 'manual'" class="mt-3">
          <div class="mb-2 flex items-center justify-between gap-2">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">
              Pick Posts
            </p>

            <div class="flex gap-2">
              <button class="rounded-full border border-black/8 bg-white px-3 py-1 text-[11px] font-medium text-[#4b5563] hover:bg-[#f3f4f6]" @click="selectAllManualPosts">
                Select all
              </button>
              <button class="rounded-full border border-black/8 bg-white px-3 py-1 text-[11px] font-medium text-[#4b5563] hover:bg-[#f3f4f6]" @click="clearManualSelection">
                Clear
              </button>
            </div>
          </div>

          <div class="max-h-74 space-y-2 overflow-y-auto pr-1">
            <button
              v-for="(post, index) in posts"
              :key="post.id"
              class="w-full rounded-[16px] border p-2 text-left transition-colors"
              :class="manualSelectionSet.has(post.id) ? 'border-[#9ca3af] bg-[#eef2f7]' : 'border-black/6 bg-white hover:bg-[#f8fafc]'"
              @click="toggleManualPost(post.id)"
            >
              <div class="flex gap-3">
                <img :src="post.imageUrl" alt="" class="h-16 w-16 rounded-[12px] border border-black/5 object-cover">

                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-xs font-semibold uppercase tracking-[0.12em] text-[#111827]">
                      Post {{ index + 1 }}
                    </p>
                    <span class="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]" :class="manualSelectionSet.has(post.id) ? 'bg-[#111827] text-white' : 'bg-[#f3f4f6] text-[#6b7280]'">
                      {{ manualSelectionSet.has(post.id) ? 'Selected' : 'Idle' }}
                    </span>
                  </div>

                  <p class="mt-2 break-all text-[11px] text-[#6b7280]">
                    {{ post.id }}
                  </p>
                  <p class="mt-2 text-xs leading-5 text-[#4b5563]">
                    {{ formatCaptionPreview(post.caption) }}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div class="mt-4 flex gap-2">
          <button class="btn btn-secondary flex-1 rounded-[16px] px-4 py-3 text-sm font-semibold" :disabled="isBusy || hasActiveSession || !progress.sessionId || !hasFetchedPosts" @click="selectionMode = 'all'; downloadSelectedPosts()">
            Download all
          </button>
          <button class="btn btn-primary flex-1 rounded-[16px] px-4 py-3 text-sm font-semibold" :disabled="!canDownloadSelection" @click="downloadSelectedPosts">
            {{ downloadSelectionLabel }}
          </button>
        </div>
      </section>

      <section class="mt-4">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
            Session Log
          </h2>
          <p class="text-[11px] text-[#9ca3af]">
            {{ visibleDebugLog.length }} recent entries
          </p>
        </div>

        <div class="mt-2 max-h-58 overflow-y-auto rounded-[18px] border border-black/6 bg-[#fbfbfc] px-3 py-2 font-mono text-[11px] leading-4 text-[#374151]">
          <p v-if="visibleDebugLog.length === 0" class="py-2 text-[#9ca3af]">
            No session logs yet.
          </p>

          <div v-for="entry in visibleDebugLog" :key="entry.id" class="border-b border-black/5 py-2 last:border-b-0">
            <p>
              [{{ entry.level }}][{{ entry.scope }}] {{ entry.message }}
            </p>
            <p class="mt-1 text-[#9ca3af]">
              {{ new Date(entry.timestamp).toLocaleTimeString() }}
            </p>
            <p v-if="entry.details" class="mt-1 break-words text-[#6b7280]">
              {{ entry.details }}
            </p>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>
