# Trellis Plus: Validation Profile

## Current repository evidence

2026-10-01：通用清单实现建立 `hako`/`dev.sh`、`@playwright/test` 1.62.1、`frontend/playwright.config.ts` 和 `frontend/e2e/`。当前任务已通过 45 项单元、4 项真实 PostgreSQL、14 个桌面/手机浏览器场景；具体证据留在 task verification，不代表之后的改动自动通过。MVP archive 的验证是历史证据。当前没有 CI job。

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

上列是已有宿主命令；标准 Docker 入口为 `./hako python ruff check app tests migrations`、`./hako python ruff format --check app tests migrations`、`./hako python pytest -q`、`./hako node npm run typecheck` / `format:check` / `build`。首次依赖初始化见 development.md。API 改动需更新实际 `app.openapi()` → `frontend/openapi.json`，再 `./hako node npm run api:generate` 并验证生成客户端，不手改生成文件。格式检查包含持久浏览器套件；`./hako node npm run typecheck:e2e` 单独检查测试配置和代码。

`backend/tests/conftest.py` 用隔离 SQLite/媒体目录。迁移、数据库约束/并发、行锁需在独立 PostgreSQL 项目执行 `(cd backend && .venv/bin/alembic upgrade head)` / `alembic check` 和针对性的并发路径，不能用默认实例。fixture/连接来源在 task 记录，不输出凭据。历史 TestClient 在 sandbox 内挂起而在受允许环境通过；再次遇到须报告实际阻碍，不能计通过。

纯文档/规则更新核对链接、JSONL 格式/去重、加载解析、受保护文件 hash、路径分类与 `git diff --check`，不运行应用全套。配置/脚本变更增加语法、Compose `config --quiet`、启动/就绪/限定停止验证。权限、隐私、分享撤销、媒体、导入、迁移或备份变更必须覆盖真实契约，构建或 HTTP 200 不能替代。

### Trellis Plus: Playwright Validation Profile

- execution mode: `docker-wrapper`。浏览器用官方 `mcr.microsoft.com/playwright:v1.62.1-noble`，其内置 Node 24.18.1 符合项目最低要求；开发命令用 Node 22，测试依赖和浏览器 revision 精确匹配。容器在独立 Compose 网络执行。
- setup/install: `./hako node npm ci` 安装锁定依赖；`./dev.sh` 建立隔离应用网络；官方镜像提供 Chromium，不向宿主安装浏览器。依赖/镜像更新需保持版本匹配并重验。
- app readiness: `./dev.sh` → 独立 Compose `up --build --wait -d` 并在 web 请求 health；宿主 `http://127.0.0.1:18080/api/health`，浏览器容器 base URL `http://web`。`./infra/e2e-seed.sh` 只初始化该隔离项目。`preview.sh` 使用根 `.env` 的预览实例，不能拿默认数据实例运行可写测试；预览生命周期与配置检查见 [development.md](development.md)。
- focused test command: `./hako browser npm run test:e2e -- e2e/completion.spec.ts -g 'guest completion'`；可追加 `--project=mobile` 或其他文件/标题。
- full/CI browser command: `./hako browser npm run test:e2e`；列表检查 `./hako browser npm run test:e2e:list`。目前没有 CI job，不声称 CI 通过。
- test location and config: `frontend/e2e/` 和 `frontend/playwright.config.ts`，复用现有 npm 工具链，单 worker、无默认重试。延迟真实请求用于 busy/loading 检查；事务/隐私不以 mock 响应代替。
- browser projects and supported viewports: Chromium `desktop` 1280×800、`mobile` 375×812（isMobile/hasTouch，deviceScaleFactor=1）；locale zh-CN、timezone Asia/Shanghai。手机主流程和桌面管理都运行；模拟不证明真机或其他移动引擎。
- mobile applicability and coverage: `mobile-required`；产品手机优先、桌面支持浏览/管理。受影响页面/核心交互都验证两端，即使未改响应式 CSS；分别记录布局、触控、导航、输入和最终状态。缺测试不构成 desktop-only；模拟不证明真机、移动引擎或原生 App，仅剩真实设备风险才请求真机复核。
- fixtures and test-data boundary: `./infra/e2e-seed.sh` 在 `tabi-checklist-dev` 中创建按 project/spec 分组的合成账号和原 OCR 草稿，使用合成 PNG。Browser base URL 为网络内 `http://web`，`hako browser` 设置 `TABI_E2E_ISOLATED=1`；这是误操作防护，不是任意目标授权。API 单测的真实限流器按 fixture 隔离；浏览器使用真实限流、不放宽生产限制。测试重跑需重建/重启这个隔离 API 或使用新账号，不能更改默认实例。
- accessibility policy: 无扫描工具；按改动断言 role、accessible name、键盘/focus 与错误提示，优先语义 locator。涉及语义/交互时补适当扫描，扫描不证明完整可访问性。
- visual baseline policy: 无批准基线；截图作诊断。固定 OS/browser/fonts/data/viewport/动画且审核基线后才用像素断言，不自动接受失败快照。
- failure artifacts: 忽略的 `frontend/playwright-report/`、`frontend/test-results/`；失败保留 screenshot/video/trace，HTML 与 console/network 诊断。成功截图也可附于 test-results，review 副本可放 `/tmp`。任务结果写 `verification.md`，不共享私人数据。截图无批准像素基线，不替代流程断言。

