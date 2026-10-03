# 实施与验收记录

## 批准与范围

2026-10-01 用户在完整规划摘要后明确回复“开始实施”。`task.py start` 成功，状态为 `in_progress`。以 PRD 的 R1–R7、AC1–AC8 和已评审 design/implement 为准；不部署、不导入真实实例、不修改既有用户数据。

## 实施分工

- 后端代理：`backend/**`、格式说明和 JSON Schema；契约、原子导入、发布、直接完成、兼容和后端测试。
- 前端代理：`frontend/**` 产品界面及从实际 OpenAPI 生成的客户端。
- 环境代理：开发包装器、隔离测试配置、持久 Playwright 套件；与前端协调 package scripts。
- 主会话：阶段、证据核实、规格同步、最终检查和收尾；独立检查代理在实现完成后介入。

## 验收映射

| 标准 | 验证重点 | 当前证据 |
| --- | --- | --- |
| AC1 | 同一 v1 契约、模板/Schema/主题示例、可空地点 | 解析器/Schema/示例单测、运行模型与产物一致、真实下载通过 |
| AC2 | 文件与粘贴预览、定位错误、管理员/CSRF、原子导入 | API 权限/字段/回滚及双视口上传、粘贴、预览失效、错误保留通过 |
| AC3 | 显式批量发布、跳过下架、草稿隔离 | 服务端状态/计数和真实浏览器发布、游客草稿拒绝、下架保留通过 |
| AC4 | 内容规范化、复用/冲突、并发、编辑和记录保留 | 同内容/变更重试与编辑保留、真实 PG 竞争/零孤儿、浏览器复用/冲突通过 |
| AC5 | 私人直接完成、补文字/照片、主动多次记录、进度/历史/分享 | 单元/PG 并发及双视口完整记录路径、登录续接、同页再次完成通过 |
| AC6 | 无内容显示、清空/移除照片、删除恢复进度、隐私撤销 | 单元/真实浏览器空记录、原图拒绝、清空/删除/分享失效通过；隐藏规则原回归通过 |
| AC7 | 简洁文案、条件详情、桌面/手机管理和用户路径 | Chromium 1280×800、375×812 流程/状态/无溢出/键盘标签通过，主会话查看截图 |
| AC8 | OCR 172 条/原 ID/来源/复核/种子和旧导入兼容 | 原种子/复核回归及全部 172 行 ID/来源/状态/核实信息前后快照通过；种子源码和数据无 diff |

## 已运行检查

- 规划上下文：`task.py validate .trellis/tasks/09-30-universal-checklist-format`，implement/check 各 14 个真实条目，通过。
- 最终 `./hako python pytest -q`：45 passed、4 skipped；跳过的 PG 用例在独立 PostgreSQL 专门运行，4 passed。Ruff lint/49 文件格式通过。
- PG `alembic upgrade head` 至加法迁移 `a748bd701acf`，`alembic check` 无新增操作；并发套件各使用 UUID schema 并仅清理自身 schema。不是 SQLite 锁证明。
- 最终 OpenAPI/HeyAPI 生成、前端构建/类型、浏览器测试代码类型/格式、Schema 和六个文档/示例构建资产与来源一致通过。
- 完整 `./hako browser npm run test:e2e`：**14 passed (19.9s)**；日志 `/tmp/tabi-universal-e2e-final.log` 已由主会话读取核实，HTML `frontend/playwright-report/index.html`。重点游客续接/同页重完成 2 项也单独通过。
- 脚本 Bash/ShellCheck/shfmt、Compose quiet 校验及独立项目启动/限定停止/端口释放/保留卷重启通过。当前供审阅实例为 `http://127.0.0.1:18080`，停止用 `./dev.sh down`，不涉及默认实例。

详细命令、修复与 AC 映射见 `backend-verification.md`（首次后端交付）、`check-verification.md`（最终全范围 45+4+14）、`environment-verification.md`（浏览器/生命周期）。运行新 checker thread 时触发运行时线程上限，复用前端线程加载 Trellis check 指令；主会话独立审阅 UI 与最终日志。未将首次失败或中间 12/14 当作通过。

## 发现与修复

