import { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Card({
  className,
  strong = false,
  hover = false,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  strong?: boolean;
  hover?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        strong ? "glass-card-strong" : "glass-card",
        hover && "hover-lift",
        "rounded-[30px]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
