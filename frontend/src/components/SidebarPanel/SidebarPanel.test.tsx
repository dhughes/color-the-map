import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SidebarPanel } from "./SidebarPanel";

describe("SidebarPanel", () => {
  describe("header", () => {
    it("renders the title text", () => {
      render(<SidebarPanel title="Test Title" />);

      expect(screen.getByText("Test Title")).toBeInTheDocument();
    });

    it("renders the accent bar", () => {
      const { container } = render(<SidebarPanel title="Test" />);

      expect(
        container.querySelector(".sidebar-panel-header-bar"),
      ).toBeInTheDocument();
    });

    it("applies header styling classes", () => {
      const { container } = render(<SidebarPanel title="Test" />);

      expect(
        container.querySelector(".sidebar-panel-header"),
      ).toBeInTheDocument();
    });
  });

  describe("with children", () => {
    it("renders children below the header", () => {
      render(
        <SidebarPanel title="Panel">
          <div data-testid="child-content">Child content</div>
        </SidebarPanel>,
      );

      expect(screen.getByTestId("child-content")).toBeInTheDocument();
      expect(screen.getByText("Child content")).toBeInTheDocument();
    });

    it("renders multiple children", () => {
      render(
        <SidebarPanel title="Panel">
          <div>First child</div>
          <div>Second child</div>
        </SidebarPanel>,
      );

      expect(screen.getByText("First child")).toBeInTheDocument();
      expect(screen.getByText("Second child")).toBeInTheDocument();
    });
  });

  describe("without children", () => {
    it("renders only the header when children is undefined", () => {
      const { container } = render(<SidebarPanel title="Empty Panel" />);

      expect(screen.getByText("Empty Panel")).toBeInTheDocument();
      expect(container.children).toHaveLength(1);
      expect(container.firstChild).toHaveClass("sidebar-panel-header");
    });

    it("renders only the header when children is null", () => {
      const { container } = render(
        <SidebarPanel title="Empty Panel">{null}</SidebarPanel>,
      );

      expect(screen.getByText("Empty Panel")).toBeInTheDocument();
      expect(container.children).toHaveLength(1);
      expect(container.firstChild).toHaveClass("sidebar-panel-header");
    });
  });
});
