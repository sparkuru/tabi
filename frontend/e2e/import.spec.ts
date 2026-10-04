import { randomUUID } from "node:crypto";
import {
  apiLogin,
  expect,
  learningPackage,
  login,
  minimumTarget,
  noOverflow,
  reviewScreenshot,
  syntheticPhoto,
  password,
  createPublishedPackage,
  test,
} from "./helpers";

test("administrator uploads, previews, imports, publishes, reuses and sees conflicts", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(60_000);
  const document = learningPackage();
  await login(page, "admin", "/admin");
  await page
    .getByRole("navigation", { name: "管理工作区" })
    .getByRole("button", { name: "导入", exact: true })
    .click();
  await page.getByLabel("清单 JSON 文件", { exact: true }).setInputFiles({
    name: "learning.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(document)),
  });
  await expect(page.getByLabel("清单 JSON", { exact: true })).toHaveValue(
    JSON.stringify(document),
  );
  await expect(
    page.getByRole("button", { name: "导入草稿清单", exact: true }),
  ).toBeDisabled();
  await minimumTarget(page, "预览清单");
  await page.getByRole("button", { name: "预览清单", exact: true }).focus();
  await page.keyboard.press("Enter");
  const preview = page.getByRole("region", { name: "清单预览" });
  await expect(
    preview.getByRole("heading", { name: document.list.title }),
  ).toBeVisible();
  await expect(preview.getByText(/2 个条目/)).toBeVisible();
  await expect(
    preview.getByRole("heading", { name: document.items[0].name }),
  ).toBeVisible();
  await expect(
    preview.getByText(document.items[0].description!, { exact: true }),
  ).toBeVisible();
  await preview.getByText("查看原始 JSON · functions", { exact: true }).click();
  await expect(
    preview.locator("pre").filter({ hasText: '"key": "functions"' }),
  ).toBeVisible();
  await noOverflow(page);
  await reviewScreenshot(page, "admin-import-preview");
  await preview.screenshot({
    path: test
      .info()
      .outputPath(
        `${test.info().project.name}-admin-import-preview-viewport.png`,
      ),
    animations: "disabled",
  });
  const importResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/admin/checklist-imports") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "导入草稿清单", exact: true }).click();
  const imported = await importResponse;
  expect(imported.status()).toBe(201);
  const result = (await imported.json()) as {
    list_id: string;
    item_ids_by_key: Record<string, string>;
  };
  await expect(
    page.getByRole("status").filter({ hasText: "清单和条目已导入为草稿" }),
  ).toBeVisible();
  const visitor = await browser.newContext({ ...test.info().project.use });
  const origin = new URL(page.url()).origin;
  expect(
    (
      await visitor.request.get(`${origin}/api/lists/${result.list_id}`)
    ).status(),
  ).toBe(404);
  expect(
    (
      await visitor.request.get(
        `${origin}/api/items/${result.item_ids_by_key.functions}`,
      )
    ).status(),
  ).toBe(404);
  await page.getByRole("button", { name: "编辑当前清单", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "内容编辑", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "发布清单及 2 个草稿条目", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "清单已发布：新发布 2 个条目" }),
  ).toBeVisible();
  const publicPage = await visitor.newPage();
  await publicPage.goto(`${origin}/lists/${result.list_id}`);
  await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText(
    document.list.title,
  );
  const publicItemLink = publicPage.getByRole("link").filter({
    has: publicPage.getByRole("heading", {
      name: document.items[0].name,
      exact: true,
    }),
  });
  await expect(publicItemLink).toBeVisible();
  await expect(publicItemLink).toHaveAttribute(
    "href",
    `/items/${result.item_ids_by_key.functions}`,
  );
  await noOverflow(publicPage);

  await page
    .getByRole("navigation", { name: "管理工作区" })
    .getByRole("button", { name: "导入", exact: true })
    .click();
  await page.getByLabel("清单 JSON", { exact: true }).fill(
    JSON.stringify(
      {
        items: document.items,
        list: document.list,
        key: document.key,
        version: document.version,
        format: document.format,
      },
      null,
      2,
    ),
  );
  await expect(page.getByRole("region", { name: "清单预览" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "导入草稿清单", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "预览清单", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "相同内容已导入" }),
  ).toBeVisible();
  const reuseResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/admin/checklist-imports") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "使用原有清单", exact: true }).click();
  const reused = await reuseResponse;
  expect(reused.status()).toBe(200);
  expect((await reused.json()).list_id).toBe(result.list_id);
  expect(
    (await (await request.get(`/api/lists/${result.list_id}`)).json())
      .item_count,
  ).toBe(2);
  await page.getByLabel("清单 JSON", { exact: true }).fill(
    JSON.stringify({
      ...document,
      list: { ...document.list, title: "改变后的内容" },
    }),
  );
  await page.getByRole("button", { name: "预览清单", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "相同 key 的内容已变化" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "导入草稿清单", exact: true }),
  ).toBeDisabled();
  expect(
    (await (await request.get(`/api/lists/${result.list_id}`)).json()).title,
  ).toBe(document.list.title);
  await noOverflow(page);
  await visitor.close();
});

