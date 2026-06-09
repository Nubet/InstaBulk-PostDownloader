import { Buffer } from 'node:buffer'
import { execFileSync, execSync } from 'node:child_process'
import { join } from 'node:path'
import process from 'node:process'
import { tmpdir } from 'node:os'
import fs from 'fs-extra'
import type PkgType from '../package.json'
import { log, r } from './utils'

const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9a-z.-]+)?(?:\+[0-9a-z.-]+)?$/i
const artifactsDir = r('release')

interface ReleaseContext {
  artifactBaseName: string
  tagName: string
  version: string
}

function run(command: string, args: string[]) {
  const commandLine = [command, ...args]
    .map(arg => arg.includes(' ') ? JSON.stringify(arg) : arg)
    .join(' ')

  execSync(commandLine, {
    cwd: r(),
    shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
    stdio: 'inherit',
  })
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition)
    throw new Error(message)
}

async function getReleaseContext(): Promise<ReleaseContext> {
  const pkg = await fs.readJSON(r('package.json')) as typeof PkgType
  return {
    artifactBaseName: `${pkg.name}-${pkg.version}`,
    tagName: `v${pkg.version}`,
    version: pkg.version,
  }
}

function validateVersion({ tagName, version }: ReleaseContext) {
  assert(semverPattern.test(version), `package.json version must be valid semver. Received: ${version}`)

  const githubTag = process.env.GITHUB_REF_NAME
  if (githubTag)
    assert(githubTag === tagName, `GitHub tag ${githubTag} must match package.json version ${version} (${tagName}).`)
}

async function moveArtifact(sourceName: string, targetName: string) {
  const sourcePath = r(sourceName)
  const targetPath = r('release', targetName)

  assert(await fs.pathExists(sourcePath), `Expected artifact was not created: ${sourceName}`)
  await fs.move(sourcePath, targetPath, { overwrite: true })
  log('REL', `created release/${targetName}`)
}

function normalizePem(rawKey: string) {
  return rawKey.includes('BEGIN')
    ? rawKey
    : Buffer.from(rawKey, 'base64').toString('utf8')
}

async function withChromeKey<T>(callback: (keyPath: string) => Promise<T>) {
  const rawKey = process.env.CHROME_EXTENSION_KEY?.trim()
  if (!rawKey)
    return null

  const tempDir = await fs.mkdtemp(join(tmpdir(), 'instabulk-release-'))
  const keyPath = join(tempDir, 'key.pem')

  await fs.writeFile(keyPath, normalizePem(rawKey), 'utf8')

  try {
    return await callback(keyPath)
  }
  finally {
    await fs.remove(tempDir)
  }
}

async function createArtifacts() {
  const context = await getReleaseContext()
  validateVersion(context)

  await fs.emptyDir(artifactsDir)
  await Promise.all([
    fs.remove(r('extension.zip')),
    fs.remove(r('extension.xpi')),
    fs.remove(r('extension.crx')),
  ])

  run('pnpm', ['build:all'])

  run('pnpm', ['pack:zip:run'])
  await moveArtifact('extension.zip', `${context.artifactBaseName}-chromium.zip`)

  run('pnpm', ['pack:xpi:run'])
  await moveArtifact('extension.xpi', `${context.artifactBaseName}-firefox.xpi`)

  const crxName = `${context.artifactBaseName}-chromium.crx`
  const crxCreated = await withChromeKey(async (keyPath) => {
    run('pnpm', ['exec', 'crx', 'pack', 'extension-chromium', '-o', join('release', crxName), '-p', keyPath])
    log('REL', `created release/${crxName}`)
  })

  if (crxCreated === null)
    log('REL', 'skipped CRX artifact because CHROME_EXTENSION_KEY is not set')
}

function gitTagExists(tagName: string) {
  const output = execFileSync('git', ['tag', '-l', tagName], {
    cwd: r(),
    encoding: 'utf8',
  }).trim()

  return output === tagName
}

async function createTag() {
  const context = await getReleaseContext()
  validateVersion(context)
  assert(!gitTagExists(context.tagName), `Git tag ${context.tagName} already exists.`)

  run('git', ['tag', '-a', context.tagName, '-m', `release: ${context.tagName}`])
  log('REL', `created annotated tag ${context.tagName}`)
}

async function readStdin() {
  if (process.stdin.isTTY)
    return ''

  return await new Promise<string>((resolve, reject) => {
    let input = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => input += chunk)
    process.stdin.on('end', () => resolve(input))
    process.stdin.on('error', reject)
  })
}

async function runPrePushHook() {
  const input = await readStdin()
  if (!input.trim())
    return

  const tags = input
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const [localRef] = line.trim().split(/\s+/)
      return localRef
    })
    .filter(ref => ref?.startsWith('refs/tags/v'))
    .map(ref => ref.replace('refs/tags/', ''))

  if (tags.length === 0)
    return

  const context = await getReleaseContext()
  validateVersion(context)

  for (const tag of tags)
    assert(tag === context.tagName, `Pushed release tag ${tag} must match package.json version ${context.version} (${context.tagName}).`)

  log('REL', `validated release tag ${context.tagName}`)
}

const command = process.argv[2]

const commands: Record<string, () => Promise<void>> = {
  artifacts: createArtifacts,
  hook: runPrePushHook,
  tag: createTag,
  verify: async () => validateVersion(await getReleaseContext()),
}

assert(command && command in commands, `Unknown release command: ${command || '<empty>'}`)

commands[command]().catch((error) => {
  console.error(error)
  process.exit(1)
})
