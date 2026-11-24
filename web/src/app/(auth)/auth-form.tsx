import type { ReactNode } from "react";

import Image from "next/image";

export function AuthForm({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4">
      <section aria-labelledby="auth-title" className="w-full max-w-sm rounded-lg border bg-card">
        <div className="flex h-14 items-center gap-2 border-b px-6">
          <Image src="/logo.png" width={24} height={24} alt="" className="dark:brightness-0 dark:invert" />
          <span className="font-semibold tracking-wide">ARTEX</span>
        </div>
        <div className="space-y-6 p-6">
          <div className="space-y-1.5">
            <h1 id="auth-title" className="font-semibold text-xl tracking-tight">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
