import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, LogOut, UserRound } from "lucide-react";

import { apiDone } from "../api/client";
import { logoutApiAuthLogoutPost } from "../api/generated";
import { useSession } from "../hooks/use-session";
import { queryClient } from "../lib/query-client";
import { Button } from "./ui/button";
import { ErrorNotice } from "./common";

export function AppShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<unknown>(null);

  async function logout() {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await apiDone(logoutApiAuthLogoutPost());
      queryClient.setQueryData(["session"], null);
      queryClient.invalidateQueries();
      await navigate({ to: "/" });
    } catch (error) {
      setLogoutError(error);
    } finally {
      setLoggingOut(false);
    }
  }

  const admin =
    session.data?.role === "content_admin" ||
    session.data?.role === "system_admin";
  return (
    <div className="app-frame min-h-screen bg-paper">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:block focus:p-3 focus:text-teal-900"
      >
        跳到内容
      </a>
      <header className="app-header sticky top-0 z-20">
        <div className="shell-width flex min-h-20 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 sm:flex-nowrap sm:gap-4">
          <Link
            to="/"
            className="flex min-h-11 items-center gap-4 text-ink"
            aria-label="旅々，返回清单首页"
          >
            <span className="brand-mark">
              旅々<span className="text-accent">.</span>
            </span>
            <span className="brand-caption hidden border-l border-stone-300 pl-4 sm:block">
              TABI
              <br />
              日常，也值得探索
            </span>
          </Link>
          <nav
            aria-label="主导航"
            className="order-3 flex w-full items-center justify-center gap-1 sm:order-none sm:w-auto sm:gap-3"
          >
            <Link to="/" className="nav-link" activeOptions={{ exact: true }}>
              清单
            </Link>
            {session.data && (
              <Link to="/history" className="nav-link">
                我的记录
              </Link>
            )}
            {admin && (
              <Link to="/admin" className="nav-link">
                管理
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-2">
            {session.data ? (
              <>
                <Link
                  to="/profile"
                  aria-label="个人资料"
                  className="flex size-11 min-h-11 items-center justify-center gap-1 rounded-full text-sm text-stone-600 hover:bg-white hover:text-teal-900 sm:w-auto sm:justify-start sm:px-2"
                >
                  <UserRound className="size-4" aria-hidden="true" />
                  <span className="hidden max-w-36 truncate sm:inline">
                    {session.data.display_name}
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  disabled={loggingOut}
                  aria-label="退出登录"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                </Button>
              </>
            ) : (
              <Button asChild size="small">
                <Link to="/auth" search={{ redirect: "/" }}>
                  登录 <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="app-main shell-width">
        {logoutError !== null && (
          <div className="mb-6">
            <ErrorNotice error={logoutError} />
          </div>
        )}
        {children}
      </main>
      <footer className="app-footer">
        <div className="shell-width flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs">旅々 · 把日常，走成自己的旅程。</p>
          <p className="folio">A LITTLE FURTHER, EVERY DAY.</p>
        </div>
      </footer>
    </div>
  );
}
