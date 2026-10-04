# Docker development and environment profile

## Existing runtime and before-dev checkpoint

证据：`backend/pyproject.toml`（Python >=3.12）、`frontend/package.json`/锁文件（Node >=22.13、npm）、`infra/docker-compose.yml`、`infra/docker/`、`preview.sh`、`hako`、`dev.sh`。Compose 是已有服务生命周期；开发命令通过一次性 Docker 包装器运行。宿主 `.venv`/node_modules 仅属本机，不是可移植交付。

2026-10-01 通用清单任务获批准后建立 `hako` 和 `dev.sh`，复用现有 Compose。`./hako python COMMAND` 从 backend 使用 Python 3.12 与忽略的 `.devhome/python` 开发 venv；`./hako node COMMAND` 从 frontend 使用 Node 22；命令容器按宿主 UID/GID 运行、执行后删除。首次初始化：

```sh
./hako python python -m venv /app/.devhome/python
./hako python pip install -e '.[dev]'
./hako node npm ci
```

服务运行镜像不包含后端测试依赖。Docker 需要真实会话中的 socket 权限，不修改 sandbox、平台配置或本机 allowlist。`.devhome`、egg-info、浏览器产物被忽略并从 Docker build context 排除。

## Isolated development runtime

```sh
./dev.sh
./hako compose ps
./infra/e2e-seed.sh
./hako browser npm run test:e2e
./dev.sh down
```

默认使用独立 `tabi-checklist-dev` 项目和项目卷、网络，HTTP `127.0.0.1:18080`、HTTPS bind `127.0.0.1:18443`；DB/API 不发布宿主端口。`dev.sh` 支持 `start/down/stop/status`，不读取 `infra/.env`；`hako compose` 以 `/dev/null` env-file 和合成开发配置调用已有 Compose。项目名必须以 `tabi-checklist-` 开头且绑定为 loopback。可覆盖 `TABI_DEV_PROJECT`、`WEB_HOST_PORT`、`HTTPS_HOST_PORT`，所有操作保持相同配置；不以名称前缀作为访问未知项目的授权。

`hako compose` 显式固定合成数据库名/用户、Postgres 镜像、内部监听 host/port 和媒体目录，并清除预览 API/Web 镜像引用，使其按独立项目名派生。进程中导出的根预览参数不能改变这些测试配置；允许的测试项目和宿主端口覆盖仍按上段执行。

`down` 仅停止指定 Compose 项目，保留所有卷，不使用 `down -v`。通用清单任务已验证启动/停止/端口释放/同卷恢复，当时未修改默认实例和本地环境。`e2e-seed.sh` 仅创建按测试场景分组的合成账号及原 OCR 草稿，不运行在真实实例。真实数据覆盖或环境修改仍须按后文范围判断。

Python 模式按需透传 `TABI_DATABASE_URL`、`TABI_TEST_DATABASE_URL`、`TABI_MEDIA_ROOT` 与 `HAKO_NETWORK`，日志显示环境变量名、不输出值。PG 迁移用前者，并发套件用后者；显式连接到独立 `db` 服务，测试各创建并清理自己的 UUID schema。浏览器固定镜像/命令见 validation.md。

## Preview and service lifecycle

触发：调整预览入口、Compose、监听地址、镜像或环境配置时，实施与检查均读取本节及根 `.env.example`。`preview.sh` 直接复用已有 `infra/docker-compose.yml` 生命周期，不创建第二套服务；`dev.sh`/`hako compose` 继续服务于独立、loopback 的自动化测试实例，不能让测试读取预览凭据或写默认数据。

```sh
cp .env.example .env                 # only when root .env is absent
# Edit POSTGRES_PASSWORD before first use.
./preview.sh build                   # first setup or after source/Dockerfile changes
docker compose --env-file .env -f infra/docker-compose.yml pull db  # first setup when DB image is absent
./preview.sh start                   # ./preview.sh is the same operation
./preview.sh status
./preview.sh stop                    # down is an alias; volumes retained
```

脚本从自身位置定位仓库，允许从其他 cwd 使用绝对路径执行。根 `.env` 是预览主配置，由 Compose `--env-file` 解析，不 source/eval dotenv。`start` 后台启动，等待 db/api 的健康检查及 web 的网站、API health 请求，通过后打印地址并返回控制权；不在每次启动安装依赖、构建或运行测试。缺 Docker/Compose、缺必填值、缺镜像或就绪失败必须非零退出并给出修复命令，不打印 `System is ready.`。镜像由显式 `build` 更新；只改环境配置时重跑 `start` 使 Compose 重建受影响容器。

