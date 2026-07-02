import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

interface BackLinkProps {
  to: string;
  params?: Record<string, string>;
  label?: string;
}

export function BackLink({ to, params, label = "Back" }: BackLinkProps) {
  return (
    <Link
      // @ts-expect-error TanStack typed routes; string is passed through
      to={to}
      // @ts-expect-error same
      params={params}
      preload="intent"
      className="inline-flex items-center gap-1.5 mono-tag text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="size-3.5" />
      {label}
    </Link>
  );
}
