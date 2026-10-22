import { expect, test, type Page } from '@playwright/test'

async function tapAt(page: Page, x: number, y: number) {
  if (test.info().project.name === 'mobile-chrome') await page.touchscreen.tap(x, y)
  else await page.mouse.click(x, y)
}

/** 拖动选区上下粗线；桌面用鼠标，手机用 CDP 触摸事件。 */
async function dragHandle(page: Page, name: string, deltaY: number) {
  const handle = page.getByRole('button', { name, exact: true })
  const box = (await handle.boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  if (test.info().project.name !== 'mobile-chrome') {
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x, y + deltaY, { steps: 10 })
    await page.mouse.up()
    return
  }
  const cdp = await page.context().newCDPSession(page)
  const touch = { x, y, radiusX: 4, radiusY: 4, force: 1, id: 1 }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] })
  for (let step = 1; step <= 10; step++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ ...touch, y: y + (deltaY * step) / 10 }],
    })
    await page.waitForTimeout(20)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

async function recordSlideAnimations(page: Page) {
  await page.evaluate(() => {
    const w = window as Window & { __chronosSlideAnimations?: { transform: string[] }[] }
    w.__chronosSlideAnimations = []
    const original = Element.prototype.animate
    Element.prototype.animate = function (
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
      options?: number | KeyframeAnimationOptions,
    ) {
      if (Array.isArray(keyframes)) {
        w.__chronosSlideAnimations!.push({
          transform: keyframes.map((frame) => String((frame as Keyframe).transform ?? '')),
        })
      }
      return original.call(this, keyframes, options)
    }
  })
}

async function lastSlide(page: Page): Promise<{ transform: string[] }> {
  return page.evaluate(() => {
    const w = window as Window & { __chronosSlideAnimations?: { transform: string[] }[] }
    return w.__chronosSlideAnimations!.at(-1)!
  })
}

/** 计算某天某小时时间格的中心点，用于模拟拖放。 */
async function hourTarget(page: Page, date: string, hour: string) {
  return page.evaluate(
    ({ date, hour }) => {
      const lanes = [...document.querySelectorAll(`[data-time="${hour}:00:00"]`)]
        .map((element) => element.getBoundingClientRect())
        .sort((a, b) => b.width - a.width)
      const lane = lanes[0]
      const columns = [...document.querySelectorAll('[data-date][role="gridcell"]')]
        .filter((element) => element.getAttribute('data-date') === date)
        .map((element) => element.getBoundingClientRect())
        .filter((rect) => rect.height > 200)
      const column = columns[0]
      if (!lane || !column) throw new Error('没有找到时间格')
      return { x: column.x + column.width / 2, y: lane.y + lane.height / 2 }
    },
    { date, hour },
  )
}

function todayString(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' })
}

/** 桌面端：新增待办并拖到指定整点，返回事件卡片。 */
async function createTaskEvent(page: Page, title: string, hour = '09') {
  const input = page.getByLabel('新待办')
  await input.fill(title)
  await input.press('Enter')
  const task = page.locator('.chronos-task-item--active').filter({ hasText: title })
  await expect(task).toBeVisible()
  const target = await hourTarget(page, todayString(), hour)
  const box = (await task.boundingBox())!
  await page.mouse.move(box.x + 30, box.y + 14)
  await page.mouse.down()
  await page.mouse.move(box.x + 35, box.y + 30, { steps: 6 })
  await page.mouse.move(target.x, target.y, { steps: 15 })
  await page.mouse.up()
  const card = page.locator('.chronos-event-card').filter({ hasText: title }).filter({ visible: true }).first()
  await expect(card).toBeVisible()
  return card
}

/** 待办日程可能已被拖动选中，第一次点击就会打开编辑器；必要时再点一次。 */
async function openTaskEventEditor(page: Page, title: string) {
  const card = page.locator('.chronos-event-card').filter({ hasText: title }).filter({ visible: true }).first()
  await card.click()
  await page.waitForTimeout(150)
  if (await page.getByRole('dialog').count() === 0) await card.click()
  await expect(page.getByRole('dialog', { name: '编辑日程' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'chronos.demo.v1',
      JSON.stringify({ categories: [], events: [], tasks: [] }),
    )
  })
  await page.goto('/')
  test.skip(!(await page.getByText('演示模式', { exact: true }).isVisible()), '需要演示模式')
})

test('首次点击选中整点一小时，选区明显且可直接新建', async ({ page }) => {
  await page.getByRole('button', { name: '日', exact: true }).click()
  const slot = page.locator('[data-time="10:00:00"]').last()
  const box = (await slot.boundingBox())!
  await tapAt(page, box.x + Math.min(80, box.width / 2), box.y + 42)
  await expect(page.getByText(/已选中 \d+\/\d+ 10:00–11:00/)).toBeVisible()

  const highlight = page.locator('.chronos-selection-box')
  await expect(highlight).toHaveCount(1)
  await expect.poll(async () => (await highlight.boundingBox())?.height ?? 0).toBeGreaterThan(50)

  await page.locator('.chronos-selection-hint').getByRole('button', { name: '新建日程', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '新建日程' })).toBeVisible()
  await expect(page.locator('#ev-st')).toHaveValue('10:00')
  await expect(page.locator('#ev-et')).toHaveValue('11:00')
})

