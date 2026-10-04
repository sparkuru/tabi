import type { ReactNode } from "react";
import { Camera, MapPin, Sparkles } from "lucide-react";

import type { MediaOut } from "../api/generated";
import { Card } from "./ui/card";

export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string | null;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-intro space-y-3">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="page-title max-w-3xl">{title}</h1>
      {children && (
        <p className="max-w-2xl text-sm leading-7 text-stone-600">{children}</p>
      )}
    </div>
  );
}

export function Loading({ label = "正在载入…" }: { label?: string }) {
  return (
    <p role="status" className="loading-notice">
      {label}
    </p>
  );
}

export function ErrorNotice({ error }: { error: unknown }) {
  return (
    <Card
      role="alert"
      className="prose-note border-rose-200 bg-rose-50 p-5 text-rose-900"
    >
      {error instanceof Error ? error.message : "暂时无法加载，请稍后重试。"}
    </Card>
  );
}

export function EmptyState({
  icon = "sparkles",
  title,
  children,
}: {
  icon?: "sparkles" | "camera" | "map";
  title: string;
  children?: ReactNode;
}) {
  const Icon = icon === "camera" ? Camera : icon === "map" ? MapPin : Sparkles;
  return (
    <Card className="flex flex-col items-center gap-3 border-dashed bg-white/70 px-6 py-12 text-center">
      <Icon aria-hidden="true" className="size-8 text-teal-700" />
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && (
        <div className="max-w-md text-sm text-stone-600">{children}</div>
      )}
    </Card>
  );
}

export function PhotoGallery({ media }: { media: MediaOut[] }) {
  if (!media.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {media.map((photo) => (
        <a
          key={photo.id}
          href={photo.original_url ?? photo.thumbnail_url}
          target="_blank"
          rel="noreferrer"
          aria-label="查看记录照片"
        >
          <img
            src={photo.thumbnail_url}
            alt="记录照片"
            loading="lazy"
            className="aspect-square w-full rounded-2xl object-cover"
          />
        </a>
      ))}
    </div>
  );
}
