import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DrawerPanelHeader } from "./DrawerPanelHeader";

describe("DrawerPanelHeader", () => {
  it("renders the title", () => {
    render(<DrawerPanelHeader title="Test Title" />);

    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  it("renders the accent bar", () => {
    const { container } = render(<DrawerPanelHeader title="Test" />);

    expect(
      container.querySelector(".drawer-panel-header-bar"),
    ).toBeInTheDocument();
  });
});
