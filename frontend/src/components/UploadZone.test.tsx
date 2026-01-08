import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UploadZone } from "./UploadZone";

describe("UploadZone", () => {
  const mockOnFilesDropped = vi.fn();

  it("renders invisible zone when not dragging or uploading", () => {
    const { container } = render(
      <UploadZone onFilesDropped={mockOnFilesDropped} isUploading={false} />,
    );
    expect(
      container.querySelector(".upload-zone-invisible"),
    ).toBeInTheDocument();
  });

  it("shows drag overlay when dragging", () => {
    const { container } = render(
      <UploadZone onFilesDropped={mockOnFilesDropped} isUploading={false} />,
    );

    const zone = container.querySelector(".upload-zone-invisible")!;
    fireEvent.dragEnter(zone);

    expect(screen.getByText(/Drop GPX files/i)).toBeInTheDocument();
  });

  it("shows uploading overlay when uploading", () => {
    const { container } = render(
      <UploadZone onFilesDropped={mockOnFilesDropped} isUploading={true} />,
    );

    expect(container.querySelector(".spinner")).toBeInTheDocument();
  });

  it("calls onFilesDropped with GPX files only", () => {
    const { container } = render(
      <UploadZone onFilesDropped={mockOnFilesDropped} isUploading={false} />,
    );

    const zone = container.querySelector(".upload-zone-invisible")!;

    const gpxFile = new File(["gpx content"], "test.gpx", {
      type: "application/gpx+xml",
    });
    const txtFile = new File(["text content"], "test.txt", {
      type: "text/plain",
    });

    const dataTransfer = {
      files: [gpxFile, txtFile],
    };

    fireEvent.dragEnter(zone);
    fireEvent.drop(zone, { dataTransfer });

    expect(mockOnFilesDropped).toHaveBeenCalledWith([gpxFile]);
    expect(mockOnFilesDropped).toHaveBeenCalledTimes(1);
  });

  it("hides drag overlay on drag leave", () => {
    const { container } = render(
      <UploadZone onFilesDropped={mockOnFilesDropped} isUploading={false} />,
    );

    const zone = container.querySelector(".upload-zone-invisible")!;

    fireEvent.dragEnter(zone);
    expect(screen.getByText(/Drop GPX files/i)).toBeInTheDocument();

    fireEvent.dragLeave(zone);

    expect(screen.queryByText(/Drop GPX files/i)).not.toBeInTheDocument();
  });
});
