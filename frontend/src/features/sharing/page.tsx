import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { apiData } from "../../api/client";
import { sharedExperienceApiSharesShareIdGet } from "../../api/generated";
import {
  EmptyState,
  Loading,
  PageIntro,
  PhotoGallery,
} from "../../components/common";
import { Card } from "../../components/ui/card";
import { formatDate } from "../../lib/utils";

export function SharePage({ shareId }: { shareId: string }) {
  const record = useQuery({
    queryKey: ["share", shareId],
    queryFn: () =>
      apiData(
        sharedExperienceApiSharesShareIdGet({ path: { share_id: shareId } }),
      ),
    retry: false,
  });
  if (record.isPending) return <Loading />;
  if (record.error)
    return (
      <EmptyState title="这条分享暂时不可见">
        作者可能改回了私人、删除了记录，或内容已被隐藏。
        <div className="mt-4">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center font-semibold text-teal-800 underline"
          >
            返回公开清单
          </Link>
        </div>
      </EmptyState>
    );
  return (
    <div className="mx-auto max-w-3xl">
      <PageIntro eyebrow={record.data.list_title} title={record.data.item_name}>
        来自 {record.data.author_name} ·{" "}
        {formatDate(record.data.experienced_at)}
      </PageIntro>
      <Card className="space-y-6 p-6 sm:p-8">
        <p className="prose-note leading-8 text-stone-700">
          {record.data.note ||
            (record.data.media.length ? "照片记录" : "已完成")}
        </p>
        <PhotoGallery media={record.data.media} />
      </Card>
      <Link
        to="/items/$itemId"
        params={{ itemId: record.data.item_id }}
        className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-teal-800 hover:underline"
      >
        查看条目 →
      </Link>
    </div>
  );
}
