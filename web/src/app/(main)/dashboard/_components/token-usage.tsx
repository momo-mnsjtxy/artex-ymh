import * as React from "react";

import { ZapIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ConvTokenSummary, LLMProfile, Task, UsageStats } from "@/lib/types";
import { cn } from "@/lib/utils";

import { fmtTokens } from "./format";

const dailyTrendConfig = {
  input: { label: "未缓存输入", color: "var(--running)" },
  output: { label: "输出", color: "var(--warning)" },
  cacheRead: { label: "缓存读", color: "var(--success)" },
} satisfies ChartConfig;

export function TokenUsage({
  tasks,
  convTokens,
  llmProfiles,
  usageStats,
}: {
  tasks: Task[];
  convTokens: ConvTokenSummary[];
  llmProfiles: LLMProfile[];
  usageStats: UsageStats | null;
}) {
  const activeProfile = llmProfiles.find((p) => p.is_default);
  // ── token stats per LLM profile ──────────────────────────────────────────
  // tasks whose llm_profile_id is null/undefined used the active default profile
  const defaultProfileId = activeProfile ? Number(activeProfile.id) : null;

  // 数据源开关：旧版 = activity（task.tokens + 会话），新版 = llm_usage 计量账本。
  const [tokenVersion, setTokenVersion] = React.useState<"old" | "new">("old");
  // selected profile tab: "all" = 全部; number = specific profile id
  const [tokenTab, setTokenTab] = React.useState<number | null | "all">("all");
  // day range for the daily bar chart
  const [tokenDays, setTokenDays] = React.useState<7 | 30 | 90 | 180 | 365>(30);

  // profile 名 → id，用于把 llm_usage 的 profile_name 映射到现有 profile 分栏。
  const profileIdByName = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const p of llmProfiles) m.set(p.name, Number(p.id));
    return m;
  }, [llmProfiles]);

  type Bucket = { input: number; output: number; cacheRead: number; cacheWrite: number; taskCount: number };

  // 旧版：按 profile 归桶（来自 activity 的 task.tokens + 会话用量）。
  const tokenByProfileOld = React.useMemo<Map<number | null, Bucket>>(() => {
    const m = new Map<number | null, Bucket>();
    const fold = (key: number | null, inp: number, out: number, cr: number, cw: number, addTask: boolean) => {
      const prev = m.get(key) ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, taskCount: 0 };
      m.set(key, {
        input: prev.input + inp,
        output: prev.output + out,
        cacheRead: prev.cacheRead + cr,
        cacheWrite: prev.cacheWrite + cw,
        taskCount: prev.taskCount + (addTask ? 1 : 0),
      });
    };
    for (const t of tasks) {
      fold(
        t.llm_profile_id ?? defaultProfileId,
        t.tokens?.input_tokens ?? 0,
        t.tokens?.output_tokens ?? 0,
        t.tokens?.cache_read_tokens ?? 0,
        t.tokens?.cache_write_tokens ?? 0,
        true,
      );
    }
    for (const c of convTokens) {
      fold(
        c.llm_profile_id ?? defaultProfileId,
        c.input_tokens,
        c.output_tokens,
        c.cache_read_tokens,
        c.cache_write_tokens,
        false,
      );
    }
    return m;
  }, [tasks, convTokens, defaultProfileId]);

  // 新版：按 profile 归桶（来自 llm_usage 全局聚合，逐次调用精确）。
  const tokenByProfileNew = React.useMemo<Map<number | null, Bucket>>(() => {
    const m = new Map<number | null, Bucket>();
    for (const p of usageStats?.by_profile ?? []) {
      // 未匹配到现有 profile（改名/删除/空名）→ 落到默认桶，仍计入「全部」。
      const key = profileIdByName.get(p.profile_name) ?? defaultProfileId;
      const prev = m.get(key) ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, taskCount: 0 };
      m.set(key, {
        input: prev.input + p.input_tokens,
        output: prev.output + p.output_tokens,
        cacheRead: prev.cacheRead + p.cache_read_tokens,
        cacheWrite: prev.cacheWrite + p.cache_write_tokens,
        taskCount: prev.taskCount + p.tasks,
      });
    }
    return m;
  }, [usageStats, profileIdByName, defaultProfileId]);

  const tokenByProfile = tokenVersion === "new" ? tokenByProfileNew : tokenByProfileOld;

  const displayedTokens = React.useMemo(() => {
    if (tokenTab === "all") {
      let input = 0,
        output = 0,
        cacheRead = 0,
        cacheWrite = 0,
        taskCount = 0;
      for (const v of tokenByProfile.values()) {
        input += v.input;
        output += v.output;
        cacheRead += v.cacheRead;
        cacheWrite += v.cacheWrite;
        taskCount += v.taskCount;
      }
      return { input, output, cacheRead, cacheWrite, taskCount };
    }
    const v = tokenByProfile.get(tokenTab as number | null);
    return v
      ? { input: v.input, output: v.output, cacheRead: v.cacheRead, cacheWrite: v.cacheWrite, taskCount: v.taskCount }
      : { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, taskCount: 0 };
  }, [tokenTab, tokenByProfile]);

  // 旧版每日：把任务/会话的总量按其创建日期归桶（近似，非真实每日消耗）。
  const dailyTokenDataOld = React.useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() - tokenDays);
    const cutoff = now.toISOString().slice(0, 10);
    const m = new Map<string, { input: number; output: number; cacheRead: number }>();
    const fold = (date: string, inp: number, out: number, cr: number) => {
      if (date < cutoff) return;
      const prev = m.get(date) ?? { input: 0, output: 0, cacheRead: 0 };
      m.set(date, { input: prev.input + inp, output: prev.output + out, cacheRead: prev.cacheRead + cr });
    };
    for (const t of tasks) {
      if (tokenTab !== "all" && (t.llm_profile_id ?? defaultProfileId) !== tokenTab) continue;
      fold(
        t.created_at.slice(0, 10),
        t.tokens?.input_tokens ?? 0,
        t.tokens?.output_tokens ?? 0,
        t.tokens?.cache_read_tokens ?? 0,
      );
    }
    for (const c of convTokens) {
      if (tokenTab !== "all" && (c.llm_profile_id ?? defaultProfileId) !== tokenTab) continue;
      fold(c.created_at.slice(0, 10), c.input_tokens, c.output_tokens, c.cache_read_tokens);
    }
    return [...m.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date: date.slice(5), ...v, input: Math.max(0, v.input - v.cacheRead) }));
  }, [tasks, convTokens, tokenDays, tokenTab, defaultProfileId]);

  // 新版每日：来自 llm_usage 的真实每日消耗（ts 是实际调用时刻）。
  const dailyTokenDataNew = React.useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() - tokenDays);
    const cutoff = now.toISOString().slice(0, 10);
    const m = new Map<string, { input: number; output: number; cacheRead: number }>();
    for (const d of usageStats?.daily ?? []) {
      if (d.date < cutoff) continue;
      if (tokenTab !== "all" && (profileIdByName.get(d.profile_name) ?? defaultProfileId) !== tokenTab) continue;
      const prev = m.get(d.date) ?? { input: 0, output: 0, cacheRead: 0 };
      m.set(d.date, {
        input: prev.input + d.input_tokens,
        output: prev.output + d.output_tokens,
        cacheRead: prev.cacheRead + d.cache_read_tokens,
      });
    }
    return [...m.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date: date.slice(5), ...v, input: Math.max(0, v.input - v.cacheRead) }));
  }, [usageStats, tokenDays, tokenTab, profileIdByName, defaultProfileId]);

  const dailyTokenData = tokenVersion === "new" ? dailyTokenDataNew : dailyTokenDataOld;

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <ZapIcon className="size-3.5 text-muted-foreground" />
          LLM Token 消耗
          {/* 数据源开关：旧版=activity 统计（含历史任务），新版=llm_usage 计量账本（更准，仅覆盖启用后） */}
          <div className="ml-1 flex gap-0.5 rounded-md border bg-muted/30 p-0.5">
            {(
              [
                { v: "old", label: "旧版" },
                { v: "new", label: "新版" },
              ] as const
            ).map(({ v, label }) => (
              <button
                type="button"
                key={v}
                onClick={() => setTokenVersion(v)}
                title={
                  v === "new"
                    ? "新版：来自 llm_usage 计量账本，逐次调用精确、含中断消耗；仅覆盖启用后的数据"
                    : "旧版：来自 activity 统计（含历史任务），中断消耗不计、无法精确到模型"
                }
                className={cn(
                  "rounded px-2 py-0.5 text-[9px] font-medium transition-colors",
                  tokenVersion === v
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-normal text-muted-foreground">
            {tokenVersion === "new" ? "llm_usage" : "activity"}
          </span>
        </div>
        {/* Profile tabs */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setTokenTab("all")}
            className={cn(
              "rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors",
              tokenTab === "all"
                ? "bg-foreground text-background"
                : "bg-muted/30 text-muted-foreground hover:text-foreground",
            )}
          >
            全部
          </button>
          {llmProfiles.map((p) => {
            const key = Number(p.id);
            const hasData = tokenByProfile.has(key) || (p.is_default && tokenByProfile.has(defaultProfileId));
            const resolvedKey = tokenByProfile.has(key) ? key : p.is_default ? defaultProfileId : key;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => setTokenTab(resolvedKey)}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors",
                  tokenTab === resolvedKey
                    ? "bg-foreground text-background"
                    : "bg-muted/30 text-muted-foreground hover:text-foreground",
                  !hasData && "opacity-40",
                )}
              >
                {p.name}
                {p.is_default && (
                  <span
                    className={cn(
                      "rounded px-1 py-0 text-[8px]",
                      tokenTab === resolvedKey ? "bg-background/20 text-background" : "bg-success/20 text-success",
                    )}
                  >
                    默认
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body: metrics left + bar chart right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        {/* Left: key metrics */}
        <div className="flex flex-col gap-4">
          {/* Total */}
          <div>
            <div className="text-[10px] text-muted-foreground">合计 (输入+输出)</div>
            <div className="mt-0.5 text-3xl font-bold tabular-nums tracking-tight">
              {fmtTokens(displayedTokens.input + displayedTokens.output) || "—"}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">{displayedTokens.taskCount} 个任务</div>
          </div>

          {/* Per-type bars */}
          <div className="space-y-3">
            {(() => {
              // input 已含缓存；拆成不重叠三段：未命中输入 + 缓存命中 + 输出 = 总量。
              const total = displayedTokens.input + displayedTokens.output;
              return [
                {
                  label: "输入(未命中)",
                  value: displayedTokens.input - displayedTokens.cacheRead,
                  barColor: dailyTrendConfig.input.color!,
                  text: "text-running",
                },
                {
                  label: "缓存命中",
                  value: displayedTokens.cacheRead,
                  barColor: dailyTrendConfig.cacheRead.color!,
                  text: "text-success",
                },
                {
                  label: "输出",
                  value: displayedTokens.output,
                  barColor: dailyTrendConfig.output.color!,
                  text: "text-warning",
                },
              ].map(({ label, value, barColor, text }) => {
                const pct = total > 0 ? (value / total) * 100 : 0;
                return (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={cn("font-mono font-semibold tabular-nums", text)}>{fmtTokens(value)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Cache hit rate */}
          {(() => {
            // input 已含缓存 → 命中率 = 缓存命中 / 总输入。
            const denominator = displayedTokens.input;
            const hitPct = denominator > 0 ? Math.round((displayedTokens.cacheRead / denominator) * 100) : 0;
            return (
              <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-[10px]">
                <span className="text-muted-foreground">缓存命中率</span>
                <span className={cn("font-semibold tabular-nums", hitPct > 50 ? "text-success" : "text-warning")}>
                  {hitPct}%
                </span>
              </div>
            );
          })()}
        </div>

        {/* Right: daily bar chart */}
        <div className="flex min-w-0 min-h-0 flex-col">
          <div className="mb-2 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-3 text-[9px] text-muted-foreground">
              {(["input", "output", "cacheRead"] as const).map((k) => (
                <span key={k} className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-sm" style={{ background: dailyTrendConfig[k].color }} />
                  {dailyTrendConfig[k].label}
                </span>
              ))}
            </div>
            <div className="flex gap-0.5 rounded-md border bg-muted/30 p-0.5">
              {(
                [
                  { days: 7, label: "7天" },
                  { days: 30, label: "30天" },
                  { days: 90, label: "3月" },
                  { days: 180, label: "6月" },
                  { days: 365, label: "一年" },
                ] as const
              ).map(({ days, label }) => (
                <button
                  type="button"
                  key={days}
                  onClick={() => setTokenDays(days)}
                  className={cn(
                    "rounded px-2.5 py-0.5 text-[9px] font-medium transition-colors",
                    tokenDays === days
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {dailyTokenData.length === 0 ? (
            <div
              className="flex flex-1 items-center justify-center rounded-lg border bg-muted/10 text-xs text-muted-foreground"
              style={{ minHeight: 180 }}
            >
              暂无数据
            </div>
          ) : (
            <ChartContainer config={dailyTrendConfig} className="h-[200px] w-full">
              <BarChart data={dailyTokenData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} maxBarSize={40}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  tickMargin={6}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v) => fmtTokens(Number(v))}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  width={44}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      formatter={(value, name) => (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span>
                            {(dailyTrendConfig as Record<string, { label: string }>)[String(name)]?.label ??
                              String(name)}
                          </span>
                          <span className="font-mono font-semibold tabular-nums">{fmtTokens(Number(value))}</span>
                        </div>
                      )}
                    />
                  }
                />
                <Bar dataKey="input" stackId="1" fill="var(--color-input)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="output" stackId="1" fill="var(--color-output)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="cacheRead" stackId="1" fill="var(--color-cacheRead)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </div>
    </Card>
  );
}
