import * as React from "react";

import Link from "next/link";

import { ArrowUpRightIcon, ClockIcon } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Task } from "@/lib/types";

import { fmtRel } from "./format";

export function RecentTasks({ tasks }: { tasks: Task[] }) {
  const sortedTasks = React.useMemo(
    () =>
      [...tasks]
        .sort((a, b) => (b.last_activity_unix ?? b.created_unix ?? 0) - (a.last_activity_unix ?? a.created_unix ?? 0))
        .slice(0, 5),
    [tasks],
  );

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <ClockIcon className="size-3.5 text-muted-foreground" />
          任务
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{tasks.length} 个任务</span>
          <Link
            href="/function/tasks"
            className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
          >
            全部 <ArrowUpRightIcon className="size-3" />
          </Link>
        </div>
      </div>
      <div className="min-w-0 overflow-x-auto">
        <table className="min-w-[36rem] w-full border-collapse text-xs">
          <thead>
            <tr className="border-b">
              {["任务", "状态", "引擎", "目标进度", "在途", "最近活动"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2 text-left text-[9px] font-semibold uppercase tracking-widest text-muted-foreground first:pl-4"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-xs text-muted-foreground">
                  暂无任务
                </td>
              </tr>
            ) : (
              sortedTasks.map((t) => {
                const goalsPct = t.goals_total ? Math.round(((t.goals_met ?? 0) / t.goals_total) * 100) : null;
                return (
                  <tr key={t.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                    <td className="max-w-xs px-4 py-3">
                      <Link href={`/function/tasks/detail?id=${t.id}`} className="group flex flex-col">
                        <span className="truncate font-medium group-hover:underline">{t.description}</span>
                        <span className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{t.id}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge domain="task" value={t.status} dot className="px-1.5 py-0 text-[10px]" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        domain="engine"
                        value={t.engine_mode ?? "idle"}
                        className="px-1.5 py-0 text-[10px]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {goalsPct !== null ? (
                        <div className="flex items-center gap-2">
                          <Progress value={goalsPct} className="h-1 w-14" />
                          <span className="tabular-nums text-muted-foreground">
                            {t.goals_met ?? 0}/{t.goals_total}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {(t.in_flight ?? 0) > 0 ? (
                        <span className="font-semibold">{t.in_flight}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {fmtRel(t.last_activity_unix ?? t.created_unix)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
