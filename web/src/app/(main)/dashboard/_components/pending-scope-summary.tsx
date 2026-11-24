import * as React from "react";

import Link from "next/link";

import { api } from "@/lib/api";
import type { Task } from "@/lib/types";

type ScopeCounts = { key: string; counts: Map<string, number>; failed: number };

function lastActivity(task: Task) {
  if (task.last_activity_unix) return task.last_activity_unix;
  if (task.created_unix) return task.created_unix;
  const parsed = Date.parse(task.last_activity ?? task.created_at);
  return Number.isFinite(parsed) ? parsed / 1000 : 0;
}

export function PendingScopeSummary({ tasks, loaded }: { tasks: Task[]; loaded: boolean }) {
  const trackedTasks = React.useMemo(() => {
    const recent = [...tasks].sort((a, b) => lastActivity(b) - lastActivity(a));
    return recent.filter((t, index) => t.active || t.status === "running" || index < 5);
  }, [tasks]);
  const key = JSON.stringify(trackedTasks.map((task) => task.id).sort());
  const [result, setResult] = React.useState<ScopeCounts | null>(null);

  React.useEffect(() => {
    if (!loaded) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    const ids: string[] = JSON.parse(key);
    async function refresh() {
      const counts = new Map<string, number>();
      let failed = 0;
      for (let index = 0; index < ids.length && live; index += 4) {
        await Promise.all(
          ids.slice(index, index + 4).map(async (id) => {
            try {
              const rows = await api.pendingScope(id);
              counts.set(id, rows.filter((row) => row.kind === "cidr" && row.status === "pending").length);
            } catch {
              failed++;
            }
          }),
        );
      }
      if (live) {
        setResult({ key, counts, failed });
        timer = setTimeout(refresh, 15000);
      }
    }
    void refresh();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [key, loaded]);
  const snapshot = result?.key === key ? result : null;
  const total =
    snapshot && (snapshot.counts.size || !snapshot.failed)
      ? Array.from(snapshot.counts.values()).reduce((sum, count) => sum + count, 0)
      : null;
  return (
    <section
      aria-label="待授权网段"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card px-4 py-3 text-xs"
    >
      <h2 className="font-medium">待授权网段</h2>
      <strong className="font-mono text-base text-warning">{total ?? "—"}</strong>
      <span className="text-muted-foreground">运行中及最近 5 个任务</span>
      {!!snapshot?.failed && <span className="text-warning">{snapshot.failed} 个任务未能读取</span>}
      {trackedTasks.map((task) => {
        const count = snapshot?.counts.get(task.id);
        if (!count) return null;
        return (
          <Link
            key={task.id}
            href={`/function/tasks/detail?id=${encodeURIComponent(task.id)}&tab=overview`}
            className="max-w-full truncate rounded border px-2 py-1 hover:bg-hover"
          >
            {task.name || task.description} · {count}
          </Link>
        );
      })}
    </section>
  );
}
