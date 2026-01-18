import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { UploadZone } from "./UploadZone";

describe("UploadZone", () => {
  const mockOnFilesDropped = vi.fn();

  it("renders nothing when not dragging or uploading", () => {
    const { container } = render(
      <UploadZone onFilesDropped={mockOnFilesDropped} isUploading={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows uploading overlay when uploading", () => {
    const { container } = render(
      <UploadZone onFilesDropped={mockOnFilesDropped} isUploading={true} />,
    );

    expect(container.querySelector(".spinner")).toBeInTheDocument();
    expect(container.querySelector(".upload-zone")).toBeInTheDocument();
  });

  it("cleans up event listeners on unmount", () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    const { unmount } = render(
      <UploadZone onFilesDropped={mockOnFilesDropped} isUploading={false} />,
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "dragenter",
      expect.any(Function),
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "drop",
      expect.any(Function),
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "dragenter",
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "drop",
      expect.any(Function),
    );

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it("shows progress bar when uploadProgress is provided", () => {
    const { getByText, container } = render(
      <UploadZone
        onFilesDropped={mockOnFilesDropped}
        isUploading={true}
        uploadProgress={{ current: 5, total: 10 }}
      />,
    );

    expect(getByText(/Uploading 5 of 10 files \(50%\)/)).toBeInTheDocument();
    expect(container.querySelector(".upload-progress-bar")).toBeInTheDocument();
  });

  it("sets correct progress bar width based on percentage", () => {
    const { container } = render(
      <UploadZone
        onFilesDropped={mockOnFilesDropped}
        isUploading={true}
        uploadProgress={{ current: 3, total: 10 }}
      />,
    );

    const progressFill = container.querySelector(
      ".upload-progress-fill",
    ) as HTMLElement;
    expect(progressFill).toBeInTheDocument();
    expect(progressFill.style.width).toBe("30%");
  });

  it("shows spinner even when progress is displayed", () => {
    const { container } = render(
      <UploadZone
        onFilesDropped={mockOnFilesDropped}
        isUploading={true}
        uploadProgress={{ current: 2, total: 5 }}
      />,
    );

    expect(container.querySelector(".spinner")).toBeInTheDocument();
  });
});
