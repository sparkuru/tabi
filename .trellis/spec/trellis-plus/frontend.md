# Frontend design integration

## Detection and local prerequisites

项目是 React 19 / TypeScript / Vite / TanStack / Tailwind Web，证据为 `frontend/package.json`、`frontend/src/` 与产品规格；手机核心操作和桌面管理均受支持。不能因为 UUPM 的本机说明偏向 React Native 就改为原生 App、替换既有 Lucide 或另建设计系统。

Codex 本地 `.codex/skills/ui-ux-pro-max/SKILL.md`、`scripts/search.py` / `core.py` / `design_system.py` 与 `data/*.csv` 已存在；这些文件被忽略，不提交、不覆盖、不重装。精确版本/许可没有记录，原始输出共享前按 `third_party/index.md` 核对。换 clone/平台后重新确认入口和数据完整性；全局安装不算项目初始化。

若入口或依赖缺失，在执行 UUPM 命令/生成材料前只问一次是否用 `uipro init --ai codex` 初始化，并说明会创建本项目本地平台文件。用户拒绝则记在已有计划中，继续普通 UI 工作和浏览器验证。接受后优先已安装 CLI，否则先核对官方 CLI 与版本再使用 `npx uipro-cli@latest init --ai codex`；不默认 all、不强制覆盖。失败明确报告文件和命令，不假称初始化完成。

## Plan → Implement → Check → Update Spec

用户于 2026-10-05 明确要求把获奖级品质约束和本项目适配落实为长期规格。
[体验设计契约](../frontend/experience-design.md) 是视觉与心智模型的共享来源：
凡用户界面规划、实施、检查，实际读取正文，并在正常 task 的 implement/check
JSONL 中分别显式注册该文件；仅有索引或 Markdown 链接不构成加载。
后续页面继承城市探索手账视觉及“清单 → 条目 → 完成或追加记录 → 回看/可选分享”模型，
按其八维标准循环检查与优化，直到没有明显可提升之处。该要求不替代本文件的
工具流程、validation 的行为/实际入口验收或产品领域契约，也不授予新增功能权限。

1. Plan：先读当前任务、前端规范、本文件和验证 profile，再读项目本地 UUPM skill。检查真实脚本 help；按清单/内容管理、批准视觉方向及 React Web 栈生成 design-system 搜索。通用可用入口如下；选项以本机 help 为准：

   ```sh
   python3 .codex/skills/ui-ux-pro-max/scripts/search.py --help
   python3 .codex/skills/ui-ux-pro-max/scripts/search.py '<approved UI scope and direction>' --design-system -f markdown
   ```

   不把候选默认风格当成用户决定。许可允许时将原始结果放正常 task 的 `research/ui-ux-pro-max.md` 并注册 implement/check；否则只保存项目独立编写的决策摘要。已有 `research/format-and-import.md` 保留，不为本轮规范更新另造设计输出。
2. 把采用的视觉、密度、组件、交互及验收写入 task `design.md`。规划 loading/empty/error/disabled/success/permission、键盘焦点、accessible name、reduced motion、44px Web 触控区域及手机/桌面布局。当前任务已有具体设计，不覆盖已确认的简洁文案和通用清单方向。
3. Implement：子代理读取 JSONL 正文、设计、研究和前端 specs；既有工具不适用的技术建议须过滤。技术限制使批准设计失效时，记录变更并同步双方 context，涉及用户决定则先取得决定。
4. Check：对照验收和设计验证响应式、布局溢出、可触控/键盘操作、文字/颜色对比、名称与反馈、各状态、权限、长列表/图片和性能边界。按 [验证资料](validation.md) 运行真实浏览器路径，构建/类型通过不替代 UI 结果；仅为自动化不能解决的剩余风险请求人验。
5. Update Spec：只把稳定通用的项目决定写回本层；任务特定结果留在 task，不新增竞争性的可编辑 MASTER。工具更新后重验路径，不自动重装或改受保护加载器。