test("download links serve the authoritative template, schema and field reference", async ({
  page,
  request,
}) => {
  await login(page, "admin", "/admin");
  await page
    .getByRole("navigation", { name: "管理工作区" })
    .getByRole("button", { name: "导入", exact: true })
    .click();
  const templateURL = await page
    .getByRole("link", { name: "下载模板", exact: true })
    .getAttribute("href");
  const schemaURL = await page
    .getByRole("link", { name: "JSON Schema", exact: true })
    .getAttribute("href");
  const referenceURL = await page
    .getByRole("link", { name: "字段说明", exact: true })
    .getAttribute("href");
  expect(templateURL).toBeTruthy();
  expect(schemaURL).toBeTruthy();
  expect(referenceURL).toBeTruthy();
  const template = await request.get(templateURL!);
  expect(template.status()).toBe(200);
  expect(template.headers()["content-type"]).toContain("application/json");
  const data = await template.json();
  expect(data.format).toBe("tabi.checklist");
  expect(data.version).toBe(1);
  expect(data.items.length).toBeGreaterThan(0);
  const schema = await request.get(schemaURL!);
  expect(schema.status()).toBe(200);
  expect(schema.headers()["content-type"]).toContain("application/json");
  expect((await schema.json()).properties.format.const).toBe("tabi.checklist");
  const reference = await request.get(referenceURL!);
  expect(reference.status()).toBe(200);
  const text = await reference.text();
  expect(text).toContain("tabi.checklist");
  expect(text).not.toContain("<!doctype html>");
});

