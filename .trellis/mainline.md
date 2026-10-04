# Trellis Mainline

## Initiative

- title: 清单打卡系统：首版基础与通用清单演进
- parent task: none
- objective: 交付可在手机浏览器完成公开清单发现、重复打卡、个人回看及可控公开分享的响应式 Web 应用；美食和游玩主题共用同一流程。
- owner decision: 2026-09-28 原 PRD 转为本记录与 product specs；首版基础随后完成并归档。2026-10-01 用户先授权以 `upgrade trellis plus` 提交共享规范，随后恢复通用清单 task，在最终规划评审后明确批准“开始实施”。此批准仅覆盖当前任务，不构成 serial 授权。

## Requirements And Sources

- 原根 PRD 已转存 `.trellis/spec/product/requirements.md`（定位、领域不变量、首版验收）与 `architecture.md`（技术栈、隐私、数据/媒体边界）。不重建已转存原文；根 `readme.md` 的目录树只作历史示例，实际命令以清单、源码和运行文件为准。
- 已交付首版：账号、公开清单/条目、重复记录/去重进度、私人媒体、受控分享、管理员及 OCR 参考数据。证据见 MVP archive 的 PRD/design/verification；历史验证不证明后续变更通过。
- 当前需求：`.trellis/tasks/archive/2026-10/09-30-universal-checklist-format/prd.md` 的 R1–R7、AC1–AC8；用户已确认管理员导入发布、无内容直接完成、同 key/同内容复用而内容变化冲突。2026-10-01 最终规划评审后用户明确回复“开始实施”；任务已启动。批准范围以 `prd.md`、`design.md`、`implement.md` 为准。
- 本任务已实现并验证通用导入和无内容完成，产品/后端执行契约及开发/验证 profile 已同步。隐私、所有权、历史保留、OCR ID/来源/真实核实状态保持原契约。
- 非目标：普通用户自建/协作、文件同步覆盖、CSV/Excel、导出、任意字段编辑器、周期待办、自动抓取/实时核查。邮箱验证/找回/注销、地图费用/来源、治理和保留期限仍是后续决定，不能自动进入现有范围。

## Continuation

- mode: guided
- serial authorization: none
- next pulse: user-requested or after archive

## Ordered Work

只记录已有工作的实际状态，不把原技术依赖建议变成批准排期。没有 parent/child 计划或 serial 授权。

| order | task / existing work | state | readiness and dependency evidence |
| --- | --- | --- | --- |
| 1 | `.trellis/tasks/archive/2026-09/09-29-checklist-mvp/` | complete | Work `b22105a`、archive `d92afbb`；verification 记录应用/数据库/恢复及 172 条参考内容验收和现状未核实限制。 |
| 2 | 本地预览入口 | complete | `2595100` 增加 `preview.sh`、地址配置和已有 Compose 生命周期，无独立 task；不新建任务补历史。 |
| 3 | `.trellis/tasks/archive/2026-10/09-30-universal-checklist-format/` | complete | 实现与全范围检查通过：45 单元、4 PostgreSQL、14 桌面/手机浏览器，迁移/构建/格式及生命周期通过；实际 preview 与用户验收通过；Work `7f6eb74`、archive `9171c39`；任务 completed，收尾 journal 独立记录。 |
| 4 | `.trellis/tasks/archive/2026-10/00-bootstrap-guidelines/` | complete | 2026-10-04 用户明确要求补齐现有 `00` 后提交归档，不新建任务。11 份后端/前端指南已按真实源码填充，索引与 context 同步；例子、链接、占位清理与 diff 检查通过，详见任务 verification。Work `86b4318`；archive `62aa9ee` 含恰好一次 Codex trailer，task completed。 |
| 5 | 预览输出与运行规范整理 | complete | Work `86b4318` 覆盖开始时的 18 个脏路径；脚本/夹具、Compose 配置、Node 22 类型/格式/构建、独立 Docker 生命周期及实际入口匿名桌面/手机检查通过；README 原有删除与运行内容迁入 spec 一并提交。 |
| 6 | 检查期间新增的种子/备份忽略文件变动 | committed with known validation failure | Work `8e9f20c`：用户在得知种子三项校验错误与备份忽略保护移除后，明确回复“一并检查并提交”。按现状纳入独立提交，不恢复用户删除的字段或忽略文件；JSON 语法与 diff 检查通过，seed schema 校验未通过。此决定在 `00` 归档后到达，不属于指南任务验收。运行规格同步为条件式校验契约，不声称当前文件必然可导入。 |

## Evidence and Decisions

- completed evidence: 上表及已归档 verification；2026-10-01 的 Trellis Plus 更新已独立提交。当前产品实施的新证据记录在任务 `verification.md`，不沿用历史检查结果声称通过。
- current blocker / dirty-state warning: 开始时脏文件及补齐 `00` 指南已由 Work `86b4318` 提交，archive `62aa9ee` 完成归档。检查中新出现的种子修改与 `backups/.gitignore` 删除也已明确获准按现状提交。已知未修复问题：seed 缺必填 `source_file`/`source_sha256`，首个 `source_note_prefix` 为空，现有 seed 命令校验失败；删除备份忽略文件后不得误加真实备份。忽略的 dotenv/凭据/缓存/测试产物不纳入。
- next user decision: 建议后续先决定如何修复种子与现有 schema 的不兼容；当前授权仅为保存这些变动，不推导额外产品任务或 serial 授权。手机检查为 Chromium 触控模拟，真实设备/辅助技术未证明；旧版本回滚须兼容新空记录。
- actual preview review: 用户确认验收入口为 `http://192.168.9.4:7081`（infra 项目），授权创建首个管理员并要求后续同步测试通过 preview HTTP 入口。38 个运行后端源码文件与工作区一致、前端资源与验收构建一致、迁移为 `a748bd701acf`。实际 HTTP 桌面/手机登录、管理页和 JSON 预览通过，持久 `test:preview` 2/2、类型/格式及 8 个配置拒绝路径通过，真实退出204/me401。随机凭据仅在 owner-only `/tmp` 文件；规则见 validation，实际证据见任务 verification。用户已在该入口认可效果。
- OCR publication: 用户另行授权不创建任务，第一块“北京《Delicious》刊”已整理为“北京美食·《Delicious》刊”，70 条经实际 preview 导入并发布；原始字段/顺序逐项核对，4 条区域、66 条实体地点，均保留历史 OCR 未核实状态。匿名 API 及桌面/手机页面通过；公开地址 `http://192.168.9.4:7081/lists/22909b37-a11e-406c-8bd4-f01180f53f58`。临时导入包与结果保存在 `/tmp/tabi-ocr-first/`，数据不属于 Git 文件。
- attribution evidence: 历史 MVP archive `d92afbb` 缺 Codex trailer，按新版仅记录、不修改历史；以后按 commit-policy.md 的受支持 `archive --no-commit` 路径一次署名。
- current preview verification: 本轮真实入口 `http://192.168.9.4:7081` 的标题/资源与构建一致，Chromium 桌面和手机匿名页面、登录表单及无横向溢出通过；preview status 与独立生命周期通过。历史 owner-only `/tmp/tabi-preview-review/credentials.json` 已不存在，故管理员登录与 authenticated `test:preview` 未重跑，不沿用历史结果计本轮通过。没有创建/重置账号；手机仍是模拟，域名 HTTPS 与跨设备可达性未验证。
