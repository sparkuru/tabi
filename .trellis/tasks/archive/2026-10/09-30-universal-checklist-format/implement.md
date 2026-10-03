# 实施和验收计划

## 工作组织与进入实施条件

保留一项复杂任务：导入、发布、直接完成与页面表达共同构成一条通用清单验收路径。按下列阶段实现和独立验证，最终做完整联调；本次不增加任务树来隐含依赖。

- [x] 创建任务并研究现有实现与既有产品决定。
- [x] 用户确认管理员导入发布、允许直接完成、重复导入不覆盖。
- [x] 完成 PRD 收敛、设计与本实施计划。
- [x] 校验 `implement.jsonl` / `check.jsonl` 中真实路径及准备状态；2026-10-01 保留原 7 条并显式注册新版 Trellis Plus 详情与 mainline，各 14 个真实上下文条目，任务仍为 `planning`。
- [x] 呈现完整规划摘要；2026-10-01 用户随后明确回复“开始实施”。
- [x] 已执行 `task.py start`，任务为 `in_progress`；按 Trellis 实施/检查子代理流程推进。后端、前端和开发/验收环境各有明确写入边界，由主会话协调、核实证据、更新规格和收尾。

## 1. 通用契约与事务导入（R1/R2/R5/R7）

- 新增独立格式模型、有效数据规范化、JSON Schema 生成及可定位错误；复用现有文本、地点、链接校验，所有通用字段拒绝未知值/版本。
- 实现文件 2 MiB/200 条限制和不写入的预览；服务端与前端上传/粘贴保持同一契约。
- 新增导入身份模型和加法迁移；实现事务导入、关联解析、审计、同摘要复用、内容冲突和数据库并发竞争处理。
- 为格式、查重、事务失败无残留、相同内容复用、管理员编辑/下架后再导入不覆盖、权限与 CSRF 写有行为价值的后端测试。
- 编写格式说明、生成 Schema、最小/待办/学习/OCR 样例，验证样例与同一解析器契约一致。

影响：`backend/app/schemas/imports.py` 或新格式模块、`backend/app/services/imports.py` 或新导入服务、`backend/app/api/routes/admin.py` 或独立管理路由、`backend/app/models/tables.py`、`backend/migrations/versions/`、`backend/tests/`、`docs/`、`backend/data/examples/`。新接口可拆路由/服务，避免继续扩张单一管理模块。

## 2. 发布清单及草稿条目（R2）

- 新增批量发布事务/审计与状态数量响应，保留旧单条接口。
- 覆盖发布草稿、已有公开项、跳过已下架条目、空清单拒绝、非管理员拒绝和来源信息保留。
- 迁移后运行 PostgreSQL `alembic upgrade head` / `alembic check`；并发导入用实际 PostgreSQL 验证。

影响：管理路由、管理响应契约、清单投影服务、对应后端测试。完成后为前端生成 OpenAPI/HeyAPI。

## 3. 直接完成与无内容记录（R3/R6）

- 移除创建/编辑记录及删除照片中冲突的非空限制；实现直接完成入口、操作指纹、记录复用与 PostgreSQL 行锁。
- 验证无内容默认私人、双击/重试/并发完成、主动重复记录、内容补充/清空、删除最后一条恢复进度、照片授权和分享撤销。
- 测试无内容记录公开后的真实展示数据；不把空正文误报成照片记录，不改变公共响应的隐私范围。

影响：`backend/app/api/routes/checkins.py`、`backend/app/api/routes/media.py`、记录服务/契约和对应测试。完成后重新生成 API 客户端。

## 4. 管理导入与发布 UI（R1/R2/R5/R7）

- 提供模板与字段说明链接、文件上传/粘贴、预览、字段错误与冲突反馈；输入变化使旧预览失效，失败保留输入。
- 导入成功选择新清单，显示草稿/已发布/已下架数量；默认发布按钮明确包含草稿条目数量，结果显示实际数量。
- 复用现有组件、数据请求和缓存模式；可拆分通用导入组件降低管理页复杂度。

## 5. 通用完成 UI 与文案（R3/R4/R6）

- 清单条目/详情提供“标记完成”和独立“添加记录”，忙碌期间阻止重复点击，刷新进度与历史。
- 编辑页面支持后续补文字/照片和无内容保存；历史、记录和分享提供纯完成状态。
- 首页直接展示清单；清理页脚、装饰副标题和空泛引导；无地点详情只展示真实内容，保留简短隐私和来源信息。
- 对照 UI/UX 研究检查标签、键盘、44px 点击目标、错误状态与手机布局。

影响：`frontend/src/features/admin/`、`checklists/`、`entries/`、`history/`、`sharing/`、`auth/`、`frontend/src/components/app-shell.tsx` 及必要的公共组件。

