# Tabi 清单打卡

用公开清单整理想去的店和地方。用户可以给同一条目多次打卡，记录心得、照片和可选定位；记录默认私人。管理员维护清单、条目和公开内容。

## 本地启动

需要 Docker Compose。首次运行：

```sh
cp infra/.env.example infra/.env
# 修改 infra/.env 中的 POSTGRES_PASSWORD
docker compose --env-file infra/.env -f infra/docker-compose.yml up --build -d
docker compose --env-file infra/.env -f infra/docker-compose.yml exec api python -m app.bootstrap_admin --email you@example.com
```

打开 <http://127.0.0.1:8080>。API 文档在 <http://127.0.0.1:8080/api/docs>。首次启动会自动执行数据库迁移。管理员账号创建命令会交互式读取密码，至少 12 个字符。

默认只监听本机回环地址。对外部署时，先配置 HTTPS 域名和反向代理入口，并将 `TABI_COOKIE_SECURE=true`；浏览器定位需要 HTTPS。配置项见 `infra/.env.example`。

## 首批资料

用户确认 `archive/ocr.md` 是首批北京美食和周末游玩的完整记录。`backend/data/ocr_seed.json` 从中提取 96 条美食和 76 条游玩记录，保留来源行号、原始字段和缺项标记。公开内容明确标注 OCR 来源与现状未核实；未注明采集日期的票价、车程或营业状态不会作为当前事实展示，`verified_at` 留空。

`archive/ocr.md` 是本地资料，受仓库根目录的 `/archive` 忽略规则保护，不随代码提交。新检出仓库仍可使用已跟踪的 `backend/data/ocr_seed.json` 导入全部 172 条；若本地有原始 Markdown，测试会额外核对来源行和 SHA-256。

先创建系统管理员，再执行种子命令：

```sh
docker compose --env-file infra/.env -f infra/docker-compose.yml exec api \
  python -m app.seed_ocr --check-only --log
docker compose --env-file infra/.env -f infra/docker-compose.yml exec api \
  python -m app.seed_ocr --owner-email you@example.com
docker compose --env-file infra/.env -f infra/docker-compose.yml exec api \
  python -m app.seed_ocr --owner-email you@example.com --publish-reference
```

第一条写入草稿；带 `--publish-reference` 的命令需由操作者明确选择，公开未改动的 OCR 参考条目并在清单简介中加入过时提醒。重复运行不会覆盖管理员修改，手动下架或编辑的条目不会被重新发布。内容管理员可在 `/admin` 核对和维护资料。周末原表的 25–54 行缺失；末尾 26 条仅列店名的美食推荐以区域记录单列，不推测街道地址或合并疑似分店。

## 开发与验证

后端使用 Python 3.12，前端使用 Node 22：

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

API 类型由后端 OpenAPI 生成，`frontend/src/api/generated/` 内文件不要手动修改。后端接口变更后，先更新 `frontend/openapi.json`，再生成类型。

备份与恢复步骤见 [运行手册](infra/RUNBOOK.md)。
