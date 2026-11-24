"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { InterceptPending } from "@/lib/types";

const PendingContext = createContext<InterceptPending[] | null>(null);

export function PendingApprovalsProvider({ children }: { children: ReactNode }) {
  const [rows, setRows] = useState<InterceptPending[] | null>(null);
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const pending = await api.interceptPending();
        if (live) setRows(pending);
      } catch {
        if (live) setRows(null);
      } finally {
        if (live) timer = setTimeout(refresh, 5000);
      }
    }
    void refresh();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, []);
  return <PendingContext.Provider value={rows}>{children}</PendingContext.Provider>;
}

export function usePendingApprovals() {
  return useContext(PendingContext);
}
