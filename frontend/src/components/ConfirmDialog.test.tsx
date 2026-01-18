import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when not open", () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="Delete Track"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders dialog when open", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete Track"
        message="Are you sure you want to delete this track?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText("Delete Track")).toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to delete this track?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button clicked", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete Track"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );

    fireEvent.click(screen.getByText("Yes"));

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button clicked", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete Track"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );

    fireEvent.click(screen.getByText("No"));

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when backdrop clicked", () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={true}
        title="Delete Track"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );

    const backdrop = container.querySelector(".confirm-dialog-backdrop");
    fireEvent.click(backdrop!);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it("does not call onCancel when dialog content clicked", () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={true}
        title="Delete Track"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );

    const dialog = container.querySelector(".confirm-dialog");
    fireEvent.click(dialog!);

    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel when Escape key pressed", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete Track"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when Enter key pressed", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete Track"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );

    fireEvent.keyDown(document, { key: "Enter" });

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it("uses custom button text when provided", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete Track"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        confirmText="Delete"
        cancelText="Cancel"
      />,
    );

    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });
});
