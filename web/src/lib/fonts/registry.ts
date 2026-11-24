import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

export const fontRegistry = { geist: { label: "Geist", font: GeistSans } } as const;
export type FontKey = keyof typeof fontRegistry;
export const fontVars = `${GeistSans.variable} ${GeistMono.variable}`;
