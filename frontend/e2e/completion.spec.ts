import { randomUUID } from "node:crypto";
import {
  accounts,
  apiLogin,
  createPublishedPackage,
  expect,
  login,
  minimumTarget,
  noOverflow,
  password,
  reviewScreenshot,
  syntheticPhoto,
  test,
} from "./helpers";

test("complete, edit, photos, repeat, share and revoke preserve progress and privacy", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(60_000);
  const { document, result } = await createPublishedPackage(request);
  const itemId = result.item_ids_by_key.functions;
  await login(page, "user", `/items/${itemId}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    document.items[0].name,
  );
  await expect(
    page.getByRole("heading", { name: "地点", exact: true }),
  ).toHaveCount(0);
  await minimumTarget(page, "标记完成");
  await noOverflow(page);
  await reviewScreenshot(page, "no-location-item");

  let release: () => void = () => {};
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  let completionRequests = 0;
  await page.route(`**/api/items/${itemId}/complete`, async (route) => {
    completionRequests += 1;
    await hold;
    await route.continue();
  });
  const completeResponse = page.waitForResponse((response) =>
    response.url().endsWith(`/api/items/${itemId}/complete`),
  );
  await page.getByRole("button", { name: "标记完成", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "正在完成…", exact: true }),
  ).toBeDisabled();
  release();
  const completed = await completeResponse;
  expect(completed.status()).toBe(200);
  const record = (await completed.json()) as {
    id: string;
    share_id: string;
    visibility: string;
    note: string | null;
    media: unknown[];
  };
  expect(record.visibility).toBe("private");
  expect(record.note).toBeNull();
  expect(record.media).toEqual([]);
  await expect(
    page.getByRole("status").filter({ hasText: "已完成" }),
  ).toBeVisible();
  expect(completionRequests).toBe(1);
  await page.unroute(`**/api/items/${itemId}/complete`);

  const userHeaders = await apiLogin(page.request, "user");
  const retry = await page.request.post(`/api/items/${itemId}/complete`, {
    headers: { ...userHeaders, "Idempotency-Key": randomUUID() },
  });
  expect(retry.status()).toBe(200);
  expect((await retry.json()).id).toBe(record.id);
  const progress = await page.request.get(`/api/lists/${result.list_id}`);
  expect((await progress.json()).completed_count).toBe(1);

  await page.goto(`/checkins/${record.id}`);
  await expect(page.getByText("已完成", { exact: true })).toBeVisible();
  await reviewScreenshot(page, "completion-record");
  await page
    .getByRole("combobox", { name: "可见性", exact: true })
    .selectOption("public");
  await page.getByRole("button", { name: "保存修改", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "查看公开分享页" }),
  ).toBeVisible();
  const visitor = await browser.newContext({
    ...test.info().project.use,
    storageState: { cookies: [], origins: [] },
  });
  const publicPage = await visitor.newPage();
  await publicPage.goto(
    `${new URL(page.url()).origin}/shares/${record.share_id}`,
  );
  await expect(publicPage.getByText("已完成", { exact: true })).toBeVisible();
  await noOverflow(publicPage);
  const publicData = await visitor.request.get(
    `${new URL(page.url()).origin}/api/shares/${record.share_id}`,
  );
  const publicJSON = await publicData.json();
  expect(publicJSON).not.toHaveProperty("latitude");
  expect(publicJSON).not.toHaveProperty("email");
  expect(JSON.stringify(publicJSON)).not.toContain(accounts.user);

  await page
    .getByRole("combobox", { name: "可见性", exact: true })
    .selectOption("private");
  await page.getByRole("button", { name: "保存修改", exact: true }).click();
  await expect(page.getByRole("link", { name: "查看公开分享页" })).toHaveCount(
    0,
  );
  await publicPage.reload();
  await expect(
    publicPage.getByRole("heading", { name: "这条分享暂时不可见" }),
  ).toBeVisible();

  await page.getByLabel("心得", { exact: true }).fill("函数练习已完成。");
  await page.getByRole("button", { name: "保存修改", exact: true }).click();
  await expect(
    page.getByText("函数练习已完成。", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("添加照片（最多 8 张）").setInputFiles(syntheticPhoto);
  await page.getByRole("button", { name: "添加这张照片", exact: true }).click();
  await expect(page.getByRole("img", { name: "记录照片" })).toBeVisible();
  await noOverflow(page);

  await page
    .getByRole("combobox", { name: "可见性", exact: true })
    .selectOption("public");
  await page.getByRole("button", { name: "保存修改", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "查看公开分享页" }),
  ).toBeVisible();
  await publicPage.reload();
  await expect(
    publicPage.getByText("函数练习已完成。", { exact: true }),
  ).toBeVisible();
  await expect(publicPage.getByRole("img", { name: "记录照片" })).toBeVisible();
  const ownData = await page.request.get(`/api/checkins/${record.id}`);
  const photo = (await ownData.json()).media[0];
  expect(
    (
      await visitor.request.get(
        `${new URL(page.url()).origin}${photo.original_url}`,
      )
    ).status(),
  ).toBe(404);

  await page.getByRole("button", { name: "移除照片 1", exact: true }).click();
  await expect(page.getByRole("img", { name: "记录照片" })).toHaveCount(0);
  await page.getByLabel("心得", { exact: true }).fill("");
  await page.getByRole("button", { name: "保存修改", exact: true }).click();
  await expect(page.getByText("已完成", { exact: true })).toBeVisible();
  await publicPage.reload();
  await expect(publicPage.getByText("已完成", { exact: true })).toBeVisible();

  await page.goto(`/items/${itemId}/checkin`);
  await expect(
    page.getByRole("radio", { name: "仅自己（默认）" }),
  ).toBeChecked();
  await noOverflow(page);

  await page.getByRole("button", { name: "保存记录", exact: true }).click();
  await expect(page).toHaveURL(/\/checkins\/[a-f0-9-]+$/);
  const secondId = page.url().split("/").pop();
  expect(secondId).not.toBe(record.id);
  expect(
    (await (await page.request.get(`/api/lists/${result.list_id}`)).json())
      .completed_count,
  ).toBe(1);
  await page.goto("/history");
  await expect(
    page.getByRole("link").filter({ hasText: document.items[0].name }),
  ).toHaveCount(2);
  await noOverflow(page);
  await reviewScreenshot(page, "completion-history");

  page.on("dialog", (dialog) => dialog.accept());
  for (const id of [secondId, record.id]) {
    await page.goto(`/checkins/${id}`);
    await page.getByRole("button", { name: "删除记录", exact: true }).click();
    await expect(page).toHaveURL(/\/history$/);
  }
  expect(
    (await (await page.request.get(`/api/lists/${result.list_id}`)).json())
      .completed_count,
  ).toBe(0);
  await page.goto(`/items/${itemId}`);
  await expect(
    page.getByRole("button", { name: "标记完成", exact: true }),
  ).toBeVisible();
  const restoredResponse = page.waitForResponse((response) =>
    response.url().endsWith(`/api/items/${itemId}/complete`),
  );
  await page.getByRole("button", { name: "标记完成", exact: true }).click();
  const restored = await restoredResponse;
  expect(restored.status()).toBe(200);
  const restoredRecord = await restored.json();
  expect(restoredRecord.id).not.toBe(record.id);
  expect(
    (await (await page.request.get(`/api/lists/${result.list_id}`)).json())
      .completed_count,
  ).toBe(1);
  expect(
    (
      await page.request.delete(`/api/checkins/${restoredRecord.id}`, {
        headers: userHeaders,
      })
    ).status(),
  ).toBe(204);
  await publicPage.reload();
  await expect(
    publicPage.getByRole("heading", { name: "这条分享暂时不可见" }),
  ).toBeVisible();
  await visitor.close();
});

test("guest completion resumes once after login and can complete again after deletion on the same page", async ({
  page,
  request,
}) => {
  await page.clock.install();
  const { result } = await createPublishedPackage(request);
  const itemId = result.item_ids_by_key.functions;
  await page.goto(`/items/${itemId}`);
  await page.getByRole("button", { name: "标记完成", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/auth");
  expect(new URL(page.url()).searchParams.get("redirect")).toContain(
    "complete=1",
  );
  await page.getByLabel("邮箱", { exact: true }).fill(accounts.user);
  await page.getByLabel("密码", { exact: true }).fill(password);
  const firstResponse = page.waitForResponse((response) =>
    response.url().endsWith(`/api/items/${itemId}/complete`),
  );
  await page.getByRole("button", { name: "登录", exact: true }).click();
  const first = await firstResponse;
  expect(first.status()).toBe(200);
  const record = await first.json();
  await expect(
    page.getByRole("status").filter({ hasText: "已完成" }),
  ).toBeVisible();
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === `/items/${itemId}` &&
      url.searchParams.get("complete") !== "1",
  );
  const headers = await apiLogin(page.request, "user");
  expect(
    (
      await page.request.delete(`/api/checkins/${record.id}`, { headers })
    ).status(),
  ).toBe(204);
  // The application has a 30-second freshness window; advance it before foreground refetch.
  await page.clock.fastForward(30_001);
  // Simulate leaving and returning to this tab; the real query refetches on visibility change.
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));
  });
  await expect(
    page.getByRole("button", { name: "标记完成", exact: true }),
  ).toBeVisible();
  const secondResponse = page.waitForResponse((response) =>
    response.url().endsWith(`/api/items/${itemId}/complete`),
  );
  await page.getByRole("button", { name: "标记完成", exact: true }).click();
  const second = await secondResponse;
  expect(second.status()).toBe(200);
  const replacement = await second.json();
  expect(replacement.id).not.toBe(record.id);
  expect(
    (await (await page.request.get(`/api/lists/${result.list_id}`)).json())
      .completed_count,
  ).toBe(1);
  expect(
    (
      await page.request.delete(`/api/checkins/${replacement.id}`, { headers })
    ).status(),
  ).toBe(204);
});
