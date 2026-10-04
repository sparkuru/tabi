import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowDown,
  Check,
  ListChecks,
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
import { useCompletion } from "../entries/use-completion";
import { CollectionArt, JourneyArt } from "../../components/journey-art";

function ListCard({ list, index }: { list: ChecklistOut; index: number }) {
  const progress = list.item_count
    ? Math.round((list.completed_count / list.item_count) * 100)
    : 0;
  return (
    <Link
      to="/lists/$listId"
      params={{ listId: list.id }}
      className="collection-link group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
    >
      <Card className="collection-card">
        <div className={`collection-cover tone-${index % 3}`}>
          {list.cover_url ? (
            <img
              src={list.cover_url}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <CollectionArt variant={index % 3} />
          )}
          <span className="collection-index" aria-hidden="true">
            VOL. {String(index + 1).padStart(2, "0")}
          </span>
          {list.category && (
            <span className="collection-category">{list.category}</span>
          )}
        </div>
        <div className="collection-content">
          <div>
            <h3 className="collection-title">{list.title}</h3>
            {list.summary && (
              <p className="collection-summary line-clamp-2">{list.summary}</p>
            )}
          </div>
          <div className="collection-meta">
            <span className="text-stone-600">
              {list.item_count} 个条目 · 已完成 {list.completed_count}
            </span>
            <span className="collection-arrow">
              <ArrowRight className="size-4" aria-hidden="true" />
            </span>
          </div>
          <div
            className="collection-progress"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${list.title}完成进度`}
          >
            <div
              className="collection-progress-fill"
              style={{ transform: `scaleX(${progress / 100})` }}
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
      <section className="hero" aria-label="探索日常">
        <div className="hero-copy enter">
          <p className="hero-kicker eyebrow">
            日常探索手账{" "}
            <span className="folio text-stone-500">THE EVERYDAY JOURNAL</span>
          </p>
          <h1 className="hero-title">
            世界很大，
            <br />
            先从<em>身边</em>出发。
          </h1>
          <p className="hero-description">
            一张清单，一次出发。
            <br />
            发现值得体验的小事，收藏属于你的日常。
          </p>
          <a href="#lists" className="hero-cta">
            发现清单 <ArrowDown className="size-4" aria-hidden="true" />
          </a>
        </div>
        <div className="hero-visual enter enter-later">
          <JourneyArt />
          <p className="hero-annotation folio">
            <span>WANDER / DISCOVER / REMEMBER</span>
          </p>
        </div>
      </section>
      <div className="journey-steps" aria-label="探索方式">
        {[
          ["01", "挑选一张清单", "找到一点灵感，安排下一次出发"],
          ["02", "完成一次体验", "轻轻打个卡，积攒自己的进度"],
          ["03", "留下一个瞬间", "写下心得，照片和记录默认私密"],
        ].map(([number, title, description]) => (
          <div className="journey-step" key={number}>
            <span className="step-number" aria-hidden="true">
              {number}
            </span>
            <div>
              <p className="step-title">{title}</p>
              <p className="step-description">{description}</p>
            </div>
          </div>
        ))}
      </div>
      <section id="lists" aria-label="公开清单" tabIndex={-1}>
        <div className="collection-heading">
          <div>
            <p className="eyebrow mb-2">THE COLLECTION</p>
            <h2>
              <span className="block sm:inline">下一站，</span>
              <span>由你挑选。</span>
            </h2>
          </div>
          <p className="text-xs leading-6 text-stone-500">
            {lists.data
              ? `${lists.data.pages[0].total} 张公开清单`
              : "等一个新的出发"}
            <br />
            慢慢走，一点点收集。
          </p>
        </div>
        {lists.isPending ? (
          <Loading />
        ) : lists.error && visibleLists.length === 0 ? (
          <ErrorNotice error={lists.error} />
        ) : visibleLists.length ? (
          <>
            <div className="collection-grid">
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
  const session = useSession();
  const completion = useCompletion(item.id);
  return (
    <Card className="item-card p-4 sm:p-5">
      <Link
        to="/items/$itemId"
        params={{ itemId: item.id }}
        className="group flex items-center gap-4 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      >
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-emerald-50 text-teal-800 sm:size-20">
          {item.cover_url ? (
            <img
              src={item.cover_url}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <ListChecks className="size-7" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="break-words font-bold text-stone-900 sm:text-lg">
            {item.name}
          </h2>
          {item.summary && (
            <p className="mt-1 line-clamp-2 text-sm text-stone-600">
              {item.summary}
            </p>
          )}
          <p className="mt-2 text-xs text-stone-500">
            {item.category && `${item.category} · `}
            {item.checkin_count} 条记录
          </p>
        </div>
        <ArrowRight
          className="size-4 shrink-0 text-teal-800"
          aria-hidden="true"
        />
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {item.completed ? (
          <span className="inline-flex min-h-11 items-center gap-1 px-3 text-sm font-semibold text-teal-800">
            <Check className="size-4" aria-hidden="true" />
            已完成
          </span>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={completion.isPending || session.isPending}
            onClick={() => completion.complete()}
            aria-label={`标记完成：${item.name}`}
          >
            {completion.isPending ? "正在完成…" : "标记完成"}
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link
            to={session.data ? "/items/$itemId/checkin" : "/auth"}
            {...(session.data
              ? { params: { itemId: item.id } }
              : { search: { redirect: `/items/${item.id}/checkin` } })}
          >
            添加记录
          </Link>
        </Button>
      </div>
      {completion.error && (
        <div className="mt-3">
          <ErrorNotice error={completion.error} />
        </div>
      )}
    </Card>
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
        className="mb-6 inline-flex min-h-11 items-center text-sm font-semibold text-teal-800 hover:underline"
      >
        ← 返回清单
      </Link>
      <PageIntro eyebrow={list.data.category} title={list.data.title}>
        {list.data.summary}
      </PageIntro>
      <Card className="progress-panel mb-8 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-800">进度</p>
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
          <div
            className="h-3 overflow-hidden rounded-full bg-white"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${list.data.title}完成进度`}
          >
            <div
              className="collection-progress-fill rounded-full"
              style={{ transform: `scaleX(${progress / 100})` }}
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
            className="field field-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索条目"
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

export function ItemPage({
  itemId,
  completeOnArrival = false,
}: {
  itemId: string;
  completeOnArrival?: boolean;
}) {
  const session = useSession();
  const completion = useCompletion(itemId);
  const navigate = useNavigate();
  const autoCompleted = useRef(false);
  useEffect(() => {
    if (completeOnArrival && session.data && !autoCompleted.current) {
      autoCompleted.current = true;
      void navigate({
        to: "/items/$itemId",
        params: { itemId },
        search: {},
        replace: true,
      });
      void completion.complete();
    }
  }, [completeOnArrival, session.data, completion.complete, navigate, itemId]);
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
        className="mb-6 inline-flex min-h-11 items-center text-sm font-semibold text-teal-800 hover:underline"
      >
        ← 返回清单
      </Link>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <PageIntro eyebrow={current.category} title={current.name}>
            {current.summary}
          </PageIntro>
          {current.source && (
            <p
              className={`mb-6 rounded-2xl p-4 text-sm leading-6 ${current.verified_at ? "bg-stone-100 text-stone-600" : "bg-amber-50 text-amber-950"}`}
            >
              {current.verified_at
                ? `资料核对于 ${formatDate(current.verified_at)}。`
                : current.source.includes("OCR Markdown transcription only")
                  ? "OCR 整理资料，现状未核实，仅供参考。"
                  : "资料尚未核实，仅供参考。"}
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
            {(current.description || current.summary) && (
              <section>
                <h2 className="mb-3 text-xl font-bold">详情</h2>
                <p className="prose-note leading-8 text-stone-700">
                  {current.description || current.summary}
                </p>
              </section>
            )}
            {current.place_kind !== "none" &&
              (current.place_name ||
                current.address ||
                current.area ||
                current.online_url ||
                (current.latitude !== null && current.longitude !== null)) && (
                <section>
                  <h2 className="mb-3 text-xl font-bold">地点</h2>
                  {(current.place_name || current.address || current.area) && (
                    <p className="flex items-start gap-2 text-stone-700">
                      <MapPin
                        className="mt-1 size-5 shrink-0 text-teal-700"
                        aria-hidden="true"
                      />
                      {[current.place_name, current.address, current.area]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  {current.latitude !== null && current.longitude !== null && (
                    <p className="mt-2 text-sm text-stone-600">
                      坐标：{current.latitude}, {current.longitude}（
                      {current.coordinate_system}）
                    </p>
                  )}
                  {current.online_url && (
                    <a
                      className="mt-2 inline-flex min-h-11 items-center break-all text-teal-800 underline"
                      href={current.online_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      打开线上地点
                    </a>
                  )}
                </section>
              )}
            {(current.suggested_action ||
              current.recommendation ||
              current.reference_note) && (
              <section>
                <h2 className="mb-3 text-xl font-bold">建议</h2>
                {current.suggested_action && (
                  <p className="prose-note leading-8 text-stone-700">
                    {current.suggested_action}
                  </p>
                )}
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
            )}
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
                      className="inline-flex min-h-11 items-center text-teal-800 underline"
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
            <p className="text-sm font-semibold text-teal-800">我的记录</p>
            <p className="mt-2 text-3xl font-black">
              {current.checkin_count}{" "}
              <span className="text-base font-medium">条记录</span>
            </p>
            {current.completed ? (
              <p
                role="status"
                className="mt-4 flex items-center gap-2 font-semibold text-teal-800"
              >
                <Check className="size-5" aria-hidden="true" />
                已完成
              </p>
            ) : (
              <Button
                type="button"
                className="mt-5 w-full"
                disabled={completion.isPending || session.isPending}
                onClick={() => completion.complete()}
              >
                {completion.isPending ? "正在完成…" : "标记完成"}
              </Button>
            )}
            <Button asChild variant="outline" className="mt-3 w-full">
              <Link
                to={session.data ? "/items/$itemId/checkin" : "/auth"}
                {...(session.data
                  ? { params: { itemId } }
                  : { search: { redirect: `/items/${itemId}/checkin` } })}
              >
                添加记录
              </Link>
            </Button>
            {current.completed && completion.data && (
              <Link
                to="/checkins/$checkinId"
                params={{ checkinId: completion.data.id }}
                className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-teal-800 underline"
              >
                补充心得和照片
              </Link>
            )}
            {completion.error && (
              <div className="mt-3">
                <ErrorNotice error={completion.error} />
              </div>
            )}
          </Card>
        </aside>
      </div>
      {current.related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold">相关条目</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {current.related.map((related) => (
              <ItemCard key={related.id} item={related} />
            ))}
          </div>
        </section>
      )}
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold">公开记录</h2>
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
                {!record.note && !record.media.length && (
                  <p className="font-semibold text-teal-800">已完成</p>
                )}
                <PhotoGallery media={record.media} />
                <Link
                  to="/shares/$shareId"
                  params={{ shareId: record.share_id }}
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-800 hover:underline"
                >
                  查看记录 →
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
          <EmptyState title="还没有公开记录" />
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
