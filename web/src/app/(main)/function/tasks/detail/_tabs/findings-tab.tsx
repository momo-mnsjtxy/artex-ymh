"use client";

import * as React from "react";

import Link from "next/link";

import { ArrowDownIcon, ArrowUpIcon, ArrowUpRightIcon, ChevronRightIcon } from "lucide-react";
import { useDefaultLayout } from "react-resizable-panels";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { api } from "@/lib/api";
import { useStoredSortPreference } from "@/lib/sort-preference";
import { statusMeta } from "@/lib/status";
import type { Finding, FindingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type FindingSortField = "time";

const FINDING_SORT_FIELDS: readonly FindingSortField[] = ["time"];
const FINDING_SORT_PREFERENCE_KEY = "artex_task_findings_sort";

function findingLabel(finding: Finding): string {
  if (finding.name?.trim()) return finding.name;
  if (typeof finding.vulnclass === "string" && finding.vulnclass.trim()) return finding.vulnclass;
  return "未分类";
}

const FINDING_STATUSES: FindingStatus[] = [
  "pending",
  "in_progress",
  "confirmed",
  "resolved",
  "fixed",
  "false_positive",
  "ignored",
  "duplicate",
  "risk_accepted",
];

function Row({
  f,
  contextTaskId,
  onStatus,
  open,
  onSelect,
  rowRef,
}: {
  f: Finding;
  contextTaskId: string;
  open: boolean;
  onSelect: () => void;
  rowRef?: React.Ref<HTMLDivElement>;
  onStatus: (f: Finding, next: FindingStatus) => void;
}) {
  return (
    <div ref={rowRef} className="border-b last:border-b-0">
      <div className="@container flex w-full flex-wrap items-center gap-2 px-3 py-2 text-sm hover:bg-accent/40">
        <button
          type="button"
          onClick={onSelect}
          aria-expanded={open}
          className="flex min-w-32 flex-1 items-center gap-2 text-left"
        >
          <ChevronRightIcon
            className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
          />
          <StatusBadge domain="severity" value={f.severity} dot />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium">{findingLabel(f)}</span>
              {f.inherited && f.source_task_id && (
                <Badge variant="outline" className="shrink-0">
                  来源 #{f.source_task_id} · 只读
                </Badge>
              )}
            </div>
            <span className="truncate text-xs text-muted-foreground">{f.summary}</span>
          </div>
        </button>
        <Badge variant="outline" className="hidden @xl:inline-flex">
          流量证据 {f.traffic_count ?? 0} 条
        </Badge>
        {f.assets && f.assets.length > 0 && (
          <div className="hidden shrink-0 flex-wrap justify-end gap-1 @2xl:flex">
            {f.assets.slice(0, 2).map((a) => (
              <code
                key={a.id}
                className="max-w-[10rem] truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                title={`${a.type} · ${a.label}`}
              >
                {a.label}
              </code>
            ))}
            {f.assets.length > 2 && <span className="text-xs text-muted-foreground">+{f.assets.length - 2}</span>}
          </div>
        )}
        {f.finding_id && !f.inherited ? (
          <Select value={f.status} onValueChange={(v) => onStatus(f, v as FindingStatus)}>
            <SelectTrigger size="sm" className="h-7 w-28 shrink-0 border-none px-1 shadow-none focus-visible:ring-2">
              <StatusBadge domain="finding" value={f.status} dot />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              <SelectGroup>
                {FINDING_STATUSES.map((st) => (
                  <SelectItem key={st} value={st}>
                    {statusMeta("finding", st).label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : (
          <StatusBadge domain="finding" value={f.status} dot />
        )}
        <span className="hidden shrink-0 text-xs text-muted-foreground @4xl:block">
          {new Date(f.ts).toLocaleString("zh-CN")}
        </span>
        {f.finding_id && (
          <Link
            href={
              f.inherited
                ? `/function/findings/detail?id=${f.finding_id}&context_task=${contextTaskId}`
                : `/function/findings/detail?id=${f.finding_id}`
            }
            className="text-muted-foreground hover:text-primary inline-flex shrink-0 items-center gap-0.5 text-xs"
            title="查看漏洞详情"
          >
            详情
            <ArrowUpRightIcon className="size-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

export function FindingsTab({ taskId, headerRef }: { taskId: string; headerRef: React.RefObject<HTMLElement | null> }) {
  const compact = useIsMobile();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const evidenceTitleRef = React.useRef<HTMLHeadingElement>(null);
  const listViewportRef = React.useRef<HTMLDivElement>(null);
  const selectedRowRef = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    if (selectedId === null || !evidenceTitleRef.current) return;
    if (!compact) {
      const viewport = listViewportRef.current;
      if (!viewport) return;
      // The resizable group can restore a saved width after this commit.
      // Measure after reflow, on selection and width changes only.
      let lastWidth: number;
      const observer = new ResizeObserver(([entry]) => {
        if (entry.contentRect.width === lastWidth) return;
        lastWidth = entry.contentRect.width;
        const row = selectedRowRef.current?.getBoundingClientRect();
        if (!row) return;
        const visibleTop = viewport.getBoundingClientRect().top + viewport.clientTop;
        const visibleBottom = visibleTop + viewport.clientHeight;
        if (row.top < visibleTop) viewport.scrollTop += row.top - visibleTop;
        else if (row.bottom > visibleBottom) viewport.scrollTop += row.bottom - visibleBottom;
      });
      observer.observe(viewport);
      return () => observer.disconnect();
    }
    const title = evidenceTitleRef.current.getBoundingClientRect();
    const visibleTop = (headerRef.current?.getBoundingClientRect().bottom ?? 0) + 8;
    if (title.top < visibleTop || title.bottom > window.innerHeight) {
      window.scrollBy({ top: title.top - visibleTop, behavior: "instant" });
    }
  }, [compact, selectedId, headerRef]);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "task-finding-evidence",
    onlySaveAfterUserInteractions: true,
  });
  const [findings, setFindings] = React.useState<Finding[]>([]);
  const [sortPreference, setSortPreference] = useStoredSortPreference(
    FINDING_SORT_PREFERENCE_KEY,
    FINDING_SORT_FIELDS,
    "time",
    "desc",
  );

  React.useEffect(() => {
    let active = true;
    const load = () => {
      api
        .findings(taskId)
        .then((fs) => {
          if (active) setFindings(fs);
        })
        .catch(() => {
          // Keep the last successful snapshot during transient refresh failures.
        });
    };
    load();
    const t = setInterval(load, 3000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [taskId]);

  const onStatus = React.useCallback(async (f: Finding, next: FindingStatus) => {
    if (f.inherited || !f.finding_id || next === f.status) return;
    const prev = f.status;
    setFindings((cur) => cur.map((x) => (x.id === f.id ? { ...x, status: next } : x)));
    try {
      await api.setFindingStatus(f.finding_id, next);
      toast.success(`已标记为「${statusMeta("finding", next).label}」`);
    } catch (e) {
      setFindings((cur) => cur.map((x) => (x.id === f.id ? { ...x, status: prev } : x)));
      toast.error("更新失败：" + (e as Error).message);
    }
  }, []);

  const items = findings
    .filter((f) => f.task_id === taskId || f.inherited)
    .sort((a, b) => {
      const compared = Date.parse(a.ts) - Date.parse(b.ts);
      if (compared !== 0) return sortPreference.direction === "asc" ? compared : -compared;
      return b.id.localeCompare(a.id, undefined, { numeric: true });
    });

  const selected = items.find((item) => item.id === selectedId);
  const list = (
    <Card className="min-w-0 overflow-hidden py-0">
      <CardContent className="px-0">
        <div className="flex items-center border-b px-4 py-2 text-xs text-muted-foreground">
          <span className="min-w-0 flex-1">漏洞</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 outline-none focus-visible:underline"
            aria-label={`发现时间当前${sortPreference.direction === "asc" ? "正序" : "倒序"}，点击切换排序方向`}
            onClick={() =>
              setSortPreference((current) => ({
                field: "time",
                direction: current.direction === "asc" ? "desc" : "asc",
              }))
            }
          >
            <span>发现时间</span>
            {sortPreference.direction === "asc" ? (
              <ArrowUpIcon className="size-3.5" />
            ) : (
              <ArrowDownIcon className="size-3.5" />
            )}
          </button>
        </div>
        <div ref={listViewportRef} className="md:max-h-[max(12rem,calc(100dvh-16rem))] md:overflow-y-auto">
          {items.map((f) => (
            <Row
              key={f.id}
              f={f}
              contextTaskId={taskId}
              onStatus={onStatus}
              open={selectedId === f.id}
              rowRef={selectedId === f.id ? selectedRowRef : undefined}
              onSelect={() => setSelectedId(f.id === selectedId ? null : f.id)}
            />
          ))}
          {items.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">本任务及直接关联任务暂无确认发现。</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const evidence = selected && (
    <aside aria-label="发现证据" className="min-w-0 rounded-lg border bg-card">
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <h2 ref={evidenceTitleRef} className="min-w-0 truncate text-sm font-semibold" title={findingLabel(selected)}>
          {findingLabel(selected)}
        </h2>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedId(null)}>
          收起证据
        </Button>
      </header>
      <div className="space-y-2 p-3">
        <p className="text-xs text-muted-foreground">
          证据 / PoC · 流量证据 <span className="tabular-nums">{selected.traffic_count ?? 0}</span> 条
        </p>
        <pre className="max-h-[60dvh] overflow-auto whitespace-pre-wrap break-all text-xs">
          {selected.evidence || "暂无证据正文。"}
        </pre>
      </div>
    </aside>
  );
  if (compact)
    return (
      <div className="flex min-w-0 flex-col gap-2">
        {evidence}
        {list}
      </div>
    );
  return (
    <ResizablePanelGroup
      orientation="horizontal"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
      className="items-start"
    >
      <ResizablePanel id="findings" defaultSize="62%" minSize="35%">
        {list}
      </ResizablePanel>
      {selected && (
        <>
          <ResizableHandle withHandle aria-label="调整证据面板宽度" className="mx-2 self-stretch" />
          <ResizablePanel id="evidence" defaultSize="38%" minSize="22%">
            {evidence}
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}