## Browser execution decision

先读本 profile 再查外部文档；持久约定被仓库证据改变时更新，任务只记录自身覆盖/结果。

能在本地/测试部署用受控数据验证则 `playwright-required`：建立或扩展并运行最小持久测试，断言操作/最终状态、变更状态、桌面/手机、键盘及权限。已有等效套件则 `playwright-existing-equivalent`，不强行迁移。仅主观无基线、原生/硬件或无法复制私有环境才 `playwright-not-effective`；缺依赖、浏览器、权限、fixture 或服务则 `playwright-unavailable`，记录实际尝试命令/错误和替代 CI/人工证据，不计通过。

当前产品 task 是 `playwright-required` / `mobile-required`，持久套件已建立且两端实际通过。失败先核对 PRD/design，不能删断言、放宽 selector 或无限加 timeout 获得绿色结果。焦点回归须考虑现有 30 秒查询 freshness；使用 Playwright 时钟和浏览器实际事件传播语义，不以长 sleep 或修改生产缓存规则代替。

## Submit-ready human review gate

提交验收前同时执行下节的实际 preview 同步检查；隔离数据库测试和截图不能替代用户确认的 preview 登录入口及账号可用性。

实现和检查后、提交或标 completed/archive 前，比较 diff、PRD 与实际证据：

- `human-required`：关键自动检查未跑、必需手机覆盖缺失、测试没验证承诺行为；或权限/认证/安全、迁移/删除、部署、生成资产、收费/外部服务、真实设备/辅助技术/私有环境及未解决产品/视觉判断。先完成可运行检查，仅对剩余风险请求反馈。
- `human-optional`：自动验证覆盖验收，仅剩低风险偏好；明确不阻塞，按已有授权继续。
- `human-not-needed`：文档/机械修改经相应检查，或浏览器路径/视口通过且没有有意义的人类判断；说明具体理由。

需反馈时列实际改动、已执行命令/结果、用户需执行的最小步骤和希望返回的 pass/fail、失败截图/日志、预期/实际及环境信息；说明影响提交的问题，不笼统要求“测试一下”。复用已有批准/提交授权，不制造重复确认。浏览器通过不解除安全/数据或主观判断，也不自动触发通用人工 smoke。

## Actual preview synchronous acceptance

### 1. Scope / Trigger

2026-10-04 用户确认：后续同步验收通过 preview 对应的连接方式测试。交付、提交/归档审阅前，使用用户实际访问的 HTTP(S) 地址，核对运行版本、登录账号及受影响页面。先确认实际实例和数据边界；URL、Cookie、CSRF、代理转发和已部署资源都是该入口验收的一部分。

### 2. Signatures

