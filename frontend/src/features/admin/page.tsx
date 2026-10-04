import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  FilePenLine,
  FileInput,
  ShieldCheck,
  Users,
  History,
} from "lucide-react";

import { apiData, apiDone } from "../../api/client";
import {
  addRelationApiAdminItemsItemIdRelationsPost,
  adminItemsApiAdminListsListIdItemsGet,
  adminListDetailApiAdminListsListIdGet,
  adminListsApiAdminListsGet,
  auditHistoryApiAdminAuditGet,
  changeRoleApiAdminUsersUserIdRolePut,
  createItemApiAdminListsListIdItemsPost,
  createListApiAdminListsPost,
  editItemApiAdminItemsItemIdPut,
  editListApiAdminListsListIdPut,
  hideExperienceApiAdminCheckinsCheckinIdHidePost,
  importReviewedItemsApiAdminListsListIdImportsPost,
  itemCoverApiMediaItemsItemIdCoverPost,
  listCoverApiMediaListsListIdCoverPost,
  listUsersApiAdminUsersGet,
  publishItemApiAdminItemsItemIdPublishPost,
  publishAllApiAdminListsListIdPublishAllPost,
  unpublishItemApiAdminItemsItemIdUnpublishPost,
  unpublishListApiAdminListsListIdUnpublishPost,
} from "../../api/generated";
import type {
  ChangeRoleIn,
  AdminChecklistOut,
  ChecklistWrite,
  ItemDetailOut,
  ItemWrite,
  ReviewedImportIn,
} from "../../api/generated";
import {
  EmptyState,
  ErrorNotice,
  Loading,
  PageIntro,
} from "../../components/common";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useSession } from "../../hooks/use-session";
import { queryClient } from "../../lib/query-client";
import { ChecklistImport } from "./checklist-import";

const blankList: ChecklistWrite = {
  title: "",
  summary: "",
  category: null,
  sort_order: 0,
};
const blankItem: ItemWrite = {
  name: "",
  summary: "",
  description: "",
  category: null,
  tags: [],
  suggested_action: null,
  recommendation: null,
  sort_order: 0,
  place_kind: "none",
  links: [],
};

type Role = ChangeRoleIn["role"];

const roleLabels: Record<Role, string> = {
  user: "普通用户",
  content_admin: "内容管理员",
  system_admin: "系统管理员",
};

function localDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function auditText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function itemToWrite(item: ItemDetailOut): ItemWrite {
  return {
    name: item.name,
    summary: item.summary,
    description: item.description,
    category: item.category,
    tags: item.tags,
    suggested_action: item.suggested_action,
    recommendation: item.recommendation,
    reference_note: item.reference_note,
    reference_as_of: item.reference_as_of,
    missing_fields: item.missing_fields,
    sort_order: item.sort_order,
    place_kind: item.place_kind,
    place_name: item.place_name,
    address: item.address,
    area: item.area,
    online_url: item.online_url,
    latitude: item.latitude,
    longitude: item.longitude,
    coordinate_system: item.coordinate_system,
    source: item.source,
    verified_at: item.verified_at,
    links: item.links.map(({ title, url, kind }) => ({ title, url, kind })),
  };
}

type Workspace = "content" | "imports" | "moderation" | "users" | "audit";
const workspaces = [
  {
    id: "content",
    label: "内容编辑",
    description: "清单与条目",
    icon: FilePenLine,
  },
  { id: "imports", label: "导入", description: "预览与草稿", icon: FileInput },
  {
    id: "moderation",
    label: "内容治理",
    description: "公开记录",
    icon: ShieldCheck,
  },
  { id: "users", label: "账号角色", description: "权限管理", icon: Users },
  { id: "audit", label: "操作审计", description: "操作记录", icon: History },
] as const;

function contentStatus(status: AdminChecklistOut["status"]) {
  return status === "published"
    ? "已发布"
    : status === "unpublished"
      ? "已下架"
      : "草稿";
}

function OptionalFields({
  title,
  initialOpen,
  children,
}: {
  title: string;
  initialOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <details
      className="admin-disclosure"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        {title}
        <span className="admin-disclosure-hint">{open ? "收起" : "展开"}</span>
      </summary>
      <div className="space-y-4 pt-4">{children}</div>
    </details>
  );
}

