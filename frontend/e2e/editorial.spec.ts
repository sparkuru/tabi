import { test, expect, noOverflow, reviewScreenshot } from "./helpers";

test("discovery stays usable across responsive widths and reduced motion", async ({
  page,
}) => {
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width === 768 ? 540 : 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "世界很大，先从身边出发。",
    );
    await page.getByRole("link", { name: "发现清单", exact: true }).click();
    await expect(page).toHaveURL(/#lists$/);
    await expect(
      page.getByRole("region", { name: "公开清单" }),
    ).toBeInViewport();
    await noOverflow(page);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const motion = await page
    .locator(".hero-copy")
    .evaluate((element) => getComputedStyle(element).animationName);
  expect(motion).toBe("none");
  const collection = page.locator(".collection-link").first();
  await expect(collection).toBeVisible();
  const card = collection.locator(".collection-card");
  const artwork = collection.locator(".journey-art, img").first();
  const artworkTransform = await artwork.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  await collection.hover();
  await expect(card).toHaveCSS("transform", "none");
  await expect(card).toHaveCSS("transition-duration", "0s");
  await expect(artwork).toHaveCSS("transform", artworkTransform);
  await expect(artwork).toHaveCSS("transition-duration", "0s");
  await reviewScreenshot(page, "editorial-home");
});

test("auth tabs support keyboard focus and enlarged text without overflow", async ({
  page,
}) => {
  await page.goto("/auth");
  const login = page.getByRole("tab", { name: "登录", exact: true });
  const register = page.getByRole("tab", { name: "注册", exact: true });
  await login.focus();
  await page.keyboard.press("ArrowRight");
  await expect(register).toBeFocused();
  await expect(register).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("昵称", { exact: true })).toBeVisible();
  const registerPassword = page.getByLabel("密码", { exact: true });
  await expect(registerPassword).toBeVisible();
  await expect(registerPassword).toHaveAccessibleDescription(
    "至少 12 个字符。",
  );
  await page.keyboard.press("Home");
  await expect(login).toBeFocused();
  await expect(login).toHaveAttribute("aria-selected", "true");
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  await noOverflow(page);
  await page.getByLabel("邮箱", { exact: true }).fill("keyboard@example.com");
  await expect(page.getByLabel("邮箱", { exact: true })).toHaveValue(
    "keyboard@example.com",
  );
  await reviewScreenshot(page, "editorial-auth-large-text");
});

test("long catalog titles and keyboard skip link preserve readable navigation", async ({
  page,
}) => {
  await page.route("**/api/lists?*", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    if (data.items.length) {
      data.items[0].title = "周末探索：沿着街巷寻找属于自己的日常记忆".repeat(
        4,
      );
      data.items[0].summary = "保留完整标题，摘要保持易读。".repeat(12);
    }
    await route.fulfill({ response, json: data });
  });
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "跳到内容", exact: true });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
  await expect(page.getByRole("main")).toBeFocused();
  await expect(page.getByRole("heading", { name: /^周末探索/ })).toBeVisible();
  await noOverflow(page);
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  await noOverflow(page);
});

test("logout shows pending and failure feedback, then allows a real retry", async ({
  page,
}) => {
  const loggedIn = await page.request.post("/api/auth/login", {
    data: {
      email: "user@e2e.example.com",
      password: "E2e-Checklist-Password-42",
    },
  });
  expect(loggedIn.status()).toBe(200);
  await page.goto("/");
  const profile = page.getByRole("link", { name: "个人资料", exact: true });
  await expect(profile).toBeVisible();
  expect((await profile.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  let release: () => void = () => {};
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/auth/logout", async (route) => {
    await hold;
    await route.abort("failed");
  });
  const logout = page.getByRole("button", { name: "退出登录", exact: true });
  await logout.click();
  await expect(logout).toBeDisabled();
  release();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(logout).toBeEnabled();
  await page.unroute("**/api/auth/logout");
  await logout.click();
  await expect(
    page.getByRole("link", { name: "登录", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("list search filters real items and retains clear empty feedback", async ({
  page,
  request,
}) => {
  const lists = await (await request.get("/api/lists?limit=1")).json();
  const list = lists.items[0];
  expect(list).toBeTruthy();
  const items = await (await request.get(`/api/lists/${list.id}/items`)).json();
  const item = items.items[0];
  expect(item).toBeTruthy();
  await page.goto(`/lists/${list.id}`);
  const listReturn = page.getByRole("link", {
    name: "← 返回清单",
    exact: true,
  });
  await expect(listReturn).toBeVisible();
  expect((await listReturn.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  const search = page.getByRole("textbox", { name: "搜索条目", exact: true });
  await search.fill(item.name);
  await expect(
    page.getByRole("heading", { name: item.name, exact: true }),
  ).toBeVisible();
  await search.fill("no-matching-item-editorial-2026");
  await expect(
    page.getByRole("heading", { name: "没有找到匹配的条目", exact: true }),
  ).toBeVisible();
  await search.clear();
  await expect(
    page.getByRole("heading", { name: item.name, exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  await reviewScreenshot(page, "editorial-list-search");
  await page
    .getByRole("link")
    .filter({
      has: page.getByRole("heading", { name: item.name, exact: true }),
    })
    .click();
  await expect(page).toHaveURL(`/items/${item.id}`);
  const itemReturn = page.getByRole("link", {
    name: "← 返回清单",
    exact: true,
  });
  await expect(itemReturn).toBeVisible();
  expect((await itemReturn.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await itemReturn.click();
  await expect(page).toHaveURL(`/lists/${list.id}`);
});