HTTP 环境随机键不可用、登录跳转参数二次归一化、文本框标签不稳定、URL/名称规范化和整数超出 SQL 存储边界、最终生成契约漂移均修复并回归。请求键使用安全随机数；登录完成指令消耗一次；字段拒绝保持可定位，输入与原数据保留。测试账号/真实限流器按隔离场景组织，没有放宽生产权限或限流。

## 规格同步与范围保护

产品需求/架构、后端通用执行契约/索引/MVP 引用、开发与浏览器 profile、连续性和 mainline 已同步；受保护 Trellis runtime/platform 文件、其他任务、旧 OCR 完整种子、本地 `infra/.env` 和默认数据实例未修改。只增加锁定 Playwright 开发依赖，已有锁文件平台 metadata 保留；缓存、依赖、报告与测试截图不进入候选提交。

## 审阅资料

- 手机无地点详情：`/tmp/tabi-universal-review/mobile-no-location-item.png`。
- 手机私人空记录：`/tmp/tabi-universal-review/mobile-completion-record.png`。
- 管理员导入预览：`/tmp/tabi-universal-review/desktop-admin-import-preview-viewport.png`。
- 人工确认的最小内容：查看这些界面与候选 diff，确认导入/发布、私人直接完成和简洁文案符合期望；若不通过，返回页面/预期/实际。自动权限/迁移证明见上述日志，不要求再手工重复完整套件。

## 提交与人工风险

`human-required`：任务涉及权限和迁移，且界面没有批准的视觉基线；可运行自动检查已全部完成，剩余为具体交付审阅/提交确认。手机验证为 Chromium 触控模拟，未声称真机、其他移动引擎或完整辅助技术验收；不存在 CI 证明。回退至旧版本前须兼容新空记录，不能靠删除用户历史回滚。

实现与检查已完成，状态仍为 `in_progress`。候选提交见 `commit-plan.md`；用户尚未批准工作提交/归档，未暂存、提交或归档。原 `00-bootstrap-guidelines` 保持不动。批准后按工作提交 → 有一次 Codex trailer 的归档提交 → 独立 journal 顺序完成，再更新 mainline。

## 2026-10-03 收尾准备

用户明确要求“先收尾通用清单升级，准备提交与归档”。本轮核对真实 Git、任务和历史最终浏览器日志，查看手机无地点详情、私人空记录和管理员导入截图；未重跑 45+4+14 产品测试，不把历史结果写成本轮执行。

`task.py validate` 当前 implement/check 均为 15 条真实引用并通过；前文 14 条是实施阶段历史结果。`git diff --check` 通过，index 原为空。收尾检查代理确认独立预览 bootstrap 与产品范围边界，并验证完整 hako 与 HEAD 旧 Compose 的合成环境隔离兼容性。当前和旧 Compose 的配置检查、脚本语法/ShellCheck/shfmt 通过；本轮没有启动/停止实例或读取本地 dotenv。

本轮实际检查：`bash -n hako dev.sh infra/e2e-seed.sh preview.sh`、`sh -n infra/docker/api-entrypoint.sh`、上述脚本的 `shellcheck` / `shfmt -d`、`./hako compose config --quiet` 及 HEAD 旧 Compose 快照的配置检查均通过。冲突合成环境夹具验证项目为 `tabi-checklist-dev`、数据库和 DB/media 卷属于该项目、宿主 loopback 18080/18443 与旧容器端口 80/443 一致；这仅证明配置兼容，不是新一次运行或业务测试通过。只读检查详情在 `/tmp/tabi-universal-closeout-review.md`。

原 commit-plan 漏列的独立预览文件及共享文件边界已修正。本轮候选为 79 个产品文件，其中 5 个共享文件按产品内容部分暂存；预览的 5 个完整文件及共享余量保持工作区原状。候选快照在 `/tmp/tabi-universal-closeout/`，执行前须复核 HEAD 与候选内容；归档后仍有已识别的预览改动，不能自动清理。

尚未执行暂存、工作提交、归档或 journal。剩余决定是用户审阅具体候选及界面后授权执行；手机模拟、无批准视觉基线和旧代码对空记录的回退限制沿用上节说明。

## 2026-10-04 实际 preview 验收入口核对

用户指出实际验收地址为 `http://192.168.9.4:7081`，此前给出的 `18080` dev 测试账号不能用于该实例。此前截图/自动测试属于隔离数据库，不能替代用户在实际 preview 的可登录验收入口。

