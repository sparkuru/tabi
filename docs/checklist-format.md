# 通用清单 JSON v1

管理员可以上传 UTF-8 JSON 文件或粘贴相同的 JSON。先预览，确认后整体导入草稿，再明确发布清单及草稿条目。文件最多 **2 MiB（2,097,152 字节）**，一份文件包含一张清单、**1–200 个条目**。不导入图片、账号、用户记录或完成状态。

[JSON Schema](checklist.schema.json) 由后端 `ChecklistDocument.model_json_schema()` 生成。示例位于 `backend/data/examples/`：`minimal.json`、`todo.json`、`learning.json` 和 `ocr-reference.json`。OCR 示例仅引用两条原始资料；它不会重新导入完整的 172 条种子数据，也不表示现状已核实。

```json
{
  "format": "tabi.checklist",
  "version": 1,
  "key": "my-learning-list",
  "list": {"title": "学习清单", "category": "学习"},
  "items": [{"key": "first", "name": "完成第一个练习"}]
}
```

## 字段

所有层级拒绝未知字段和错误类型。`version` 必须为整数 `1`，不接受 `true`、`1.0` 或字符串 `"1"`。名称和标题去除两侧空白后不能为空。

| 位置 | 字段 | 规则 |
| --- | --- | --- |
| 顶层 | `format`, `version`, `key`, `list`, `items` | 必填；format 固定为 `tabi.checklist` |
| 顶层 | `source` | 可选来源，最多 2000 字符；条目未填来源时继承 |
| 身份 | 清单 `key`、每个条目 `key` | 必填；1–80 字符，以小写字母或数字开头，其后可含小写字母、数字、`.`、`_`、`-` |
| `list` | `title` | 必填，1–160 字符 |
| `list` | `summary`, `category`, `sort_order` | 简介默认空，最多 5000 字符；分类可空，最多 80 字符；排序整数默认 0，范围 -2147483648–2147483647 |
| `items[]` | `name` | 必填，1–160 字符 |
| `items[]` | `summary`, `description` | 默认空；分别最多 5000、30000 字符 |
| `items[]` | `category`, `tags`, `missing_fields` | 分类可空，最多 80 字符；两个字符串数组默认空，分别最多 20 项 |
| `items[]` | `suggested_action`, `recommendation` | 可空，分别最多 5000 字符 |
| `items[]` | `reference_note`, `reference_as_of` | 可空；带日期的参考文字（最多 5000 字符）与 ISO 8601 日期必须同时提供 |
| `items[]` | `sort_order` | 整数，范围 -2147483648–2147483647；未提供时使用数组下标，从 0 开始 |
| `items[]` | `place_kind` | `none`（默认）、`physical`、`area`、`online` |
| `items[]` | `place_name`, `address`, `area`, `online_url` | 可空；地点名/区域最多 160 字符，地址最多 255；线上链接为 http/https，最多 2048 字符 |
| `items[]` | `latitude`, `longitude`, `coordinate_system` | 可空；坐标必须成对并标明 `WGS84`、`GCJ02` 或 `BD09`；纬度 -90–90，经度 -180–180 |
| `items[]` | `source`, `verified_at` | 可空；来源最多 2000 字符；核实时间使用 ISO 8601 日期，只在确有核实依据时填入 |
| `items[]` | `links` | 最多 20 项；每项 `title`（1–160 字符）、`url`（http/https，最多 2048 字符）必填，`kind` 可选，默认 `reference`，最多 24 字符；拒绝额外字段 |
| `items[]` | `related_keys` | 最多 199 项，引用本文件内其他条目 key；禁止未知目标、自关联和重复引用 |

不接受数据库 `id`、`list_id`、图片/媒体 key、发布 `status` 或用户完成字段。地点完全可选，学习和待办无需填写虚假地址。Schema 描述字段约束；同文件 key 唯一、同名同址规范化查重、关联及成对字段规则还由服务端执行。

URL 规范化后（包括 Unicode 路径的百分号编码）也不得超过 2048 字符；超限错误会指向对应的 `online_url` 或 `links[].url`。

同清单查重使用规范化后的名称与地址；两者生成的身份文本最多 512 字符。少量 Unicode 兼容字符可能在规范化时展开，超限时返回条目的 `name` 字段错误，并提示缩短名称或地址。

## 预览、导入与错误

两个接口都需要管理员登录及 `X-CSRF-Token`，请求体直接为上面的 JSON 对象，`Content-Type: application/json`。文件和粘贴采用相同解析规则。

- `POST /api/admin/checklist-imports/preview` 不写入清单、条目或审计，返回 `key`、`title`、`item_count`、规范化的 `items`、`state` 和 `existing_list_id`。状态为 `ready`（可导入）、`existing`（相同原文件已导入）或 `conflict`（同 key 内容不同）。修改输入后重新预览。
- `POST /api/admin/checklist-imports` 独立重新校验；首次返回 `201`，相同原文件返回 `200`。结果为 `list_id`、`item_ids_by_key` 和 `reused`。整张草稿、外链、关联、身份及审计一起提交，失败全部回滚。
- 相同清单 key 且有效内容相同会复用原 ID，不覆盖管理员后来的编辑，也不重新发布下架内容。对象字段顺序、JSON 空白以及显式填写相同默认值不改变摘要；数组顺序和内容变化会改变摘要。
- 相同 key 内容不同返回 `409`；到已有清单中维护，或为独立清单选择新 key。不同 key 可以使用相同清单名称；同名同址条目在不同清单各自独立。
- 体积超限为 `413`；字段或 JSON 语法错误为 `422`。字段错误示例：`{"detail":[{"type":"value_error","loc":["body","items",1,"name"],"msg":"Duplicate name/address from items[0]"}]}`。下标从 0 开始，表示第二条与第一条重复。未知关联的路径指向具体 `related_keys` 下标。无登录为 `401`，普通用户或 CSRF 不符为 `403`。

## 发布与完成

`GET /api/admin/lists/{id}` 与管理清单列表返回总条目数 `total_item_count` 以及 `draft_item_count`、`published_item_count`、`unpublished_item_count`。公开响应的 `item_count` 仍只计已发布条目。

`POST /api/admin/lists/{id}/publish-all` 一次发布清单及草稿条目，保留已发布条目，跳过已下架条目。没有草稿或已发布条目时返回 `422`。响应包含 `list` 和本次 `published_count`、`already_published_count`、`skipped_unpublished_count`。旧逐条发布接口保持兼容。

登录用户可使用 `POST /api/items/{id}/complete`，携带 `Idempotency-Key`（16–80 字符）及 CSRF，不需要请求体。首次创建无心得/照片的私人记录；已有有效记录时返回它，不更改内容、时间或可见性。直接完成的重试不会追加记录；用户主动添加记录仍使用原 `POST /api/items/{id}/checkins`。已经用于其他操作的 key 冲突为 `409`，删除原记录后重用原 key 也返回 `409`，新操作使用新 key。

可以随后补充或清空心得、添加或移除最后一张照片。进度计不同已完成条目，重复记录只增加记录次数；删除最后一条有效记录才恢复未完成。分享必须显式设为公开，改私密、删除或隐藏后立即失效；公开接口仍不暴露邮箱、精确定位或原图。
