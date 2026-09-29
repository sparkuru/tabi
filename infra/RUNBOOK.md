# 运行手册

以下命令在仓库根目录执行，使用 `infra/.env` 和默认 Compose 项目名。备份同时包含 PostgreSQL 和媒体卷，二者属于同一数据集；恢复会覆盖目标实例现有数据，应先停止写入并保存目标实例的独立备份。

## 状态和日志

```sh
docker compose --env-file infra/.env -f infra/docker-compose.yml ps
docker compose --env-file infra/.env -f infra/docker-compose.yml logs --tail=100 api web db
curl -f http://127.0.0.1:8080/api/health
```

API 容器启动时执行 `alembic upgrade head`。数据库健康后 API 才启动，API 健康后 Web 才启动。媒体存在 Compose 命名卷中，不在仓库目录里。

## 备份

建议先停写或安排短暂维护窗口，使数据库和媒体快照一致。示例在本机创建权限受限的备份目录：

```sh
mkdir -p backups
chmod 700 backups
docker compose --env-file infra/.env -f infra/docker-compose.yml exec -T db \
  pg_dump -U tabi -d tabi -Fc > backups/tabi.dump
docker compose --env-file infra/.env -f infra/docker-compose.yml exec -T api \
  tar -C /data/media -czf - . > backups/media.tar.gz
chmod 600 backups/tabi.dump backups/media.tar.gz
docker compose --env-file infra/.env -f infra/docker-compose.yml exec -T db \
  pg_restore --list < backups/tabi.dump >/dev/null
tar -tzf backups/media.tar.gz >/dev/null
```

将备份复制到访问受控的异机存储；按恢复测试结果制定保留周期。`backups/` 不应提交到版本库。

## 恢复演练

在**隔离的测试项目**中恢复，确认两份文件来自同一次备份。以下示例使用独立的 `tabi-restore-drill` 项目名和端口；先启动数据库和 API 以创建目标卷，随后停止 API，恢复数据库和媒体，再启动服务：

```sh
docker compose --env-file infra/.env -p tabi-restore-drill -f infra/docker-compose.yml up -d db api
docker compose --env-file infra/.env -p tabi-restore-drill -f infra/docker-compose.yml stop api
docker compose --env-file infra/.env -p tabi-restore-drill -f infra/docker-compose.yml exec -T db \
  pg_restore -U tabi -d tabi --clean --if-exists --no-owner --single-transaction < backups/tabi.dump
docker compose --env-file infra/.env -p tabi-restore-drill -f infra/docker-compose.yml run --rm --no-deps -T \
  -v "$(pwd)/backups:/backup:ro" --entrypoint sh api \
  -c 'tar -C /data/media -xzf /backup/media.tar.gz'
TABI_HTTP_BIND=127.0.0.1:18080 TABI_HTTPS_BIND=127.0.0.1:18443 \
  docker compose --env-file infra/.env -p tabi-restore-drill -f infra/docker-compose.yml up -d api web
```

恢复后从 `http://127.0.0.1:18080` 核对 `/api/health`、登录、清单/历史记录、照片缩略图与原图权限。恢复生产实例前，先在隔离实例完成同一备份的演练。

## 安全配置

- 对外服务使用 HTTPS 并设置 `TABI_COOKIE_SECURE=true`。
- 为 `POSTGRES_PASSWORD` 使用单独的强密码，限制 `infra/.env` 的文件权限。
- 备份同时含账号和私人照片，按敏感数据保护。不要公开数据库或媒体卷。
- 管理员操作写入 `audit_logs`。默认单 API 进程对注册、登录和照片上传执行内存限流并返回 `429` 与 `Retry-After`；多进程或多实例部署需要共享限流存储，且应在网关监控异常登录。
