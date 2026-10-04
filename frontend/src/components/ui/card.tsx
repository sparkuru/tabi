import * as React from "react";

import { cn } from "../../lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border border-stone-300/70 bg-[#fffdf7]",
        className,
      )}
      {...props}
    />
  );
}
