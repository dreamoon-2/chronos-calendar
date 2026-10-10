import { expect, test } from '@playwright/test'

// E2E 需要先启动开发服务器：npm run dev
// 默认地址 http://localhost:1420；其他端口可设置 E2E_BASE_URL。
//
// 两种运行环境：
// - 未配置 Supabase 凭证 → 演示模式，跑「演示模式」用例组；
// - 已配置凭证 → 登录页，跑基础加载用例；设置 E2E_EMAIL / E2E_PASSWORD 后
//   还会跑「真实登录 + 创建日程」用例。
//
//   PowerShell:  $env:E2E_EMAIL="you@example.com"; $env:E2E_PASSWORD="xxxxxx"; npm run test:e2e

const E2E_EMAIL = process.env.E2E_EMAIL
const E2E_PASSWORD = process.env.E2E_PASSWORD

test('应用可加载（登录页或日历，取决于是否配置凭证）', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Chronos').first()).toBeVisible()
  await expect(
    page.getByText(/演示模式|登录后跨端同步|添加日程/).first(),
  ).toBeVisible()
})

test.describe('演示模式（无凭证时）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    const demoVisible = await page
      .getByText('演示模式')
      .first()
      .isVisible()
      .catch(() => false)
    test.skip(!demoVisible, '已配置 Supabase 凭证，跳过演示模式用例')
  })

  test('打开新建日程表单并可保存一条日程', async ({ page }) => {
    const openButton = page.getByRole('button', { name: /添加日程|新建日程/ }).first()
    await openButton.click()
    await expect(page.getByText('新建日程').first()).toBeVisible()

    await page.locator('#ev-title').fill('E2E 测试日程')
    await page.getByRole('button', { name: '保存', exact: true }).click()

    // 保存成功后表单关闭，日程已写入后端并出现在日历 DOM 中。
    await expect(page.getByText('新建日程').first()).toBeHidden()
    await expect(page.getByText('E2E 测试日程').first()).toBeAttached()
  })
})

test.describe('真实 Supabase（需 E2E_EMAIL / E2E_PASSWORD）', () => {
  test('邮箱 + 密码登录并创建日程', async ({ page }) => {
    test.skip(
      !E2E_EMAIL || !E2E_PASSWORD,
      '未设置 E2E_EMAIL / E2E_PASSWORD，跳过真实登录用例',
    )

    await page.goto('/')
    await page.locator('#email').fill(E2E_EMAIL as string)
    await page.locator('#password').fill(E2E_PASSWORD as string)
    await page.getByRole('button', { name: '登录', exact: true }).click()

    // 登录成功进入日历：出现视图切换与「添加日程」，且不再显示登录表单。
    await expect(page.getByRole('button', { name: /添加日程|新建日程/ }).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('#email')).toHaveCount(0)

    // 创建一条日程，验证真实 CRUD 与 RLS 通路。
    const title = `E2E ${Date.now()}`
    await page.getByRole('button', { name: /添加日程|新建日程/ }).first().click()
    await page.locator('#ev-title').fill(title)
    await page.getByRole('button', { name: '保存', exact: true }).click()
    await expect(page.getByText('新建日程').first()).toBeHidden()
    await expect(page.getByText(title).first()).toBeAttached({ timeout: 15_000 })
  })
})
