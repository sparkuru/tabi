import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Compass, LogOut, MapPinned, UserRound } from "lucide-react";

import { apiDone } from "../api/client";
import { logoutApiAuthLogoutPost } from "../api/generated";
import { useSession } from "../hooks/use-session";
import { queryClient } from "../lib/query-client";
import { Button } from "./ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const navigate = useNavigate();

  async function logout() {
    await apiDone(logoutApiAuthLogoutPost());
    queryClient.setQueryData(["session"], null);
    queryClient.invalidateQueries();
    navigate({ to: "/" });
  }

  const admin =
    session.data?.role === "content_admin" ||
    session.data?.role === "system_admin";
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap sm:gap-4 sm:px-8">
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-black tracking-tight text-teal-900"
            aria-label="旅々，返回清单首页"
          >
            <span className="grid size-9 place-items-center rounded-2xl bg-teal-800 text-white">
              <Compass className="size-5" aria-hidden="true" />
            </span>
            旅々
          </Link>
          <nav
            aria-label="主导航"
            className="order-3 flex w-full items-center justify-center gap-1 sm:order-none sm:w-auto sm:gap-3"
          >
            <Link
              to="/"
              className="rounded-full px-3 py-2 text-sm font-medium text-stone-700 hover:bg-white"
              activeProps={{
                className:
                  "rounded-full bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900",
              }}
            >
              清单
            </Link>
            {session.data && (
              <Link
                to="/history"
                className="rounded-full px-3 py-2 text-sm font-medium text-stone-700 hover:bg-white"
                activeProps={{
                  className:
                    "rounded-full bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900",
                }}
              >
                我的打卡
              </Link>
            )}
            {admin && (
              <Link
                to="/admin"
                className="rounded-full px-3 py-2 text-sm font-medium text-stone-700 hover:bg-white"
              >
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
                  className="flex size-11 items-center justify-center gap-1 rounded-full text-sm text-stone-600 hover:bg-white hover:text-teal-900 sm:size-auto sm:justify-start sm:px-2"
                >
                  <UserRound className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {session.data.display_name}
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  aria-label="退出登录"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                </Button>
              </>
            ) : (
              <Button asChild size="small">
                <Link to="/auth" search={{ redirect: "/" }}>
                  登录
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
        {children}
      </main>
      <footer className="mt-16 border-t border-stone-200 px-4 py-8 text-center text-sm text-stone-500">
        <MapPinned
          className="mx-auto mb-2 size-5 text-teal-700"
          aria-hidden="true"
        />
        一次一记，把想做的事慢慢过成故事。
      </footer>
    </div>
  );
}
