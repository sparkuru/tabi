# 通用清单格式与导入流程研究

## 已确认的产品边界

- 管理员导入、检查并发布清单，普通用户使用已发布清单。
- 条目可以只标记完成，生成默认私人的记录；之后可补心得和照片。
- 地点是可选信息，待办、学习、出游主题使用同一核心模型。

## 格式提案（待最终评审）

```json
{
  "format": "tabi.checklist",
  "version": 1,
  "key": "python-basics",
  "list": {
    "title": "Python 基础",
    "summary": "",
    "category": "学习"
  },
  "items": [
    {
      "key": "functions",
      "name": "函数",
      "description": "编写一个带参数和返回值的函数。",
      "links": [
        {"title": "学习资料", "url": "https://example.com/functions"}
      ]
    }
  ]
}
```

- 最小载荷由格式名、版本、稳定清单 key、标题和至少一个条目组成；条目 key 与 name 必填。
- 沿用清单与条目的现有内容字段；地点、分类、标签、推荐动作和来源可选。没有地点数据时使用既有 `place_kind="none"` 默认值。
- key 表示数据包中的稳定身份，不使用名称、数组顺序或数据库 ID 充当长期身份。相同名称的清单需要按 key 判断导入冲突，不能单靠标题判断。
- 导入数据不包含用户完成状态、心得、照片、账号、数据库 ID 和发布权限；这些由系统管理。
- 来源与真实核实日期可以填写，但通用格式不要求 OCR 转录标记或虚构核查时间。OCR 示例保留自身来源和未核实提醒。
- 首版仅支持 JSON 文件与粘贴 JSON；提供最小模板、待办与学习示例及 JSON Schema。字段和大小限制需与服务端契约一致，错误包含字段路径与条目序号。
- 用户已确认：相同 key、相同内容返回已有导入结果；相同 key、不同内容拒绝并提示到管理页编辑。批量同步更新不纳入本次范围。最终技术契约以 `../design.md` 为准。

## 现有实现与影响

| 边界 | 当前行为 | 规划影响 |
| --- | --- | --- |
| `backend/app/schemas/imports.py` | OCR 复核批次，仅包含条目 | 新增独立的整张清单格式契约，兼容既有复核入口 |
| `backend/app/api/routes/admin.py:317` | 先选择已有清单，再导入草稿条目 | 新增校验预览与整张清单的事务导入 |
| `backend/app/api/routes/admin.py:139` | 发布清单不改变条目状态 | 明确提供清单及草稿条目的批量发布，保留已下架状态 |
| `backend/app/models/tables.py:244` | 只有 OCR 式批次来源和核查者 | 新导入需持久化格式身份与内容摘要，不能伪造复核记录 |
| `backend/app/api/routes/checkins.py:80,194` | 创建与编辑都要求文字或照片 | 支持无正文的完成记录，统一调整编辑规则 |
| `backend/app/api/routes/media.py:94` | 不许删除无正文记录的最后一张照片 | 按已确认的新完成规则允许照片为空 |
| `backend/app/services/catalog.py:19` | 进度按有效记录去重 | 保留既有去重与删除最后一条记录恢复未完成的语义 |

## 界面规划依据

2026-09-30 已运行本地 UI/UX Pro Max 真实脚本：

```sh
python3 .codex/skills/ui-ux-pro-max/scripts/search.py 'productivity checklist content management minimal content first' --design-system -p Tabi -f markdown
python3 .codex/skills/ui-ux-pro-max/scripts/search.py 'form validation error feedback loading touch accessibility' --domain ux -n 5
```

采用与当前应用相关的建议：内容优先、清晰层级、关联标签、可被辅助技术感知的错误、提交中/成功/失败反馈和错误恢复路径。脚本的 newsletter 页面模板与本项目不符，不能作为页面结构；沿用项目已有 React Web、Lucide 图标和颜色基础。

- 首页直接展示“清单”和清单卡片，移除大段宣传式 hero 与页脚口号。
- 条目详情有内容才显示“详情”“地点”“建议”等区域，无地点不显示“没有固定地点”占位块。
- 导入输入提供明确标签、下载模板、预览与错误反馈；管理界面展示草稿/已发布/已下架及各状态条目数量。
- 完成按钮与“添加记录”分开；完成操作显示忙碌/成功状态、刷新个人进度，重复点击不生成多条意外记录。
- 已完成条目继续支持主动添加多次记录。撤销记录仍遵守当前历史和进度规则，不用勾选操作批量删除有内容的历史。
- 手机主流程与桌面管理分别验收；交互目标至少 44px、键盘可用，字段错误有路径和修正提示。

## 待最终设计落实

- 输入大小/条目数上限，事务与并发幂等约束。
- OCR 种子稳定 ID 与既有已发布清单的兼容方案，不能因格式变化重复生成或覆写资料。
- 仅完成记录的历史/分享文案，以及不含心得和照片时的正常展示。
