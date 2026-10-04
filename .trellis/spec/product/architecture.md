# 清单打卡系统：架构与数据约束

## 计划技术栈

| 边界 | 选型与责任 |
| --- | --- |
| Web | React + TypeScript + TanStack Router + TanStack Query；Tailwind CSS + shadcn/ui；适配手机与桌面浏览器。 |
| API 客户端 | HeyAPI 依据后端 OpenAPI 生成类型和请求代码；生成文件不手改。 |
| 服务端 | FastAPI 实现账号、清单、条目、打卡、媒体及管理接口，在服务端执行授权。 |
| 持久化 | PostgreSQL 存领域数据；私有对象存储或受保护文件存储放照片和缩略图。 |
| 交付 | HTTPS 反向代理统一提供 Web、API 和分享页；浏览器定位仅在安全上下文且用户主动授权时请求。 |

这是 PRD 确定的选型。首版实现、迁移和运行命令见 [运行与首批资料规格](runtime-and-data.md)、[运行手册](../../../infra/RUNBOOK.md) 及当前 Trellis task 的验证记录。

## 数据模型与约束

| 表 | 最小字段和关系 |
| --- | --- |
| `users` | `id`, `email`, `password_hash`, `display_name`, `avatar_key`, `role`, `created_at`。 |
| `lists` | `id`, `title`, `summary`, `cover_key`, `status`, `created_by`, `published_at`。 |
| `items` | `id`, `list_id`, `name`, `summary`, `description`, `cover_key`, `category`, `suggested_action`, `recommendation`, `sort_order`, `place_kind`, `place_name`, `address`, `latitude`, `longitude`, `coordinate_system`, `source`, `verified_at`, `removed_at`。 |
| `checkins` | `id`, `user_id`, `item_id`, `experienced_at`, `note`, `visibility`, `latitude`, `longitude`, `accuracy_m`, `located_at`, `created_at`, `updated_at`, `deleted_at`。 |
| `media` | `id`, `checkin_id`, `storage_key`, `thumbnail_key`, `sort_order`, `created_at`。 |
| `item_links` | `id`, `item_id`, `title`, `url`, `kind`。 |
| `item_relations` | `item_id`, `related_item_id`, `relation_kind`；两端必须同属一个清单，禁止自关联及重复。 |
| `checklist_imports` | 唯一 `package_key`、版本、初次有效载荷摘要、清单 ID、条目 key→ID 映射、管理员与时间；同一事务创建内容及审计，用于复用/冲突，不同步覆盖编辑。 |

`list` 一对多 `item`，`item` 一对多 `checkin`，`user` 一对多 `checkin`，`checkin` 一对多 `media`。统计进度时按用户、清单、不同有效 `item_id` 去重，不按记录数计算。删除/下架策略须保留历史关系；原资料更新不改写记录正文。

## API、可见性和媒体

建议 API 边界为 `/auth`、`/lists`、`/items`、`/checkins`、`/me/checkins`、`/media`、`/admin`；公开清单和心得接口须分页。对外采用不透明 ID 或不易枚举的分享标识，但分享标识不替代服务端每次检查可见性、隐藏状态和记录所有权。公开响应不得返回精确打卡位置、邮箱或原图元数据；原图和私人图片通过授权接口或限时 URL 访问。

上传先进入私有临时区，经类型、大小和图片处理校验后绑定记录；生成缩略图并移除公开图片的敏感元数据，失败时清理临时文件。打卡写入使用幂等请求标识以处理连点和网络重试。浏览器定位记录坐标、精度、时间及坐标系，地图服务边界负责坐标转换，不混用坐标系。

通用 JSON 预览/整张草稿导入与清单/草稿批量发布为管理员入口；不改变旧 OCR 复核路径。直接完成复用有效 Checkin 或创建私人无内容记录，采用条目行锁和用户级幂等约束，不增加独立完成表。具体接口、错误和回归契约见 `../backend/universal-checklist-contracts.md`。

## 质量与运行约束

- 密码安全哈希；写接口鉴权与服务端角色/所有权检查；上传限额、展示心得防脚本注入、接口合理限流。
- 图片和数据库都纳入备份并定期验证恢复；管理员隐藏及内容操作留审计。
- 列表/心得分页，列表优先缩略图；上线前用实际内容量和手机网络验证体验。
- 手机核心流程应有明确标签、错误反馈、键盘可用性、照片预览/移除；定位失败、拒绝授权或照片上传失败时，允许保留文字并重试。
- 用户确认 `archive/ocr.md` 是首批北京美食与周末游玩的完整记录。种子文件 `backend/data/ocr_seed.json` 保留原文与来源行号；可作为明确标注 OCR 来源、现状未核实的参考清单公开，不得宣称店铺或交通现状已核实。易变的票价、车程和营业信息需另有带日期的来源才能展示为参考资料。
