# Trellis Plus Project Policy

- ownership: project-shared
- source: project-authored
- tracking: commit this file and its referenced project-owned detail files

本层是共享开发规则的唯一来源，规则由项目编写，不复制工具源码。2026-10-01 按新版 Trellis Plus 核对，随后在获批准的通用清单任务中落实开发包装器、持久浏览器 profile 和产品契约；当前执行证据以 mainline/task 为准。

## Loading conditions

| 时机 | 必读资料 |
| --- | --- |
| 会话开始、长时间中断后、提交/归档前、选择后续工作 | 本文件、[mainline](../../mainline.md)、当前任务验收标准、[连续性](continuity.md) |
| 开发与修复 | [开发原则](development-principles.md)、[Docker/环境资料](development.md) |
| 新建或调整 preview.sh、Compose、环境配置；启动/停止预览 | [预览生命周期与环境契约](development.md#preview-and-service-lifecycle)；根 `.env.example` 与实际脚本 |
| UI 规划、实施、检查 | [前端设计流程](frontend.md)、[验证资料](validation.md) |
| 检查完成与提交前 | [验证和人工反馈门禁](validation.md) |
| 同步验收、提交/归档审阅前 | [实际 preview HTTP 入口与账号检查](validation.md#actual-preview-synchronous-acceptance) |
| 工作提交、归档、journal | [提交与归档署名](commit-policy.md) |
| 新增第三方材料或工具更新 | [通知清单](../../../third_party/index.md)、下列写入边界 |

## License and write boundary

- 共享写入范围：本目录、正常 task 文档/context、`.trellis/mainline.md`、`third_party/`；普通源码、测试、包装器仅在相应工作获授权后修改。
- Trellis `workflow.md`、`scripts/**`、`agents/**`、`config.yaml`、`.gitignore`、版本/hash/backup 元数据、AGENTS 的管理块及生成的平台文件只读；不补回旧定制、不配置 `update.skip`。要求维护上游 fork 时先说明具体来源与许可边界，等待单独决定。
- `.codex/`、`.agents/` 等平台目录和本地环境文件属于个人/本机配置；沿用忽略规则，不暂存、不强制添加。README 仅在用户明确要求时修改。
- 提交前逐路径分类，运行 `git diff --check`，检查 staged 列表；只添加明确授权的项目文件，不使用全仓库或强制暂存，不混入原有工作。
- Trellis 0.6.14 的许可证状态 `present`，已收集文本与安装包一致；UUPM 本地材料精确版本/许可状态 `unknown`，见通知清单。遇到未知来源记 `license-notice-needed`，继续独立工作，不伪造通知或修改根许可证。
- `trellis update` 后重检本层、mainline 和 task context。当前没有 `.backup-*`，本次未恢复备份，所有修改目标均不属于模板覆盖目标。2026-10-01 `trellis update --dry-run` 确认项目/CLI 同为 0.6.14、87 个模板无变化，spec/tasks/workspace 保留；npm 最新版本无法获取，不据此声称已核实远端最新。若以后更新状态不明，先运行 dry-run 并只读核对最新备份。

## Actual policy loading

`get_context.py --mode packages` 能发现 `trellis-plus` 层，但只列路径，不加载正文。根 AGENTS 管理块与已安装启动流程没有直接加载本层/mainline 的入口；未来主会话必须手动读取上表。没有修改受保护的启动文件，也没有宣称全阶段自动集成。

已归档 `.trellis/tasks/archive/2026-10/09-30-universal-checklist-format/` 的 implement/check 各 15 个条目，显式注册本层各适用详情、mainline 和已实施通用清单契约；原有条目保留。Codex `.codex/hooks.json` 的 `SubagentStart` 经 `.codex/hooks/inject-subagent-context.py` 读取 JSONL 引用，不递归读取 Markdown 链接。原生注入需要正确的父会话标识；缺失时，现有子代理定义要求从派发的 `Active task: <path>` 读取清单及正文，不能猜另一个会话的任务。

以后在正常任务规划阶段逐项注册所需详情，不能只注册 index：

```sh
python3 .trellis/scripts/task.py add-context <task-dir> implement .trellis/spec/trellis-plus/validation.md 'UI validation and review gate'
python3 .trellis/scripts/task.py add-context <task-dir> check .trellis/spec/trellis-plus/validation.md 'UI validation and review gate'
python3 .trellis/scripts/task.py validate <task-dir>
```

其他详情按上表同样注册，去重且保留原条目。子代理只执行已批准的有边界任务；主会话负责阶段、规格、提交、归档和主线。2026-10-01 规范安装阶段只验证上下文解析与流程推演；之后的产品实施证据见任务 verification。

预览/环境变更的正常任务必须在 implement/check 显式注册 `development.md`（不能只注册本 index）：

```sh
python3 .trellis/scripts/task.py add-context <task-dir> implement .trellis/spec/trellis-plus/development.md 'Preview lifecycle and environment configuration'
python3 .trellis/scripts/task.py add-context <task-dir> check .trellis/spec/trellis-plus/development.md 'Preview lifecycle and environment configuration'
python3 .trellis/scripts/task.py validate <task-dir>
```

用户明确要求不建 task 的预览 bootstrap 直接读取本 index 与 `development.md`，不创建或借用其他会话的 task/context；本轮采用子代理按派发路径读取共享规范的方式，不声称无 task 时原生 JSONL 注入已生效。

2026-10-01 验证：implement/check 各 14 条真实、唯一、存在的引用；直接调用已安装 hook 的两种 context 解析入口，确认本层所有详情及 mainline 的正文已物化，低于默认 131072 字节总预算。这里只证明解析与内容可加载，未派发子代理，不能代替真实父会话 `SubagentStart` 的运行证据。
