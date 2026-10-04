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
import { JourneyArt } from "../../components/journey-art";

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
    <div className="auth-layout">
      <div className="auth-story enter">
        <p className="eyebrow mb-5">YOUR PERSONAL JOURNAL</p>
        <h2>
          去过的地方，
          <br />
          都成为你的故事。
        </h2>
        <JourneyArt />
        <p className="mt-4 text-sm leading-7 text-stone-600">
          记录默认仅自己可见。
          <br />
          值得分享的时刻，由你决定何时公开。
        </p>
      </div>
      <div className="auth-form enter enter-later">
        <PageIntro
          eyebrow="旅程，从这里继续"
          title={mode === "login" ? "登录" : "注册"}
        >
          {mode === "login"
            ? "欢迎回来。你的下一站，正在等你。"
            : "创建一本属于自己的日常探索手账。"}
        </PageIntro>
        <Card className="p-6 sm:p-8">
          <div
            className="auth-tabs mb-7 grid grid-cols-2"
            role="tablist"
            aria-label="账号操作"
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? "login"
                  : event.key === "End"
                    ? "register"
                    : mode === "login"
                      ? "register"
                      : "login";
              setMode(next);
              event.currentTarget
                .querySelector<HTMLButtonElement>(`#auth-${next}-tab`)
                ?.focus();
            }}
          >
            <button
              role="tab"
              id="auth-login-tab"
              aria-controls="auth-panel"
              tabIndex={mode === "login" ? 0 : -1}
              aria-selected={mode === "login"}
              type="button"
              className="auth-tab"
              onClick={() => setMode("login")}
            >
              登录
            </button>
            <button
              role="tab"
              id="auth-register-tab"
              aria-controls="auth-panel"
              tabIndex={mode === "register" ? 0 : -1}
              aria-selected={mode === "register"}
              type="button"
              className="auth-tab"
              onClick={() => setMode("register")}
            >
              注册
            </button>
          </div>
          <form
            id="auth-panel"
            role="tabpanel"
            aria-labelledby={`auth-${mode}-tab`}
            onSubmit={submit}
            className="space-y-5"
          >
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
            <div>
              <label htmlFor="auth-password" className="field-label">
                密码
              </label>
              <input
                id="auth-password"
                className="field"
                type="password"
                aria-describedby={
                  mode === "register" ? "auth-password-hint" : undefined
                }
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                required
                minLength={mode === "register" ? 12 : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {mode === "register" && (
                <span
                  id="auth-password-hint"
                  className="mt-1 block text-xs text-stone-500"
                >
                  至少 12 个字符。
                </span>
              )}
            </div>
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
    </div>
  );
}