export function AdminPage() {
  const session = useSession();
  const contentRef = useRef<HTMLElement>(null);
  const [workspace, setWorkspace] = useState<Workspace>("content");
  const [importFeedback, setImportFeedback] = useState<{
    busy: boolean;
    error: unknown;
    message: string;
  }>({ busy: false, error: null, message: "" });
  const [selectedListId, setSelectedListId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedListSnapshot, setSelectedListSnapshot] =
    useState<AdminChecklistOut | null>(null);
  const [selectedItemSnapshot, setSelectedItemSnapshot] =
    useState<ItemDetailOut | null>(null);
  const [listForm, setListForm] = useState<ChecklistWrite>(blankList);
  const [itemForm, setItemForm] = useState<ItemWrite>(blankItem);
  const [importJson, setImportJson] = useState("");
  const [moderationId, setModerationId] = useState("");
  const [moderationReason, setModerationReason] = useState("");
  const [listCover, setListCover] = useState<File | null>(null);
  const [itemCover, setItemCover] = useState<File | null>(null);
  const [relatedItemId, setRelatedItemId] = useState("");
  const [roleDrafts, setRoleDrafts] = useState<Record<string, Role>>({});
  const [userOffset, setUserOffset] = useState(0);
  const [auditOffset, setAuditOffset] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const isAdmin =
    session.data?.role === "content_admin" ||
    session.data?.role === "system_admin";
  const lists = useInfiniteQuery({
    queryKey: ["admin-lists"],
    queryFn: ({ pageParam }) =>
      apiData(
        adminListsApiAdminListsGet({ query: { limit: 50, offset: pageParam } }),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.offset + lastPage.limit < lastPage.total
        ? lastPage.offset + lastPage.limit
        : undefined,
    enabled: isAdmin,
  });
  const listId = selectedListId;
  const listDetail = useQuery({
    queryKey: ["admin-list", listId],
    queryFn: () =>
      apiData(
        adminListDetailApiAdminListsListIdGet({ path: { list_id: listId } }),
      ),
    enabled: isAdmin && Boolean(listId),
  });
  const items = useInfiniteQuery({
    queryKey: ["admin-items", listId],
    queryFn: ({ pageParam }) =>
      apiData(
        adminItemsApiAdminListsListIdItemsGet({
          path: { list_id: listId },
          query: { limit: 50, offset: pageParam },
        }),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.offset + lastPage.limit < lastPage.total
        ? lastPage.offset + lastPage.limit
        : undefined,
    enabled: isAdmin && Boolean(listId),
  });
  const visibleLists = lists.data?.pages.flatMap((page) => page.items) ?? [];
  const visibleItems = items.data?.pages.flatMap((page) => page.items) ?? [];
  const selectedList =
    listDetail.data ??
    visibleLists.find((entry) => entry.id === listId) ??
    (selectedListSnapshot?.id === listId ? selectedListSnapshot : undefined);
  const selectedItem =
    visibleItems.find((entry) => entry.id === selectedItemId) ??
    (selectedItemSnapshot?.id === selectedItemId
      ? selectedItemSnapshot
      : undefined);
  const isSystemAdmin = session.data?.role === "system_admin";
  const currentWorkspace =
    !isSystemAdmin && (workspace === "users" || workspace === "audit")
      ? "content"
      : workspace;
  const users = useQuery({
    queryKey: ["admin-users", userOffset],
    queryFn: () =>
      apiData(
        listUsersApiAdminUsersGet({ query: { limit: 50, offset: userOffset } }),
      ),
    enabled: isSystemAdmin,
  });
  const audit = useQuery({
    queryKey: ["admin-audit", auditOffset],
    queryFn: () =>
      apiData(
        auditHistoryApiAdminAuditGet({
          query: { limit: 50, offset: auditOffset },
        }),
      ),
    enabled: isSystemAdmin,
  });

  async function run(action: () => Promise<unknown>, success = "已保存") {
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      const result = await action();
      setMessage(typeof result === "string" ? result : success);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-lists"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-list"] }),
        queryClient.invalidateQueries({ queryKey: ["list"] }),
        queryClient.invalidateQueries({ queryKey: ["item"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-items"] }),
        queryClient.invalidateQueries({ queryKey: ["lists"] }),
        queryClient.invalidateQueries({ queryKey: ["items"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-audit"] }),
      ]);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }

  function saveList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(async () => {
      if (selectedListId) {
        const updated = await apiData(
          editListApiAdminListsListIdPut({
            path: { list_id: selectedListId },
            body: listForm,
          }),
        );
        setSelectedListSnapshot(updated);
      } else {
        const created = await apiData(
          createListApiAdminListsPost({ body: listForm }),
        );
        setSelectedListId(created.id);
        setSelectedListSnapshot(created);
      }
    });
  }

  function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!listId) return;
    run(async () => {
      if (selectedItemId) {
        const updated = await apiData(
          editItemApiAdminItemsItemIdPut({
            path: { item_id: selectedItemId },
            body: itemForm,
          }),
        );
        setSelectedItemSnapshot(updated);
      } else {
        const created = await apiData(
          createItemApiAdminListsListIdItemsPost({
            path: { list_id: listId },
            body: itemForm,
          }),
        );
        setSelectedItemId(created.id);
        setSelectedItemSnapshot(created);
      }
    });
  }

  function importRows(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!listId) return;
    run(async () => {
      const payload = JSON.parse(importJson) as ReviewedImportIn;
      await apiData(
        importReviewedItemsApiAdminListsListIdImportsPost({
          path: { list_id: listId },
          body: payload,
        }),
      );
      setImportJson("");
    }, "复核条目已导入为草稿");
  }

  if (session.isPending) return <Loading />;
  if (!isAdmin)
    return (
      <EmptyState title="需要管理员权限">此页面仅供内容管理员使用。</EmptyState>
    );
  return (
    <>
      <div className="admin-intro">
        <PageIntro title="内容管理">
          维护清单、复核内容，让每个条目清晰可用。
        </PageIntro>
        <span className="admin-role">
          {isSystemAdmin ? "系统管理员" : "内容管理员"}
        </span>
      </div>
      <div className="admin-layout">
        <nav className="admin-navigation" aria-label="管理工作区">
          {workspaces
            .filter(
              (entry) =>
                isSystemAdmin || (entry.id !== "users" && entry.id !== "audit"),
            )
            .map(({ id, label, description, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-label={label}
                aria-pressed={currentWorkspace === id}
                aria-controls={`admin-${id}`}
                onClick={() => setWorkspace(id)}
              >
                <Icon aria-hidden="true" size={19} />
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
              </button>
            ))}
        </nav>
        <div className="admin-main">
          {currentWorkspace !== "imports" &&
            (importFeedback.busy ||
              importFeedback.error !== null ||
              importFeedback.message) && (
              <div className="mb-6 space-y-3">
                {importFeedback.busy && (
                  <p role="status" className="admin-context">
                    导入工作区正在处理，请稍候…
                  </p>
                )}
                {importFeedback.error !== null && (
                  <ErrorNotice error={importFeedback.error} />
                )}
                {importFeedback.message && (
                  <p role="status" className="admin-context">
                    {importFeedback.message}
                  </p>
                )}
              </div>
            )}
          {error !== null && (
            <div className="mb-6">
              <ErrorNotice error={error} />
            </div>
          )}
          {busy && (
            <p role="status" className="admin-context">
              正在处理，请稍候…
            </p>
          )}
          {message && (
            <p
              role="status"
              className="mb-6 rounded-2xl bg-teal-50 p-4 text-sm font-semibold text-teal-900"
            >
              {message}
            </p>
          )}
          <section
            id="admin-content"
            ref={contentRef}
            tabIndex={-1}
            aria-label="内容编辑"
            hidden={currentWorkspace !== "content"}
          >
            <div className="admin-workspace-heading">
              <h2>内容编辑</h2>
              <p>选择清单，编辑内容；保存与发布分别操作。</p>
            </div>
            <div className="admin-content-layout">
              <Card className="admin-panel admin-selection-panel">
                <h3 className="mb-4 text-base font-bold">清单目录</h3>
                {lists.isPending ? (
                  <Loading />
                ) : lists.error && visibleLists.length === 0 ? (
                  <ErrorNotice error={lists.error} />
                ) : (
                  <div className="admin-selection">
                    {visibleLists.length === 0 && (
                      <p className="text-sm text-stone-600">
                        暂无清单，可新建或前往导入。
                      </p>
                    )}
                    {visibleLists.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          setSelectedListId(entry.id);
                          setSelectedListSnapshot(null);
                          setListForm({
                            title: entry.title,
                            summary: entry.summary,
                            category: entry.category,
                            sort_order: entry.sort_order,
                          });
                          setSelectedItemId("");
                          setSelectedItemSnapshot(null);
                          setItemForm(blankItem);
                          setListCover(null);
                          setItemCover(null);
                          setRelatedItemId("");
                        }}
                        className="admin-selection-row"
                        aria-pressed={listId === entry.id}
                      >
                        <span>{entry.title}</span>
                        <small>{contentStatus(entry.status)}</small>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedListId("");
                        setSelectedListSnapshot(null);
                        setListForm(blankList);
                        setSelectedItemId("");
                        setSelectedItemSnapshot(null);
                        setItemForm(blankItem);
                        setListCover(null);
                        setItemCover(null);
                        setRelatedItemId("");
                      }}
                      className="min-h-11 rounded-full border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-800"
                    >
                      + 新建清单
                    </button>
                    {lists.hasNextPage && (
                      <Button
                        type="button"
                        variant="outline"
                        size="small"
                        disabled={lists.isFetchingNextPage}
                        onClick={() => lists.fetchNextPage()}
                      >
                        {lists.isFetchingNextPage ? "加载中…" : "加载更多清单"}
                      </Button>
                    )}
                    {lists.isFetchNextPageError && (
                      <ErrorNotice error={lists.error} />
                    )}
                  </div>
                )}
              </Card>
              <div className="min-w-0 space-y-6">
                <Card className="admin-panel">
                  <div className="admin-editor-heading">
                    <div>
                      <p className="admin-eyebrow">清单资料</p>
                      <h3>{selectedList ? selectedList.title : "新建清单"}</h3>
                    </div>
                    <span className="admin-status">
                      {selectedList
                        ? contentStatus(selectedList.status)
                        : "未保存"}
                    </span>
                  </div>
                  <form onSubmit={saveList} className="space-y-4">
                    <label className="block">
                      <span className="field-label">标题</span>
                      <input
                        className="field"
                        required
                        maxLength={160}
                        value={listForm.title}
                        onChange={(event) =>
                          setListForm({
                            ...listForm,
                            title: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="field-label">简介</span>
                      <textarea
                        className="field min-h-24"
                        value={listForm.summary ?? ""}
                        onChange={(event) =>
                          setListForm({
                            ...listForm,
                            summary: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="field-label">主题分类</span>
                      <input
                        className="field"
                        value={listForm.category ?? ""}
                        onChange={(event) =>
                          setListForm({
                            ...listForm,
                            category: event.target.value || null,
                          })
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="field-label">排序数字</span>
                      <input
                        className="field"
                        type="number"
                        value={listForm.sort_order ?? 0}
                        onChange={(event) =>
                          setListForm({
                            ...listForm,
                            sort_order: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <Button type="submit" disabled={busy}>
                      保存清单
                    </Button>
                  </form>
                  {listDetail.error && <ErrorNotice error={listDetail.error} />}
                  {selectedList && (
                    <div className="mt-5 space-y-4">
                      <p className="text-sm text-stone-600">
                        共 {selectedList.total_item_count} 个条目 · 草稿{" "}
                        {selectedList.draft_item_count} · 已发布{" "}
                        {selectedList.published_item_count} · 已下架{" "}
                        {selectedList.unpublished_item_count}
                      </p>
                      <div className="admin-tool-group">
                        <h4>封面</h4>
                        <label className="block">
                          <span className="field-label">清单封面</span>
                          <input
                            className="field"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) => {
                              setListCover(event.target.files?.[0] ?? null);
                              event.target.value = "";
                            }}
                          />
                        </label>
                        {listCover && (
                          <span className="mt-1 block break-all text-xs text-stone-600">
                            已选：{listCover.name}
                          </span>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-2"
                          disabled={busy || !listCover}
                          onClick={() =>
                            listCover &&
                            run(async () => {
                              await apiDone(
                                listCoverApiMediaListsListIdCoverPost({
                                  path: { list_id: selectedList.id },
                                  body: { file: listCover },
                                }),
                              );
                              setSelectedListSnapshot((current) =>
                                current?.id === selectedList.id
                                  ? {
                                      ...current,
                                      cover_url: `/api/media/lists/${selectedList.id}/cover`,
                                    }
                                  : current,
                              );
                              setListCover(null);
                            }, "清单封面已上传")
                          }
                        >
                          上传封面
                        </Button>
                      </div>
                      {selectedList.cover_url &&
                        selectedList.status === "published" && (
                          <img
                            src={selectedList.cover_url}
                            alt={`${selectedList.title} 当前封面`}
                            className="aspect-[16/9] w-full rounded-2xl object-cover"
                          />
                        )}
                      <div className="admin-tool-group">
                        <h4>发布与访问</h4>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            disabled={
                              busy ||
                              listDetail.isFetching ||
                              (selectedList.draft_item_count === 0 &&
                                selectedList.published_item_count === 0)
                            }
                            onClick={() =>
                              run(async () => {
                                const result = await apiData(
                                  publishAllApiAdminListsListIdPublishAllPost({
                                    path: { list_id: listId },
                                  }),
                                );
                                setSelectedListSnapshot(result.list);
                                return `清单已发布：新发布 ${result.published_count} 个条目，已有 ${result.already_published_count} 个已发布条目，跳过 ${result.skipped_unpublished_count} 个已下架条目。`;
                              })
                            }
                          >
                            {busy
                              ? "正在处理…"
                              : `发布清单及 ${selectedList.draft_item_count} 个草稿条目`}
                          </Button>
                          {selectedList.status === "published" && (
                            <Button
                              type="button"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                run(async () => {
                                  const updated = await apiData(
                                    unpublishListApiAdminListsListIdUnpublishPost(
                                      {
                                        path: { list_id: listId },
                                      },
                                    ),
                                  );
                                  setSelectedListSnapshot(updated);
                                }, "清单已下架")
                              }
                            >
                              下架清单
                            </Button>
                          )}
                          <Button asChild variant="ghost">
                            <Link to="/lists/$listId" params={{ listId }}>
                              查看公开页
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
                <Card className="admin-panel">
                  <div className="admin-editor-heading">
                    <div>
                      <p className="admin-eyebrow">条目管理</p>
                      <h3>{selectedItem ? selectedItem.name : "新建条目"}</h3>
                    </div>
                    {selectedItem && (
                      <span className="admin-status">
                        {contentStatus(selectedItem.status)}
                      </span>
                    )}
                  </div>
                  {!listId ? (
                    <p className="text-sm text-stone-500">先建立一张清单。</p>
                  ) : (
                    <>
                      {items.isPending && <Loading />}
                      {items.error && visibleItems.length === 0 && (
                        <ErrorNotice error={items.error} />
                      )}
                      <div className="admin-selection admin-item-selection">
                        {!items.isPending &&
                          !items.error &&
                          visibleItems.length === 0 && (
                            <p className="text-sm text-stone-600">
                              暂无条目，可在下方新建。
                            </p>
                          )}
                        {visibleItems.map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => {
                              setSelectedItemId(entry.id);
                              setSelectedItemSnapshot(null);
                              setItemForm(itemToWrite(entry));
                              setItemCover(null);
                              setRelatedItemId("");
                            }}
                            className="admin-selection-row"
                            aria-pressed={selectedItemId === entry.id}
                          >
                            <span>{entry.name}</span>
                            <small>{contentStatus(entry.status)}</small>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItemId("");
                            setSelectedItemSnapshot(null);
                            setItemForm(blankItem);
                            setItemCover(null);
                            setRelatedItemId("");
                          }}
                          className="min-h-11 rounded-full border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-800"
                        >
                          + 新建条目
                        </button>
                        {items.hasNextPage && (
                          <Button
                            type="button"
                            variant="outline"
                            size="small"
                            disabled={items.isFetchingNextPage}
                            onClick={() => items.fetchNextPage()}
                          >
                            {items.isFetchingNextPage
                              ? "加载中…"
                              : "加载更多条目"}
                          </Button>
                        )}
                        {items.isFetchNextPageError && (
                          <ErrorNotice error={items.error} />
                        )}
                      </div>
                      <form
                        onSubmit={saveItem}
                        className="space-y-4"
                        onInvalidCapture={(event) => {
                          let disclosure = (
                            event.target as HTMLElement
                          ).closest("details");
                          while (disclosure) {
                            disclosure.open = true;
                            disclosure =
                              disclosure.parentElement?.closest("details") ??
                              null;
                          }
                        }}
                      >
                        <label className="block">
                          <span className="field-label">名称</span>
                          <input
                            className="field"
                            required
                            maxLength={160}
                            value={itemForm.name}
                            onChange={(event) =>
                              setItemForm({
                                ...itemForm,
                                name: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="field-label">一句简介</span>
                          <input
                            className="field"
                            value={itemForm.summary ?? ""}
                            onChange={(event) =>
                              setItemForm({
                                ...itemForm,
                                summary: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="field-label">详细介绍</span>
                          <textarea
                            className="field min-h-24"
                            value={itemForm.description ?? ""}
                            onChange={(event) =>
                              setItemForm({
                                ...itemForm,
                                description: event.target.value,
                              })
                            }
                          />
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="field-label">分类</span>
                            <input
                              className="field"
                              value={itemForm.category ?? ""}
                              onChange={(event) =>
                                setItemForm({
                                  ...itemForm,
                                  category: event.target.value || null,
                                })
                              }
                            />
                          </label>
                          <label className="block">
                            <span className="field-label">排序数字</span>
                            <input
                              className="field"
                              type="number"
                              value={itemForm.sort_order ?? 0}
                              onChange={(event) =>
                                setItemForm({
                                  ...itemForm,
                                  sort_order: Number(event.target.value),
                                })
                              }
                            />
                          </label>
                        </div>
                        <label className="block">
                          <span className="field-label">
                            标签（用逗号分隔）
                          </span>
                          <input
                            className="field"
                            value={(itemForm.tags ?? []).join(", ")}
                            onChange={(event) =>
                              setItemForm({
                                ...itemForm,
                                tags: event.target.value
                                  .split(",")
                                  .map((tag) => tag.trim())
                                  .filter(Boolean),
                              })
                            }
                          />
                        </label>
                        <OptionalFields
                          key={`${selectedItemId}-recommendation`}
                          title="推荐动作与理由"
                          initialOpen={Boolean(
                            itemForm.suggested_action ||
                            itemForm.recommendation,
                          )}
                        >
                          <label className="block">
                            <span className="field-label">推荐动作</span>
                            <textarea
                              className="field"
                              value={itemForm.suggested_action ?? ""}
                              onChange={(event) =>
                                setItemForm({
                                  ...itemForm,
                                  suggested_action: event.target.value || null,
                                })
                              }
                            />
                          </label>
                          <label className="block">
                            <span className="field-label">推荐理由</span>
                            <textarea
                              className="field"
                              value={itemForm.recommendation ?? ""}
                              onChange={(event) =>
                                setItemForm({
                                  ...itemForm,
                                  recommendation: event.target.value || null,
                                })
                              }
                            />
                          </label>
                        </OptionalFields>
                        <OptionalFields
                          key={`${selectedItemId}-location`}
                          title="地点与坐标"
                          initialOpen={Boolean(
                            (itemForm.place_kind &&
                              itemForm.place_kind !== "none") ||
                            itemForm.place_name ||
                            itemForm.address ||
                            itemForm.area ||
                            itemForm.online_url ||
                            itemForm.latitude != null ||
                            itemForm.longitude != null ||
                            itemForm.coordinate_system,
                          )}
                        >
                          <label className="block">
                            <span className="field-label">地点类型</span>
                            <select
                              className="field"
                              value={itemForm.place_kind ?? "none"}
                              onChange={(event) =>
                                setItemForm({
                                  ...itemForm,
                                  place_kind: event.target
                                    .value as ItemWrite["place_kind"],
                                })
                              }
                            >
                              <option value="none">无固定地点</option>
                              <option value="physical">实体地点</option>
                              <option value="area">区域</option>
                              <option value="online">线上</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="field-label">地点名称</span>
                            <input
                              className="field"
                              value={itemForm.place_name ?? ""}
                              onChange={(event) =>
                                setItemForm({
                                  ...itemForm,
                                  place_name: event.target.value || null,
                                })
                              }
                            />
                          </label>
                          <label className="block">
                            <span className="field-label">地址</span>
                            <input
                              className="field"
                              value={itemForm.address ?? ""}
                              onChange={(event) =>
                                setItemForm({
                                  ...itemForm,
                                  address: event.target.value || null,
                                })
                              }
                            />
                          </label>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block">
                              <span className="field-label">区域</span>
                              <input
                                className="field"
                                value={itemForm.area ?? ""}
                                onChange={(event) =>
                                  setItemForm({
                                    ...itemForm,
                                    area: event.target.value || null,
                                  })
                                }
                              />
                            </label>
                            <label className="block">
                              <span className="field-label">线上地点</span>
                              <input
                                className="field"
                                type="url"
                                placeholder="https://"
                                value={itemForm.online_url ?? ""}
                                onChange={(event) =>
                                  setItemForm({
                                    ...itemForm,
                                    online_url: event.target.value || null,
                                  })
                                }
                              />
                            </label>
                          </div>
                          <fieldset className="rounded-2xl border border-stone-200 p-4">
                            <legend className="px-1 text-sm font-semibold text-stone-700">
                              坐标（可选）
                            </legend>
                            <p className="mb-3 text-xs text-stone-500">
                              经纬度需同时填写，并标明坐标系。
                            </p>
                            <div className="grid gap-3 sm:grid-cols-3">
                              <label className="block">
                                <span className="field-label">纬度</span>
                                <input
                                  className="field"
                                  type="number"
                                  step="any"
                                  min={-90}
                                  max={90}
                                  value={itemForm.latitude ?? ""}
                                  onChange={(event) =>
                                    setItemForm({
                                      ...itemForm,
                                      latitude: event.target.value
                                        ? Number(event.target.value)
                                        : null,
                                    })
                                  }
                                />
                              </label>
                              <label className="block">
                                <span className="field-label">经度</span>
                                <input
                                  className="field"
                                  type="number"
                                  step="any"
                                  min={-180}
                                  max={180}
                                  value={itemForm.longitude ?? ""}
                                  onChange={(event) =>
                                    setItemForm({
                                      ...itemForm,
                                      longitude: event.target.value
                                        ? Number(event.target.value)
                                        : null,
                                    })
                                  }
                                />
                              </label>
                              <label className="block">
                                <span className="field-label">坐标系</span>
                                <select
                                  className="field"
                                  value={itemForm.coordinate_system ?? ""}
                                  onChange={(event) =>
                                    setItemForm({
                                      ...itemForm,
                                      coordinate_system: event.target.value
                                        ? (event.target
                                            .value as ItemWrite["coordinate_system"])
                                        : null,
                                    })
                                  }
                                >
                                  <option value="">不填写</option>
                                  <option value="WGS84">WGS84</option>
                                  <option value="GCJ02">GCJ02</option>
                                  <option value="BD09">BD09</option>
                                </select>
                              </label>
                            </div>
                          </fieldset>
                        </OptionalFields>
                        <OptionalFields
                          key={`${selectedItemId}-reference`}
                          title="参考资料与核对"
                          initialOpen={Boolean(
                            itemForm.reference_note ||
                            itemForm.reference_as_of ||
                            itemForm.source ||
                            itemForm.verified_at ||
                            itemForm.missing_fields?.length,
                          )}
                        >
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block">
                              <span className="field-label">
                                带时效的参考资料
                              </span>
                              <textarea
                                className="field"
                                value={itemForm.reference_note ?? ""}
                                onChange={(event) =>
                                  setItemForm({
                                    ...itemForm,
                                    reference_note: event.target.value || null,
                                  })
                                }
                              />
                            </label>
                            <div>
                              <label className="block">
                                <span className="field-label">
                                  资料截至时间
                                </span>
                                <input
                                  className="field"
                                  type="datetime-local"
                                  aria-describedby="admin-reference-time-help"
                                  value={localDateTime(
                                    itemForm.reference_as_of,
                                  )}
                                  onChange={(event) =>
                                    setItemForm({
                                      ...itemForm,
                                      reference_as_of: event.target.value
                                        ? new Date(
                                            event.target.value,
                                          ).toISOString()
                                        : null,
                                    })
                                  }
                                />
                              </label>
                              <span
                                id="admin-reference-time-help"
                                className="mt-1 block text-xs text-stone-500"
                              >
                                如填写参考资料，两项都需填写。
                              </span>
                            </div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="block">
                                <span className="field-label">资料来源</span>
                                <input
                                  className="field"
                                  value={itemForm.source ?? ""}
                                  aria-describedby={
                                    selectedItem?.source?.includes(
                                      "OCR Markdown transcription only",
                                    )
                                      ? "admin-ocr-source-help"
                                      : undefined
                                  }
                                  readOnly={Boolean(
                                    selectedItem?.source?.includes(
                                      "OCR Markdown transcription only",
                                    ),
                                  )}
                                  onChange={(event) =>
                                    setItemForm({
                                      ...itemForm,
                                      source: event.target.value || null,
                                    })
                                  }
                                />
                              </label>
                              {selectedItem?.source?.includes(
                                "OCR Markdown transcription only",
                              ) && (
                                <span
                                  id="admin-ocr-source-help"
                                  className="text-xs text-stone-500"
                                >
                                  OCR 来源标记需保留；其他条目资料仍可修改。
                                </span>
                              )}
                            </div>
                            <label className="block">
                              <span className="field-label">核对时间</span>
                              <input
                                className="field"
                                type="datetime-local"
                                value={localDateTime(itemForm.verified_at)}
                                onChange={(event) =>
                                  setItemForm({
                                    ...itemForm,
                                    verified_at: event.target.value
                                      ? new Date(
                                          event.target.value,
                                        ).toISOString()
                                      : null,
                                  })
                                }
                              />
                            </label>
                          </div>
                          <label className="block">
                            <span className="field-label">
                              待补字段（用逗号分隔）
                            </span>
                            <input
                              className="field"
                              value={(itemForm.missing_fields ?? []).join(", ")}
                              onChange={(event) =>
                                setItemForm({
                                  ...itemForm,
                                  missing_fields: event.target.value
                                    .split(",")
                                    .map((field) => field.trim())
                                    .filter(Boolean),
                                })
                              }
                            />
                          </label>
                        </OptionalFields>
                        <OptionalFields
                          key={`${selectedItemId}-links`}
                          title="外部链接"
                          initialOpen={Boolean(itemForm.links?.length)}
                        >
                          <fieldset className="space-y-3 rounded-2xl border border-stone-200 p-4">
                            <legend className="px-1 text-sm font-semibold text-stone-700">
                              带标题的外链
                            </legend>
                            {(itemForm.links ?? []).map((link, index) => (
                              <div
                                key={index}
                                className="grid gap-2 rounded-xl bg-stone-50 p-3 sm:grid-cols-[1fr_1.5fr_auto]"
                              >
                                <label className="block">
                                  <span className="field-label">标题</span>
                                  <input
                                    className="field"
                                    required
                                    maxLength={160}
                                    value={link.title}
                                    onChange={(event) =>
                                      setItemForm({
                                        ...itemForm,
                                        links: (itemForm.links ?? []).map(
                                          (current, currentIndex) =>
                                            currentIndex === index
                                              ? {
                                                  ...current,
                                                  title: event.target.value,
                                                }
                                              : current,
                                        ),
                                      })
                                    }
                                  />
                                </label>
                                <label className="block">
                                  <span className="field-label">网址</span>
                                  <input
                                    className="field"
                                    type="url"
                                    required
                                    placeholder="https://"
                                    value={link.url}
                                    onChange={(event) =>
                                      setItemForm({
                                        ...itemForm,
                                        links: (itemForm.links ?? []).map(
                                          (current, currentIndex) =>
                                            currentIndex === index
                                              ? {
                                                  ...current,
                                                  url: event.target.value,
                                                }
                                              : current,
                                        ),
                                      })
                                    }
                                  />
                                </label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="self-end"
                                  onClick={() =>
                                    setItemForm({
                                      ...itemForm,
                                      links: (itemForm.links ?? []).filter(
                                        (_, currentIndex) =>
                                          currentIndex !== index,
                                      ),
                                    })
                                  }
                                >
                                  移除
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              disabled={(itemForm.links ?? []).length >= 20}
                              onClick={() =>
                                setItemForm({
                                  ...itemForm,
                                  links: [
                                    ...(itemForm.links ?? []),
                                    { title: "", url: "", kind: "reference" },
                                  ],
                                })
                              }
                            >
                              添加外链
                            </Button>
                          </fieldset>
                        </OptionalFields>
                        <Button type="submit" disabled={busy}>
                          保存条目
                        </Button>
                      </form>
                      {selectedItemId && (
                        <div className="mt-5 space-y-4">
                          <div>
                            <label className="block">
                              <span className="field-label">条目封面</span>
                              <input
                                className="field"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(event) => {
                                  setItemCover(event.target.files?.[0] ?? null);
                                  event.target.value = "";
                                }}
                              />
                            </label>
                            {itemCover && (
                              <span className="mt-1 block break-all text-xs text-stone-600">
                                已选：{itemCover.name}
                              </span>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              className="mt-2"
                              disabled={busy || !itemCover}
                              onClick={() =>
                                itemCover &&
                                run(async () => {
                                  await apiDone(
                                    itemCoverApiMediaItemsItemIdCoverPost({
                                      path: { item_id: selectedItemId },
                                      body: { file: itemCover },
                                    }),
                                  );
                                  setSelectedItemSnapshot((current) =>
                                    current?.id === selectedItemId
                                      ? {
                                          ...current,
                                          cover_url: `/api/media/items/${selectedItemId}/cover`,
                                        }
                                      : current,
                                  );
                                  setItemCover(null);
                                }, "条目封面已上传")
                              }
                            >
                              上传封面
                            </Button>
                          </div>
                          {selectedItem?.cover_url &&
                            selectedItem.status === "published" &&
                            selectedList?.status === "published" && (
                              <img
                                src={selectedItem.cover_url}
                                alt={`${selectedItem.name} 当前封面`}
                                className="aspect-[16/9] w-full rounded-2xl object-cover"
                              />
                            )}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={busy}
                              onClick={() => {
                                if (selectedItem)
                                  run(async () => {
                                    const updated = await apiData(
                                      (selectedItem.status === "published"
                                        ? unpublishItemApiAdminItemsItemIdUnpublishPost
                                        : publishItemApiAdminItemsItemIdPublishPost)(
                                        {
                                          path: { item_id: selectedItem.id },
                                        },
                                      ),
                                    );
                                    setSelectedItemSnapshot(updated);
                                  }, "条目状态已更新");
                              }}
                            >
                              {selectedItem?.status === "published"
                                ? "下架条目"
                                : "发布条目"}
                            </Button>
                            <Button asChild variant="ghost">
                              <Link
                                to="/items/$itemId"
                                params={{ itemId: selectedItemId }}
                              >
                                查看公开页
                              </Link>
                            </Button>
                          </div>
                          <form
                            className="space-y-2 rounded-2xl bg-stone-50 p-4"
                            onSubmit={(event) => {
                              event.preventDefault();
                              if (!relatedItemId) return;
                              run(async () => {
                                await apiData(
                                  addRelationApiAdminItemsItemIdRelationsPost({
                                    path: { item_id: selectedItemId },
                                    body: { related_item_id: relatedItemId },
                                  }),
                                );
                                setRelatedItemId("");
                              }, "相关条目已添加");
                            }}
                          >
                            <label className="block">
                              <span className="field-label">
                                添加同清单相关条目
                              </span>
                              <select
                                className="field"
                                required
                                value={relatedItemId}
                                onChange={(event) =>
                                  setRelatedItemId(event.target.value)
                                }
                              >
                                <option value="">选择条目</option>
                                {visibleItems
                                  .filter(
                                    (entry) => entry.id !== selectedItemId,
                                  )
                                  .map((entry) => (
                                    <option key={entry.id} value={entry.id}>
                                      {entry.name}
                                    </option>
                                  ))}
                              </select>
                            </label>
                            {selectedItem?.related.length ? (
                              <p className="text-xs text-stone-600">
                                已关联：
                                {selectedItem.related
                                  .map((entry) => entry.name)
                                  .join("、")}
                              </p>
                            ) : null}
                            <Button
                              type="submit"
                              variant="outline"
                              disabled={busy || !relatedItemId}
                            >
                              添加关联
                            </Button>
                          </form>
                        </div>
                      )}
                    </>
                  )}
                </Card>
              </div>
            </div>
          </section>
          <section
            id="admin-imports"
            aria-label="导入"
            hidden={currentWorkspace !== "imports"}
          >
            <div className="admin-workspace-heading">
              <h2>导入</h2>
              <p>先预览内容，再导入为草稿。发布请前往内容编辑。</p>
            </div>
            <ChecklistImport
              onFeedback={setImportFeedback}
              onEdit={() => {
                setWorkspace("content");
                requestAnimationFrame(() => contentRef.current?.focus());
              }}
              onSelect={async (id) => {
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ["admin-lists"] }),
                  queryClient.invalidateQueries({
                    queryKey: ["admin-items", id],
                  }),
                  queryClient.invalidateQueries({
                    queryKey: ["admin-list", id],
                  }),
                  queryClient.invalidateQueries({ queryKey: ["admin-audit"] }),
                ]);
                const imported = await queryClient.fetchQuery({
                  queryKey: ["admin-list", id],
                  queryFn: () =>
                    apiData(
                      adminListDetailApiAdminListsListIdGet({
                        path: { list_id: id },
                      }),
                    ),
                });
                setSelectedListId(id);
                setSelectedListSnapshot(imported);
                setListForm({
                  title: imported.title,
                  summary: imported.summary,
                  category: imported.category,
                  sort_order: imported.sort_order,
                });
                setSelectedItemId("");
                setSelectedItemSnapshot(null);
                setItemForm(blankItem);
                setListCover(null);
                setItemCover(null);
                setRelatedItemId("");
              }}
            />
            <details className="admin-reviewed">
              <summary>已复核资料 · 导入到当前清单</summary>
              <Card className="admin-panel">
                <h3 className="mb-2 text-lg font-bold">导入已复核资料</h3>
                <p className="admin-context">
                  {selectedList
                    ? `当前清单：${selectedList.title}`
                    : "请先在内容编辑中选择或建立一张清单。"}
                </p>
                <p className="mb-4 text-sm leading-6 text-stone-600">
                  粘贴包含 source、reviewed_at、rows 的 JSON。每行必须标记
                  transcription_reviewed，坐标还需
                  coordinates_checked。导入后作为草稿复查。
                </p>
                <form onSubmit={importRows} className="space-y-3">
                  <label className="block">
                    <span className="field-label">已复核条目 JSON</span>
                    <textarea
                      className="field min-h-40 font-mono text-xs"
                      value={importJson}
                      onChange={(event) => setImportJson(event.target.value)}
                      placeholder='{"source":"OCR file...","reviewed_at":"2026-09-29T00:00:00Z","rows":[...]}'
                      required
                    />
                  </label>
                  <Button type="submit" disabled={busy || !listId}>
                    导入当前清单
                  </Button>
                </form>
              </Card>
            </details>
          </section>
          <section
            id="admin-moderation"
            aria-label="内容治理"
            hidden={currentWorkspace !== "moderation"}
          >
            <div className="admin-workspace-heading">
              <h2>内容治理</h2>
              <p>处理公开记录，保留原因和操作记录。</p>
            </div>
            <Card className="admin-panel admin-bounded">
              <h3 className="mb-2 text-lg font-bold">隐藏公开内容</h3>
              <p className="mb-4 text-sm text-stone-600">
                按记录 ID 隐藏，分享链接会立即失效；原因写入审计。
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  run(
                    () =>
                      apiDone(
                        hideExperienceApiAdminCheckinsCheckinIdHidePost({
                          path: { checkin_id: moderationId },
                          body: { reason: moderationReason },
                        }),
                      ),
                    "内容已隐藏",
                  );
                }}
                className="space-y-3"
              >
                <label className="block">
                  <span className="field-label">记录 ID</span>
                  <input
                    className="field"
                    required
                    value={moderationId}
                    onChange={(event) => setModerationId(event.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="field-label">原因</span>
                  <textarea
                    className="field"
                    required
                    value={moderationReason}
                    onChange={(event) =>
                      setModerationReason(event.target.value)
                    }
                  />
                </label>
                <Button type="submit" variant="danger" disabled={busy}>
                  隐藏内容
                </Button>
              </form>
            </Card>
          </section>
          {isSystemAdmin && (
            <>
              <section
                id="admin-users"
                aria-label="账号角色"
                hidden={currentWorkspace !== "users"}
              >
                <Card className="admin-panel">
                  <h2 className="mb-2 text-xl font-bold">账号角色</h2>
                  <p className="mb-4 text-sm text-stone-600">
                    角色调整会立即影响该账号的管理权限，并记入操作审计。
                  </p>
                  {users.isPending ? (
                    <Loading />
                  ) : users.error ? (
                    <ErrorNotice error={users.error} />
                  ) : (
                    <>
                      {users.data?.items.length === 0 && (
                        <p className="text-sm text-stone-600">暂无账号。</p>
                      )}
                      <ul className="divide-y divide-stone-200">
                        {users.data?.items.map((user) => (
                          <li key={user.id} className="space-y-2 py-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-stone-900">
                                {user.display_name}
                              </p>
                              <p className="break-all text-xs text-stone-500">
                                {user.email}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-end gap-2">
                              <label className="min-w-40 flex-1">
                                <span className="field-label">角色</span>
                                <select
                                  className="field"
                                  value={roleDrafts[user.id] ?? user.role}
                                  onChange={(event) =>
                                    setRoleDrafts({
                                      ...roleDrafts,
                                      [user.id]: event.target.value as Role,
                                    })
                                  }
                                >
                                  {Object.entries(roleLabels).map(
                                    ([value, label]) => (
                                      <option key={value} value={value}>
                                        {label}
                                      </option>
                                    ),
                                  )}
                                </select>
                              </label>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={
                                  busy ||
                                  !roleDrafts[user.id] ||
                                  roleDrafts[user.id] === user.role
                                }
                                onClick={() =>
                                  run(async () => {
                                    await apiData(
                                      changeRoleApiAdminUsersUserIdRolePut({
                                        path: { user_id: user.id },
                                        body: { role: roleDrafts[user.id] },
                                      }),
                                    );
                                    setRoleDrafts((drafts) => {
                                      const next = { ...drafts };
                                      delete next[user.id];
                                      return next;
                                    });
                                  }, "账号角色已更新")
                                }
                              >
                                保存角色
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex items-center justify-between gap-2 text-sm text-stone-600">
                        <span>共 {users.data?.total ?? 0} 个账号</span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="small"
                            disabled={userOffset === 0}
                            onClick={() =>
                              setUserOffset(Math.max(0, userOffset - 50))
                            }
                          >
                            上一页
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="small"
                            disabled={
                              userOffset + 50 >= (users.data?.total ?? 0)
                            }
                            onClick={() => setUserOffset(userOffset + 50)}
                          >
                            下一页
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              </section>
              <section
                id="admin-audit"
                aria-label="操作审计"
                hidden={currentWorkspace !== "audit"}
              >
                <Card className="admin-panel">
                  <h2 className="mb-2 text-xl font-bold">操作审计</h2>
                  <p className="mb-4 text-sm text-stone-600">
                    按时间倒序查看内容隐藏、角色调整及清单条目操作。
                  </p>
                  {audit.isPending ? (
                    <Loading />
                  ) : audit.error ? (
                    <ErrorNotice error={audit.error} />
                  ) : audit.data?.items.length ? (
                    <>
                      <ol className="divide-y divide-stone-200">
                        {audit.data.items.map((entry, index) => (
                          <li
                            key={auditText(entry.id) || index}
                            className="space-y-1 py-3 text-sm"
                          >
                            <p className="font-semibold text-stone-900">
                              {auditText(entry.action) || "未知操作"}
                            </p>
                            <p className="break-all text-stone-600">
                              {auditText(entry.target_type)} ·{" "}
                              {auditText(entry.target_id)}
                            </p>
                            {auditText(entry.reason) && (
                              <p className="text-stone-600">
                                原因：{auditText(entry.reason)}
                              </p>
                            )}
                            <p className="text-xs text-stone-500">
                              {auditText(entry.created_at)
                                ? new Date(
                                    auditText(entry.created_at),
                                  ).toLocaleString("zh-CN")
                                : ""}
                              {" · 操作者 "}
                              {auditText(entry.actor_id)}
                            </p>
                          </li>
                        ))}
                      </ol>
                      <div className="mt-4 flex items-center justify-between gap-2 text-sm text-stone-600">
                        <span>共 {audit.data.total} 条</span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="small"
                            disabled={auditOffset === 0}
                            onClick={() =>
                              setAuditOffset(Math.max(0, auditOffset - 50))
                            }
                          >
                            上一页
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="small"
                            disabled={auditOffset + 50 >= audit.data.total}
                            onClick={() => setAuditOffset(auditOffset + 50)}
                          >
                            下一页
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-stone-500">暂无审计记录。</p>
                  )}
                </Card>
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
}
