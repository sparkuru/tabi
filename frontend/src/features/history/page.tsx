import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { apiData } from "../../api/client";
import { historyApiMeCheckinsGet } from "../../api/generated";
import {
  EmptyState,
  ErrorNotice,
  Loading,
  PageIntro,
  PhotoGallery,
} from "../../components/common";
import { Card } from "../../components/ui/card";
import { useSession } from "../../hooks/use-session";
import { formatDate } from "../../lib/utils";

export function HistoryPage() {
  const session = useSession();
  const [category, setCategory] = useState("");
  const [offset, setOffset] = useState(0);
  const history = useQuery({
    queryKey: ["history", category, offset],
    queryFn: () =>
      apiData(
        historyApiMeCheckinsGet({
          query: { category: category || undefined, limit: 20, offset },
        }),
      ),
    enabled: Boolean(session.data),
  });
  useEffect(() => {
    if (history.data && offset >= history.data.total && offset > 0) {
      setOffset(Math.max(0, Math.floor((history.data.total - 1) / 20) * 20));
    }
  }, [history.data, offset]);
  if (session.isPending) return <Loading />;
  if (!session.data)
    return (
      <EmptyState title="登录后查看记录">
        <Link
          to="/auth"
          search={{ redirect: "/history" }}
          className="mt-3 inline-flex min-h-11 items-center font-semibold text-teal-800 underline"
        >
          去登录
        </Link>
      </EmptyState>
    );
  return (
    <>
      <PageIntro title="我的记录" />
      <div className="mb-6 max-w-xs">
        <label className="field-label" htmlFor="history-category">
          按分类回看
        </label>
        <input
          id="history-category"
          className="field"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setOffset(0);
          }}
          placeholder="输入分类名称"
        />
      </div>
      {history.isPending ? (
        <Loading />
      ) : history.error ? (
        <ErrorNotice error={history.error} />
      ) : history.data?.items.length ? (
        <div className="grid gap-5 md:grid-cols-2">
          {history.data.items.map((record) => (
            <Card key={record.id} className="h-full space-y-4 p-5">
              <div>
                <p className="text-xs font-semibold text-teal-700">
                  {record.list_title}
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  <Link
                    to="/checkins/$checkinId"
                    params={{ checkinId: record.id }}
                    className="inline-flex min-h-11 items-center hover:text-teal-800 hover:underline"
                  >
                    {record.item_name}
                  </Link>
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  {formatDate(record.experienced_at)} ·{" "}
                  {record.visibility === "public" ? "公开" : "仅自己"}
                </p>
              </div>
              {record.note && (
                <p className="prose-note line-clamp-4 text-sm leading-7 text-stone-700">
                  {record.note}
                </p>
              )}
              {!record.note && !record.media.length && (
                <p className="text-sm font-semibold text-teal-800">已完成</p>
              )}
              <PhotoGallery media={record.media} />
              <Link
                to="/checkins/$checkinId"
                params={{ checkinId: record.id }}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-800 hover:underline"
              >
                查看与编辑 →
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="还没有记录">
          完成清单中的条目后，记录会出现在这里。
        </EmptyState>
      )}
      {history.data && history.data.total > 20 && (
        <div className="mt-6 flex items-center justify-between gap-3 text-sm text-stone-600">
          <button
            type="button"
            className="min-h-11 rounded-full border border-teal-700 px-4 py-2 font-semibold text-teal-800 disabled:opacity-40"
            disabled={offset === 0 || history.isFetching}
            onClick={() => setOffset((value) => Math.max(0, value - 20))}
          >
            上一页
          </button>
          <span>
            {offset + 1}–{Math.min(offset + 20, history.data.total)} /{" "}
            {history.data.total}
          </span>
          <button
            type="button"
            className="min-h-11 rounded-full border border-teal-700 px-4 py-2 font-semibold text-teal-800 disabled:opacity-40"
            disabled={offset + 20 >= history.data.total || history.isFetching}
            onClick={() => setOffset((value) => value + 20)}
          >
            下一页
          </button>
        </div>
      )}
    </>
  );
}
