import { client } from "./generated/client.gen";

client.setConfig({ baseUrl: window.location.origin, credentials: "include" });

function csrfToken(): string | null {
  const entry = document.cookie
    .split("; ")
    .find((part) => part.startsWith("tabi_csrf="));
  return entry ? decodeURIComponent(entry.slice("tabi_csrf=".length)) : null;
}

client.interceptors.request.use((request) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
    const token = csrfToken();
    if (token) request.headers.set("x-csrf-token", token);
  }
  return request;
});

type ApiResult<T> = { data?: T; error?: unknown; response?: Response };

function describeError(error: unknown, response?: Response): string {
  if (error && typeof error === "object" && "detail" in error) {
    const detail = error.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail))
      return detail.map((entry) => entry.msg ?? "输入不完整").join("；");
  }
  return response
    ? `请求失败（${response.status}）`
    : "网络连接失败，请稍后重试。";
}

export async function apiData<T>(promise: Promise<ApiResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.response?.ok || result.data === undefined) {
    throw new Error(describeError(result.error, result.response));
  }
  return result.data;
}

export async function apiDone(
  promise: Promise<ApiResult<unknown>>,
): Promise<void> {
  const result = await promise;
  if (!result.response?.ok)
    throw new Error(describeError(result.error, result.response));
}

export async function uploadFile(
  path: string,
  file: File,
): Promise<{ upload_id: string }> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(path, {
    method: "POST",
    body: form,
    credentials: "include",
    headers: csrfToken() ? { "x-csrf-token": csrfToken()! } : {},
  });
  if (!response.ok) {
    const error: unknown = await response.json().catch(() => null);
    throw new Error(describeError(error, response));
  }
  return response.json() as Promise<{ upload_id: string }>;
}

export async function uploadDirect(path: string, file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  const token = csrfToken();
  const response = await fetch(path, {
    method: "POST",
    body: form,
    credentials: "include",
    headers: token ? { "x-csrf-token": token } : {},
  });
  if (!response.ok) {
    const error: unknown = await response.json().catch(() => null);
    throw new Error(describeError(error, response));
  }
}
