import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import { apiData } from "../../api/client";
import {
  loginApiAuthLoginPost,
  registerApiAuthRegisterPost,
} from "../../api/generated";
import { ErrorNotice, PageIntro } from "../../components/common";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { queryClient } from "../../lib/query-client";

export function AuthPage({ redirect }: { redirect: string }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      mode === "login"
        ? apiData(loginApiAuthLoginPost({ body: { email, password } }))
        : apiData(
            registerApiAuthRegisterPost({
              body: { email, password, display_name: displayName },
            }),
          ),
    onSuccess: (user) => {
      queryClient.setQueryData(["session"], user);
      const safeRedirect =
        redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
      window.location.assign(safeRedirect);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageIntro title={mode === "login" ? "登录" : "注册"}>
        记录默认仅自己可见。
      </PageIntro>
      <Card className="p-6 sm:p-8">
        <div
          className="mb-6 grid grid-cols-2 rounded-full bg-stone-100 p-1"
          role="tablist"
          aria-label="账号操作"
        >
          <button
            role="tab"
            aria-selected={mode === "login"}
            type="button"
            className={`min-h-11 rounded-full py-2 text-sm font-semibold ${mode === "login" ? "bg-white text-teal-900 shadow-sm" : "text-stone-600"}`}
            onClick={() => setMode("login")}
          >
            登录
          </button>
          <button
            role="tab"
            aria-selected={mode === "register"}
            type="button"
            className={`min-h-11 rounded-full py-2 text-sm font-semibold ${mode === "register" ? "bg-white text-teal-900 shadow-sm" : "text-stone-600"}`}
            onClick={() => setMode("register")}
          >
            注册
          </button>
        </div>
        <form onSubmit={submit} className="space-y-5">
          {mode === "register" && (
            <label className="block">
              <span className="field-label">昵称</span>
              <input
                className="field"
                autoComplete="nickname"
                required
                maxLength={80}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
          )}
          <label className="block">
            <span className="field-label">邮箱</span>
            <input
              className="field"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="field-label">密码</span>
            <input
              className="field"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={mode === "register" ? 12 : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {mode === "register" && (
              <span className="mt-1 block text-xs text-stone-500">
                至少 12 个字符。
              </span>
            )}
          </label>
          {mutation.error && <ErrorNotice error={mutation.error} />}
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="w-full"
          >
            {mutation.isPending
              ? "请稍候…"
              : mode === "login"
                ? "登录"
                : "创建账号"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
