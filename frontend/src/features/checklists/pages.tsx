import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  MapPin,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { apiData, apiDone } from "../../api/client";
import {
  hideExperienceApiAdminCheckinsCheckinIdHidePost,
  itemDetailsApiItemsItemIdGet,
  listDetailApiListsListIdGet,
  listItemsApiListsListIdItemsGet,
  listsApiListsGet,
  publicExperiencesApiItemsItemIdCheckinsPublicGet,
} from "../../api/generated";
import type { ChecklistOut, ItemSummaryOut } from "../../api/generated";
import {
  EmptyState,
  ErrorNotice,
  Loading,
  PageIntro,
  PhotoGallery,
} from "../../components/common";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useSession } from "../../hooks/use-session";
import { queryClient } from "../../lib/query-client";
import { formatDate } from "../../lib/utils";

function ListCard({ list, index }: { list: ChecklistOut; index: number }) {
  const progress = list.item_count
    ? Math.round((list.completed_count / list.item_count) * 100)
    : 0;
  return (
    <Link
      to="/lists/$listId"
      params={{ listId: list.id }}
      className="group block h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
    >
      <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-lg">
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-400">
          {list.cover_url ? (
            <img
              src={list.cover_url}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-between px-7 text-white/80">
              <span className="text-6xl font-black opacity-50">
                {String(index + 1).padStart(2, "0")}
              </span>
              <MapPin className="size-16 opacity-60" aria-hidden="true" />
            </div>
          )}
          {list.category && (
            <span className="absolute right-4 bottom-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-teal-900">
              {list.category}
            </span>
          )}
        </div>
        <div className="space-y-4 p-6">
          <div>
            <h2 className="text-xl font-bold text-stone-900">{list.title}</h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">
              {list.summary}
            </p>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-600">
              {list.item_count} 个条目 · 已完成 {list.completed_count}
            </span>
            <ArrowRight
              className="size-4 text-teal-800 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-stone-100"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${list.title}完成进度`}
          >
            <div
              className="h-full rounded-full bg-teal-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function HomePage() {
  const lists = useInfiniteQuery({
    queryKey: ["lists"],
    queryFn: ({ pageParam }) =>
      apiData(listsApiListsGet({ query: { limit: 24, offset: pageParam } })),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.offset + lastPage.limit < lastPage.total
        ? lastPage.offset + lastPage.limit
        : undefined,
  });
  const visibleLists = lists.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <>
      <div className="relative mb-12 overflow-hidden rounded-[2rem] bg-teal-900 px-6 py-12 text-white sm:px-12 sm:py-16">
        <div
          className="absolute -right-12 -bottom-24 size-72 rounded-full border-[32px] border-white/10"
          aria-hidden="true"
        />
        <p className="mb-4 text-xs font-bold tracking-[0.25em] text-emerald-200 uppercase">
          Tabi · 旅々
        </p>
        <h1 className="max-w-2xl text-4xl leading-tight font-black tracking-tight sm:text-6xl">
          把想做的事，
          <br />
          <span className="text-amber-200">一件件过成故事。</span>
        </h1>
        <p className="mt-6 max-w-xl leading-7 text-teal-100">
          挑一张清单，从“这是什么、在哪里、做什么”开始探索。每次体验都能留下自己的照片与心得。
        </p>
        <a
          href="#lists"
          className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-teal-900 hover:bg-amber-100"
        >
          探索清单 <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </div>
      <section id="lists" aria-label="公开清单">
        <PageIntro eyebrow="Find your next stop" title="想从哪里开始？">
          从一张清单出发，按自己的节奏慢慢打卡。
        </PageIntro>
        {lists.isPending ? (
          <Loading />
        ) : lists.error && visibleLists.length === 0 ? (
          <ErrorNotice error={lists.error} />
        ) : visibleLists.length ? (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visibleLists.map((list, index) => (
                <ListCard key={list.id} list={list} index={index} />
              ))}
            </div>
            {lists.isFetchNextPageError && <ErrorNotice error={lists.error} />}
            {lists.hasNextPage && (
              <div className="mt-8 text-center">
                <Button
                  type="button"
                  variant="outline"
                  disabled={lists.isFetchingNextPage}
                  onClick={() => lists.fetchNextPage()}
                >
                  {lists.isFetchingNextPage ? "正在加载…" : "加载更多清单"}
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState title="清单正在准备中">
            管理员发布第一张清单后，会出现在这里。
          </EmptyState>
        )}
      </section>
    </>
  );
}

function ItemCard({ item }: { item: ItemSummaryOut }) {
  return (
    <Link
      to="/items/$itemId"
      params={{ itemId: item.id }}
      className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
    >
      <Card className="flex items-center gap-4 p-4 transition-shadow group-hover:shadow-md sm:p-5">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-emerald-50 text-teal-800 sm:size-20">
          {item.cover_url ? (
            <img
              src={item.cover_url}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <MapPin className="size-7" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-bold text-stone-900 sm:text-lg">
              {item.name}
            </h2>
            {item.completed && (
              <span
                className="grid size-5 shrink-0 place-items-center rounded-full bg-teal-700 text-white"
                aria-label="已打卡"
              >
                <Check className="size-3" />
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-stone-600">
            {item.summary || "点开看看详情与推荐动作"}
          </p>
          <p className="mt-2 text-xs text-stone-500">
            {item.category ?? "未分类"} · {item.checkin_count} 次打卡
          </p>
        </div>
        <ArrowRight
          className="size-4 shrink-0 text-teal-800"
          aria-hidden="true"
        />
      </Card>
    </Link>
  );
}

export function ListPage({ listId }: { listId: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<"order" | "name" | "newest">("order");
  const list = useQuery({
    queryKey: ["list", listId],
    queryFn: () =>
      apiData(listDetailApiListsListIdGet({ path: { list_id: listId } })),
  });
  const items = useInfiniteQuery({
    queryKey: ["items", listId, query, category, sort],
    queryFn: ({ pageParam }) =>
      apiData(
        listItemsApiListsListIdItemsGet({
          path: { list_id: listId },
          query: {
            q: query || undefined,
            category: category || undefined,
            sort,
            limit: 30,
            offset: pageParam,
          },
        }),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.offset + lastPage.limit < lastPage.total
        ? lastPage.offset + lastPage.limit
        : undefined,
  });
  const visibleItems = items.data?.pages.flatMap((page) => page.items) ?? [];
  const categories = useMemo(
    () => [
      ...new Set(
        [category, ...visibleItems.map((item) => item.category)].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    ],
    [category, visibleItems],
  );
  if (list.isPending) return <Loading />;
  if (list.error) return <ErrorNotice error={list.error} />;
  const progress = list.data.item_count
    ? Math.round((list.data.completed_count / list.data.item_count) * 100)
    : 0;
  return (
    <>
      <Link
        to="/"
        className="mb-6 inline-block text-sm font-semibold text-teal-800 hover:underline"
      >
        ← 返回清单
      </Link>
      <PageIntro
        eyebrow={list.data.category ?? "Checklist"}
        title={list.data.title}
      >
        {list.data.summary}
      </PageIntro>
      <Card className="mb-8 flex flex-col gap-4 bg-teal-50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-800">你的探索进度</p>
          <p className="mt-1 text-2xl font-black text-teal-900">
            {list.data.completed_count}{" "}
            <span className="text-base font-medium">
              / {list.data.item_count} 个条目
            </span>
          </p>
        </div>
        <div className="w-full sm:max-w-xs">
          <div className="mb-2 text-right text-sm font-bold text-teal-800">
            {progress}%
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-teal-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </Card>
      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="relative">
          <Search
            className="absolute top-3.5 left-3 size-4 text-stone-500"
            aria-hidden="true"
          />
          <span className="sr-only">搜索条目</span>
          <input
            className="field pl-10"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索想去的地方或条目"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          <span className="sr-only">分类筛选</span>
          <select
            className="field"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">全部分类</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="sr-only">排序方式</span>
          <select
            className="field"
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
          >
            <option value="order">清单顺序</option>
            <option value="name">名称</option>
            <option value="newest">最新加入</option>
          </select>
        </label>
      </div>
      {items.isPending ? (
        <Loading />
      ) : items.error && visibleItems.length === 0 ? (
        <ErrorNotice error={items.error} />
      ) : visibleItems.length ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {visibleItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
          {items.isFetchNextPageError && <ErrorNotice error={items.error} />}
          {items.hasNextPage && (
            <div className="mt-8 text-center">
              <Button
                type="button"
                variant="outline"
                disabled={items.isFetchingNextPage}
                onClick={() => items.fetchNextPage()}
              >
                {items.isFetchingNextPage ? "正在加载…" : "加载更多条目"}
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState title="没有找到匹配的条目">
          换个关键词或分类试试。
        </EmptyState>
      )}
    </>
  );
}

export function ItemPage({ itemId }: { itemId: string }) {
  const session = useSession();
  const [experienceOffset, setExperienceOffset] = useState(0);
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [moderationError, setModerationError] = useState<unknown>(null);
  useEffect(() => setExperienceOffset(0), [itemId]);
  const canModerate =
    session.data?.role === "content_admin" ||
    session.data?.role === "system_admin";

  async function hideExperience(checkinId: string) {
    const reason = window.prompt("填写隐藏原因，操作会记入审计：")?.trim();
    if (!reason) return;
    setModeratingId(checkinId);
    setModerationError(null);
    try {
      await apiDone(
        hideExperienceApiAdminCheckinsCheckinIdHidePost({
          path: { checkin_id: checkinId },
          body: { reason },
        }),
      );
      await queryClient.invalidateQueries({
        queryKey: ["public-experiences", itemId],
      });
      await queryClient.invalidateQueries({ queryKey: ["share"] });
    } catch (error) {
      setModerationError(error);
    } finally {
      setModeratingId(null);
    }
  }
  const item = useQuery({
    queryKey: ["item", itemId],
    queryFn: () =>
      apiData(itemDetailsApiItemsItemIdGet({ path: { item_id: itemId } })),
  });
  const experiences = useQuery({
    queryKey: ["public-experiences", itemId, experienceOffset],
    queryFn: () =>
      apiData(
        publicExperiencesApiItemsItemIdCheckinsPublicGet({
          path: { item_id: itemId },
          query: { limit: 20, offset: experienceOffset },
        }),
      ),
  });
  useEffect(() => {
    if (
      experiences.data &&
      experienceOffset >= experiences.data.total &&
      experienceOffset > 0
    ) {
      setExperienceOffset(
        Math.max(0, Math.floor((experiences.data.total - 1) / 20) * 20),
      );
    }
  }, [experiences.data, experienceOffset]);
  if (item.isPending) return <Loading />;
  if (item.error) return <ErrorNotice error={item.error} />;
  const current = item.data;
  return (
    <>
      <Link
        to="/lists/$listId"
        params={{ listId: current.list_id }}
        className="mb-6 inline-block text-sm font-semibold text-teal-800 hover:underline"
      >
        ← 返回清单
      </Link>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <PageIntro
            eyebrow={current.category ?? "Checklist item"}
            title={current.name}
          >
            {current.summary}
          </PageIntro>
          {current.source && (
            <p
              className={`mb-6 rounded-2xl p-4 text-sm leading-6 ${current.verified_at ? "bg-stone-100 text-stone-600" : "bg-amber-50 text-amber-950"}`}
            >
              {current.verified_at
                ? `资料核对于 ${formatDate(current.verified_at)}。`
                : current.source.includes("OCR Markdown transcription only")
                  ? "本条来自 OCR 整理记录。店铺或景点现状未核实，地点与推荐仅供参考，请出行前自行确认。"
                  : "资料尚未核对，地点与推荐仅供参考，请出行前自行确认。"}
              <span className="mt-1 block break-words">
                来源：
                {current.source.replace(
                  "; OCR Markdown transcription only",
                  "",
                )}
              </span>
            </p>
          )}
          {current.cover_url && (
            <img
              src={current.cover_url}
              alt=""
              className="mb-8 aspect-[16/9] w-full rounded-3xl object-cover"
            />
          )}
          <div className="space-y-8">
            {current.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {current.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-teal-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <section>
              <h2 className="mb-3 text-xl font-bold">这是什么</h2>
              <p className="prose-note leading-8 text-stone-700">
                {current.description ||
                  current.summary ||
                  "管理员还没有补充详情。"}
              </p>
            </section>
            <section>
              <h2 className="mb-3 text-xl font-bold">在哪里</h2>
              <p className="flex items-start gap-2 text-stone-700">
                <MapPin
                  className="mt-1 size-5 shrink-0 text-teal-700"
                  aria-hidden="true"
                />
                {current.place_kind === "none"
                  ? "没有固定地点"
                  : [current.place_name, current.address, current.area]
                      .filter(Boolean)
                      .join(" · ") || "地点待补充"}
              </p>
              {current.online_url && (
                <a
                  className="mt-2 inline-block text-teal-800 underline"
                  href={current.online_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  打开线上地点
                </a>
              )}
            </section>
            <section>
              <h2 className="mb-3 text-xl font-bold">做什么</h2>
              <p className="prose-note leading-8 text-stone-700">
                {current.suggested_action || "按自己的方式体验，回来记下一次。"}
              </p>
              {current.recommendation && (
                <p className="prose-note mt-3 rounded-2xl bg-amber-50 p-4 text-sm leading-7 text-stone-700">
                  {current.recommendation}
                </p>
              )}
              {current.reference_note && (
                <p className="mt-3 text-sm text-stone-500">
                  参考资料（截至{" "}
                  {current.reference_as_of
                    ? formatDate(current.reference_as_of)
                    : "未标日期"}
                  ）：{current.reference_note}
                </p>
              )}
            </section>
          </div>
          {current.links.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-xl font-bold">更多资料</h2>
              <ul className="space-y-2">
                {current.links.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-800 underline"
                    >
                      {link.title} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside className="space-y-5">
          <Card className="sticky top-24 p-6">
            <p className="text-sm font-semibold text-teal-800">我的足迹</p>
            <p className="mt-2 text-3xl font-black">
              {current.checkin_count}{" "}
              <span className="text-base font-medium">次打卡</span>
            </p>
            <p className="mt-2 text-sm text-stone-600">
              每一次去，都是一条新的记录。
            </p>
            <Button asChild className="mt-5 w-full">
              <Link
                to={session.data ? "/items/$itemId/checkin" : "/auth"}
                {...(session.data
                  ? { params: { itemId } }
                  : { search: { redirect: `/items/${itemId}/checkin` } })}
              >
                写一次打卡 <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Card>
        </aside>
      </div>
      {current.related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold">同清单里还可以看看</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {current.related.map((related) => (
              <ItemCard key={related.id} item={related} />
            ))}
          </div>
        </section>
      )}
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold">大家的公开心得</h2>
        {moderationError !== null && <ErrorNotice error={moderationError} />}
        {experiences.isPending ? (
          <Loading />
        ) : experiences.error ? (
          <ErrorNotice error={experiences.error} />
        ) : experiences.data?.items.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {experiences.data.items.map((record) => (
              <Card key={record.id} className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{record.author_name}</span>
                  <time className="text-xs text-stone-500">
                    {formatDate(record.experienced_at)}
                  </time>
                </div>
                {record.note && (
                  <p className="prose-note text-sm leading-7 text-stone-700">
                    {record.note}
                  </p>
                )}
                <PhotoGallery media={record.media} />
                <Link
                  to="/shares/$shareId"
                  params={{ shareId: record.share_id }}
                  className="inline-block text-sm font-semibold text-teal-800 hover:underline"
                >
                  查看这次体验 →
                </Link>
                {canModerate && (
                  <Button
                    type="button"
                    variant="danger"
                    size="small"
                    disabled={moderatingId !== null}
                    onClick={() => hideExperience(record.id)}
                  >
                    {moderatingId === record.id ? "正在隐藏…" : "隐藏这条内容"}
                  </Button>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon="camera" title="还没有公开心得">
            第一条分享，也许就从你开始。
          </EmptyState>
        )}
        {experiences.data && experiences.data.total > 20 && (
          <div className="mt-6 flex items-center justify-between gap-3 text-sm text-stone-600">
            <Button
              type="button"
              variant="outline"
              disabled={experienceOffset === 0 || experiences.isFetching}
              onClick={() =>
                setExperienceOffset((offset) => Math.max(0, offset - 20))
              }
            >
              上一页
            </Button>
            <span>
              {experienceOffset + 1}–
              {Math.min(experienceOffset + 20, experiences.data.total)} /{" "}
              {experiences.data.total}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={
                experienceOffset + 20 >= experiences.data.total ||
                experiences.isFetching
              }
              onClick={() => setExperienceOffset((offset) => offset + 20)}
            >
              下一页
            </Button>
          </div>
        )}
      </section>
    </>
  );
}
