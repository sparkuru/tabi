# Trellis Mainline

## Initiative

- title: 清单打卡系统首版
- parent task: none
- objective: 交付可在手机浏览器完成公开清单发现、重复打卡、个人回看及可控公开分享的响应式 Web 应用；美食和游玩主题共用同一流程。
- owner decision: 2026-09-28 用户要求将根目录 PRD 转为项目 mainline 与 spec；当前仅授权规格整理和 `repo init` 提交。

## Continuation

- mode: guided
- serial authorization: none
- next pulse: user-requested

## Ordered Work

以下顺序来自 PRD 的依赖关系，只是后续工作建议；本次不创建或启动任何产品任务。

| order | proposed work | state | readiness and dependency evidence |
| --- | --- | --- | --- |
| 1 | 工程骨架、账号与公开清单/条目浏览 | proposed | 前后端代码尚不存在；邮箱验证、找回密码上线范围待定。 |
| 2 | 重复打卡、个人历史、照片和私密访问 | proposed | 依赖账号、条目与受保护图片存储；需落实幂等、进度口径和备份。 |
| 3 | 公开心得、分享、管理员内容治理 | proposed | 依赖记录所有权和可见性模型；需确认治理及保留期限。 |
| 4 | 北京美食与周末游玩内容复核、导入及首版验收 | proposed | OCR 原料尚未入库；需取得和人工核对素材，确认地点资料来源。 |

## Evidence and Decisions

- completed evidence: 2026-09-28 根目录 `prd.md` 的需求与架构决策已转存于 `.trellis/spec/product/`；本仓库尚无应用实现或运行验证。
- current blocker / dirty-state warning: 初始化中的 `.trellis/` 含 Trellis 上游文件；分发前需核对其 AGPL 许可及准确通知。已有 `00-bootstrap-guidelines` 初始化任务与本轮产品工作分开。
- next user decision: 开始实现前确定首个任务范围；账号验证/找回、地图与地点来源、管理员治理和数据保留策略在对应功能开发前确定。