test("invalid input retains fields and administrator boundaries protect imports", async ({
  page,
  request,
  browser,
}) => {
  const headers = await apiLogin(request, "admin");
  const before = (
    await (await request.get("/api/admin/lists?limit=100")).json()
  ).total;
  await login(page, "admin", "/admin");
  await page
    .getByRole("navigation", { name: "管理工作区" })
    .getByRole("button", { name: "导入", exact: true })
    .click();
  const invalid = learningPackage();
  const input = JSON.stringify({
    ...invalid,
    items: [{ key: "invalid", name: "" }],
  });
  await page.getByLabel("清单 JSON", { exact: true }).fill(input);
  await page.getByRole("button", { name: "预览清单", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(/items.*0.*name/);
  await expect(page.getByLabel("清单 JSON", { exact: true })).toHaveValue(
    input,
  );
  await expect(page.getByLabel("清单 JSON", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "导入草稿清单", exact: true }),
  ).toBeDisabled();
  expect(
    (await (await request.get("/api/admin/lists?limit=100")).json()).total,
  ).toBe(before);
  expect(
    (
      await request.post("/api/admin/checklist-imports", {
        data: JSON.parse(input),
        headers,
      })
    ).status(),
  ).toBe(422);
  expect(
    (await (await request.get("/api/admin/lists?limit=100")).json()).total,
  ).toBe(before);
  await noOverflow(page);

  const unauthorized = await browser.newContext();
  const origin = new URL(page.url()).origin;
  expect(
    (
      await unauthorized.request.post(
        `${origin}/api/admin/checklist-imports/preview`,
        { data: invalid },
      )
    ).status(),
  ).toBe(401);
  await unauthorized.close();
  const userHeaders = await apiLogin(request, "user");
  expect(
    (
      await request.post("/api/admin/checklist-imports/preview", {
        data: invalid,
        headers: userHeaders,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/admin/checklist-imports", {
        data: invalid,
        headers: userHeaders,
      })
    ).status(),
  ).toBe(403);
  await login(page, "user", "/admin");
  await expect(
    page.getByRole("heading", { name: "需要管理员权限" }),
  ).toBeVisible();
  await expect(page.getByLabel("清单 JSON", { exact: true })).toHaveCount(0);
});

test("workspaces retain drafts, staged covers and preview while editors persist optional data", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await login(page, "admin", "/admin");
  const navigation = page.getByRole("navigation", { name: "管理工作区" });
  const content = page.getByRole("region", { name: "内容编辑", exact: true });
  await expect(
    navigation.getByRole("button", { name: "内容编辑", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const document = learningPackage();
  await content.getByLabel("标题", { exact: true }).fill(document.list.title);
  await content
    .getByRole("textbox", { name: "简介", exact: true })
    .fill("尚未保存的清单草稿");
  let writes = 0;
  page.on("request", (event) => {
    if (
      ["POST", "PUT", "DELETE"].includes(event.method()) &&
      event.url().includes("/api/admin/") &&
      !event.url().endsWith("/preview")
    )
      writes += 1;
  });
  await navigation.getByRole("button", { name: "导入", exact: true }).click();
  await expect(content).toBeHidden();
  await expect(
    page.getByRole("button", { name: "保存清单", exact: true }),
  ).toHaveCount(0);
  const source = JSON.stringify(document);
  await page.getByLabel("清单 JSON", { exact: true }).fill(source);
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let previews = 0;
  await page.route("**/api/admin/checklist-imports/preview", async (route) => {
    previews += 1;
    await held;
    await route.continue();
  });
  await page.getByRole("button", { name: "预览清单", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "正在预览…", exact: true }),
  ).toBeDisabled();
  await navigation
    .getByRole("button", { name: "内容治理", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "导入工作区正在处理" }),
  ).toBeVisible();
  release();
  await navigation.getByRole("button", { name: "导入", exact: true }).click();
  await expect(page.getByRole("region", { name: "清单预览" })).toBeVisible();
  await expect(page.getByLabel("清单 JSON", { exact: true })).toHaveValue(
    source,
  );
  expect(previews).toBe(1);
  await page.unroute("**/api/admin/checklist-imports/preview");
  await navigation
    .getByRole("button", { name: "内容编辑", exact: true })
    .click();
  await expect(content.getByLabel("标题", { exact: true })).toHaveValue(
    document.list.title,
  );
  await expect(
    content.getByRole("textbox", { name: "简介", exact: true }),
  ).toHaveValue("尚未保存的清单草稿");
  expect(writes).toBe(0);
  const createdResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/admin/lists") &&
      response.request().method() === "POST",
  );
  await content.getByRole("button", { name: "保存清单", exact: true }).click();
  const created = await createdResponse;
  expect(created.status()).toBe(201);
  const list = await created.json();
  await content
    .getByLabel("清单封面", { exact: true })
    .setInputFiles(syntheticPhoto);
  await content
    .getByLabel("名称", { exact: true })
    .fill(document.items[0].name);
  await content
    .getByLabel("一句简介", { exact: true })
    .fill("待保存的条目草稿");
  const location = content
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "地点与坐标" }) });
  await location.locator("summary").click();
  await content
    .getByRole("combobox", { name: "地点类型", exact: true })
    .selectOption("physical");
  await content.getByLabel("地点名称", { exact: true }).fill("合成资料地点");
  await content.getByLabel("纬度", { exact: true }).fill("39.9");
  await content.getByLabel("经度", { exact: true }).fill("116.4");
  await content
    .getByRole("combobox", { name: "坐标系", exact: true })
    .selectOption("WGS84");
  const reference = content
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "参考资料与核对" }) });
  await reference.locator("summary").click();
  await content
    .getByLabel("带时效的参考资料", { exact: true })
    .fill("合成参考，待核实");
  await content
    .getByLabel("资料截至时间", { exact: true })
    .fill("2026-09-29T09:00");
  await content.getByLabel("资料来源", { exact: true }).fill("E2E 合成资料");
  const links = content
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "外部链接" }) });
  await links.locator("summary").click();
  await content.getByRole("button", { name: "添加外链", exact: true }).click();
  await links.locator("summary").click();
  await content.getByRole("button", { name: "保存条目", exact: true }).click();
  await expect(links).toHaveAttribute("open", "");
  await expect(links.getByLabel("标题", { exact: true })).toBeFocused();
  await links.getByLabel("标题", { exact: true }).fill("参考链接");
  await links
    .getByLabel("网址", { exact: true })
    .fill("https://example.com/reference");
  await navigation
    .getByRole("button", { name: "账号角色", exact: true })
    .click();
  await navigation
    .getByRole("button", { name: "内容编辑", exact: true })
    .click();
  await expect(content.getByLabel("一句简介", { exact: true })).toHaveValue(
    "待保存的条目草稿",
  );
  await expect(
    content.getByText("已选：e2e-pixel.png", { exact: true }),
  ).toBeVisible();
  const savedResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/admin/lists/${list.id}/items`) &&
      response.request().method() === "POST",
  );
  await content.getByRole("button", { name: "保存条目", exact: true }).click();
  const saved = await savedResponse;
  expect(saved.status()).toBe(201);
  const item = await saved.json();
  expect(item.place_name).toBe("合成资料地点");
  expect(item.latitude).toBe(39.9);
  expect(item.reference_note).toBe("合成参考，待核实");
  expect(item.links[0].url).toBe("https://example.com/reference");
  await content
    .getByLabel("条目封面", { exact: true })
    .setInputFiles(syntheticPhoto);
  await navigation.getByRole("button", { name: "导入", exact: true }).click();
  await expect(page.getByRole("region", { name: "清单预览" })).toBeVisible();
  await navigation
    .getByRole("button", { name: "内容编辑", exact: true })
    .click();
  const uploads = content.getByRole("button", {
    name: "上传封面",
    exact: true,
  });
  const coverResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/media/lists/${list.id}/cover`) &&
      response.request().method() === "POST",
  );
  await uploads.nth(0).click();
  expect((await coverResponse).status()).toBe(204);
  await expect(
    page.getByRole("status").filter({ hasText: "清单封面已上传" }),
  ).toBeVisible();
  const itemCoverResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/media/items/${item.id}/cover`) &&
      response.request().method() === "POST",
  );
  await uploads.nth(1).click();
  expect((await itemCoverResponse).status()).toBe(204);
  await expect(
    page.getByRole("status").filter({ hasText: "条目封面已上传" }),
  ).toBeVisible();
  await content
    .getByRole("button", { name: "+ 新建条目", exact: true })
    .click();
  await content
    .getByLabel("名称", { exact: true })
    .fill(document.items[1].name);
  const secondResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/admin/lists/${list.id}/items`) &&
      response.request().method() === "POST",
  );
  await content.getByRole("button", { name: "保存条目", exact: true }).click();
  const second = await secondResponse;
  expect(second.status()).toBe(201);
  await expect(
    content.getByRole("button").filter({ hasText: document.items[0].name }),
  ).toBeVisible();
  await content
    .getByRole("button", { name: "发布清单及 2 个草稿条目", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "清单已发布：新发布 2 个条目" }),
  ).toBeVisible();
  await content
    .getByRole("combobox", { name: "添加同清单相关条目", exact: true })
    .selectOption(item.id);
  const relationResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/relations") &&
      response.request().method() === "POST",
  );
  await content.getByRole("button", { name: "添加关联", exact: true }).click();
  expect((await relationResponse).status()).toBe(201);
  await expect(
    content.getByText(`已关联：${document.items[0].name}`, { exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  await reviewScreenshot(page, "admin-content-populated");
  const persisted = await page.request.get(`/api/admin/lists/${list.id}/items`);
  const data = await persisted.json();
  expect(
    data.items.find((entry: { id: string }) => entry.id === item.id).cover_url,
  ).toBeTruthy();
  await content
    .getByRole("button")
    .filter({ hasText: document.items[0].name })
    .click();
  for (const group of [location, reference, links])
    await expect(group).toHaveAttribute("open", "");
  await expect(content.getByLabel("地点名称", { exact: true })).toHaveValue(
    "合成资料地点",
  );
  await expect(links.getByLabel("网址", { exact: true })).toHaveValue(
    "https://example.com/reference",
  );

  await navigation.getByRole("button", { name: "导入", exact: true }).click();
  const reviewed = page.locator("details.admin-reviewed");
  await reviewed.locator("summary").click();
  await expect(
    reviewed.getByText(`当前清单：${document.list.title}`, { exact: true }),
  ).toBeVisible();
  const reviewedDocument = {
    source: "E2E 已复核合成资料",
    reviewed_at: "2026-09-29T00:00:00Z",
    rows: [
      {
        item: { name: `复核条目 ${document.key}`, place_kind: "none" },
        transcription_reviewed: false,
      },
    ],
  };
  const reviewedInput = reviewed.getByRole("textbox", {
    name: "已复核条目 JSON",
    exact: true,
  });
  const unreviewedSource = JSON.stringify(reviewedDocument);
  await reviewedInput.fill(unreviewedSource);
  const rejectedResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/admin/lists/${list.id}/imports`) &&
      response.request().method() === "POST",
  );
  await reviewed
    .getByRole("button", { name: "导入当前清单", exact: true })
    .click();
  expect((await rejectedResponse).status()).toBe(422);
  await expect(page.getByRole("alert")).toContainText("Unreviewed OCR row");
  await expect(reviewedInput).toHaveValue(unreviewedSource);
  expect(
    (await (await page.request.get(`/api/admin/lists/${list.id}/items`)).json())
      .total,
  ).toBe(2);
  reviewedDocument.rows[0].transcription_reviewed = true;
  const reviewedSource = JSON.stringify(reviewedDocument);
  await reviewedInput.fill(reviewedSource);
  await navigation
    .getByRole("button", { name: "内容治理", exact: true })
    .click();
  await navigation.getByRole("button", { name: "导入", exact: true }).click();
  await expect(reviewedInput).toHaveValue(reviewedSource);
  const reviewedResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/admin/lists/${list.id}/imports`) &&
      response.request().method() === "POST",
  );
  await reviewed
    .getByRole("button", { name: "导入当前清单", exact: true })
    .click();
  const importedRows = await reviewedResponse;
  expect(importedRows.status()).toBe(201);
  const reviewedResult = await importedRows.json();
  await expect(
    page.getByRole("status").filter({ hasText: "复核条目已导入为草稿" }),
  ).toBeVisible();
  await expect(reviewedInput).toHaveValue("");
  const reviewedItems = (
    await (await page.request.get(`/api/admin/lists/${list.id}/items`)).json()
  ).items;
  expect(
    reviewedItems.find(
      (entry: { id: string }) => entry.id === reviewedResult.item_ids[0],
    ),
  ).toMatchObject({
    name: reviewedDocument.rows[0].item.name,
    source: reviewedDocument.source,
    status: "draft",
  });
  expect(
    (
      await page.request.get(`/api/items/${reviewedResult.item_ids[0]}`)
    ).status(),
  ).toBe(404);
});

