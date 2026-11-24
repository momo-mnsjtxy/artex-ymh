"use client";

import * as React from "react";

import { api } from "@/lib/api";
import type {
  Activity,
  ConvTokenSummary,
  Finding,
  LLMProfile,
  Settings,
  Stats,
  Task,
  TrafficExchange,
  UsageStats,
} from "@/lib/types";

export function useDashboardData() {
  // data state
  const [tasksLoaded, setTasksLoaded] = React.useState(false);
  const [assetsLoaded, setAssetsLoaded] = React.useState(false);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [findings, setFindings] = React.useState<Finding[]>([]);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [settings, setSettings] = React.useState<Settings | null>(null);
  const [activity, setActivity] = React.useState<Activity[]>([]);
  const [convTokens, setConvTokens] = React.useState<ConvTokenSummary[]>([]);
  const [usageStats, setUsageStats] = React.useState<UsageStats | null>(null);
  const [assetCounts, setAssetCounts] = React.useState<Record<string, number>>({});
  const [traffic, setTraffic] = React.useState<TrafficExchange[]>([]);
  const [llmProfiles, setLLMProfiles] = React.useState<LLMProfile[]>([]);

  // The task list is the most expensive dashboard source. Poll it independently
  // so a large history cannot hold back every other dashboard panel.
  React.useEffect(() => {
    let alive = true;
    let loading = false;
    let signature = "";
    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const tr = await api.tasks();
        if (!alive) return;
        setTasksLoaded(true);
        const nextSignature = JSON.stringify(tr.tasks);
        if (nextSignature !== signature) {
          signature = nextSignature;
          setTasks(tr.tasks);
        }
      } catch {
        /* transient errors — next poll retries */
      } finally {
        loading = false;
      }
    };
    void load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // The remaining fast sources stay batched so one poll causes a single render.
  React.useEffect(() => {
    let alive = true;
    let loading = false;
    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const [findings, stats, settings, activity, conversationTokens] = await Promise.all([
          api.findings(),
          api.stats(),
          api.settings(),
          api.activity(undefined, { limit: 30 }),
          api.conversationTokens(),
        ]);
        if (!alive) return;
        setFindings(findings);
        setStats(stats);
        setSettings(settings);
        setActivity(activity.items);
        setConvTokens(conversationTokens);
      } catch {
        // Preserve stale data and retry on the next interval.
      } finally {
        loading = false;
      }
    };
    void load();
    const timer = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  // slow poll: traffic, assets, system-static (every 15s)
  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [traf, counts, profileList, usage] = await Promise.all([
          api.traffic(0, 50),
          api.assetCounts(),
          api.llmProfiles(),
          api.usageStats(365),
        ]);
        if (!alive) return;
        setAssetsLoaded(true);
        setTraffic(traf.exchanges ?? []);
        setAssetCounts(counts ?? {});
        setLLMProfiles(profileList);
        setUsageStats(usage);
      } catch {
        /* transient errors */
      }
    };
    void load();
    const t = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return {
    tasks,
    findings,
    stats,
    settings,
    activity,
    convTokens,
    usageStats,
    assetCounts,
    traffic,
    llmProfiles,
    tasksLoaded,
    assetsLoaded,
  };
}
