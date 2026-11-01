import type { LucideIcon } from 'lucide-react';

export type SidebarSubItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
};

export type SidebarItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  subItems?: SidebarSubItem[];
};