test("administration layouts wrap long content across widths, text sizes and reduced motion", async ({
  page,
}) => {
  await login(page, "admin", "/admin");
  const title =
    `长标题用于检查清单与编辑区域的换行${randomUUID().slice(0, 8)}`.repeat(5);
  const name = `LongUnbrokenItemName${randomUUID().slice(0, 8)}`.repeat(5);
  await page.getByLabel("标题", { exact: true }).fill(title);
  await page.getByLabel("排序数字", { exact: true }).fill("-1000");
  await page.getByRole("button", { name: "保存清单", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button").filter({ hasText: title }),
  ).toBeVisible();
  await page.getByLabel("名称", { exact: true }).fill(name);
  await page.getByRole("button", { name: "保存条目", exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(
    page.getByRole("button").filter({ hasText: name }),
  ).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "管理工作区" });
  for (const name of ["内容编辑", "导入", "内容治理", "账号角色", "操作审计"])
    await minimumTarget(page, name);
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow(page);
    await reviewScreenshot(page, `admin-content-${width}`);
  }
  await page.setViewportSize({ width: 812, height: 375 });
  await navigation
    .getByRole("button", { name: "内容治理", exact: true })
    .click();
  await page
    .getByLabel("记录 ID", { exact: true })
    .fill("long-unbroken-identifier".repeat(8));
  await noOverflow(page);
  await reviewScreenshot(page, "admin-landscape-moderation");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  await navigation.getByRole("button", { name: "导入", exact: true }).click();
  await noOverflow(page);
  await reviewScreenshot(page, "admin-import-large-text");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await navigation
      .getByRole("button", { name: "导入", exact: true })
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe("0s");
  await page.addStyleTag({ content: "html { font-size: 100%; }" });
  await navigation
    .getByRole("button", { name: "操作审计", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    navigation.getByRole("button", { name: "操作审计", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await noOverflow(page);
  await reviewScreenshot(page, "admin-audit");
});

test("governance invalidates a synthetic share and role edits preserve content-admin boundaries", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(60_000);
  const { result } = await createPublishedPackage(request);
  const headers = await apiLogin(request, "user");
  const recordResponse = await request.post(
    `/api/items/${result.item_ids_by_key.functions}/checkins`,
    {
      headers: { ...headers, "Idempotency-Key": randomUUID() },
      data: { note: "合成公开内容治理记录", visibility: "public" },
    },
  );
  expect(recordResponse.status()).toBe(201);
  const record = await recordResponse.json();
  const visitor = await browser.newContext({ ...test.info().project.use });
  const origin = new URL(test.info().project.use.baseURL!).origin;
  const shareURL = `${origin}/api/shares/${record.share_id}`;
  expect((await visitor.request.get(shareURL)).status()).toBe(200);
  const email = `workspace-${randomUUID()}@e2e.example.com`;
  const created = await visitor.request.post(`${origin}/api/auth/register`, {
    data: { email, password, display_name: "合成管理权限检查" },
  });
  expect(created.status()).toBe(201);
  const user = await created.json();
  await login(page, "admin", "/admin");
  const navigation = page.getByRole("navigation", { name: "管理工作区" });
  await navigation
    .getByRole("button", { name: "内容治理", exact: true })
    .click();
  await page.getByLabel("记录 ID", { exact: true }).fill(record.id);
  await page.getByLabel("原因", { exact: true }).fill("隔离环境测试原因");
  const hideResponse = page.waitForResponse((response) =>
    response.url().endsWith(`/api/admin/checkins/${record.id}/hide`),
  );
  await page.getByRole("button", { name: "隐藏内容", exact: true }).click();
  expect((await hideResponse).status()).toBe(204);
  await expect(
    page.getByRole("status").filter({ hasText: "内容已隐藏" }),
  ).toBeVisible();
  expect((await visitor.request.get(shareURL)).status()).toBe(404);
  await reviewScreenshot(page, "admin-moderation-success");
  await navigation
    .getByRole("button", { name: "账号角色", exact: true })
    .click();
  const users = page.getByRole("region", { name: "账号角色", exact: true });
  const row = users.getByRole("listitem").filter({ hasText: email });
  await row
    .getByRole("combobox", { name: "角色", exact: true })
    .selectOption("content_admin");
  await navigation
    .getByRole("button", { name: "操作审计", exact: true })
    .click();
  await navigation
    .getByRole("button", { name: "账号角色", exact: true })
    .click();
  await expect(row.getByRole("combobox")).toHaveValue("content_admin");
  const roleResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/admin/users/${user.id}/role`) &&
      response.request().method() === "PUT",
  );
  await row.getByRole("button", { name: "保存角色", exact: true }).click();
  expect((await roleResponse).status()).toBe(200);
  await expect(
    row.getByRole("button", { name: "保存角色", exact: true }),
  ).toBeDisabled();
  await noOverflow(page);
  await reviewScreenshot(page, "admin-users");
  await navigation
    .getByRole("button", { name: "操作审计", exact: true })
    .click();
  const audit = page.getByRole("region", { name: "操作审计", exact: true });
  await expect(
    audit.getByText("user.role.change", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    audit
      .getByRole("listitem")
      .filter({ hasText: record.id })
      .getByText("原因：隔离环境测试原因", { exact: true }),
  ).toBeVisible();
  const next = audit.getByRole("button", { name: "下一页", exact: true });
  if (await next.isEnabled()) {
    const nextPage = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/audit?") &&
        response.url().includes("offset=50"),
    );
    await next.click();
    expect((await nextPage).status()).toBe(200);
    await audit.getByRole("button", { name: "上一页", exact: true }).click();
    await expect(
      audit
        .getByRole("listitem")
        .filter({ hasText: record.id })
        .getByText("原因：隔离环境测试原因", { exact: true }),
    ).toBeVisible();
  }
  const contentAdmin = await visitor.newPage();
  await contentAdmin.goto(`${origin}/auth?redirect=%2Fadmin`);
  await contentAdmin.getByLabel("邮箱", { exact: true }).fill(email);
  await contentAdmin.getByLabel("密码", { exact: true }).fill(password);
  await contentAdmin.getByRole("button", { name: "登录", exact: true }).click();
  await expect(contentAdmin).toHaveURL(`${origin}/admin`);
  const limitedNav = contentAdmin.getByRole("navigation", {
    name: "管理工作区",
  });
  await expect(limitedNav.getByRole("button")).toHaveCount(3);
  await expect(
    limitedNav.getByRole("button", { name: "账号角色", exact: true }),
  ).toHaveCount(0);
  await expect(
    limitedNav.getByRole("button", { name: "操作审计", exact: true }),
  ).toHaveCount(0);
  expect(
    (await visitor.request.get(`${origin}/api/admin/users`)).status(),
  ).toBe(403);
  expect(
    (await visitor.request.get(`${origin}/api/admin/audit`)).status(),
  ).toBe(403);
  const adminHeaders = await apiLogin(request, "admin");
  expect(
    (
      await request.put(`/api/admin/users/${user.id}/role`, {
        headers: adminHeaders,
        data: { role: "system_admin" },
      })
    ).status(),
  ).toBe(200);
  await contentAdmin.clock.install();
  await contentAdmin.reload();
  await limitedNav
    .getByRole("button", { name: "账号角色", exact: true })
    .click();
  await expect(
    contentAdmin.getByRole("region", { name: "账号角色", exact: true }),
  ).toBeVisible();
  expect(
    (
      await request.put(`/api/admin/users/${user.id}/role`, {
        headers: adminHeaders,
        data: { role: "content_admin" },
      })
    ).status(),
  ).toBe(200);
  await contentAdmin.clock.fastForward(30_001);
  await contentAdmin.evaluate(() => {
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
  await expect(limitedNav.getByRole("button")).toHaveCount(3);
  await expect(
    contentAdmin.getByRole("region", { name: "账号角色", exact: true }),
  ).toHaveCount(0);
  await expect(
    limitedNav.getByRole("button", { name: "内容编辑", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    contentAdmin.getByRole("region", { name: "内容编辑", exact: true }),
  ).toBeVisible();
  expect(
    (
      await request.put(`/api/admin/users/${user.id}/role`, {
        headers: adminHeaders,
        data: { role: "user" },
      })
    ).status(),
  ).toBe(200);
  await contentAdmin.reload();
  await expect(
    contentAdmin.getByRole("heading", { name: "需要管理员权限" }),
  ).toBeVisible();
  await visitor.close();
});
