import * as React from "react";

import Link from "next/link";

import { ActivityIcon, ArrowUpRightIcon, NetworkIcon, ShieldCheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { InterceptPending, LLMProfile, Settings, Stats, TrafficExchange } from "@/lib/types";
import { cn } from "@/lib/utils";

const ASSET_TYPE_LABELS: Record<string, string> = {
  root_domain: "根域名",
  ip: "IP",
  subdomain: "子域名",
  app: "应用",
  service: "服务",
  endpoint: "端点",
};

const ASSET_COLORS: Record<string, string> = {
  root_domain: "bg-running",
  ip: "bg-indigo-400",
  subdomain: "bg-violet-500",
  app: "bg-orange-400",
  service: "bg-cyan-500",
  endpoint: "bg-success",
};

function statusColor(code: number): string {
  if (code < 300) return "text-success";
  if (code < 400) return "text-running";
  if (code < 500) return "text-warning";
  return "text-danger";
}

function statusBg(code: number): string {
  if (code < 300) return "bg-success";
  if (code < 400) return "bg-running";
  if (code < 500) return "bg-warning";
  return "bg-danger";
}

function SectionTitle({
  icon: Icon,
  children,
  sub,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <Icon className="size-3.5 text-muted-foreground" />
        {children}
      </div>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function InventorySummary({
  assetCounts,
  traffic,
  stats,
  settings,
  llmProfiles,
  pending,
}: {
  assetCounts: Record<string, number>;
  traffic: TrafficExchange[];
  stats: Stats | null;
  settings: Settings | null;
  llmProfiles: LLMProfile[];
  pending: InterceptPending[] | null;
}) {
  const totalAssets = React.useMemo(() => Object.values(assetCounts).reduce((a, b) => a + b, 0), [assetCounts]);

  // asset type breakdown
  const assetByType = React.useMemo(() => {
    return Object.entries(assetCounts)
      .filter(([, n]) => n > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
  }, [assetCounts]);

  const assetMax = assetByType[0]?.[1] ?? 1;

  // traffic status code breakdown
  const trafficByCodes = React.useMemo(() => {
    const m: Record<number, number> = {};
    for (const e of traffic) {
      const bucket = Math.floor(e.status / 100) * 100;
      m[bucket] = (m[bucket] ?? 0) + 1;
    }
    return Object.entries(m)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([code, n]) => ({ code: Number(code), n }));
  }, [traffic]);

  const trafficMax = Math.max(...trafficByCodes.map((x) => x.n), 1);
  const recentTraffic = [...traffic].sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts)).slice(0, 5);

  // system
  const activeProfile = llmProfiles.find((p) => p.is_default);
  const pendingCount = pending?.length ?? 0;
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {/* 资产分布 */}
      <Card className="p-4">
        <SectionTitle icon={NetworkIcon} sub="按类型">
          资产分布
        </SectionTitle>

        {assetByType.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">暂无资产数据</div>
        ) : (
          <div className="flex flex-col gap-2">
            {assetByType.map(([type, count]) => (
              <div key={type} className="flex items-center gap-2 text-xs">
                <span className="w-8 shrink-0 text-right text-[10px] text-muted-foreground">
                  {ASSET_TYPE_LABELS[type] ?? type}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", ASSET_COLORS[type] ?? "bg-inactive")}
                    style={{ width: `${(count / assetMax) * 100}%` }}
                  />
                </div>
                <span className="w-4 text-right tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 border-t pt-3 text-[10px] text-muted-foreground">共 {totalAssets} 节点</div>
      </Card>

      {/* 流量状态码 */}
      <Card className="p-4">
        <SectionTitle icon={ActivityIcon} sub={`${traffic.length} 次请求`}>
          流量状态码
        </SectionTitle>

        {/* bar chart */}
        {trafficByCodes.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">暂无流量数据</div>
        ) : (
          <>
            <div className="mb-3 flex items-end gap-2" style={{ height: 52 }}>
              {trafficByCodes.map(({ code, n }) => (
                <div key={code} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[9px] tabular-nums text-muted-foreground">{n}</span>
                  <div
                    className={cn("w-full min-h-1 rounded-sm", statusBg(code), "opacity-80")}
                    style={{ height: Math.max(4, (n / trafficMax) * 36) }}
                  />
                  <span className={cn("text-[9px] font-mono", statusColor(code))}>{code}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-2.5">
              <div className="mb-1.5 text-[10px] text-muted-foreground">最近请求</div>
              <div className="flex flex-col gap-1.5">
                {recentTraffic.map((e) => (
                  <div key={e.id} className="flex items-center gap-1.5 text-[10px]">
                    <span
                      className={cn(
                        "shrink-0 rounded border px-1 py-0 font-mono text-[9px]",
                        e.method === "GET"
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-running/30 bg-running/10 text-running",
                      )}
                    >
                      {e.method}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {e.host}
                      {e.url.replace(/^https?:\/\/[^/]+/, "").substring(0, 30)}
                    </span>
                    <span className={cn("shrink-0 font-mono text-[9px]", statusColor(e.status))}>{e.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </Card>

      {/* 系统状态 & 待审批 */}
      <Card className="p-4">
        <SectionTitle icon={ShieldCheckIcon}>系统状态</SectionTitle>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
            <div className="text-[10px] text-muted-foreground">LLM 配置</div>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                stats?.llm_configured
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-danger/30 bg-danger/10 text-danger",
              )}
            >
              {stats?.llm_configured ? "已配置" : "未配置"}
            </Badge>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
            <div className="text-[10px] text-muted-foreground">流量捕获</div>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                settings?.traffic_capture
                  ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
                  : "text-muted-foreground",
              )}
            >
              {settings?.traffic_capture ? "开启" : "关闭"}
            </Badge>
          </div>

          {activeProfile && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
              <div className="text-[10px] text-muted-foreground">激活模型</div>
              <span className="font-mono text-[10px]">{activeProfile.model}</span>
            </div>
          )}
        </div>

        {/* pending approvals */}
        {pendingCount > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 text-[10px] font-medium text-warning">待审批 ({pendingCount})</div>
            <div className="flex flex-col gap-1.5">
              {pending?.slice(0, 3).map((p) => (
                <Link
                  key={p.id}
                  href="/system/intercept/approvals"
                  className="flex items-center justify-between rounded-lg border border-warning/20 bg-warning/5 px-2.5 py-2 hover:bg-warning/10"
                >
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium">{p.tool_name}</div>
                    <div className="text-[9px] text-muted-foreground">{p.agent_name}</div>
                  </div>
                  <ArrowUpRightIcon className="size-3 shrink-0 text-warning" />
                </Link>
              ))}
              {pendingCount > 3 && (
                <Link
                  href="/system/intercept/approvals"
                  className="text-center text-[10px] text-muted-foreground hover:text-foreground"
                >
                  还有 {pendingCount - 3} 条…
                </Link>
              )}
            </div>
          </div>
        )}

        {pending && pendingCount === 0 && (
          <div className="mt-3 rounded-lg border bg-muted/10 px-3 py-3 text-center text-[10px] text-muted-foreground">
            <ShieldCheckIcon className="mx-auto mb-1 size-4 text-success/50" />
            无待审批拦截
          </div>
        )}
      </Card>
    </div>
  );
}