只读核对：7081 对应 `infra-web-1`，关联 `infra-api-1` / `infra-db-1`；数据库迁移为 `a748bd701acf`，system_admin/content_admin 查询返回 0 行。38 个运行中后端源码文件的 SHA-256 与工作区逐一一致；preview 前端 index.html、JS、CSS 与历史验收构建字节摘要一致（JS `index-Bs-eXz8F.js`）。版本一致不等于已完成该实例的登录与管理员操作验证。

实际 preview 目前没有管理员，须经用户授权在该库初始化专用验收管理员，再从此入口验证登录及管理页。此动作会新增账号，不能用旧任务的“仅隔离测试、不改默认实例”批准代替。当前未初始化或重置账号、未修改数据或服务，未读取密码哈希/本地 dotenv，也未提交/归档。一次 docker-exec API 查询因新进程未继承 entrypoint 导出的数据库 URL 而失败；改用数据库容器的本地只读 psql 查询成功，失败未当作应用运行错误或通过。

收尾候选已因本节证据及 mainline 更新而变化；10-03 的 `/tmp/tabi-universal-closeout/product.patch` 不能直接执行。应在管理员与实际入口验证、用户交付审阅通过后重新生成候选、核对源文件摘要，再请求/使用具体提交授权。

## 2026-10-04 preview 管理员初始化与实际 HTTP 检查

用户明确回复“授权”，并要求后续同步测试使用 preview 对应的连接方式。本轮在已确认的 `infra` preview 调用原 `app.bootstrap_admin`，创建 `admin@preview.example.com`；只读复核角色为 `system_admin`。随机密码经标准输入进入容器，不进入命令参数/源码/Git，凭据保存在 `/tmp/tabi-preview-review/credentials.json`（0600，上级目录0700）。未重置既有账号、合并数据库、seed OCR、重建/停止服务或修改既有内容。

独立检查代理通过 `http://192.168.9.4:7081` 实际浏览器入口，在 Chromium 1280×800、375×812 各完成一次表单登录：登录200、跳转 `/admin`、`/api/auth/me` 为 system_admin、管理和导入控件可用；合法合成 JSON 的预览为200/ready/1item，两端清单数量各为0→0。health、模板、Schema、字段说明实际下载、无水平溢出及44px按钮检查通过；0 page errors、0意外写入请求。只允许登录和不写入内容的预览 POST，未点击导入/发布。登录会产生已授权会话，因此不把“未创建清单”误报为没有任何数据库写入。

实际入口检查报告 `/tmp/tabi-preview-review/report.md`，脱敏结果 `result.json`，桌面/手机预览截图 `desktop-admin-preview.png` / `mobile-admin-preview.png`；主会话已读取结果并目视截图。浏览器通过缓存的匹配 Playwright Docker 镜像、host 网络访问用户的实际 LAN 地址，未通过容器别名或直接数据库调用替代 HTTP 登录。首次依赖加载失败发生在登录前，修正 NODE_PATH 后成功，不将失败计通过。

本轮 actual-preview 检查补齐真实入口可登录验收；不替代此前隔离库的45+4+14业务/并发套件，手机仍为模拟视口。用户同步验收约定已写入 `.trellis/spec/trellis-plus/validation.md`；持久 `test:preview` 的类型、格式及实际运行结果另在完成后补录。管理员初始化授权不包括提交/归档，当前均未执行。

### 持久 preview 检查

新增 `frontend/playwright.preview.config.ts`、`frontend/e2e-preview/access.spec.ts`，并在 package scripts 提供 `test:preview` / `typecheck:preview`，纳入已有格式检查；无新增依赖或锁文件更新。配置要求显式 HTTP(S) origin、绝对本地 owner-only 凭据 JSON，不回退 dev，不伪设隔离写入标志；单 worker、无重试、不导出 trace/video/storageState。失败仅保留阶段、HTTP状态和错误类型，不输出可能含密码的 Playwright 调用日志或实际页面 aria 快照；Playwright 仍可能保存只含脱敏错误/源码的 error-context，不能声称所有失败文件都被禁止。