## 6. 质量门禁与完整路径（AC1–AC8）

先运行变化边界的测试，随后完成正常门禁；不为固定文案写镜像单元测试。

```sh
cd backend
.venv/bin/pytest -q
.venv/bin/ruff check app tests migrations
.venv/bin/ruff format --check app tests migrations
.venv/bin/alembic upgrade head
.venv/bin/alembic check
```

Alembic 与并发测试使用隔离 PostgreSQL。具体聚焦测试文件在实施后补入验证记录，不预称目前已存在或通过。项目共享规格要求在运行开发命令前核对 Docker 包装器；当前未跟踪 `hako`/`dev.sh`，实施开始时按 `.trellis/spec/trellis-plus/development.md` 的具体 checkpoint 建立实际需要的窄范围包装器并复用已有 Compose 生命周期；可用时读取 `dev-it-in-docker`。不能把未运行的检查计作通过。

```sh
cd frontend
npm run api:generate
npm run typecheck
npm run format:check
npm run build
```

API 生成前，从实际后端 `app.openapi()` 更新 `frontend/openapi.json`，再运行 HeyAPI；同时校验 Schema 与示例。格式说明中的错误路径、字段和限制须与真实响应一致。

浏览器路径采用 Playwright，在受控隔离数据上覆盖：

1. 桌面管理员上传学习 JSON → 预览 → 导入草稿 → 发布清单及条目 → 游客可浏览；重试导入复用结果，修改同 key 文件显示冲突。
2. 手机用户登录 → 无地点条目直接完成 → 进度增加一次 → 补文字和照片 → 分享 → 改私密后分享失效。
3. 无内容记录历史/分享正常显示，删除最后一条记录后未完成；已下架条目不被批量发布恢复。
4. 首页、无地点详情、错误/空/加载状态，键盘和可访问名称；375px 手机与 1280px 桌面，无横向溢出。

当前仓库未跟踪 Playwright 配置/测试，实施时按 `.trellis/spec/trellis-plus/validation.md` 建立最小可复现持久套件，补齐唯一共享 profile 的执行模式、精确命令、browser/viewport/fixture 和产物位置；不能以临时环境截图代替验收测试。浏览器/依赖不能运行时记录真实阻碍与截图/日志，不计作通过。浏览器证据保存到测试产物或 `/tmp`，不使用私人账号和照片。

## 7. 收尾与风险处理

2026-10-01 执行结果：阶段 1–5 已实施，全范围检查通过，最终 45 单元 + 4 PostgreSQL + 14 双视口浏览器通过；实际迁移/生成/构建/类型/格式和限定生命周期通过。规格已同步；证据见 `verification.md` 及 check/environment 报告。剩余为用户审阅具体结果并确认 `commit-plan.md`，之后工作提交、归档和 journal。未提前提交、归档或修改其他 task。

## 2026-10-04 实际 preview 同步验收

用户已授权创建实际 preview 管理员，并要求同步测试使用 preview 的连接方式；在当前任务中补齐验收路径，不新建产品任务。

- [x] 核对实际入口、运行源码/前端资源/迁移及管理员缺失。
- [x] 使用原 bootstrap 为该 preview 创建首个管理员，随机凭据仅保存至 owner-only `/tmp` 文件。
- [x] 为 preview 新增独立 Playwright 配置/桌面手机验收用例及 npm 运行入口；显式 URL 和凭据路径，不伪装为隔离写入实例。
- [x] 从用户使用的 preview HTTP 地址验证登录、管理员身份、管理页、合法 JSON 预览且清单不新增；持久检查最后退出测试会话并验证匿名401。
- [x] 检查测试代码类型/格式与失败配置路径，更新验证规范、实际证据和候选清单（preview类型、全格式、8个配置拒绝路径及有效配置列出2项通过）。
- [x] 用户认可实际 preview 交付及已发布的 OCR 第一块清单，并授权完整提交所有未提交文件。
- [x] 完成工作提交 `7f6eb74`，本任务搬至 archive/2026-10；journal 随归档提交之后独立记录，引用见 mainline。

- Trellis 检查代理对照所有 AC、跨层数据流、迁移/权限/事务、旧 OCR 回归与 API 生成证据检查；发现问题反馈给实施代理修复。
- 主会话检查 diff，更新产品规格中数据导入及无内容完成规则、后端执行契约和已过时的运行/验证资料；稳定约定写 spec，任务结果写 `verification.md`。
- 先完成可运行自动验证，再只针对剩余风险决定是否需人工验收；按现有工作流处理提交、任务归档与 journal。
- 新表加法迁移以保留数据为前提；完成记录已变更非空语义，旧代码回滚需先解决兼容性，不通过删除用户记录回滚。
