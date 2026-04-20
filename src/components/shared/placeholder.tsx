import { LucideIcon } from "lucide-react";

export function Placeholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-16 text-center shadow-sm">
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "rgba(2, 29, 64, 0.08)" }}
        >
          <Icon className="h-6 w-6 text-pb-navy" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          Coming soon
        </h2>
        <p className="max-w-sm text-sm text-muted">
          This page will light up once we wire it to the real CRM data.
        </p>
      </div>
    </div>
  );
}
