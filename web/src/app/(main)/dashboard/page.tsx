"use client";

import Link from "next/link";

import { ArrowUpRight } from "lucide-react";

import { usePendingApprovals } from "../_components/pending-approvals";
import { ActivityAndFindings } from "./_components/activity-and-findings";
import { InventorySummary } from "./_components/inventory-summary";
import { PendingScopeSummary } from "./_components/pending-scope-summary";
import { RecentTasks } from "./_components/recent-tasks";
import { TokenUsage } from "./_components/token-usage";
import { useDashboardData } from "./_components/use-dashboard-data";

export default function DashboardPage() {
  const data = useDashboardData();
  const pending = usePendingApprovals();
  const metrics = [
    { label: "待审批拦截", value: pending?.length ?? null, href: "/system/intercept/approvals", tone: "text-warning" },
    {
      label: "运行中任务",
      value: data.tasksLoaded ? data.tasks.filter((t) => t.status === "running").length : null,
      href: "/function/tasks",
      tone: "text-running",
    },
    {
      label: "严重与高危发现",
      value: data.findingsLoaded
        ? data.findings.filter((f) => f.severity === "critical" || f.severity === "high").length
        : null,
      href: "/function/findings",
      tone: "text-danger",
    },
    {
      label: "资产节点",
      value: data.assetsLoaded ? Object.values(data.assetCounts).reduce((sum, n) => sum + n, 0) : null,
      href: "/function/assets",
      tone: "text-foreground",
    },
  ];
  return (
    <div className="flex min-w-0 flex-col gap-4 pb-5">
      <h1 className="font-semibold text-xl tracking-tight">态势总览</h1>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-4">
        {metrics.map(({ label, value, href, tone }) => (
          <Link
            key={label}
            href={href}
            className="group flex flex-col gap-2 bg-card p-4 hover:bg-hover focus-visible:outline-offset-[-2px]"
          >
            <span className="flex items-center justify-between text-xs text-muted-foreground">
              {label}
              <ArrowUpRight className="size-3.5" />
            </span>
            <span className={`font-mono text-2xl font-semibold ${tone}`}>{value?.toLocaleString() ?? "—"}</span>
          </Link>
        ))}
      </div>
      <PendingScopeSummary tasks={data.tasks} loaded={data.tasksLoaded} />
      <RecentTasks tasks={data.tasks} />
      <ActivityAndFindings activity={data.activity} findings={data.findings} />
      <InventorySummary
        assetCounts={data.assetCounts}
        traffic={data.traffic}
        stats={data.stats}
        settings={data.settings}
        llmProfiles={data.llmProfiles}
        pending={pending}
      />
      <TokenUsage
        tasks={data.tasks}
        convTokens={data.convTokens}
        llmProfiles={data.llmProfiles}
        usageStats={data.usageStats}
      />
    </div>
  );
}
