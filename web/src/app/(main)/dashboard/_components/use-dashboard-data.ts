"use client";

import * as React from "react";

import { api } from "@/lib/api";

const readTasks = () => api.tasks().then((response) => response.tasks);
const readActivity = () => api.activity(undefined, { limit: 30 }).then((response) => response.items);
const readTraffic = () => api.traffic(0, 50).then((response) => response.exchanges ?? []);
const readUsage = () => api.usageStats(365);

// Each resource keeps its last successful snapshot and has at most one request in flight.
function useDashboardSource<T>(read: () => Promise<T>, interval: number) {
  const [snapshot, setSnapshot] = React.useState<T | null>(null);
  React.useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const next = await read();
        if (active) setSnapshot(next);
      } catch {
        // The next poll retries without disturbing the other panels.
      } finally {
        if (active) timer = setTimeout(refresh, interval);
      }
    }
    void refresh();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [read, interval]);
  return snapshot;
}

export function useDashboardData() {
  const tasks = useDashboardSource(readTasks, 5000);
  const findings = useDashboardSource(api.findings, 5000);
  const stats = useDashboardSource(api.stats, 5000);
  const settings = useDashboardSource(api.settings, 5000);
  const activity = useDashboardSource(readActivity, 5000);
  const convTokens = useDashboardSource(api.conversationTokens, 5000);
  const traffic = useDashboardSource(readTraffic, 15000);
  const assetCounts = useDashboardSource(api.assetCounts, 15000);
  const llmProfiles = useDashboardSource(api.llmProfiles, 15000);
  const usageStats = useDashboardSource(readUsage, 15000);
  return {
    tasks: tasks ?? [],
    tasksLoaded: tasks !== null,
    findings: findings ?? [],
    findingsLoaded: findings !== null,
    stats,
    settings,
    activity: activity ?? [],
    convTokens: convTokens ?? [],
    traffic: traffic ?? [],
    assetCounts: assetCounts ?? {},
    assetsLoaded: assetCounts !== null,
    llmProfiles: llmProfiles ?? [],
    usageStats,
  };
}
