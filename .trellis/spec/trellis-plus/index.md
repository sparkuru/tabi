# Trellis Plus Project Policy

- ownership: project-shared
- source: project-authored
- tracking: commit this file and its referenced project-owned detail files

本层记录项目级 Trellis Plus 决策。Trellis 上游 workflow、scripts、agents、config、更新元数据和平台生成文件保持原样；本层不是新的任务系统或自动运行时。每次应用 Trellis Plus 时先读取本文件及 [验证资料](validation.md)。未来有产品任务时，通过现有 Trellis context 机制让 implement/check 读取本层；本次不新建或激活任务。

## Mainline continuity

项目方向见 [mainline](../../mainline.md)。对相关的无任务请求，先只读检查 mainline、task/archive、git 和验证证据，报告当前进度、阻碍及唯一明确的建议。默认 `guided`：未经用户选择，不创建下一个产品任务或实现代码。只有 mainline 明确记录了有边界、有顺序的 `serial` 授权，且候选工作已准备好，才可按正常 Trellis 生命周期继续；`paused` 只报告状态。遇到脏工作区、歧义、风险、范围变化或依赖未满足时停止推进并取得决定。

## Before development

当前仓库只有产品规格，没有前后端清单、可运行命令或端口证据，因此现在不生成 `hako`/`dev.sh`。首个需要安装、lint、测试、构建或开发服务的任务开始前，核对项目真实工具链，按 `dev-it-in-docker` skill 建立 Docker 开发命令包装器；使用 `.devhome/` 时将其忽略。只配置当前平台可用的、针对 `./hako` 的窄权限或审批方式，不放宽原始 `docker`、shell、包管理器权限。项目级规则留在本层，本机适配留在个人配置且不提交。

## UI/UX Pro Max

本项目是手机优先的 Web UI；Codex 项目级 UUPM 已于 2026-09-28 初始化在 `.codex/skills/ui-ux-pro-max/`，属于本机生成文件，不作为共享提交内容。对未来改变页面、交互或视觉的任务：计划阶段先读取安装的 UUPM skill，用其真实脚本生成任务级设计研究，再把经确认的视觉、响应式、状态和可访问性决策写入 task `design.md` 与 implement/check context；实施与检查均对照这些决策，验证后仅将稳定通用规则写回本层。原始生成材料的保存与共享须先核对其来源和许可。当前仅整理产品规格，尚无具体页面设计，不生成伪造的 UUPM 设计系统。

## Browser validation and human review

未来浏览器可访问的 UI 改动先判断 Playwright 是否能验证验收路径；可验证时建立最小可复现测试并运行，记录具体页面、状态、视口、数据边界和结果。已存在等效浏览器测试工具时沿用。不能运行时记下实际失败的前置条件，不计作通过。项目当前没有应用、Playwright 依赖、配置或测试命令；可运行资料见 [验证资料](validation.md)，待首个 UI 实现任务用仓库证据补齐。

在任务实现与可运行检查结束、提交前，按差异、验收场景和验证证据选择 `human-required`、`human-optional` 或 `human-not-needed`。权限、删除、数据迁移、部署或无法自动验证的关键行为需要针对剩余风险征求反馈；纯文档且已检查的变更无需人工验收。需要反馈时明确说明已改内容、已运行检查、用户需测试的步骤及希望返回的通过/失败、截图或日志，避免泛泛要求“看一下”。

## Commit and attribution

每个工作提交前检查完整候选路径、`git diff --check` 和 staged 列表；只逐一暂存明确属于项目的文件。个人平台配置不提交，Trellis 上游受保护材料不由 Trellis Plus 修改或暂存。实质性 AI 作者贡献的工作提交写简洁完成摘要，并在正文后加 `Co-authored-by: OpenAI Codex <codex@openai.com>`；纯机械修改、用户原有文件、任务归档和 journal 提交通常不加。提交前给出正文与归属判断，遵守用户本次明确指定的提交范围及标题。

## License boundary

仓库内 Trellis 生成文件来自本机安装的 `@mindfoldhq/trellis` 0.6.14；该版本的 AGPL-3.0-only 许可证副本在 `third_party/trellis/LICENSE`，来源记录在根目录 `readme.md`，通知状态为 `present`。根目录 `license` 是项目原有文件，不能替代 Trellis 上游的 AGPL 通知。新写的 mainline 和本层、product 层是独立项目文档；`trellis update` 后仅重检这些项目文件，不向上游模板恢复自定义内容。受保护的上游文件仍不作为 Trellis Plus 自定义目标。
