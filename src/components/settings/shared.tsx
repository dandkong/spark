import type { ReactNode } from "react";

export function SettingsContent({ children }: { children: ReactNode }) {
  return <div className="mx-auto grid max-w-4xl gap-4 px-4 pt-2 pb-2">{children}</div>;
}

export function SettingsHeader({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {icon}
        <div className="min-w-0">
          <h2 className="truncate text-base font-medium">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
