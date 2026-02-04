interface DrawerPanelHeaderProps {
  title: string;
}

export function DrawerPanelHeader({ title }: DrawerPanelHeaderProps) {
  return (
    <div className="drawer-panel-header">
      <span className="drawer-panel-header-bar" />
      <span className="drawer-panel-header-title">{title}</span>
    </div>
  );
}
