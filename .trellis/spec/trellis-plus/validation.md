# Trellis Plus: Validation Profile

## Current repository evidence

2026-10-01：MVP 已实现，证据为 `backend/pyproject.toml`、`backend/tests/`、`frontend/package.json`/锁文件和 `infra/`。归档 `.trellis/tasks/archive/2026-09/09-29-checklist-mvp/verification.md` 记录 15 个单测、类型/格式/构建、PostgreSQL/HTTP/恢复演练及 390px Chrome 截图；这是历史证据，不代表本轮或下一项改动通过。当前没有 `@playwright/test`、Playwright 配置/测试、等效持久浏览器套件或 `.github` CI。

## Required checks and limits

按变化边界先聚焦再执行正常门禁，从仓库根目录：

```sh
(cd backend && .venv/bin/ruff check app tests migrations)
(cd backend && .venv/bin/ruff format --check app tests migrations)
(cd backend && .venv/bin/pytest -q)
(cd frontend && npm run typecheck)
(cd frontend && npm run format:check)
(cd frontend && npm run build)
git diff --check
```

这些是依赖本机 Python/Node 和已安装项目依赖的现有宿主命令；需要 Docker 执行时先完成 development.md 的包装器 checkpoint，不伪称容器命令。API 改动需更新实际 `app.openapi()` → `frontend/openapi.json`，再 `(cd frontend && npm run api:generate)` 并验证生成客户端，不手改生成文件。

`backend/tests/conftest.py` 用隔离 SQLite/媒体目录。迁移、数据库约束/并发、行锁需在独立 PostgreSQL 项目执行 `(cd backend && .venv/bin/alembic upgrade head)` / `alembic check` 和针对性的并发路径，不能用默认实例。fixture/连接来源在 task 记录，不输出凭据。历史 TestClient 在 sandbox 内挂起而在受允许环境通过；再次遇到须报告实际阻碍，不能计通过。

纯文档/规则更新核对链接、JSONL 格式/去重、加载解析、受保护文件 hash、路径分类与 `git diff --check`，不运行应用全套。配置/脚本变更增加语法、Compose `config --quiet`、启动/就绪/限定停止验证。权限、隐私、分享撤销、媒体、导入、迁移或备份变更必须覆盖真实契约，构建或 HTTP 200 不能替代。

### Trellis Plus: Playwright Validation Profile

- execution mode: 未配置；已有宿主依赖和 Docker 应用生命周期可用于后续选择。实施时固定 `project-local` / `docker-wrapper` / `ci`、匹配 browser/runtime 和精确命令；Compose CLI 可用不证明 daemon/浏览器可运行。
- setup/install: `frontend` 使用 npm/package-lock，尚无浏览器测试依赖、安装脚本或 browser 镜像。下一项批准的 UI 实施加入最小 dev-only Playwright Test 依赖及匹配浏览器 bootstrap；本次不安装、不虚构现有命令。
- app readiness: 现有 `./preview.sh` → Compose `up --build --wait -d`；web 容器 `http://127.0.0.1:80/`，宿主默认 health `http://127.0.0.1:8080/api/health`；base URL `http://127.0.0.1:8080`。隔离测试改为空闲 loopback 端口并在套件显式配置。
- focused test command: 未建立；下一项 UI 实施需提交可按测试名/文件运行的精确命令，不以临时探索或截图代替可复现套件。
- full/CI browser command: 未建立，没有 CI job；配置后记录实际全套命令及 CI 镜像/浏览器版本，不要求不存在的 `npm run test:e2e`。
- test location and config: 未建立；使用 `frontend` 现有 npm 工具链中的最小配置/回归测试，不另建平行 E2E 工程。
- browser projects and supported viewports: 无 browser project；当前 task 计划 375px 手机、1280px 桌面，历史截图 390px。实施前固定完整宽高/browser/device/touch 配置及命令，历史截图不是当前 project。
- mobile applicability and coverage: `mobile-required`；产品手机优先、桌面支持浏览/管理。受影响页面/核心交互都验证两端，即使未改响应式 CSS；分别记录布局、触控、导航、输入和最终状态。缺测试不构成 desktop-only；模拟不证明真机、移动引擎或原生 App，仅剩真实设备风险才请求真机复核。
- fixtures and test-data boundary: API 单测已有隔离 fixture，浏览器 fixture 未建立。新套件用独立数据库/媒体目录、受控测试账号/照片或边界明确的网络 mock；不使用默认实例、私人 session/生产账号。当前任务导入/发布/完成的事务及权限不能用 mock 全部 API 来证明。
- accessibility policy: 无扫描工具；按改动断言 role、accessible name、键盘/focus 与错误提示，优先语义 locator。涉及语义/交互时补适当扫描，扫描不证明完整可访问性。
- visual baseline policy: 无批准基线；截图作诊断。固定 OS/browser/fonts/data/viewport/动画且审核基线后才用像素断言，不自动接受失败快照。
- failure artifacts: 尚无固定报告/trace 路径；实施时在本 profile 固定实际位置并忽略产物。失败保留报告、截图、trace（失败或首重试）、控制台/网络日志；任务结果写正常 `verification.md`，临时材料可放 `/tmp`，不共享私人数据。

## Browser execution decision

先读本 profile 再查外部文档；持久约定被仓库证据改变时更新，任务只记录自身覆盖/结果。

能在本地/测试部署用受控数据验证则 `playwright-required`：建立或扩展并运行最小持久测试，断言操作/最终状态、变更状态、桌面/手机、键盘及权限。已有等效套件则 `playwright-existing-equivalent`，不强行迁移。仅主观无基线、原生/硬件或无法复制私有环境才 `playwright-not-effective`；缺依赖、浏览器、权限、fixture 或服务则 `playwright-unavailable`，记录实际尝试命令/错误和替代 CI/人工证据，不计通过。

当前产品 task 是 `playwright-required`，套件尚未建立，不能声称已经运行失败。本轮未改 UI，mobile 为 `mobile-not-applicable`，仅安装后续规则。失败先核对 PRD/design，不能删断言、放宽 selector 或无限加 timeout 获得绿色结果。

## Submit-ready human review gate

实现和检查后、提交或标 completed/archive 前，比较 diff、PRD 与实际证据：

- `human-required`：关键自动检查未跑、必需手机覆盖缺失、测试没验证承诺行为；或权限/认证/安全、迁移/删除、部署、生成资产、收费/外部服务、真实设备/辅助技术/私有环境及未解决产品/视觉判断。先完成可运行检查，仅对剩余风险请求反馈。
- `human-optional`：自动验证覆盖验收，仅剩低风险偏好；明确不阻塞，按已有授权继续。
- `human-not-needed`：文档/机械修改经相应检查，或浏览器路径/视口通过且没有有意义的人类判断；说明具体理由。

需反馈时列实际改动、已执行命令/结果、用户需执行的最小步骤和希望返回的 pass/fail、失败截图/日志、预期/实际及环境信息；说明影响提交的问题，不笼统要求“测试一下”。复用已有批准/提交授权，不制造重复确认。浏览器通过不解除安全/数据或主观判断，也不自动触发通用人工 smoke。
