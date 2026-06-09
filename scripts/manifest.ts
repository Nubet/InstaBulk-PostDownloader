import process from 'node:process'
import fs from 'fs-extra'
import { getManifest } from '../src/manifest'
import { browserOutDir, log, r } from './utils'

export async function writeManifest() {
  await fs.ensureDir(r(browserOutDir))
  await fs.writeJSON(r(`${browserOutDir}/manifest.json`), await getManifest(), { spaces: 2 })
  log('PRE', 'write manifest.json')
}

writeManifest().catch((error) => {
  console.error(error)
  process.exit(1)
})
