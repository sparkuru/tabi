# Work commits, task archives and journals

## Scope and attribution

沿用英文 `feat:` / `fix:` / `docs:` / `chore(task):` 标题。提交前检查授权、完整路径分类、`git diff --check` 和 staged 列表；工作提交先完成，随后归档提交，再独立 journal。已有授权不重复询问；没有提交授权时只展示具体候选，不自动提交。

新版规则只在每个成功归档且确由 Codex 参与的任务的**归档提交**中添加一次：

```text
Co-authored-by: OpenAI Codex <codex@openai.com>
```

正文先简述任务目标、交付行为、实际验证与限制、任务身份及可用工作提交引用，空一行后放 trailer。小任务同样适用；工作、checkpoint、独立 journal 或后续 mainline 提交不因本规则加署名。保持用户 Git 身份和其他作者 trailer，不重写历史、不 amend、不全局挂 hook、不创建空署名提交。

## Verified installed route

已检查 Trellis 0.6.14 的 `task.py archive --help`、`common/task_store.py` 和 `add_session.py`。正常 archive 自动提交（受 config 的 `session_auto_commit` 控制），没有自定义消息接口，但支持：

```sh
python3 .trellis/scripts/task.py archive <task-dir> --no-commit
```

它设置 task 为 completed、写完成日期、清除相关会话指针、搬到 `.trellis/tasks/archive/YYYY-MM/<task-dir-name>/`；父任务归档还可能清除子任务 `task.json.parent`，运行既有 `after_archive` hooks。原生自动暂存范围为该任务来源/目标及实际改动的子任务；不会自动包括 mainline。忽略的会话指针不提交。执行前检查 task/config 中的 hooks 和完整实际候选，不把无关 staged 工作带进提交。

归档方案：先完成验收与必要人工反馈，获授权后使用 `--no-commit`；确认旧路径已搬走、目标 task.json 为 completed，明确列出旧任务的 tracked 文件删除、目标项目文档、确实改动的子 task.json，并更新 mainline。暂存逐个实际文件；旧 tracked 路径可用 `git add -u -- <old-task-dir>` 收集限定删除，不使用全仓库 `-A`。保护/个人/未知临时文件必须排除。用 `/tmp` 中的消息文件执行 `git commit -F <message-file>`；归档前未 tracked 的任务没有旧文件删除。之后检查：

```sh
git show -1 --format=full --stat
git show -1 --format=%B --no-patch
git diff --cached --name-only
```

核对正确任务、成功归档、允许的路径及恰好一个 Codex trailer，并把 archive commit 引用写回 mainline；之后的 mainline-only 提交不重复署名。若未来版本失去消息/禁止自动提交接口，记 `archive-attribution-blocked`，在执行 archive 前报告缺口，不改运行时绕过。

## Retry and journal

失败先检查目录、Git 与上次尝试：搬移成功但提交失败，只恢复尚未完成的显式提交，不再 archive；归档提交已存在则不再署名。已有历史归档缺 trailer 仅记录，不修改历史。用户独立完成的历史任务不能因后来的阅读而归给 Codex。

`python3 .trellis/scripts/add_session.py --title <title> --summary <summary> --no-commit` 写 journal 与 index，不自动提交；默认模式会自动暂存当前开发者 workspace 和可解析的当前任务目录，并使用 `chore: record journal`。为防带入尚在 planning 的工作，优先显式 `--no-commit`，后续仅暂存实际 journal/index 项目文件，独立提交且不加任务 trailer。

历史事实：MVP archive `d92afbb` 无 Codex trailer，旧工作提交 `2595100`/`96ecf4b` 有 trailer；规则从本次之后适用，这些提交保持原样。本次规范更新是独立工作提交，不加任务归档 trailer，也不执行归档或 journal。
