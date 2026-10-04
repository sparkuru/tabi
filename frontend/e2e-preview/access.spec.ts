import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

function readCredentials(): { email: string; password: string } {
  try {
    const value: unknown = JSON.parse(
      readFileSync(process.env.TABI_PREVIEW_CREDENTIALS_FILE!, "utf8"),
    );
    if (
      typeof value !== "object" ||
      value === null ||
      !("email" in value) ||
      typeof value.email !== "string" ||
      !value.email.trim() ||
      !("password" in value) ||
      typeof value.password !== "string" ||
      !value.password
    )
      throw new Error();
    return { email: value.email, password: value.password };
  } catch {
    throw new Error(
      "Preview credentials JSON must contain email and password.",
    );
  }
}

test("preview administrator login and non-writing checklist preview", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const origin = new URL(baseURL!).origin;
  const url = (path: string) => new URL(path, origin).href;
  const credentials = readCredentials();
  let stage = "request boundary";
  let blockedRequest = false;
  let cleanupFailed = false;
  let lastHTTPStatus: number | undefined;
  function checkStatus(actual: number, expected: number) {
    lastHTTPStatus = actual;
    expect(actual).toBe(expected);
  }
  await context.route("**/*", async (route) => {
    const request = route.request();
    const target = new URL(request.url());
    const allowed =
      target.origin === origin &&
      (["GET", "HEAD"].includes(request.method()) ||
        (request.method() === "POST" &&
          ["/api/auth/login", "/api/admin/checklist-imports/preview"].includes(
            target.pathname,
          )));
    if (!allowed) {
      blockedRequest = true;
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });

  try {
    stage = "login";
    await page.goto(url("/auth?redirect=%2Fadmin"));
    await page.getByLabel("邮箱", { exact: true }).fill(credentials.email);
    await page.getByLabel("密码", { exact: true }).fill(credentials.password);
    const loginResponse = page.waitForResponse(
      (response) =>
        response.url() === url("/api/auth/login") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "登录", exact: true }).click();
    checkStatus((await loginResponse).status(), 200);
    await expect(page).toHaveURL(url("/admin"));

    stage = "administrator identity and management page";
    const identity = await context.request.get(url("/api/auth/me"), {
      maxRedirects: 0,
      timeout: 5_000,
    });
    checkStatus(identity.status(), 200);
    const role: unknown = (await identity.json()).role;
    expect(["content_admin", "system_admin"].includes(String(role))).toBe(true);
    const navigation = page.getByRole("navigation", { name: "管理工作区" });
    await expect(
      navigation.getByRole("button", { name: /内容编辑/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await navigation.getByRole("button", { name: /^导入/ }).click();
    await expect(
      page.getByRole("heading", { name: "导入整张清单", exact: true }),
    ).toBeVisible();

    const listsURL = url("/api/admin/lists?limit=100");
    const beforeResponse = await context.request.get(listsURL, {
      maxRedirects: 0,
      timeout: 5_000,
    });
    checkStatus(beforeResponse.status(), 200);
    const before = await beforeResponse.json();

    stage = "non-writing JSON preview";
    const key = `preview-smoke-${randomUUID()}`;
    const title = "Preview acceptance sample";
    const payload = {
      format: "tabi.checklist",
      version: 1,
      key,
      list: { title },
      items: [{ key: "sample", name: "Synthetic preview item" }],
    };
    await page
      .getByLabel("清单 JSON", { exact: true })
      .fill(JSON.stringify(payload));
    const previewResponse = page.waitForResponse(
      (response) =>
        response.url() === url("/api/admin/checklist-imports/preview") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "预览清单", exact: true }).click();
    const response = await previewResponse;
    checkStatus(response.status(), 200);
    const result = await response.json();
    await navigation.getByRole("button", { name: /^内容治理/ }).click();
    await expect(page.getByLabel("清单 JSON", { exact: true })).toBeHidden();
    await navigation.getByRole("button", { name: /^导入/ }).click();
    await expect(page.getByLabel("清单 JSON", { exact: true })).toHaveValue(
      JSON.stringify(payload),
    );
    expect(result.state).toBe("ready");
    expect(result.title).toBe(title);
    expect(result.key).toBe(key);
    expect(result.item_count).toBe(1);
    const preview = page.getByRole("region", { name: "清单预览", exact: true });
    await expect(preview.getByRole("heading", { name: title })).toBeVisible();
    await expect(preview.getByRole("status")).toHaveText(
      "校验通过，将创建草稿清单。",
    );

    stage = "unchanged checklist inventory and layout";
    const afterResponse = await context.request.get(listsURL, {
      maxRedirects: 0,
      timeout: 5_000,
    });
    checkStatus(afterResponse.status(), 200);
    const after = await afterResponse.json();
    expect(after.total).toBe(before.total);
    expect(JSON.stringify(after.items) === JSON.stringify(before.items)).toBe(
      true,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(blockedRequest).toBe(false);

    stage = "sanitized preview screenshot";
    await preview.screenshot({
      path: testInfo.outputPath(`${testInfo.project.name}-preview.png`),
      animations: "disabled",
      mask: [page.locator("header"), page.locator("main > div > .grid")],
    });
  } catch (caught) {
    // Suppress Playwright call logs, which may contain credential input values.
    const errorType = caught instanceof Error ? caught.name : "UnknownError";
    throw new Error(
      `Preview acceptance failed during ${stage}; last HTTP status: ${lastHTTPStatus ?? "unavailable"}; error type: ${errorType}.`,
    );
  } finally {
    try {
      const csrf = (await context.cookies(origin)).find(
        (cookie) => cookie.name === "tabi_csrf",
      );
      if (csrf) {
        const logout = await context.request.post(url("/api/auth/logout"), {
          headers: { "X-CSRF-Token": csrf.value },
          maxRedirects: 0,
          timeout: 5_000,
        });
        cleanupFailed = logout.status() !== 204;
        if (!cleanupFailed) {
          const anonymous = await context.request.get(url("/api/auth/me"), {
            maxRedirects: 0,
            timeout: 5_000,
          });
          cleanupFailed = anonymous.status() !== 401;
        }
      }
    } catch {
      cleanupFailed = true;
    } finally {
      await context.close();
    }
    if (cleanupFailed) throw new Error("Preview test session logout failed.");
  }
});
