import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Camera, Crosshair, X } from "lucide-react";

import { apiData, apiDone, uploadDirect, uploadFile } from "../../api/client";
import {
  createCheckinApiItemsItemIdCheckinsPost,
  deleteCheckinApiCheckinsCheckinIdDelete,
  editCheckinApiCheckinsCheckinIdPatch,
  itemDetailsApiItemsItemIdGet,
  ownDetailApiCheckinsCheckinIdGet,
  removePhotoApiMediaMediaIdDelete,
} from "../../api/generated";
import type { PositionIn } from "../../api/generated";
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
import { createRequestKey } from "../../lib/request-key";
import { formatDate } from "../../lib/utils";

function localDateTime(): string {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function NewCheckinPage({ itemId }: { itemId: string }) {
  const session = useSession();
  const item = useQuery({
    queryKey: ["item", itemId],
    queryFn: () =>
      apiData(itemDetailsApiItemsItemIdGet({ path: { item_id: itemId } })),
  });
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [experiencedAt, setExperiencedAt] = useState(localDateTime);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [photos, setPhotos] = useState<File[]>([]);
  const [position, setPosition] = useState<PositionIn | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const requestKey = useRef(createRequestKey());
  const staged = useRef(new Map<File, string>());
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);

  useEffect(() => {
    const next = photos.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPreviews(next);
    return () => next.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [photos]);

  const mutation = useMutation({
    mutationFn: async () => {
      const uploadIds: string[] = [];
      for (const photo of photos) {
        let id = staged.current.get(photo);
        if (!id) {
          id = (await uploadFile("/api/media/uploads", photo)).upload_id;
          staged.current.set(photo, id);
        }
        uploadIds.push(id);
      }
      return apiData(
        createCheckinApiItemsItemIdCheckinsPost({
          path: { item_id: itemId },
          headers: { "idempotency-key": requestKey.current },
          body: {
            note: note.trim() || null,
            experienced_at: new Date(experiencedAt).toISOString(),
            visibility,
            position,
            upload_ids: uploadIds,
          },
        }),
      );
    },
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["list"] });
      queryClient.invalidateQueries({ queryKey: ["item"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      navigate({
        to: "/checkins/$checkinId",
        params: { checkinId: record.id },
      });
    },
  });

  function locate() {
    if (!navigator.geolocation) {
      setLocationMessage("当前浏览器不支持定位；你仍可直接提交。");
      return;
    }
    setLocationMessage("正在请求定位…");
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
          accuracy_m: result.coords.accuracy,
          coordinate_system: "WGS84",
          located_at: new Date(result.timestamp).toISOString(),
        });
        setLocationMessage("已记录当前定位；这只是你的个人辅助信息。");
      },
      () => setLocationMessage("未获得定位权限；你仍可直接提交。"),
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    mutation.mutate();
  }

  if (session.isPending || item.isPending) return <Loading />;
  if (item.error) return <ErrorNotice error={item.error} />;
  if (!session.data)
    return (
      <EmptyState title="登录后添加记录">
        <Button asChild className="mt-4">
          <Link to="/auth" search={{ redirect: `/items/${itemId}/checkin` }}>
            去登录
          </Link>
        </Button>
      </EmptyState>
    );
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/items/$itemId"
        params={{ itemId }}
        className="mb-6 inline-flex min-h-11 items-center text-sm font-semibold text-teal-800 hover:underline"
      >
        ← 返回条目
      </Link>
      <PageIntro title={`记录：${item.data.name}`}>
        心得、照片和定位均可留空。记录默认仅自己可见。
      </PageIntro>
      <Card className="p-6 sm:p-8">
        <form onSubmit={submit} className="space-y-6">
          <label className="block">
            <span className="field-label">记录时间</span>
            <input
              className="field"
              type="datetime-local"
              required
              value={experiencedAt}
              onChange={(event) => setExperiencedAt(event.target.value)}
            />
          </label>
          <div>
            <label htmlFor="new-record-note" className="field-label">
              心得（可选）
            </label>
            <textarea
              id="new-record-note"
              className="field min-h-36 resize-y"
              maxLength={30000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="添加心得，也可以留空。"
            />
          </div>
          <div className="rounded-2xl focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-teal-700">
            <label className="field-label" htmlFor="photos">
              照片（最多 8 张）
            </label>
            <label
              htmlFor="photos"
              className="flex min-h-24 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 text-sm font-semibold text-stone-600 hover:border-teal-600"
            >
              <Camera className="size-5" aria-hidden="true" />
              选择照片
            </label>
            <input
              id="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(event) =>
                setPhotos(Array.from(event.target.files ?? []).slice(0, 8))
              }
            />
            {previews.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {previews.map(({ file, url }) => (
                  <div
                    key={`${file.name}-${file.lastModified}`}
                    className="relative"
                  >
                    <img
                      src={url}
                      alt={`待上传：${file.name}`}
                      className="aspect-square w-full rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPhotos((current) =>
                          current.filter((entry) => entry !== file),
                        )
                      }
                      className="absolute top-1 right-1 grid size-11 place-items-center rounded-full bg-stone-900/75 text-white"
                      aria-label={`移除 ${file.name}`}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <span className="field-label">可选定位</span>
            <Button type="button" variant="outline" onClick={locate}>
              <Crosshair className="size-4" aria-hidden="true" />
              记录当前位置
            </Button>
            {position && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setPosition(null);
                  setLocationMessage("已移除定位。");
                }}
              >
                移除定位
              </Button>
            )}
            {locationMessage && (
              <p role="status" className="mt-2 text-sm text-stone-600">
                {locationMessage}
              </p>
            )}
          </div>
          <fieldset>
            <legend className="field-label">谁可以看到</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-stone-300 p-4">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === "private"}
                  onChange={() => setVisibility("private")}
                />
                仅自己（默认）
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-stone-300 p-4">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === "public"}
                  onChange={() => setVisibility("public")}
                />
                公开分享
              </label>
            </div>
          </fieldset>
          {mutation.error && <ErrorNotice error={mutation.error} />}
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="w-full"
          >
            {mutation.isPending ? "正在保存…" : "保存记录"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export function OwnCheckinPage({ checkinId }: { checkinId: string }) {
  const record = useQuery({
    queryKey: ["checkin", checkinId],
    queryFn: () =>
      apiData(
        ownDetailApiCheckinsCheckinIdGet({ path: { checkin_id: checkinId } }),
      ),
  });
  const navigate = useNavigate();
  const [note, setNote] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"private" | "public" | null>(
    null,
  );
  const [photoToAdd, setPhotoToAdd] = useState<File | null>(null);
  const edit = useMutation({
    mutationFn: () =>
      apiData(
        editCheckinApiCheckinsCheckinIdPatch({
          path: { checkin_id: checkinId },
          body: {
            note: note ?? record.data?.note,
            visibility: visibility ?? record.data?.visibility,
          },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkin", checkinId] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["public-experiences"] });
      queryClient.invalidateQueries({ queryKey: ["share"] });
    },
  });
  const remove = useMutation({
    mutationFn: () =>
      apiDone(
        deleteCheckinApiCheckinsCheckinIdDelete({
          path: { checkin_id: checkinId },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries();
      navigate({ to: "/history" });
    },
  });
  const removeMedia = useMutation({
    mutationFn: (mediaId: string) =>
      apiDone(
        removePhotoApiMediaMediaIdDelete({ path: { media_id: mediaId } }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkin", checkinId] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["public-experiences"] });
      queryClient.invalidateQueries({ queryKey: ["share"] });
    },
  });
  const addMedia = useMutation({
    mutationFn: (file: File) =>
      uploadDirect(`/api/media/checkins/${checkinId}`, file),
    onSuccess: () => {
      setPhotoToAdd(null);
      queryClient.invalidateQueries({ queryKey: ["checkin", checkinId] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["public-experiences"] });
      queryClient.invalidateQueries({ queryKey: ["share"] });
    },
  });
  if (record.isPending) return <Loading />;
  if (record.error) return <ErrorNotice error={record.error} />;
  const current = record.data;
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/history"
        className="mb-6 inline-flex min-h-11 items-center text-sm font-semibold text-teal-800 hover:underline"
      >
        ← 返回我的记录
      </Link>
      <PageIntro eyebrow={current.list_title} title={current.item_name}>
        {formatDate(current.experienced_at)} ·{" "}
        {current.visibility === "public" ? "公开" : "仅自己"}
      </PageIntro>
      <Card className="space-y-6 p-6 sm:p-8">
        {current.hidden && (
          <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
            这条公开内容已被管理员隐藏，只有你能看到。
          </p>
        )}
        {current.item_status !== "published" ||
        current.list_status !== "published" ? (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-stone-700">
            原清单或条目已下架，你仍可回看这次记录。
          </p>
        ) : null}
        <p className="prose-note leading-8 text-stone-700">
          {current.note || (current.media.length ? "照片记录" : "已完成")}
        </p>
        <PhotoGallery media={current.media} />
        {current.media.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {current.media.map((photo, index) => (
              <Button
                key={photo.id}
                variant="ghost"
                size="small"
                type="button"
                disabled={removeMedia.isPending}
                onClick={() => removeMedia.mutate(photo.id)}
              >
                移除照片 {index + 1}
              </Button>
            ))}
          </div>
        )}
        {removeMedia.error && <ErrorNotice error={removeMedia.error} />}
        {current.media.length < 8 && (
          <div className="space-y-2">
            <label className="block">
              <span className="field-label">添加照片（最多 8 张）</span>
              <input
                className="field"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  setPhotoToAdd(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
            </label>
            {photoToAdd && (
              <Button
                type="button"
                variant="outline"
                disabled={addMedia.isPending}
                onClick={() => addMedia.mutate(photoToAdd)}
              >
                {addMedia.isPending ? "正在上传…" : "添加这张照片"}
              </Button>
            )}
            {addMedia.error && <ErrorNotice error={addMedia.error} />}
          </div>
        )}
        {current.visibility === "public" && !current.hidden && (
          <Button asChild variant="outline">
            <Link to="/shares/$shareId" params={{ shareId: current.share_id }}>
              查看公开分享页
            </Link>
          </Button>
        )}
      </Card>
      <Card className="mt-6 p-6 sm:p-8">
        <h2 className="mb-4 text-xl font-bold">编辑这次记录</h2>
        <div>
          <label htmlFor="record-note" className="field-label">
            心得
          </label>
          <textarea
            id="record-note"
            className="field min-h-32"
            maxLength={30000}
            value={note ?? current.note ?? ""}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <label className="mt-4 block">
          <span className="field-label">可见性</span>
          <select
            className="field"
            value={visibility ?? current.visibility}
            onChange={(event) =>
              setVisibility(event.target.value as "private" | "public")
            }
          >
            <option value="private">仅自己</option>
            <option value="public">公开</option>
          </select>
        </label>
        {edit.error && (
          <div className="mt-4">
            <ErrorNotice error={edit.error} />
          </div>
        )}
        {edit.isSuccess && (
          <p role="status" className="mt-4 text-sm font-semibold text-teal-800">
            修改已保存
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={edit.isPending}
            onClick={() => edit.mutate()}
          >
            {edit.isPending ? "正在保存…" : "保存修改"}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={remove.isPending}
            onClick={() => {
              if (
                window.confirm(
                  "删除这条记录？删除最后一条记录后，条目将恢复未完成。",
                )
              )
                remove.mutate();
            }}
          >
            删除记录
          </Button>
        </div>
        {remove.error && (
          <div className="mt-4">
            <ErrorNotice error={remove.error} />
          </div>
        )}
      </Card>
    </div>
  );
}
