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
});
