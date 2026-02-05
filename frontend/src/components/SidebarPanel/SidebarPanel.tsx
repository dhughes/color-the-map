import type { ReactNode } from "react";

interface SidebarPanelProps {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function SidebarPanel({ title, children, action }: SidebarPanelProps) {
  return (
    <>
      <div className="sidebar-panel-header">
        <span className="sidebar-panel-header-bar" />
        <span className="sidebar-panel-header-title">{title}</span>
        {action && <div className="sidebar-panel-header-action">{action}</div>}
      </div>
      {children}
    </>
  );
}
