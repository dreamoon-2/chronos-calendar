import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  test.skip(!await page.getByText('演示模式', { exact: true }).isVisible(), '需要演示模式')
})

async function createEvent(page: Page, title: string, end = '11:00', notes = '') {
  await page.getByRole('button', { name: '新建日程', exact: true }).click()
  await page.locator('#ev-title').fill(title)
  await page.locator('#ev-st').fill('10:00')
  await page.locator('#ev-et').fill(end)
  if (notes) {
    await page.getByRole('button', { name: /更多选项/ }).click()
    await page.locator('#ev-desc').fill(notes)
  }
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  return page.locator('.chronos-event-card').filter({ hasText: title })
}

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

// 以小时记录当前手势中心对应的时间，检查缩放是否保持时间锚点。
async function anchorAt(page: Page, y?: number) {
  return page.locator('[data-time="09:00:00"]').last().evaluate((slot, y) => {
    let scroller = slot as HTMLElement | null
    while (scroller && !(/auto|scroll/.test(getComputedStyle(scroller).overflowY) && scroller.scrollHeight > scroller.clientHeight)) scroller = scroller.parentElement
    if (!scroller) throw new Error('时间轴没有滚动容器')
    const box = scroller.getBoundingClientRect()
    const pointerY = y ?? box.top + scroller.clientHeight / 2
    return { hour: (scroller.scrollTop + pointerY - box.top) / slot.getBoundingClientRect().height, y: pointerY, x: box.left + box.width / 2, top: scroller.scrollTop }
  }, y)
}

test('删除后撤销恢复完整日程，编辑后快捷键撤销', async ({ page }) => {
  await page.getByRole('button', { name: '日', exact: true }).click()
  const card = await createEvent(page, '撤销体验验证', '11:00', '删除前保留的备注')
  await card.click()
  await page.getByRole('button', { name: '编辑', exact: true }).click()
  await page.getByRole('button', { name: '删除', exact: true }).click()
  await page.getByRole('button', { name: '确认删除？', exact: true }).click()
  await expect(card).toHaveCount(0)
  await page.getByRole('button', { name: '撤销上一步', exact: true }).click()
  await expect(card).toBeVisible()
  await card.click()
  await page.getByRole('button', { name: '编辑', exact: true }).click()
  await expect(page.locator('#ev-desc')).toHaveValue('删除前保留的备注')
  await page.locator('#ev-title').fill('修改后的标题')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.locator('.chronos-event-card').filter({ hasText: '修改后的标题' })).toBeVisible()
  await page.keyboard.press('Control+z')
  await expect(card).toBeVisible()
  await expect(page.locator('.chronos-event-card').filter({ hasText: '修改后的标题' })).toHaveCount(0)
})

test('周日视图显示日期与小字，月视图行高随缩放改变', async ({ page }) => {
  await expect(page.locator('.chronos-date-number')).toHaveCount(7)
  await expect(page.locator('.chronos-weekday').first()).toContainText(/[一二三四五六日]/)
  await expect(page.locator('.chronos-date-lunar').first()).not.toHaveText('')
  await page.getByRole('button', { name: '月', exact: true }).click()
  const cell = page.locator('.chronos-month-cell').first()
  const initial = (await cell.boundingBox())!.height
  await zoomWithMenu(page, '放大', 2)
  await expect.poll(async () => (await cell.boundingBox())!.height).toBeGreaterThan(initial)
  await page.getByRole('button', { name: '日', exact: true }).click()
  await expect(page.locator('.chronos-date-number')).toHaveCount(1)
  await expect(page.locator('.chronos-date-number')).toHaveText(/\d+/)
})

test('卡片标题最多两行，短日程优先标题，悬停信息完整', async ({ page }) => {
  const title = '需要在两行展示的长标题：阅读相关论文并记录实验结果和需要讨论的问题'
  const card = await createEvent(page, title, '11:00', '完整备注验证')
  await expect(card.locator('.chronos-event-title')).toHaveCSS('-webkit-line-clamp', '2')
  await expect(card).toHaveAttribute('title', /10:00.*11:00/)
  await expect(card).toHaveAttribute('title', /未分类\n完整备注验证/)
  const short = await createEvent(page, '短日程标题优先', '10:15')
  await expect(short.locator('.chronos-event-time')).toBeHidden()
  await expect(short.locator('.chronos-event-title')).toBeVisible()
})

test('Ctrl 滚轮和菜单按钮缩放保持正在看的时间位置', async ({ page, isMobile }) => {
  test.skip(isMobile, '桌面滚轮交互')
  const initial = await anchorAt(page)
  await page.mouse.move(initial.x, initial.y)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, -120)
  await page.keyboard.up('Control')
  await expect.poll(() => zoomValue(page)).toBe(125)
  await expect.poll(async () => Math.abs((await anchorAt(page, initial.y)).hour - initial.hour)).toBeLessThan(0.05)
  const beforeButton = await anchorAt(page)
  await zoomWithMenu(page, '放大')
  await expect.poll(() => zoomValue(page)).toBe(150)
  await expect.poll(async () => Math.abs((await anchorAt(page)).top / 96 - beforeButton.top / 80)).toBeLessThan(0.05)
})

test('移动端双指缩放保持手势中心时间且不会误开编辑器', async ({ page, isMobile }) => {
  test.skip(!isMobile, '触屏交互')
  const initial = await anchorAt(page)
  const session = await page.context().newCDPSession(page)
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: initial.x - 40, y: initial.y - 30 }, { x: initial.x + 40, y: initial.y + 30 }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: initial.x - 60, y: initial.y - 45 }, { x: initial.x + 60, y: initial.y + 45 }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(() => zoomValue(page)).toBe(150)
  await expect.poll(async () => Math.abs((await anchorAt(page, initial.y)).hour - initial.hour)).toBeLessThan(0.05)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('拖动与调整时长支持撤销', async ({ page, isMobile }) => {
  test.skip(isMobile, '桌面鼠标拖拽；移动端另有长按逻辑')
  await page.getByRole('button', { name: '日', exact: true }).click()
  const card = await createEvent(page, '拖拽撤销验证')
  const getTimes = () => page.evaluate(() => {
    const events = JSON.parse(localStorage.getItem('chronos.demo.v1')!).events as {title: string; start_at: string; end_at: string}[]
    return events.find(event => event.title === '拖拽撤销验证')!
  })
  const before = await getTimes()
  let box = (await card.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + 12)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + 76, { steps: 12 })
  await page.mouse.up()
  await expect(page.getByRole('button', { name: '撤销上一步' })).toBeVisible()
  await expect.poll(async () => (await getTimes()).start_at).not.toBe(before.start_at)
  await page.getByRole('button', { name: '撤销上一步' }).click()
  await expect.poll(async () => (await getTimes()).start_at).toBe(before.start_at)
  box = (await card.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height + 62, { steps: 12 })
  await page.mouse.up()
  await expect.poll(async () => (await getTimes()).end_at).not.toBe(before.end_at)
  await page.keyboard.press('Control+z')
  await expect.poll(async () => (await getTimes()).end_at).toBe(before.end_at)
})
