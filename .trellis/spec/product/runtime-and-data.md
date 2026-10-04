# 运行、首批资料与开发验证

本规格整理自原根目录 `README.md`，供 agent 在启动预览、初始化管理员、处理 OCR 种子或选择开发检查时读取。命令从仓库根目录执行，明确标注的宿主开发命令除外。启动说明已按当前 `preview.sh` 和环境规范修正。

## 本地预览与管理员

需要 Docker Compose。首次配置仅在根 `.env` 不存在时复制样例；已有配置的迁移与增量补充见 [环境规范](../trellis-plus/development.md#environment-setup-and-incremental-changes)。

```sh
cp .env.example .env
# 填写根 .env 中的 POSTGRES_PASSWORD。
./preview.sh build
# 首次使用且数据库镜像不存在时拉取：
docker compose --env-file .env -f infra/docker-compose.yml pull db
./preview.sh start
docker compose --env-file .env -f infra/docker-compose.yml exec api \
  python -m app.bootstrap_admin --email you@example.com
```

- `./preview.sh` 等同于 `start`：等待服务就绪，显示网站、`/admin` 和 `/api/docs` 入口。启动不会自动构建；源码或 Dockerfile 变更后先执行 `build`，再执行 `start`。
- API 启动时自动执行数据库迁移。管理员 bootstrap 用于创建首个系统管理员，交互读取并确认至少 12 字符的密码；已有系统管理员或邮箱已注册时失败，不覆盖账号。
- 根 `.env` 是预览主配置。`infra/.env` 保留供既有部署和运行手册使用，预览不隐式读取或同步它。对预览实例执行手工 Compose 命令时也使用根 `.env`。
- 样例宿主映射为 `TABI_HTTP_BIND=0.0.0.0:8080` 和 `TABI_HTTPS_BIND=0.0.0.0:8443`，两项必填；局域网设备使用运行机器的可达 IP 和端口。默认 `TABI_SITE_ADDRESS=:80` 是容器内 HTTP 站点，HTTPS 映射不代表已启用 TLS。
- 对外部署配置 HTTPS 域名和反向代理入口，并设置 `TABI_COOKIE_SECURE=true`。浏览器定位要求安全上下文，HTTP 局域网预览不能证明定位可用。
- `./preview.sh status` 查看服务；`stop` / `down` 保留数据库和媒体卷。完整生命周期、监听与环境约束见 [开发环境规格](../trellis-plus/development.md#preview-and-service-lifecycle)。

## OCR 首批资料与来源边界

用户已确认 `archive/ocr.md` 是首批北京美食和周末游玩的完整记录。已跟踪的 `backend/data/ocr_seed.json` 保留来源行号、原始字段、缺项标记和来源 SHA-256。

| 资料 | 种子范围与约束 |
| --- | --- |
| 北京美食 | 96 条；前 70 条保留地址和备注，末尾 26 条仅列店名的推荐按区域单列，不推测街道地址或合并疑似分店。 |
| 周末游玩 | 76 条；原表记录编号 25–54 缺失，不补造记录。 |
| 合计 | 172 条；新检出仓库可直接使用种子 JSON，不依赖原始 Markdown。 |
| 原始 Markdown | 本地 `archive/ocr.md` 受根 `.gitignore` 的 `/archive` 规则保护，不随代码提交；存在时，测试额外核对原文行和 SHA-256。 |

公开内容必须明确标注 OCR 来源和现状未核实。未注明采集日期的票价、车程或营业状态不作为当前事实展示；`verified_at` 留空，不能填入导入时间冒充核查时间。具体字段、发布和回归契约见 [MVP 契约](../backend/mvp-contracts.md)。

## 校验、导入与明确发布

下列命令针对预览实例；写入前先创建系统管理员，`--owner-email` 使用该账号。仅校验种子 JSON 时无需管理员。

```sh
# 只校验并输出来源和条数，不写数据库。
docker compose --env-file .env -f infra/docker-compose.yml exec api \
  python -m app.seed_ocr --check-only --log
# 创建草稿。
docker compose --env-file .env -f infra/docker-compose.yml exec api \
  python -m app.seed_ocr --owner-email you@example.com
# 操作者明确选择后，公开未改动的 OCR 参考条目。
docker compose --env-file .env -f infra/docker-compose.yml exec api \
  python -m app.seed_ocr --owner-email you@example.com --publish-reference
```

`--publish-reference` 在清单简介加入过时提醒；重复运行不覆盖管理员修改，已编辑或手动下架的条目不会被重新发布。内容管理员可在 `/admin` 核对和维护资料。不要将 OCR 种子参考发布与逐条复核导入混为一条流程；通用 JSON 清单格式和导入契约另见 [通用清单契约](../backend/universal-checklist-contracts.md)。

## 开发工具与检查

后端使用 Python 3.12，前端开发使用 Node 22（`frontend/package.json` 最低要求为 22.13）。标准开发入口使用 `hako` Docker 包装器；依赖初始化、隔离服务和命令透传见 [开发环境规格](../trellis-plus/development.md)，完整质量门禁见 [验证规范](../trellis-plus/validation.md)。可写测试使用隔离开发实例，不向预览数据运行测试种子。

保留宿主环境下的初始化和基本检查命令，以下从仓库根目录开始，并依次切换工作目录：

```sh
cd backend
python -m venv .venv
.venv/bin/pip install -e '.[dev]'
.venv/bin/pytest -q
.venv/bin/ruff check app tests migrations
.venv/bin/ruff format --check app tests migrations

cd ../frontend
npm ci
npm run api:generate
npm run typecheck
npm run build
npm run format:check
```

API 类型依据后端 OpenAPI 生成。接口变更后先将实际 `app.openapi()` 更新到 `frontend/openapi.json`，再执行 `npm run api:generate`（Docker 入口为 `./hako node npm run api:generate`），并验证类型与构建。`frontend/src/api/generated/` 内文件禁止手工修改。

## 备份与恢复

步骤见 [运行手册](../../../infra/RUNBOOK.md)。数据库和媒体卷属于同一数据集，备份须同时包含二者，并在隔离实例验证恢复。手册示例使用 `infra/.env`；针对根 `.env` 的预览实例操作时，显式选择相同的 env-file 和 Compose 项目，不能混用配置。
