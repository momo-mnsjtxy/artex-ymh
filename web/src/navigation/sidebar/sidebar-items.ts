import {
  Activity,
  Bot,
  Brain,
  Bug,
  ClipboardList,
  FolderOpen,
  FolderSync,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  Network,
  Plug,
  Radar,
  Radio,
  ScrollText,
  Settings2,
  ShieldAlert,
  Sparkles,
  Target,
  Terminal,
  Wrench,
} from "lucide-react";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "作战中心",
    items: [
      { id: "dashboard", title: "态势总览", url: "/dashboard", icon: LayoutDashboard },
      { id: "tasks", title: "任务", url: "/function/tasks", icon: Target },
      { id: "intranet", title: "内网作战", url: "/intranet", icon: Radar },
      { id: "chat", title: "对话", url: "/chat", icon: MessageSquare },
    ],
  },
  {
    id: 2,
    label: "情报与取证",
    items: [
      { id: "findings", title: "发现", url: "/function/findings", icon: Bug },
      { id: "assets", title: "资产", url: "/function/assets", icon: Network },
      { id: "traffic", title: "流量", url: "/function/traffic", icon: Activity },
      { id: "commands", title: "工具执行", url: "/function/commands", icon: Terminal },
      { id: "llm-records", title: "LLM 录制", url: "/function/llm-records", icon: Radio },
    ],
  },
  {
    id: 3,
    label: "治理与审计",
    items: [
      { id: "intercept", title: "拦截规则", url: "/system/intercept", icon: ShieldAlert },
      { id: "approvals", title: "审批记录", url: "/system/intercept/approvals", icon: ClipboardList },
      { id: "logs", title: "系统日志", url: "/system/logs", icon: ScrollText },
    ],
  },
  {
    id: 4,
    label: "平台配置",
    items: [
      { id: "llm", title: "LLM", url: "/system/llm", icon: Brain },
      { id: "agents", title: "Agent", url: "/system/agents", icon: Bot },
      { id: "mcp", title: "MCP", url: "/system/mcp", icon: Plug },
      { id: "skills", title: "Skill", url: "/system/skills", icon: Sparkles },
      { id: "tools", title: "工具", url: "/system/tools", icon: Wrench },
      { id: "sync", title: "资产同步", url: "/function/sync", icon: FolderSync },
      { id: "workspace", title: "工作空间", url: "/function/workspace", icon: FolderOpen },
      { id: "settings", title: "系统配置", url: "/system/settings", icon: Settings2 },
    ],
  },
];
const destinations = sidebarItems
  .flatMap((group) => group.items.flatMap((item) => (item.subItems ? [] : [{ ...item, group: group.label }])))
  .sort((a, b) => b.url.length - a.url.length);
export function navLocation(path: string) {
  return destinations.find((item) => path === item.url || path.startsWith(`${item.url}/`));
}
