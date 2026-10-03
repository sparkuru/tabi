import { useRef, useState } from "react";

import { postJsonText } from "../../api/client";
import type {
  ChecklistImportOut,
  ChecklistPreviewOut,
} from "../../api/generated";
import { ErrorNotice } from "../../components/common";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";

const maxBytes = 2 * 1024 * 1024;

export function ChecklistImport({
  onSelect,
}: {
  onSelect: (listId: string) => Promise<void>;
}) {
  const [source, setSource] = useState("");
  const [preview, setPreview] = useState<ChecklistPreviewOut | null>(null);
  const [busy, setBusy] = useState<
    "file" | "preview" | "import" | "select" | null
  >(null);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const revision = useRef(0);
  const active = useRef(false);

  function changeSource(value: string) {
    revision.current += 1;
    setSource(value);
    setPreview(null);
    setError(null);
    setMessage("");
  }

  async function readFile(file: File) {
    if (active.current) return;
    active.current = true;
    setBusy("file");
    revision.current += 1;
    setPreview(null);
    setError(null);
    setMessage("");
    try {
      if (file.size > maxBytes)
        throw new Error("文件超过 2 MiB，请缩小清单文件后重试。");
      const content = new TextDecoder("utf-8", { fatal: true }).decode(
        await file.arrayBuffer(),
      );
      changeSource(content);
    } catch (caught) {
      setError(
        caught instanceof TypeError
          ? new Error("文件必须是 UTF-8 JSON，请转换编码后重试。")
          : caught,
      );
    } finally {
      setBusy(null);
      active.current = false;
    }
  }

  async function run(action: "preview" | "import") {
    if (active.current || !source.trim()) return;
    if (action === "import" && (!preview || preview.state === "conflict"))
      return;
    active.current = true;
    const currentRevision = revision.current;
    setBusy(action);
    setError(null);
    setMessage("");
    try {
      if (new TextEncoder().encode(source).byteLength > maxBytes)
        throw new Error("JSON 超过 2 MiB，请缩小清单后重试。");
      if (action === "preview") {
        setPreview(null);
        const result = await postJsonText<ChecklistPreviewOut>(
          "/api/admin/checklist-imports/preview",
          source,
        );
        if (currentRevision === revision.current) setPreview(result);
      } else {
        const result = await postJsonText<ChecklistImportOut>(
          "/api/admin/checklist-imports",
          source,
        );
        await onSelect(result.list_id);
        setPreview((current) =>
          current
            ? {
                ...current,
                state: "existing",
                existing_list_id: result.list_id,
              }
            : null,
        );
        setMessage(
          result.reused
            ? "已选择原有清单，内容和发布状态保留。"
            : "清单和条目已导入为草稿，请检查后发布。",
        );
      }
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(null);
      active.current = false;
    }
  }

  async function selectExisting(listId: string) {
    if (active.current) return;
    active.current = true;
    setBusy("select");
    setError(null);
    try {
      await onSelect(listId);
      setMessage("已选择原有清单，可在下方编辑。");
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(null);
      active.current = false;
    }
  }

  return (
    <Card className="mb-6 min-w-0 space-y-4 p-6">
      <h2 className="text-xl font-bold">导入整张清单</h2>
      <p
        id="checklist-import-help"
        className="text-sm leading-6 text-stone-600"
      >
        上传或粘贴 UTF-8 JSON，最多 200 个条目、2 MiB。先预览，再导入草稿。
      </p>
      <div className="flex flex-wrap gap-3 text-sm font-semibold text-teal-800">
        <a
          className="inline-flex min-h-11 items-center underline"
          href="/checklist-template.json"
          download
        >
          下载模板
        </a>
        <a
          className="inline-flex min-h-11 items-center underline"
          href="/checklist-format.md"
          target="_blank"
          rel="noreferrer"
        >
          字段说明
        </a>
        <a
          className="inline-flex min-h-11 items-center underline"
          href="/checklist.schema.json"
          target="_blank"
          rel="noreferrer"
        >
          JSON Schema
        </a>
        <a
          className="inline-flex min-h-11 items-center underline"
          href="/checklist-todo.json"
          download
        >
          待办示例
        </a>
        <a
          className="inline-flex min-h-11 items-center underline"
          href="/checklist-learning.json"
          download
        >
          学习示例
        </a>
        <a
          className="inline-flex min-h-11 items-center underline"
          href="/checklist-ocr-reference.json"
          download
        >
          OCR 来源示例
        </a>
      </div>
      <label className="block">
        <span className="field-label">清单 JSON 文件</span>
        <input
          className="field"
          type="file"
          accept="application/json,.json"
          disabled={busy !== null}
          aria-describedby="checklist-import-help"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void readFile(file);
          }}
        />
      </label>
      <div>
        <label htmlFor="checklist-json-source" className="field-label">
          清单 JSON
        </label>
        <textarea
          id="checklist-json-source"
          className="field min-h-48 font-mono text-sm"
          value={source}
          disabled={busy !== null}
          aria-describedby={`checklist-import-help${error ? " checklist-import-error" : ""}`}
          aria-invalid={Boolean(error)}
          spellCheck={false}
          placeholder='{"format":"tabi.checklist","version":1,"key":"my-checklist","list":{"title":"我的清单"},"items":[{"key":"first","name":"第一个条目"}]}'
          onChange={(event) => changeSource(event.target.value)}
        />
      </div>
      {error !== null && (
        <div id="checklist-import-error">
          <ErrorNotice error={error} />
        </div>
      )}
      {message && (
        <p
          role="status"
          className="rounded-xl bg-teal-50 p-3 text-sm font-semibold text-teal-900"
        >
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={busy !== null || !source.trim()}
          onClick={() => run("preview")}
        >
          {busy === "preview" ? "正在预览…" : "预览清单"}
        </Button>
        <Button
          type="button"
          disabled={busy !== null || !preview || preview.state === "conflict"}
          onClick={() => run("import")}
        >
          {busy === "import"
            ? "正在导入…"
            : preview?.state === "existing"
              ? "使用原有清单"
              : "导入草稿清单"}
        </Button>
      </div>
      {busy === "file" && (
        <p role="status" className="text-sm text-stone-600">
          正在读取文件…
        </p>
      )}
      {preview && (
        <section
          aria-label="清单预览"
          className="space-y-3 rounded-2xl bg-stone-50 p-4"
        >
          <h3 className="break-words text-lg font-bold">{preview.title}</h3>
          <p className="break-words text-sm text-stone-600">
            {preview.item_count} 个条目 · key：{preview.key}
          </p>
          {preview.state === "ready" && (
            <p role="status" className="text-sm text-teal-800">
              校验通过，将创建草稿清单。
            </p>
          )}
          {preview.state === "existing" && (
            <p role="status" className="text-sm text-teal-800">
              相同内容已导入，将复用原有清单。
            </p>
          )}
          {preview.state === "conflict" && (
            <p role="alert" className="text-sm text-rose-800">
              相同 key 的内容已变化。请编辑原有清单，或为另一张清单使用新的
              key。
            </p>
          )}
          {preview.existing_list_id && (
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() => selectExisting(preview.existing_list_id!)}
            >
              选择原有清单
            </Button>
          )}
          <ol className="divide-y divide-stone-200">
            {preview.items.map((item, index) => (
              <li key={item.key} className="py-3">
                <details>
                  <summary className="min-h-11 cursor-pointer break-words py-2 text-sm font-semibold">
                    {index + 1}. {item.name} · {item.key}
                  </summary>
                  <pre className="prose-note mt-2 rounded-xl bg-white p-3 font-mono text-xs">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                </details>
              </li>
            ))}
          </ol>
        </section>
      )}
    </Card>
  );
}
