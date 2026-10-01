# Trellis Mainline

## Initiative

- title: 清单打卡系统：首版基础与通用清单演进
- parent task: none
- objective: 交付可在手机浏览器完成公开清单发现、重复打卡、个人回看及可控公开分享的响应式 Web 应用；美食和游玩主题共用同一流程。
- owner decision: 2026-09-28 原 PRD 转为本记录与 product specs；首版基础随后完成并归档。通用清单 task 的用户需求决定已记录，完整规划仍待最终评审后批准实施。2026-10-01 用户要求应用新版 Trellis Plus 且不新建 task，随后明确授权以 `upgrade trellis plus` 提交共享更新；不构成产品实施或 serial 授权。

## Requirements And Sources

- 原根 PRD 已转存 `.trellis/spec/product/requirements.md`（定位、领域不变量、首版验收）与 `architecture.md`（技术栈、隐私、数据/媒体边界）。不重建已转存原文；根 `readme.md` 的目录树只作历史示例，实际命令以清单、源码和运行文件为准。
- 已交付首版：账号、公开清单/条目、重复记录/去重进度、私人媒体、受控分享、管理员及 OCR 参考数据。证据见 MVP archive 的 PRD/design/verification；历史验证不证明后续变更通过。
- 当前需求：`.trellis/tasks/09-30-universal-checklist-format/prd.md` 的 R1–R7、AC1–AC8；用户已确认管理员导入发布、无内容直接完成、同 key/同内容复用而内容变化冲突。`design.md`/`implement.md` 是技术/验证计划，尚未获最终实施批准。
- 本任务拟议改变旧规格的 OCR 专属导入与记录非空限制；批准实施及验证前不将产品 specs 重写为已生效。其余隐私、所有权、历史保留、OCR ID/来源/真实核实状态保持原契约。
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
| 3 | `.trellis/tasks/09-30-universal-checklist-format/` | planning | 依赖 MVP；PRD/design/implement 和真实 context 已有，等待最终规划批准，后续需开发包装器和持久浏览器套件。 |

## Evidence and Decisions

- completed evidence: 上表及已归档 verification；2026-10-01 更新项目自有 Trellis Plus 规范、通知清单和现有任务 context。共享规范、mainline 和通知清单单独提交，已有 untracked task 的 context/规划调整保留本地；不执行产品代码、测试、部署或归档。
- current blocker / dirty-state warning: 本轮前通用清单目录是已有 untracked planning 工作，保留其内容/状态，不能自动提交。`00-bootstrap-guidelines` 是独立初始化任务（in_progress），不在本轮收尾。主会话启动无自动读取本层/mainline 入口，须按 `.trellis/spec/trellis-plus/index.md` 手动加载；浏览器套件缺口见 validation.md。
- next user decision: 本轮文档安装无需追加批准；继续通用清单产品工作时须最终评审规划并明确批准实施，`guided` 不自动执行。
- attribution evidence: 历史 MVP archive `d92afbb` 缺 Codex trailer，按新版仅记录、不修改历史；以后按 commit-policy.md 的受支持 `archive --no-commit` 路径一次署名。
