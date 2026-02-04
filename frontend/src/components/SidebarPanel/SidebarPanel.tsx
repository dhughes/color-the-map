import type { ReactNode } from "react";

interface SidebarPanelProps {
  title: string;
  children?: ReactNode;
}

export function SidebarPanel({ title, children }: SidebarPanelProps) {
  return (
    <>
      <div className="sidebar-panel-header">
        <span className="sidebar-panel-header-bar" />
        <span className="sidebar-panel-header-title">{title}</span>
      </div>
      {children}
    </>
  );
}
