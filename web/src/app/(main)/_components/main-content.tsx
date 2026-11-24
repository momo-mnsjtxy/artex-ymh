"use client";

import { type ReactNode, useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronRight, ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "@/lib/api";
import { navLocation } from "@/navigation/sidebar/sidebar-items";

import { AccountSwitcher } from "./sidebar/account-switcher";
import { SearchDialog } from "./sidebar/search-dialog";
import { ThemeSwitcher } from "./sidebar/theme-switcher";

export function MainContent({ children }: { children: ReactNode }) {
  const currentUser = useCurrentUser();
  const pathname = usePathname().replace(/\/$/, "");
  const location = navLocation(pathname);
  const [version, setVersion] = useState("");

  useEffect(() => {
    api
      .health()
      .then((h) => setVersion((h.version ?? "").replace(/^v(?=\d)/, "")))
      .catch(() => setVersion(""));
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center border-b bg-card">
        <div className="flex w-full items-center min-w-0 justify-between px-2 md:px-4">
          <div className="flex min-w-0 items-center gap-1 lg:gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
            />
            <nav aria-label="面包屑" className="flex min-w-0 items-center gap-1 text-xs">
              <span className="hidden text-muted-foreground lg:inline">{location?.group}</span>
              <ChevronRight className="hidden size-3 text-muted-foreground lg:block" />
              {location && pathname !== location.url ? (
                <>
                  <Link href={location.url} className="text-muted-foreground">
                    {location.title}
                  </Link>
                  <ChevronRight className="size-3" />
                  <span aria-current="page">详情</span>
                </>
              ) : (
                <span className="truncate" aria-current="page">
                  {location?.title}
                </span>
              )}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
            {version && (
              <span className="hidden font-mono text-muted-foreground text-xs lg:inline">版本 · {version}</span>
            )}
            <SearchDialog />
            <Button asChild variant="ghost" size="icon-sm">
              <Link href="/system/intercept/approvals" aria-label="待审批记录" title="待审批记录">
                <ClipboardList />
              </Link>
            </Button>
            <ThemeSwitcher />
            <AccountSwitcher users={[currentUser]} />
          </div>
        </div>
      </header>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-3 has-data-[content-padding=false]:p-0 md:p-5 md:has-data-[content-padding=false]:p-0">
        {children}
      </div>
    </>
  );
}
