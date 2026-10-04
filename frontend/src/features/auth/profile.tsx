import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";

import { apiData, uploadDirect } from "../../api/client";
import { editProfileApiAuthMePatch } from "../../api/generated";
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

export function ProfilePage() {
  const session = useSession();
  const [name, setName] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<unknown>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session.data) return;
    setSaving(true);
    setError(null);
    setMessage("");
    try {
      await apiData(
        editProfileApiAuthMePatch({
          body: { display_name: name ?? session.data.display_name },
        }),
      );
      if (avatar) await uploadDirect("/api/media/avatar", avatar);
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      setAvatar(null);
      setMessage("资料已保存");
    } catch (caught) {
      setError(caught);
    } finally {
      setSaving(false);
    }
  }

  if (session.isPending) return <Loading />;
  if (!session.data)
    return (
      <EmptyState title="登录后管理资料">
        <Link
          to="/auth"
          search={{ redirect: "/profile" }}
          className="inline-flex min-h-11 items-center text-teal-800 underline"
        >
          去登录
        </Link>
      </EmptyState>
    );
  return (
    <div className="mx-auto max-w-xl">
      <PageIntro title="个人资料">公开记录只展示昵称和头像。</PageIntro>
      <Card className="p-6 sm:p-8">
        <form onSubmit={save} className="space-y-5">
          <div className="flex items-center gap-4">
            {session.data.avatar_url ? (
              <img
                src={session.data.avatar_url}
                alt="当前头像"
                className="size-16 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="grid size-16 shrink-0 place-items-center rounded-full bg-teal-100 text-2xl font-bold text-teal-900">
                {session.data.display_name.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0">
              <p className="break-words font-semibold">
                {session.data.display_name}
              </p>
              <p className="break-all text-sm text-stone-500">
                {session.data.email}
              </p>
            </div>
          </div>
          <label className="block">
            <span className="field-label">昵称</span>
            <input
              className="field"
              required
              maxLength={80}
              value={name ?? session.data.display_name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="field-label">头像照片</span>
            <input
              className="field"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setAvatar(event.target.files?.[0] ?? null)}
            />
          </label>
          {error !== null && <ErrorNotice error={error} />}
          {message && (
            <p role="status" className="text-sm font-semibold text-teal-800">
              {message}
            </p>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? "正在保存…" : "保存资料"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
