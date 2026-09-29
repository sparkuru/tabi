import { useState, type FormEvent } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { apiData, apiDone } from "../../api/client";
import {
  addRelationApiAdminItemsItemIdRelationsPost,
  adminItemsApiAdminListsListIdItemsGet,
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
  publishListApiAdminListsListIdPublishPost,
  unpublishItemApiAdminItemsItemIdUnpublishPost,
  unpublishListApiAdminListsListIdUnpublishPost,
} from "../../api/generated";
import type {
  ChangeRoleIn,
  ChecklistOut,
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

export function AdminPage() {
  const session = useSession();
  const [selectedListId, setSelectedListId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedListSnapshot, setSelectedListSnapshot] =
    useState<ChecklistOut | null>(null);
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
    visibleLists.find((entry) => entry.id === listId) ??
    (selectedListSnapshot?.id === listId ? selectedListSnapshot : undefined);
  const selectedItem =
    visibleItems.find((entry) => entry.id === selectedItemId) ??
    (selectedItemSnapshot?.id === selectedItemId
      ? selectedItemSnapshot
      : undefined);
  const isSystemAdmin = session.data?.role === "system_admin";
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
      await action();
      setMessage(success);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-lists"] }),
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
      <PageIntro eyebrow="Content studio" title="内容管理">
        创建清单和条目，复核资料，再决定何时发布。
      </PageIntro>
      {error && (
        <div className="mb-6">
          <ErrorNotice error={error} />
        </div>
      )}
      {message && (
        <p
          role="status"
          className="mb-6 rounded-2xl bg-teal-50 p-4 text-sm font-semibold text-teal-900"
        >
          {message}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-bold">清单</h2>
          {lists.isPending ? (
            <Loading />
          ) : lists.error && visibleLists.length === 0 ? (
            <ErrorNotice error={lists.error} />
          ) : (
            <div className="mb-5 flex flex-wrap gap-2">
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
                  className={`rounded-full px-3 py-2 text-sm ${listId === entry.id ? "bg-teal-800 text-white" : "bg-stone-100 text-stone-700"}`}
                >
                  {entry.title}
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
                className="rounded-full border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-800"
              >
                + 新建
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
          <form onSubmit={saveList} className="space-y-4">
            <label className="block">
              <span className="field-label">标题</span>
              <input
                className="field"
                required
                maxLength={160}
                value={listForm.title}
                onChange={(event) =>
                  setListForm({ ...listForm, title: event.target.value })
                }
              />
            </label>
            <label className="block">
              <span className="field-label">简介</span>
              <textarea
                className="field min-h-24"
                value={listForm.summary ?? ""}
                onChange={(event) =>
                  setListForm({ ...listForm, summary: event.target.value })
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
          {selectedList && (
            <div className="mt-5 space-y-4">
              <div>
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
                  {listCover && (
                    <span className="mt-1 block break-all text-xs text-stone-600">
                      已选：{listCover.name}
                    </span>
                  )}
                </label>
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
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const updated = await apiData(
                        (selectedList.status === "published"
                          ? unpublishListApiAdminListsListIdUnpublishPost
                          : publishListApiAdminListsListIdPublishPost)({
                          path: { list_id: listId },
                        }),
                      );
                      setSelectedListSnapshot(updated);
                    }, "清单状态已更新")
                  }
                >
                  {selectedList.status === "published"
                    ? "下架清单"
                    : "发布清单"}
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/lists/$listId" params={{ listId }}>
                    查看公开页
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-bold">条目</h2>
          {!listId ? (
            <p className="text-sm text-stone-500">先建立一张清单。</p>
          ) : (
            <>
              {items.isPending && <Loading />}
              {items.error && visibleItems.length === 0 && (
                <ErrorNotice error={items.error} />
              )}
              <div className="mb-5 flex flex-wrap gap-2">
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
                    className={`rounded-full px-3 py-2 text-sm ${selectedItemId === entry.id ? "bg-teal-800 text-white" : "bg-stone-100 text-stone-700"}`}
                  >
                    {entry.name}
                    {entry.status !== "published" ? " · 草稿" : ""}
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
                  className="rounded-full border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-800"
                >
                  + 新建
                </button>
                {items.hasNextPage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="small"
                    disabled={items.isFetchingNextPage}
                    onClick={() => items.fetchNextPage()}
                  >
                    {items.isFetchingNextPage ? "加载中…" : "加载更多条目"}
                  </Button>
                )}
                {items.isFetchNextPageError && (
                  <ErrorNotice error={items.error} />
                )}
              </div>
              <form onSubmit={saveItem} className="space-y-4">
                <label className="block">
                  <span className="field-label">名称</span>
                  <input
                    className="field"
                    required
                    maxLength={160}
                    value={itemForm.name}
                    onChange={(event) =>
                      setItemForm({ ...itemForm, name: event.target.value })
                    }
                  />
                </label>
                <label className="block">
                  <span className="field-label">一句简介</span>
                  <input
                    className="field"
                    value={itemForm.summary ?? ""}
                    onChange={(event) =>
                      setItemForm({ ...itemForm, summary: event.target.value })
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="field-label">带时效的参考资料</span>
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
                  <label className="block">
                    <span className="field-label">资料截至时间</span>
                    <input
                      className="field"
                      type="datetime-local"
                      value={localDateTime(itemForm.reference_as_of)}
                      onChange={(event) =>
                        setItemForm({
                          ...itemForm,
                          reference_as_of: event.target.value
                            ? new Date(event.target.value).toISOString()
                            : null,
                        })
                      }
                    />
                    <span className="mt-1 block text-xs text-stone-500">
                      如填写参考资料，两项都需填写。
                    </span>
                  </label>
                </div>
                <label className="block">
                  <span className="field-label">标签（用逗号分隔）</span>
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="field-label">资料来源</span>
                    <input
                      className="field"
                      value={itemForm.source ?? ""}
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
                    {selectedItem?.source?.includes(
                      "OCR Markdown transcription only",
                    ) && (
                      <span className="text-xs text-stone-500">
                        OCR 来源标记需保留；其他条目资料仍可修改。
                      </span>
                    )}
                  </label>
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
                            ? new Date(event.target.value).toISOString()
                            : null,
                        })
                      }
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="field-label">待补字段（用逗号分隔）</span>
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
                                    ? { ...current, title: event.target.value }
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
                                    ? { ...current, url: event.target.value }
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
                              (_, currentIndex) => currentIndex !== index,
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
                      {itemCover && (
                        <span className="mt-1 block break-all text-xs text-stone-600">
                          已选：{itemCover.name}
                        </span>
                      )}
                    </label>
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
                                : publishItemApiAdminItemsItemIdPublishPost)({
                                path: { item_id: selectedItem.id },
                              }),
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
                      <span className="field-label">添加同清单相关条目</span>
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
                          .filter((entry) => entry.id !== selectedItemId)
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
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-2 text-xl font-bold">导入已复核资料</h2>
          <p className="mb-4 text-sm leading-6 text-stone-600">
            粘贴包含 source、reviewed_at、rows 的 JSON。每行必须标记
            transcription_reviewed，坐标还需
            coordinates_checked。导入后作为草稿复查。
          </p>
          <form onSubmit={importRows} className="space-y-3">
            <textarea
              className="field min-h-40 font-mono text-xs"
              value={importJson}
              onChange={(event) => setImportJson(event.target.value)}
              placeholder='{"source":"OCR file...","reviewed_at":"2026-09-29T00:00:00Z","rows":[...]}'
              required
            />
            <Button type="submit" disabled={busy || !listId}>
              导入当前清单
            </Button>
          </form>
        </Card>
        <Card className="p-6">
          <h2 className="mb-2 text-xl font-bold">隐藏公开内容</h2>
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
                onChange={(event) => setModerationReason(event.target.value)}
              />
            </label>
            <Button type="submit" variant="danger" disabled={busy}>
              隐藏内容
            </Button>
          </form>
        </Card>
      </div>
      {isSystemAdmin && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
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
                      disabled={userOffset + 50 >= (users.data?.total ?? 0)}
                      onClick={() => setUserOffset(userOffset + 50)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
          <Card className="p-6">
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
        </div>
      )}
    </>
  );
}
