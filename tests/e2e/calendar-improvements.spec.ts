import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  test.skip(!await page.getByText('演示模式', { exact: true }).isVisible(), '需要演示模式')
})

async function openMenu(page: Page) {
  await page.getByRole('button', { name: '更多操作' }).click()
}

async function zoomWithMenu(page: Page, direction: '放大' | '缩小', times = 1) {
  await openMenu(page)
  for (let index = 0; index < times; index++) {
    await page.getByRole('button', { name: `${direction}时间轴` }).click()
  }
  await page.keyboard.press('Escape')
}

async function zoomValue(page: Page): Promise<number> {
  return Number(await page.locator('.chronos-calendar-surface').getAttribute('data-calendar-zoom'))
}

async function openSettings(page: Page) {
  await openMenu(page)
  await page.getByRole('menuitem', { name: '设置' }).click()
}

test('时间轴与事件同步缩放，支持边界、重置、视图切换和持久化', async ({ page }) => {
  await page.getByRole('button', { name: '新建日程', exact: true }).click()
  await page.locator('#ev-title').fill('缩放验证')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  const card = page.locator('.chronos-event-card').filter({ hasText: '缩放验证' })
  await expect(card).toBeAttached()
  const original = (await card.boundingBox())!.height
  const hour = page.locator('[data-time="09:00:00"]').last()
  const height = () => hour.evaluate((element) => element.getBoundingClientRect().height)
  await expect.poll(height).toBe(64)
  await zoomWithMenu(page, '放大')
  await expect.poll(height).toBe(80)
  await expect.poll(async () => (await card.boundingBox())!.height).toBeGreaterThan(original)
  await page.reload()
  await expect.poll(() => zoomValue(page)).toBe(125)
  await expect.poll(height).toBe(80)
  await zoomWithMenu(page, '放大', 3)
  await expect.poll(height).toBe(128)
  await openMenu(page)
  await expect(page.getByRole('button', { name: '放大时间轴' })).toBeDisabled()
  for (let index = 0; index < 6; index++) await page.getByRole('button', { name: '缩小时间轴' }).click()
  await expect.poll(height).toBe(32)
  await expect(page.getByRole('button', { name: '缩小时间轴' })).toBeDisabled()
  await page.getByRole('button', { name: '重置时间轴缩放' }).click()
  await expect.poll(height).toBe(64)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '月', exact: true }).click()
  await expect.poll(() => zoomValue(page)).toBe(100)
  await page.getByRole('button', { name: '日', exact: true }).click()
  await expect.poll(height).toBe(64)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('空账号没有默认类型，可在新建日程时创建类型并应用到日程', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('chronos.demo.v1', JSON.stringify({ categories: [], events: [] })))
  await page.reload()
  await page.getByRole('button', { name: '新建日程', exact: true }).click()
  const typeGroup = page.getByRole('group', { name: '任务类型' })
  await expect(typeGroup.getByRole('button')).toHaveText(['未分类', '＋ 新建类型'])
  await page.locator('#ev-title').fill('工作类型验证')
  await page.getByRole('checkbox', { name: '全天事件' }).check()
  await typeGroup.getByRole('button', { name: '新建类型', exact: false }).click()
  await page.getByLabel('新任务类型名称').fill('工作')
  await page.getByRole('button', { name: '类型颜色 靛蓝' }).click()
  await page.getByRole('button', { name: '添加', exact: true }).click()
  await expect(typeGroup.getByRole('button', { name: '工作', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '保存', exact: true }).click()

  const card = page.locator('.chronos-event-card').filter({ hasText: '工作类型验证' })
  await expect(card).toHaveCSS('border-left-color', 'rgb(79, 70, 229)')

  await openSettings(page)
  await page.getByRole('dialog').getByText('修改主题色', { exact: true }).click()
  await page.getByRole('button', { name: '工作 的颜色：玫瑰', exact: true }).click()
  await expect(page.getByRole('button', { name: '工作 的颜色：玫瑰', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await expect(card).toHaveCSS('border-left-color', 'rgb(219, 39, 119)')
  await page.reload()
  await expect(card).toHaveCSS('border-left-color', 'rgb(219, 39, 119)')
  await card.click()
  await page.getByRole('button', { name: '编辑', exact: true }).click()
  await expect(page.getByRole('group', { name: '任务类型' }).getByRole('button', { name: '工作', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('自定义类型支持主题色和自由选色，设置中不再提供基础类型', async ({ page }) => {
  await openSettings(page)
  await expect(page.getByRole('group', { name: '添加基础任务类型', exact: true })).toHaveCount(0)
  await page.getByRole('textbox', { name: '新分类名称', exact: true }).fill('阅读')
  await page.getByRole('button', { name: '新分类颜色：天青', exact: true }).click()
  await expect(page.getByLabel('新分类颜色：自定义颜色', { exact: true })).toHaveValue('#0891b2')
  await page.getByLabel('新分类颜色：自定义颜色', { exact: true }).fill('#123abc')
  await page.getByRole('button', { name: '添加', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '阅读 的名称', exact: true })).toBeVisible()
  const reading = page.getByRole('listitem').filter({ has: page.getByRole('textbox', { name: '阅读 的名称', exact: true }) })
  await reading.getByText('修改主题色', { exact: true }).click()
  await expect(page.getByLabel('阅读 的颜色：自定义颜色', { exact: true })).toHaveValue('#123abc')
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await page.getByRole('button', { name: '新建日程', exact: true }).click()
  await expect(page.getByRole('group', { name: '任务类型' }).getByRole('button', { name: '阅读', exact: true })).toHaveCount(1)
})