重复 `start` 复用同一 Compose 项目，不先 down、不重复创建数据栈；重复 `stop` 成功。`stop/down` 只对同一预览项目执行 Compose down，保留数据库、媒体和 Caddy 卷，禁止 `down -v`、按端口杀进程或清理其他项目。默认项目保持原 `infra` 身份和卷；不能通过改名让用户误以为原数据丢失。隔离验证显式使用唯一 `COMPOSE_PROJECT_NAME`、临时环境文件/工作副本及空闲 loopback 宿主端口，所有命令保持同一配置；不操作现有预览或 `tabi-checklist-dev`。

成功输出严格遵循 [preview console contract](preview-console.md)：固定分区，按服务分组，每行一个完整 URL；在发布宿主执行 `ip -br a` 枚举全部有效地址，保留多网卡、同网卡多地址、bridge/tunnel 候选，不能只取默认路由地址。使用实际映射端口，localhost 只在本机分区；所有地址候选的跨设备可达性未验证时必须明确说明。`start` 与健康 `status` 使用同一 renderer；默认隐藏 Compose 启动进度，`--verbose` 显示诊断。未通过就绪检查的服务不得有成功提示或可用 URL。

默认可信局域网预览采用 `0.0.0.0` 的服务监听/host publishing；已知 loopback 或 Docker-only 限制优先。db/api 不发布宿主端口，不增加防火墙规则。HTTP 预览不证明 HTTPS、浏览器定位或功能验收；对外 HTTPS、secure Cookie、数据备份与恢复见 `infra/RUNBOOK.md`。Docker 执行仍受当前会话 socket/sandbox/网络权限约束；不添加宽泛 Docker/shell allowlist、不调整审批策略。

当前自动预览验收采用 HTTP 配置。就绪探针通过容器 loopback 访问网站，不能用于验证域名证书的 HTTPS 配置；域名与证书不匹配时必须失败，不禁用 TLS 校验或打印成功。证书签发、域名解析及私有部署配置未验证，按运行手册另行配置并使用真实域名检查。

检查顺序：`bash -n preview.sh`、`sh -n infra/docker/api-entrypoint.sh`、ShellCheck、shfmt，然后用 `/tmp` 配置夹具核对无 `.env`、必填值缺失、自定义端口、其他 cwd、重复 start/stop、就绪失败不打印成功。执行能力可用时，在独立项目短启动，访问输出的网站/admin/docs/health，核对全部映射、stop 后端口释放、卷保留和再次启动恢复。变更服务监听端口时同时核对 API entrypoint、Caddy upstream、数据库 healthcheck；只检查 Compose 插值不等同于真实运行。记录实际执行范围与未验证部分，只有用户要求持续预览时保留验证服务。

2026-10-03 无 task 的 bootstrap 检查：shell 语法、ShellCheck、shfmt、Compose 配置与失败路径夹具通过；真实隔离栈同时修改 DB/API/Web 内部端口及宿主端口，验证特殊字符数据库密码、输出的四个 HTTP 路径、重复 start/stop、status/down、端口释放及 DB/media 标记在再次启动后保留。原有预览和隔离开发实例的容器 ID 未变；验证服务已停止，随后仅清理本轮新建的测试卷/镜像。根本地 `.env` 原样保留迁移自既有 `infra/.env`，只补充缺失 key，权限 0600；源文件未修改。未验证域名 HTTPS、真实手机 LAN 可达性或业务功能，后续变更仍需重新执行适用检查。

## Environment setup and incremental changes

主配置为根 `.env.example` → 根 `.env`。根 `.env` 必须由仓库 `.gitignore` 忽略且由 `.dockerignore` 排除，不能依赖个人 global ignore。`infra/.env`/样例保留供既有部署、备份手工命令使用；预览不会隐式读它或双向同步。已有项目首次迁移可在根 `.env` 不存在时原样复制 `infra/.env`，再只追加根样例中缺失的安全默认 key；保留所有原值、注释、空值和引号，不输出本地文件内容/diff。以后预览设置只改根 `.env`，手工 Compose 操作也必须显式选相同 env-file。

```sh
cp .env.example .env
docker compose --env-file .env -f infra/docker-compose.yml config --quiet
```