test('选区上下粗线可拖动调整开始与结束时间', async ({ page }) => {
  await page.getByRole('button', { name: '日', exact: true }).click()
  const slot = page.locator('[data-time="10:00:00"]').last()
  const box = (await slot.boundingBox())!
  await tapAt(page, box.x + Math.min(80, box.width / 2), box.y + 10)

  await expect(page.getByRole('button', { name: '拖动调整开始时间', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '拖动调整结束时间', exact: true })).toBeVisible()

  await dragHandle(page, '拖动调整结束时间', 64)
  await expect(page.getByText(/已选中 \d+\/\d+ 10:00–12:00/)).toBeVisible()

  await dragHandle(page, '拖动调整开始时间', 32)
  await expect(page.getByText(/已选中 \d+\/\d+ 10:30–12:00/)).toBeVisible()

  await page.locator('.chronos-selection-hint').getByRole('button', { name: '新建日程', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '新建日程' })).toBeVisible()
  await expect(page.locator('#ev-st')).toHaveValue('10:30')
  await expect(page.locator('#ev-et')).toHaveValue('12:00')
})

test('时间输入使用数字文本框，不弹出原生时钟', async ({ page }) => {
  await page.getByRole('button', { name: /添加日程|新建日程/ }).first().click()
  const start = page.locator('#ev-st')
  await expect(start).toHaveAttribute('type', 'text')
  await expect(start).toHaveAttribute('inputmode', 'numeric')
  await start.fill('0930')
  await page.locator('#ev-et').click()
  await expect(start).toHaveValue('09:30')
})

test('视图切换使用左右滑动而非淡入淡出', async ({ page }) => {
  await recordSlideAnimations(page)
  await page.getByRole('button', { name: '月', exact: true }).click()
  await expect.poll(async () => (await lastSlide(page).catch(() => null))?.transform.length).toBeGreaterThan(0)
  expect((await lastSlide(page)).transform.join(' ')).toContain('translateX(-42px)')

  await page.getByRole('button', { name: '日', exact: true }).click()
  await expect.poll(async () => (await lastSlide(page)).transform.join(' ')).toContain('translateX(42px)')
})

test('待办日程连续拖动后可编辑，并可移回待办', async ({ page, isMobile }) => {
  test.skip(isMobile, '桌面鼠标拖动')
  await page.getByRole('button', { name: '日', exact: true }).click()
  const card = await createTaskEvent(page, '连续排期', '09')

  // 第一次点击只选中，第二次进入编辑。
  await card.click()
  await expect(page.locator('.chronos-event-selected')).toHaveCount(1)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await card.click()
  await expect(page.getByRole('dialog', { name: '编辑日程' })).toBeVisible()
  await page.getByRole('button', { name: '关闭', exact: true }).click()

  // 连续拖动三次，版本应持续递增且不出现冲突提示。
  for (let index = 0; index < 3; index++) {
    const box = (await card.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + 12)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, box.y + 75, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(400)
  }
  await expect(page.getByText('该日程已在其他设备更新，请重新加载')).toHaveCount(0)
  const version = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('chronos.demo.v1')!) as {
      events: { title: string; version: number }[]
    }
    return state.events.find((event) => event.title === '连续排期')?.version
  })
  expect(version).toBeGreaterThan(1)

  // 编辑器中提供「移回待办清单」。
  await page.waitForTimeout(1200)
  const current = await card.boundingBox()
  if (!current) throw new Error('拖动后没有找到日程卡片')
  await page.mouse.click(current.x + current.width / 2, current.y + 12)
  await page.waitForTimeout(150)
  await page.mouse.click(current.x + current.width / 2, current.y + 12)
  await expect(page.getByRole('dialog', { name: '编辑日程' })).toBeVisible()
  await page.getByRole('button', { name: '移回待办清单' }).click()
  await expect(card).toHaveCount(0)
  await expect(page.locator('.chronos-undo-bar')).toHaveCount(0)
  await expect(page.locator('[role="status"]')).toHaveCount(1)
  await expect(page.locator('.chronos-task-item--active').filter({ hasText: '连续排期' })).toBeVisible()
  const done = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('chronos.demo.v1')!) as {
      tasks: { title: string; done: boolean }[]
    }
    return state.tasks.find((task) => task.title === '连续排期')?.done
  })
  expect(done).toBe(false)
})

test('编辑保存后立即拖动仍可再次编辑，不会误报冲突', async ({ page, isMobile }) => {
  test.skip(isMobile, '桌面鼠标拖动')
  await page.getByRole('button', { name: '日', exact: true }).click()
  await createTaskEvent(page, '编辑拖动', '09')

  await openTaskEventEditor(page, '编辑拖动')
  await page.locator('#ev-title').fill('编辑拖动改')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // 保存成功后不等后台刷新，立刻拖动。
  const card = page.locator('.chronos-event-card').filter({ hasText: '编辑拖动改' }).filter({ visible: true }).first()
  const box = (await card.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + 12)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + 75, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(300)

  await openTaskEventEditor(page, '编辑拖动改')
  await page.locator('#ev-title').fill('编辑拖动改2')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('该日程已在其他设备更新，请重新加载')).toHaveCount(0)

  const stored = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('chronos.demo.v1')!) as {
      events: { title: string; version: number }[]
    }
    return state.events.find((event) => event.title === '编辑拖动改2')
  })
  expect(stored?.version).toBeGreaterThanOrEqual(4)
})

