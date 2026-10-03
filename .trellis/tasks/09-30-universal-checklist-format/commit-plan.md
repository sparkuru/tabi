# 已批准提交计划

2026-10-04 用户在实际 preview 验收后明确表示“效果可以；提交吧；包括所有脏文件”。本次完整提交当前 86 个未提交文件，包括此前分别整理的通用清单与预览 bootstrap 改动；原来的部分暂存和预览排除方案已被本次授权取代。不创建新任务。

## 1. 工作提交

`feat: add universal checklist import and preview acceptance`

包括 v1 JSON 预览/导入/复用/冲突、批量发布、私人直接完成及重复记录、页面文案、Schema/示例/API 客户端、隔离开发与浏览器套件、实际 preview 同步检查，以及完整的预览 dotenv/端口/镜像/就绪/生命周期调整。产品执行规格与任务规划、验收文档一起提交。所有文件按当前工作区完整内容暂存，不使用旧的部分暂存补丁。

具体文件清单：

- `.dockerignore`
- `.env.example`
- `.gitignore`
- `.trellis/mainline.md`
- `.trellis/spec/backend/index.md`
- `.trellis/spec/backend/mvp-contracts.md`
- `.trellis/spec/backend/universal-checklist-contracts.md`
- `.trellis/spec/product/architecture.md`
- `.trellis/spec/product/requirements.md`
- `.trellis/spec/trellis-plus/continuity.md`
- `.trellis/spec/trellis-plus/development.md`
- `.trellis/spec/trellis-plus/index.md`
- `.trellis/spec/trellis-plus/validation.md`
- `.trellis/tasks/09-30-universal-checklist-format/backend-verification.md`
- `.trellis/tasks/09-30-universal-checklist-format/check-verification.md`
- `.trellis/tasks/09-30-universal-checklist-format/check.jsonl`
- `.trellis/tasks/09-30-universal-checklist-format/commit-plan.md`
- `.trellis/tasks/09-30-universal-checklist-format/design.md`
- `.trellis/tasks/09-30-universal-checklist-format/environment-verification.md`
- `.trellis/tasks/09-30-universal-checklist-format/implement.jsonl`
- `.trellis/tasks/09-30-universal-checklist-format/implement.md`
- `.trellis/tasks/09-30-universal-checklist-format/prd.md`
- `.trellis/tasks/09-30-universal-checklist-format/research/format-and-import.md`
- `.trellis/tasks/09-30-universal-checklist-format/task.json`
- `.trellis/tasks/09-30-universal-checklist-format/verification.md`
- `backend/app/api/import_body_limit.py`
- `backend/app/api/routes/admin.py`
- `backend/app/api/routes/checkins.py`
- `backend/app/api/routes/checklist_imports.py`
- `backend/app/api/routes/media.py`
- `backend/app/main.py`
- `backend/app/models/tables.py`
- `backend/app/schemas/catalog.py`
- `backend/app/schemas/checklist_format.py`
- `backend/app/services/catalog.py`
- `backend/app/services/checklist_imports.py`
- `backend/data/examples/learning.json`
- `backend/data/examples/minimal.json`
- `backend/data/examples/ocr-reference.json`
- `backend/data/examples/todo.json`
- `backend/migrations/versions/a748bd701acf_add_checklist_imports.py`
- `backend/tests/conftest.py`
- `backend/tests/test_checklist_format.py`
- `backend/tests/test_media_import.py`
- `backend/tests/test_postgres_checklist.py`
- `dev.sh`
- `docs/checklist-format.md`
- `docs/checklist.schema.json`
- `frontend/e2e-preview/access.spec.ts`
- `frontend/e2e/README.md`
- `frontend/e2e/catalog.spec.ts`
- `frontend/e2e/completion.spec.ts`
- `frontend/e2e/helpers.ts`
- `frontend/e2e/import.spec.ts`
- `frontend/openapi.json`
- `frontend/package-lock.json`
- `frontend/package.json`
- `frontend/playwright.config.ts`
- `frontend/playwright.preview.config.ts`
- `frontend/src/api/client.ts`
- `frontend/src/api/generated/index.ts`
- `frontend/src/api/generated/sdk.gen.ts`
- `frontend/src/api/generated/types.gen.ts`
- `frontend/src/components/app-shell.tsx`
- `frontend/src/components/common.tsx`
- `frontend/src/components/ui/button.tsx`
- `frontend/src/features/admin/checklist-import.tsx`
- `frontend/src/features/admin/page.tsx`
- `frontend/src/features/auth/page.tsx`
- `frontend/src/features/auth/profile.tsx`
- `frontend/src/features/checklists/pages.tsx`
- `frontend/src/features/entries/pages.tsx`
- `frontend/src/features/entries/use-completion.ts`
- `frontend/src/features/history/page.tsx`
- `frontend/src/features/sharing/page.tsx`
- `frontend/src/lib/request-key.ts`
- `frontend/src/router.tsx`
- `frontend/src/styles/main.css`
- `frontend/vite.config.ts`
- `hako`
- `infra/docker-compose.yml`
- `infra/docker/Caddyfile`
- `infra/docker/api-entrypoint.sh`
- `infra/docker/frontend.Dockerfile`
- `infra/e2e-seed.sh`
- `preview.sh`

## 2. 归档提交

工作提交成功后，使用 `python3 .trellis/scripts/task.py archive .trellis/tasks/09-30-universal-checklist-format --no-commit`，将本任务搬至 `.trellis/tasks/archive/2026-10/09-30-universal-checklist-format/`；同步 mainline、上下文和规格中的任务路径，提交 `chore(task): archive universal-checklist-format`。仅归档提交添加一次 `Co-authored-by: OpenAI Codex <codex@openai.com>`。无启用的 after_archive hook，本任务 parent 为 null、children/subtasks 为空；独立 `00-bootstrap-guidelines` 继续保持原状态。

## 3. Journal 与最终核对

使用 `add_session.py --no-commit` 记录实际工作提交与验证，将工作/归档 hash 写回 mainline；仅暂存实际 journal/index 与 mainline 引用更新，独立提交 `chore: record journal`。保留现有 Git 作者，不 push、不 amend。

提交前检查明确路径列表、staged diff 与空白错误；提交后核对三个提交、归档状态、署名次数与工作区。忽略的 dotenv、凭据、依赖、缓存、报告和截图均不纳入；`.env.example` 是无私人密码的配置模板。数据操作发生在实际 preview 数据库中，OCR 导入文件与临时验收产物位于 `/tmp`，并非源码提交内容。

## 验证与人工验收

2026-10-01：45 单元、4 PostgreSQL、14 双视口浏览器以及迁移/构建/类型/格式/Schema/生命周期检查通过。2026-10-03：完整预览脚本的语法/ShellCheck/shfmt、Compose 配置和独立实际生命周期验证通过，详见 development.md。2026-10-04：实际 preview 持久检查 2/2、增量类型/格式、8 个错误配置拒绝路径及有效配置列表通过；用户认可实际页面和已发布的 OCR 第一块 70 条内容。以上按实际运行日期记录，本次提交不将历史测试写成新一轮执行。