| Key | 消费路径与安全默认/要求 |
| --- | --- |
| `POSTGRES_PASSWORD` | Compose 必填，样例留空；从用户密码管理器产生独立开发密码，注入 db 并组成 API URL，不复用生产凭据 |
| `POSTGRES_DB` / `POSTGRES_USER` | db 初始化、healthcheck、API URL；默认 tabi；改已有库的配置不自动迁移账号/库名 |
| `TABI_POSTGRES_IMAGE` / `TABI_API_IMAGE` / `TABI_WEB_IMAGE` | Compose 实际镜像；默认 postgres:17-alpine、infra-api:latest、infra-web:latest；API/Web 无显式值时随 Compose 项目名派生，保留隔离构建的镜像身份 |
| `TABI_DB_HOST` / `TABI_DB_PORT` | Postgres 容器监听及 API URL/healthcheck，默认 0.0.0.0 / 5432，内部协议端点不发布 |
| `TABI_API_HOST` / `TABI_API_PORT` | API entrypoint、healthcheck、Caddy upstream，默认 0.0.0.0 / 8000，内部 HTTP 不发布 |
| `TABI_WEB_HOST` / `TABI_WEB_HTTP_PORT` / `TABI_WEB_HTTPS_PORT` | Caddy 监听及 Compose target port，默认 0.0.0.0 / 80 / 443；HTTPS 仍须实际 TLS 配置 |
| `TABI_SITE_ADDRESS` | Caddy 站点选择；HTTP 预览 :80；改内部 HTTP port 时同改此站点端口；HTTPS 域名配置按运行手册 |
| `TABI_COOKIE_SECURE` | Compose → API；本地 HTTP 为 false，对外 HTTPS 为 true |
| `TABI_HTTP_BIND` / `TABI_HTTPS_BIND` | Compose 必填 host:port，局域网样例 0.0.0.0:8080 / 0.0.0.0:8443；改变宿主端口不用改变容器端口 |
| `TABI_PREVIEW_READY_TIMEOUT` | Compose → web environment → preview wrapper; default 60 seconds, integer 1..9999; bounds `up --wait`, no implicit build/pull |
| `TABI_MEDIA_ROOT` | API media 目录及 media_data 挂载目标，默认 /data/media；仍用同一命名卷，不将本机路径或 secret 打入镜像 |

Compose 进程环境覆盖 `--env-file` 插值值，预览主输入仍为根 `.env`；避免带入旧的 exported 配置。插值后由 Compose 显式注入容器/命令；API `backend/app/core/config.py` 的进程环境优先于应用 cwd 的 `.env`。预览不将宿主 dotenv 复制或挂载到应用中，不在 shell 重新实现 dotenv loader。

账号由应用注册或既有 `app.bootstrap_admin --email <email>` 命令管理；管理员密码交互输入，至少 12 位。当前没有 `.env` 自动创建登录账号的消费者，不发明无效的 username/password key，不每次启动重置账号；使用独立测试账号，自动化测试继续走隔离种子。

更改样例和消费者同步。已有本地文件按 key presence 只追加缺失 key 的安全默认/占位；空值算已有并报告，不替换。保留自定义值、注释、引号、行结束符，保证分隔换行；重复运行不追加重复 key，有重复/模糊配置时报告，不猜测用户意图。缺失本地文件沿用首次设置，不生成只含新增 key 的半份文件。用 `/tmp` fixture 验证缺文件、自定义值、空值、缺 key、第二次相同更新；不为一次追加建立永久同步工具。

报告新增 key、仍需填写的用途/来源与应用动作，不打印 secret/local diff。改名/删除须说明人工调整。镜像构建输入改后执行 `build` 再 `start`；容器环境改后 `start`（`restart` 不重新注入）。`POSTGRES_PASSWORD` 改变不自动更新已有数据库密码，真实库需协调 SQL 密码修改，不能删除卷绕过。

## Current console dependency and loading contract

Read `preview-console.md` before preview changes or checks. Wildcard publication
requires host `ip` (iproute2) and a discoverable local Docker endpoint; dependency
or enumeration failures are actionable failures, never a localhost-only success.
Specific/loopback bindings retain their narrower access boundary. `--verbose`
controls safe startup diagnostics. Tabi also requires host `curl` and `jq` for
publication probes and effective Compose configuration; no host application
toolchain is required. Root `AGENTS.md` directs policy loading from
a project-owned section outside the unchanged Trellis-managed block. This
reconciliation requires no new task and changes no product acceptance state.
