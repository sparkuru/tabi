import { randomUUID } from "node:crypto";
import {
  test as base,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

export const password = "E2e-Checklist-Password-42";
function accountEmail(role: "admin" | "user") {
  const scenario = test.info().file.split("/").pop()!.replace(".spec.ts", "");
  return `${role}-${test.info().project.name}-${scenario}@e2e.example.com`;
}

export const accounts = {
  get admin() {
    return accountEmail("admin");
  },
  get user() {
    return accountEmail("user");
  },
};

export const test = base.extend<{ diagnostics: void }>({
  diagnostics: [
    async ({ page }, use, testInfo) => {
      const messages: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") messages.push(message.text());
      });
      page.on("pageerror", (error) => messages.push(error.message));
      page.on("response", (response) => {
        if (response.status() >= 400)
          messages.push(
            `${response.status()} ${response.request().method()} ${response.url()}`,
          );
      });
      page.on("requestfailed", (request) => {
        messages.push(
          `${request.method()} ${request.url()} ${request.failure()?.errorText}`,
        );
      });
      await use();
      if (testInfo.status !== testInfo.expectedStatus) {
        await testInfo.attach("browser-errors", {
          body: messages.join("\n"),
          contentType: "text/plain",
        });
      }
    },
    { auto: true },
  ],
});

export { expect };

export function learningPackage() {
  const suffix = randomUUID().slice(0, 8);
  return {
    format: "tabi.checklist",
    version: 1,
    key: `e2e-learning-${suffix}`,
    list: { title: `学习清单 ${suffix}`, category: "学习", sort_order: -100 },
    items: [
      {
        key: "functions",
        name: `编写函数 ${suffix}`,
        description: "编写一个带参数和返回值的函数。",
      },
      { key: "tests", name: `编写测试 ${suffix}`, related_keys: ["functions"] },
    ],
  };
}

export async function apiLogin(
  request: APIRequestContext,
  role: "admin" | "user",
) {
  const response = await request.post("/api/auth/login", {
    data: { email: accounts[role], password },
  });
  expect(response.status()).toBe(200);
  const cookie = (await request.storageState()).cookies.find(
    (entry) => entry.name === "tabi_csrf",
  );
  expect(cookie).toBeTruthy();
  return { "X-CSRF-Token": cookie!.value };
}

export async function login(
  page: Page,
  role: "admin" | "user",
  redirect = "/",
) {
  await page.goto(`/auth?redirect=${encodeURIComponent(redirect)}`);
  await page.getByLabel("邮箱", { exact: true }).fill(accounts[role]);
  await page.getByLabel("密码", { exact: true }).fill(password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === redirect);
}

export async function createPublishedPackage(request: APIRequestContext) {
  const headers = await apiLogin(request, "admin");
  const document = learningPackage();
  const imported = await request.post("/api/admin/checklist-imports", {
    data: document,
    headers,
  });
  expect(imported.status()).toBe(201);
  const result = (await imported.json()) as {
    list_id: string;
    item_ids_by_key: Record<string, string>;
  };
  const published = await request.post(
    `/api/admin/lists/${result.list_id}/publish-all`,
    { headers },
  );
  expect(published.status()).toBe(200);
  return { document, result, headers };
}

export async function noOverflow(page: Page) {
  const configuredWidth = page.viewportSize()?.width;
  expect(configuredWidth).toBeDefined();
  const widths = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(widths.viewport).toBe(configuredWidth);
  expect(widths.content).toBeLessThanOrEqual(configuredWidth!);
}

export async function minimumTarget(page: Page, name: string) {
  const target = page.getByRole("button", { name, exact: true });
  await expect(target).toBeVisible();
  const box = await target.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
}

export async function reviewScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: test.info().outputPath(`${test.info().project.name}-${name}.png`),
    fullPage: true,
    animations: "disabled",
  });
}

export async function homeListLink(page: Page, title: string) {
  const target = page.getByRole("link").filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  });
  await expect(
    page.getByRole("status").filter({ hasText: "正在载入" }),
  ).toHaveCount(0);
  for (let pageIndex = 0; pageIndex < 20; pageIndex += 1) {
    if (await target.count()) return target;
    const more = page.getByRole("button", {
      name: "加载更多清单",
      exact: true,
    });
    if (!(await more.count())) break;
    const loaded = page.waitForResponse((response) =>
      response.url().includes("/api/lists?"),
    );
    await more.click();
    await loaded;
    await expect(
      page.getByRole("button", { name: "正在加载…", exact: true }),
    ).toHaveCount(0);
  }
  await expect(target).toBeVisible();
  return target;
}

export const syntheticPhoto = {
  name: "e2e-pixel.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0XcAAAAASUVORK5CYII=",
    "base64",
  ),
};
