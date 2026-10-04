import {
  apiLogin,
  createPublishedPackage,
  expect,
  homeListLink,
  login,
  noOverflow,
  test,
} from "./helpers";

interface AdminItem {
  id: string;
  name: string;
  source: string | null;
  verified_at: string | null;
  status: string;
}

async function ocrSnapshot(request: Parameters<typeof apiLogin>[0]) {
  const response = await request.get("/api/admin/lists?limit=100");
  expect(response.status()).toBe(200);
  const lists = (await response.json()).items as {
    id: string;
    title: string;
  }[];
  const result: Record<string, AdminItem[]> = {};
  for (const title of ["北京美食", "周末游玩"]) {
    const list = lists.find((entry) => entry.title === title);
    expect(list, "original OCR fixture must exist").toBeTruthy();
    const items = await request.get(
      `/api/admin/lists/${list!.id}/items?limit=100`,
    );
    result[list!.id] = (await items.json()).items.map((item: AdminItem) => ({
      id: item.id,
      name: item.name,
      source: item.source,
      verified_at: item.verified_at,
      status: item.status,
    }));
  }
  expect(
    Object.values(result).reduce((count, items) => count + items.length, 0),
  ).toBe(172);
  for (const item of Object.values(result).flat()) {
    expect(item.source).toContain("OCR Markdown transcription only");
    expect(item.verified_at).toBeNull();
    expect(item.status).toBe("draft");
  }
  return result;
}

test("batch publish skips deliberately removed items and preserves all original OCR drafts", async ({
  page,
  request,
}) => {
  await apiLogin(request, "admin");
  const original = await ocrSnapshot(request);
  const { document, result, headers } = await createPublishedPackage(request);
  const removedId = result.item_ids_by_key.tests;
  expect(
    (
      await request.post(`/api/admin/items/${removedId}/unpublish`, { headers })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post(`/api/admin/lists/${result.list_id}/unpublish`, {
        headers,
      })
    ).status(),
  ).toBe(200);
  await login(page, "admin", "/admin");
  await page
    .getByLabel("清单 JSON", { exact: true })
    .fill(JSON.stringify(document));
  await page.getByRole("button", { name: "预览清单", exact: true }).click();
  await page.getByRole("button", { name: "选择原有清单", exact: true }).click();
  await page
    .getByRole("button", { name: "发布清单及 0 个草稿条目", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "跳过 1 个已下架条目" }),
  ).toBeVisible();
  await noOverflow(page);
  const publicItems = await request.get(`/api/lists/${result.list_id}/items`);
  expect(
    (await publicItems.json()).items.map((item: AdminItem) => item.id),
  ).toEqual([result.item_ids_by_key.functions]);
  expect((await request.get(`/api/items/${removedId}`)).status()).toBe(404);
  expect(await ocrSnapshot(request)).toEqual(original);

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "世界很大，先从身边出发。",
  );
  await (await homeListLink(page, document.list.title)).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    document.list.title,
  );
  await expect(
    page.getByRole("heading", { name: document.items[1].name, exact: true }),
  ).toHaveCount(0);
  await noOverflow(page);
});

test("loading, missing-item and empty public-record states remain accessible", async ({
  page,
  request,
}) => {
  const { document, result } = await createPublishedPackage(request);
  let release: () => void = () => {};
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/lists?*", async (route) => {
    await hold;
    await route.continue();
  });
  await page.goto("/");
  await expect(
    page.getByRole("status", { name: "" }).filter({ hasText: "正在载入" }),
  ).toBeVisible();
  release();
  await expect(await homeListLink(page, document.list.title)).toBeVisible();
  await noOverflow(page);
  await page.goto(`/items/${result.item_ids_by_key.functions}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    document.items[0].name,
  );
  await expect(page.getByRole("heading", { name: /还没有公开/ })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "地点", exact: true }),
  ).toHaveCount(0);
  await noOverflow(page);
  await page.goto("/items/00000000-0000-0000-0000-000000000000");
  await expect(page.getByRole("alert")).toBeVisible();
  await noOverflow(page);
});
