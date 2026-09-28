# Trellis Plus: Validation Profile

## Current repository evidence

2026-09-28：仓库没有应用源代码、`package.json`、Python 清单、锁文件、CI、浏览器测试配置或启动脚本；只有 PRD 转存的产品规格与 Trellis 初始化材料。因此本次文档整理只检查 Markdown 内容、需求覆盖、路径分类、`git diff --check` 和提交状态，不宣称通过应用测试。

## Trellis Plus: Playwright Validation Profile

- execution mode: 待首个可运行 Web UI 任务按真实仓库与环境确定，当前没有可选的 `project-local` / `docker-wrapper` / `ci` 实现。
- setup/install: 尚无依赖或浏览器安装命令；首次引入 Web 清单时确定。
- app readiness: 尚无启动命令、就绪 URL 或 base URL。
- focused test command: 尚无命令；首个 UI 任务需提供精确的路径或测试名选择。
- full/CI browser command: 尚无命令或 CI job。
- test location and config: 尚无测试目录和 Playwright 配置。
- browser projects and supported viewports: 需求要求手机浏览器核心路径和桌面浏览/管理；具体浏览器、尺寸尚待实现时固定。
- fixtures and test-data boundary: 尚无 fixture；后续使用受控测试数据，不使用生产账号或私人照片。
- accessibility policy: 需求包含标签、错误提示和键盘操作；自动检查工具尚未配置。
- visual baseline policy: 尚无批准快照基线；快照只能作诊断，直到固定运行环境与审批流程。
- failure artifacts: 目前无报告、trace、截图或控制台/网络日志位置；测试框架落地时记录。

首个浏览器任务应将这些“尚无”逐项替换为仓库内可运行的精确命令和路径，至少覆盖手机核心流程、相关桌面状态、可访问名称及权限/错误状态。Playwright 未建成前，不能把浏览器验收写成已通过；人工反馈只针对当时剩余的产品、视觉、真机或私有环境风险。
