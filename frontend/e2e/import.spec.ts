import {
  apiLogin,
  expect,
  learningPackage,
  login,
  minimumTarget,
  noOverflow,
  reviewScreenshot,
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
  await preview
    .getByText(`1. ${document.items[0].name} · functions`, { exact: true })
    .click();
  await expect(preview.getByText(/编写一个带参数和返回值/)).toBeVisible();
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
