# Docker development and environment profile

## Existing runtime and before-dev checkpoint

证据：`backend/pyproject.toml`（Python >=3.12）、`frontend/package.json`/锁文件（Node >=22.13、npm）、`infra/docker-compose.yml`、`infra/docker/`、`preview.sh`。Compose 是已有服务生命周期；没有 `hako`/`dev.sh` 开发命令包装器。宿主 `.venv`/node_modules 仅属本机，不是可移植交付。

当前为规范更新，产品任务仍 planning，不生成包装器、不安装依赖、不启动服务。下一次获批准进入实施、需要 Docker 内 lint/test/build 前：检查有没有新增等效包装器；没有则建立项目自有窄范围命令入口，使用 Python 3.12 / Node 22，后端包含 `.[dev]`，源码挂载且缓存/`.devhome` 忽略。复用 Compose 服务而不是再建数据栈；服务运行镜像目前不含后端测试依赖。生成前读取可用的 `dev-it-in-docker` 与 shell 规范；若 skill 不可用，先明确设计命令转发、标签所有权、权限和启动/停止验证，再编写包装器。不能把缺包装器写成已完成。

## Preview and service lifecycle

从仓库根目录：

```sh
./preview.sh
docker compose --env-file infra/.env -f infra/docker-compose.yml ps
curl -f http://127.0.0.1:8080/api/health
docker compose --env-file infra/.env -f infra/docker-compose.yml down
```

`preview.sh` 由脚本所在路径定位仓库，执行 `up --build --wait -d`，再从 web 容器请求 `http://127.0.0.1:80/`，打印网站、`/admin`、`/api/docs`。每次都会重建；当前只接受无参数和 `--help`，**不支持** `start`/`down`。停止必须使用上述 Compose 命令，不能凭本规范调用不存在的脚本参数。未来若修复 preview 契约，薄入口应复用同一生命周期，按获批准范围实现并验证，不能在本轮 planning 改脚本。

db 容器 5432、api 8000 均只在 Compose 网络；web 的 80/443 映射宿主。例子为 `0.0.0.0:8080` / `0.0.0.0:8443`，浏览器用 `http://127.0.0.1:8080` 或可信 LAN 中的实际宿主地址，不能用 `0.0.0.0` 作为 URL。Caddy `:80` 容器监听与宿主地址是两层配置。HTTP 预览不提供 HTTPS/定位保证；对外 HTTPS 与 secure Cookie 见 `infra/RUNBOOK.md`。保留明确网络限制，不修改防火墙或额外发布 db/api。

应用 health/web 响应仅证明就绪，不证明功能验收。本轮只确认 Compose CLI 可用，没有探测 Docker daemon、当前数据或启动服务。服务操作仍受真实 sandbox/网络权限约束，规范不是授权或新 allowlist。

隔离验证采用明确 `-p <test-project>` 和空闲 loopback 端口覆盖，所有 `up`/`exec`/`down` 保持相同项目名；只停止这个项目，不运行 `down -v` 清除未知数据。已有实例备份/恢复按 `infra/RUNBOOK.md`，需按数据覆盖范围取得授权。

## Environment setup and incremental changes

安全样例 `infra/.env.example`；本地 `infra/.env` 已存在且被忽略。本轮无新增 key、不读出或修改本地值。首次仅在文件不存在时：

```sh
cp infra/.env.example infra/.env
```

| Key | 消费路径与安全默认/要求 |
| --- | --- |
| `POSTGRES_PASSWORD` | Compose 必填，注入 db 并组成 API 数据库 URL；用户提供独立开发密码，样例占位不能用作对外凭据 |
| `TABI_SITE_ADDRESS` | web 环境 → Caddy；本地 `:80`，不是宿主端口 |
| `TABI_COOKIE_SECURE` | Compose → API；本地 HTTP 为 false，对外 HTTPS 为 true |
| `TABI_HTTP_BIND` / `TABI_HTTPS_BIND` | Compose 必填宿主发布地址；局域网样例为上述 8080/8443，隔离测试覆盖为 loopback 空闲端口 |

Compose 命令行环境覆盖 `--env-file` 的插值值，再由 Compose 显式注入容器；API 用 `backend/app/core/config.py` 的 `TABI_` settings，进程环境优先于当前目录 `.env`。Compose 同时设置 `TABI_DATABASE_URL`、`TABI_MEDIA_ROOT=/data/media`；不能以仅修改错误一层 dotenv 的方式声称配置已生效，不将 dotenv 当 shell 程序 source。

更改样例和实际消费者要同步。已有本地文件只追加缺失 key 的安全默认/占位；空值也算已有，保留自定义值、注释、引号和换行。不重复追加、不删除或重写用户值。缺失文件沿用首次设置，不生成只有新增 key 的半份配置。报告新增 key、需填写的用途/来源及应用动作，不输出秘密或本地 diff；改名/删除需告知用户清理哪些旧 key。

修改 Compose 配置后重跑 `./preview.sh` 重建/重建服务；纯 API 容器内环境不会由 `restart` 自动重新注入。`POSTGRES_PASSWORD` 改变不自动更改既有数据库用户密码，真实库需单独协调，不能删除卷绕过。仅文档/配置核对用 `docker compose --env-file infra/.env -f infra/docker-compose.yml config --quiet`，不要打印展开后的含密码配置。
