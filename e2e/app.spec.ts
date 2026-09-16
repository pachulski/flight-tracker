import { expect, test } from '@playwright/test'

test('renders the app shell', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Flight Tracker')
  await expect(page.getByTestId('app-title')).toHaveText('Flight Tracker')
})

test('renders the map without console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text())
    }
  })
  page.on('pageerror', (error) => {
    errors.push(error.message)
  })

  await page.goto('/')

  const mapContainer = page.getByTestId('map-container')
  await expect(mapContainer).toBeVisible()
  await expect(mapContainer).toHaveAttribute('data-loaded', 'true')
  expect(errors).toEqual([])
})
