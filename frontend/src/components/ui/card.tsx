import * as React from "react";

import { cn } from "../../lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-stone-200 bg-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