前端独立配置 `playwright.preview.config.ts`，测试目录 `e2e-preview/`；不复用要求 `TABI_E2E_ISOLATED=1` 的可写 E2E 配置。

```sh
cd frontend
TABI_PREVIEW_BASE_URL='<user-confirmed-http-origin>' \
TABI_PREVIEW_CREDENTIALS_FILE='<owner-only-credentials.json>' \
  npm run test:preview
npm run typecheck:preview
```

使用项目锁定的 Playwright/Chromium 版本。浏览器容器需可访问该实际地址；本机 Docker-host 入口可用已缓存匹配镜像和 `--network host`，仅挂载前端源码及只读凭据文件。容器 HOME 使用临时目录，不挂载宿主 HOME。不能在失败后静默切换 `http://web` 或 dev 端口。

### 3. Contracts

`TABI_PREVIEW_BASE_URL` 必填、显式 HTTP(S) origin，取用户确认入口而非固定写死本机 IP。`TABI_PREVIEW_CREDENTIALS_FILE` 指向本地 JSON 的 `email` / `password` 字符串，文件 owner-only；密码不进入源码、命令参数、Git、日志、trace/video 或 storageState。初始管理员缺失时先报告，创建/重置需取得该实例的明确授权；新增账号授权不等于提交/归档授权。

当前最小实际检查：从 `/auth?redirect=%2Fadmin` 输入账号登录，核对真实管理员身份和 `/admin`，经页面填写合法合成 JSON 并请求 `/api/admin/checklist-imports/preview`，断言成功和不新增清单，退出测试会话。桌面 1280×800、手机 375×812，单 worker、无默认重试。截图仅在登录后截预览区域，避免真实私人内容和密码输入过程。

此实际 preview 检查允许登录/退出会话与不写入内容的预览；导入、发布、记录、删除、恢复、种子、重建数据或更改账号必须在获授权的测试数据范围执行。并发/事务/隐私完整回归保留独立数据隔离，同步检查也必须通过部署的 HTTP 入口验证关键路径；不能将隔离库结果描述为实际 preview 已通过。

### 4. Validation & Error Matrix

| 条件 | 验收结果与动作 |
| --- | --- |
| URL/凭据路径缺失或格式无效 | 启动失败，明确缺失配置；不猜测 dev 地址或账号 |
| 实例无管理员、登录失败、角色不符 | 同步验收未通过；查明实际账号，不重置或降低权限绕过 |
| URL 不可达、TLS/代理失败 | 同步验收未通过；保留脱敏错误，不关闭 TLS 验证 |
| 运行版本/迁移与候选不一致 | 报告版本漂移，更新并确认实例后重验；不沿用旧截图 |
| 预览错误或清单新增 | 同步验收未通过；停止后续写入检查，核对 API/CSRF/事务 |
| 桌面/手机通过 | 记录准确 URL、视口、覆盖、日期和剩余人工判断 |

### 5. Good / Base / Bad Cases

Good：用户入口与候选版本一致，账号能登录，管理预览通过，两端有实际证据。Base：真实账号缺失时先查明并获授权初始化，再验证同一入口。Bad：提供 dev 库账号，让用户在另一 preview 数据库验收；或者设假 `TABI_E2E_ISOLATED=1` 对 preview 跑全套写入测试。

### 6. Tests Required

持久检查必须断言实际登录响应、管理员角色、管理页、真实 JSON 预览成功和不新增清单；结束退出会话。URL/凭据配置失败路径、测试类型和格式需验证。运行源码/资源/迁移的一致性证据与账号初始化结果记录在任务 verification，避免输出数据库凭据或私人数据。失败截图/报告也须遵守凭据脱敏范围。

### 7. Wrong vs Correct

Wrong：把 `18080` 隔离 dev 的账号和通过结果作为用户在其他 preview 地址上的验收依据。Correct：核对用户确认的 preview URL、版本及该库账号，用 `test:preview` 通过同一 HTTP 入口完成同步验收，再呈现具体交付；完整回归与实际入口结果分别准确记录。
