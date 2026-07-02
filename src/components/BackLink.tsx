import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

interface BackLinkProps {
  to: string;
  params?: Record<string, string>;
  label?: string;
}

export function BackLink({ to, params, label = "Back" }: BackLinkProps) {
  const props: Record<string, unknown> = { to, preload: "intent" };
  if (params) props.params = params;
  return (
    <Link
      {...(props as React.ComponentProps<typeof Link>)}
      className="inline-flex items-center gap-1.5 mono-tag text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="size-3.5" />
      {label}
    </Link>
  );
}
