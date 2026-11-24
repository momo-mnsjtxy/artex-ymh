import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const methods: Record<string, string> = {
  GET: "border-success/25 bg-success/10 text-success",
  POST: "border-running/25 bg-running/10 text-running",
  PUT: "border-warning/25 bg-warning/10 text-warning",
  PATCH: "border-warning/25 bg-warning/10 text-warning",
  DELETE: "border-danger/25 bg-danger/10 text-danger",
};

export function MethodBadge({ method }: { method: string }) {
  const name = method.toUpperCase();
  return (
    <Badge variant="outline" className={cn("shrink-0 font-mono text-xs", methods[name])}>
      {name || "—"}
    </Badge>
  );
}
