import { expect, test } from './fixtures'

test('popup page', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/dist/popup/index.html`)
  await expect(page.locator('h1')).toHaveText('Profile Downloader')
  await expect(page.locator('button')).toHaveText('Start profile download')
})

test('sidepanel page', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/dist/sidepanel/index.html`)
  await expect(page.locator('h1')).toHaveText('Profile Downloader Panel')
})