test('待办日程可直接拖回待办清单', async ({ page, isMobile }) => {
  test.skip(isMobile, '桌面侧栏拖回；手机用编辑器的「移回待办清单」')
  await page.getByRole('button', { name: '日', exact: true }).click()
  const card = await createTaskEvent(page, '拖回清单', '10')
  const zone = (await page.locator('[data-task-dropzone]').first().boundingBox())!
  const box = (await card.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + 12)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 - 60, box.y + 35, { steps: 6 })
  await page.mouse.move(zone.x + zone.width / 2, zone.y + 80, { steps: 18 })
  await page.mouse.up()
  await expect(card).toHaveCount(0)
  await expect(page.locator('.chronos-task-item--active').filter({ hasText: '拖回清单' })).toBeVisible()
})

test('桌面端把待办拖进时间表，自动创建日程并完成待办', async ({ page, isMobile }) => {
  test.skip(isMobile, '桌面侧栏拖拽；移动端由抽屉用例覆盖')

  await page.getByLabel('新待办').fill('拖拽待办')
  await page.getByLabel('新待办').press('Enter')
  const task = page.locator('.chronos-task-item--active').filter({ hasText: '拖拽待办' })
  await expect(task).toBeVisible()

  const target = await hourTarget(page, todayString(), '10')
  const box = (await task.boundingBox())!
  await page.mouse.move(box.x + 30, box.y + 14)
  await page.mouse.down()
  await page.mouse.move(box.x + 35, box.y + 30, { steps: 6 })
  await page.mouse.move(target.x, target.y, { steps: 15 })
  await page.mouse.up()

  await expect(page.locator('.chronos-event-card').filter({ hasText: '拖拽待办' })).toBeVisible()
  await expect(task).toHaveCount(0)
  const stored = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('chronos.demo.v1')!) as {
      events: { title: string; start_at: string }[]
      tasks: { title: string; done: boolean }[]
    }
    return {
      event: state.events.find((event) => event.title === '拖拽待办'),
      task: state.tasks.find((item) => item.title === '拖拽待办'),
    }
  })
  expect(new Date(stored.event!.start_at).getHours()).toBe(10)
  expect(stored.task?.done).toBe(true)
})

test('移动端待办抽屉支持长按拖入时间表', async ({ page, isMobile }) => {
  test.skip(!isMobile, '触屏拖拽用例')

  await page.getByRole('button', { name: '打开待办清单' }).click()
  await expect(page.locator('.chronos-task-sheet')).toBeVisible()
  const input = page.locator('.chronos-task-sheet').getByLabel('新待办')
  await input.fill('手机拖拽待办')
  await input.press('Enter')

  const task = page
    .locator('.chronos-task-sheet .chronos-task-item--active')
    .filter({ hasText: '手机拖拽待办' })
  await expect(task).toBeVisible()
  const box = (await task.boundingBox())!
  const target = await hourTarget(page, todayString(), '09')

  const cdp = await page.context().newCDPSession(page)
  const start = { x: box.x + 40, y: box.y + 15, radiusX: 4, radiusY: 4, force: 1, id: 1 }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
  await page.waitForTimeout(420)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ ...start, x: start.x + 3, y: start.y - 12 }],
  })
  for (let step = 1; step <= 10; step++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{
        ...start,
        x: start.x + ((target.x - start.x) * step) / 10,
        y: start.y + ((target.y - start.y) * step) / 10,
      }],
    })
    await page.waitForTimeout(35)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })

  await expect(page.locator('.chronos-task-sheet')).toHaveCount(0)
  await expect(page.locator('.chronos-event-card').filter({ hasText: '手机拖拽待办' })).toBeVisible()
  const startHour = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('chronos.demo.v1')!) as {
      events: { title: string; start_at: string }[]
    }
    const event = state.events.find((item) => item.title === '手机拖拽待办')
    return event ? new Date(event.start_at).getHours() : null
  })
  expect(startHour).toBe(9)

  // 手机端同样是第一次点击选中、第二次进入编辑，并可从编辑器移回待办。
  const card = page.locator('.chronos-event-card').filter({ hasText: '手机拖拽待办' })
  await card.click()
  await expect(page.locator('.chronos-event-selected')).toHaveCount(1)
  await card.click()
  await expect(page.getByRole('dialog', { name: '编辑日程' })).toBeVisible()
  await page.getByRole('button', { name: '移回待办清单' }).click()
  await expect(card).toHaveCount(0)
  await expect(page.locator('.chronos-task-item--active').filter({ hasText: '手机拖拽待办' })).toHaveCount(1)
})