持久 `npm run test:preview` 在实际 `http://192.168.9.4:7081` 上已通过桌面/手机 **2/2**。每端经真实表单登录、检查管理员身份、管理页及JSON预览ready，核对前后清单列表/数量未变化；最后调用真实logout204并验证me401。网络边界限制浏览器到同源、拒绝其他写入请求；测试专用 APIRequest 仅执行受控GET与logout。截图仅含合成预览区域，位于被忽略的 `frontend/test-results/preview/`。

本轮成功运行命令（凭据值不在命令中）：

```sh
docker run --rm --user 1000:1000 -e HOME=/tmp \
  --network host --ipc=private --shm-size=1g \
  -e TABI_PREVIEW_BASE_URL=http://192.168.9.4:7081 \
  -e TABI_PREVIEW_CREDENTIALS_FILE=/run/preview/credentials.json \
  -v /home/wkyuu/cargo/repo/37-tabi/frontend:/work \
  -v /tmp/tabi-preview-review/credentials.json:/run/preview/credentials.json:ro \
  -w /work mcr.microsoft.com/playwright:v1.62.1-noble npm run test:preview
```

主会话提供 `/tmp/tabi-preview-review/login.txt`（0600）供用户获取该实际入口的邮箱/随机密码；凭据文件不进入候选提交。当前候选新增2个测试文件，合计81个；实际preview初始化/验收与独立预览脚本bootstrap的提交边界分别记录，不混入另外5个完整文件及共享余量。仍待用户在此入口审阅具体交付后批准提交/归档。

最终 `./hako node npm run typecheck:preview`、`./hako node npm run format:check`、`git diff --check` 通过。配置仅加载的失败矩阵覆盖缺URL、错误scheme、URL内凭据、URL额外路径、缺凭据路径、相对路径、文件不存在、group/world可读凭据文件，共8项正确拒绝；有效配置列出2项。最后追加的owner-only权限检查经类型/格式与配置列表再次验证，未追加登录；持久业务2/2是在该权限检查追加前运行，不能声称追加后重新执行了登录。

脱敏证据为 `/tmp/tabi-preview-review/persistent-preview-result.json`、`persistent-preview-test.log`、`preview-config-matrix.json`、`persistent-desktop-preview.png` 和 `persistent-mobile-preview.png`；主会话已读取运行结果和配置矩阵。增量检查结果保存为 `/tmp/tabi-preview-review/persistent-review.md`。运行失败提示保留阶段/HTTP状态/错误类型，详细断言在持久源码中；不共享真实页面内容或凭据值。

## 2026-10-04 用户验收与完整提交授权

用户在实际 preview 验收后认可效果，并明确要求“提交吧；包括所有脏文件”。此前未获提交授权及预览部分排除的记录是历史状态，现以本节和更新后的 commit-plan.md 为准：完整提交当前 86 个文件，再归档本任务并记录 journal。独立开发规范初始化任务保持原状态。源码和运行脚本在最终审阅后未再改动；本次完成文档及 Git 生命周期，不把历史完整套件记作重跑。

用户另行授权无需创建 Trellis task 的数据整理、导入与发布：取 archive/ocr.md 第一块“北京《Delicious》刊”的原始 70 行，整理为“北京美食·《Delicious》刊”，稳定 key 为 ocr-beijing-delicious-v1。名称、原地址/区域、来源、推荐及顺序逐项与第一块及 OCR 种子前 70 行对照；4 条仅区域的记录保留 area，其余 66 条为 physical，verified_at 均为 null，明确提示历史 OCR 未核实。未编造坐标、核实日期或现状。

在实际 http://192.168.9.4:7081 通过浏览器上传、预览 70 条、导入 201、明确批量发布 70 条；管理员清单数量 0→1。所有 70 条字段逐项持久化核对一致，匿名 API 返回 70 条，公开页面桌面/手机均通过，最后退出 204。清单 ID：22909b37-a11e-406c-8bd4-f01180f53f58。数据操作与本开发任务的代码验收分开记录，没有补建数据任务；临时 JSON 与脱敏结果在 /tmp/tabi-ocr-first/，不进入 Git。用户随后认可页面并授权完整提交。

人工交付审阅已通过。手机检查仍为 Chromium 触控模拟；历史 OCR 未核实及旧代码对空记录的回退兼容限制继续适用。完成状态和工作/归档提交引用在实际执行后写入 task.json 与 mainline。
