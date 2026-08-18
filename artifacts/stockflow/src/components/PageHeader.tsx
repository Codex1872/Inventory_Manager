import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex gap-2 flex-wrap">{actions}</div> : null}
    </div>
  );
}
