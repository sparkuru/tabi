import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";

import { AppShell } from "./components/app-shell";
import { EmptyState, ErrorNotice } from "./components/common";
import { AdminPage } from "./features/admin/page";
import { AuthPage } from "./features/auth/page";
import { ProfilePage } from "./features/auth/profile";
import { HomePage, ItemPage, ListPage } from "./features/checklists/pages";
import { NewCheckinPage, OwnCheckinPage } from "./features/entries/pages";
import { HistoryPage } from "./features/history/page";
import { SharePage } from "./features/sharing/page";

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
  notFoundComponent: () => (
    <EmptyState title="页面没有找到">
      检查链接后再试试，或返回清单首页。
    </EmptyState>
  ),
  errorComponent: ({ error }) => <ErrorNotice error={error} />,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});
const listRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/lists/$listId",
  component: () => <ListPage listId={listRoute.useParams().listId} />,
});
const itemRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/items/$itemId",
  validateSearch: (
    search: Record<string, unknown>,
  ): { complete?: boolean } => ({
    complete:
      search.complete === "1" ||
      search.complete === 1 ||
      search.complete === true ||
      search.complete === "true"
        ? true
        : undefined,
  }),
  component: () => (
    <ItemPage
      key={itemRoute.useParams().itemId}
      itemId={itemRoute.useParams().itemId}
      completeOnArrival={itemRoute.useSearch().complete}
    />
  ),
});
const newCheckinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/items/$itemId/checkin",
  component: () => (
    <NewCheckinPage itemId={newCheckinRoute.useParams().itemId} />
  ),
});
const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth",
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : "/",
  }),
  component: () => <AuthPage redirect={authRoute.useSearch().redirect} />,
});
const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  component: HistoryPage,
});
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});
const ownCheckinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/checkins/$checkinId",
  component: () => (
    <OwnCheckinPage checkinId={ownCheckinRoute.useParams().checkinId} />
  ),
});
const shareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/shares/$shareId",
  component: () => <SharePage shareId={shareRoute.useParams().shareId} />,
});
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  listRoute,
  itemRoute,
  newCheckinRoute,
  authRoute,
  historyRoute,
  profileRoute,
  ownCheckinRoute,
  shareRoute,
  adminRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
