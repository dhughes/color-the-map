import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MapSelector } from "./MapSelector";
import type { MapData } from "../../types/map";

const mockMaps: MapData[] = [
  {
    id: 1,
    user_id: "user-1",
    name: "Default Map",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: 2,
    user_id: "user-1",
    name: "Second Map",
    created_at: "2025-01-02T00:00:00Z",
    updated_at: "2025-01-02T00:00:00Z",
  },
];

const defaultProps = {
  maps: mockMaps,
  currentMapId: 1,
  onSelectMap: vi.fn(),
  onCreateMap: vi.fn(),
  onRenameMap: vi.fn(),
  onDeleteMap: vi.fn(),
};

describe("MapSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normal state", () => {
    it("renders a select with all maps", () => {
      render(<MapSelector {...defaultProps} />);

      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();

      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(2);
      expect(options[0]).toHaveTextContent("Default Map");
      expect(options[1]).toHaveTextContent("Second Map");
    });

    it("selects the current map", () => {
      render(<MapSelector {...defaultProps} currentMapId={2} />);

      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("2");
    });

    it("calls onSelectMap when a different map is selected", async () => {
      const user = userEvent.setup();
      render(<MapSelector {...defaultProps} />);

      await user.selectOptions(screen.getByRole("combobox"), "2");

      expect(defaultProps.onSelectMap).toHaveBeenCalledWith(2);
    });

    it("renders create, rename, and delete buttons", () => {
      render(<MapSelector {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: "Create new map" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Rename map" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Delete map" }),
      ).toBeInTheDocument();
    });
  });

  describe("create mode", () => {
    it("shows input with placeholder when create button is clicked", async () => {
      const user = userEvent.setup();
      render(<MapSelector {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Create new map" }));

      expect(screen.getByPlaceholderText("New map name")).toBeInTheDocument();
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    it("calls onCreateMap with trimmed name on confirm", async () => {
      const user = userEvent.setup();
      render(<MapSelector {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Create new map" }));
      await user.type(
        screen.getByPlaceholderText("New map name"),
        "  My Map  ",
      );
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      expect(defaultProps.onCreateMap).toHaveBeenCalledWith("My Map");
    });

    it("calls onCreateMap on Enter key", async () => {
      const user = userEvent.setup();
      render(<MapSelector {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Create new map" }));
      await user.type(screen.getByPlaceholderText("New map name"), "New Map");
      await user.keyboard("{Enter}");

      expect(defaultProps.onCreateMap).toHaveBeenCalledWith("New Map");
    });

    it("does not call onCreateMap with empty name", async () => {
      const user = userEvent.setup();
      render(<MapSelector {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Create new map" }));
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      expect(defaultProps.onCreateMap).not.toHaveBeenCalled();
    });

    it("does not call onCreateMap with whitespace-only name", async () => {
      const user = userEvent.setup();
      render(<MapSelector {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Create new map" }));
      await user.type(screen.getByPlaceholderText("New map name"), "   ");
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      expect(defaultProps.onCreateMap).not.toHaveBeenCalled();
    });

    it("returns to normal state on cancel", async () => {
      const user = userEvent.setup();
      render(<MapSelector {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Create new map" }));
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("returns to normal state on Escape key", async () => {
      const user = userEvent.setup();
      render(<MapSelector {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Create new map" }));
      await user.keyboard("{Escape}");

      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });

  describe("rename mode", () => {
    it("shows input pre-filled with current map name", async () => {
      const user = userEvent.setup();
      render(<MapSelector {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Rename map" }));

      const input = screen.getByPlaceholderText(
        "Rename map",
      ) as HTMLInputElement;
      expect(input.value).toBe("Default Map");
    });

    it("calls onRenameMap with new name on confirm", async () => {
      const user = userEvent.setup();
      render(<MapSelector {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Rename map" }));
      const input = screen.getByPlaceholderText("Rename map");
      await user.clear(input);
      await user.type(input, "Renamed Map");
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      expect(defaultProps.onRenameMap).toHaveBeenCalledWith(1, "Renamed Map");
    });

    it("calls onRenameMap on Enter key", async () => {
      const user = userEvent.setup();
      render(<MapSelector {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Rename map" }));
      const input = screen.getByPlaceholderText("Rename map");
      await user.clear(input);
      await user.type(input, "New Name");
      await user.keyboard("{Enter}");

      expect(defaultProps.onRenameMap).toHaveBeenCalledWith(1, "New Name");
    });

    it("does not call onRenameMap when name is unchanged", async () => {
      const user = userEvent.setup();
      render(<MapSelector {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Rename map" }));
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      expect(defaultProps.onRenameMap).not.toHaveBeenCalled();
    });

    it("does not call onRenameMap with empty name", async () => {
      const user = userEvent.setup();
      render(<MapSelector {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Rename map" }));
      const input = screen.getByPlaceholderText("Rename map");
      await user.clear(input);
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      expect(defaultProps.onRenameMap).not.toHaveBeenCalled();
    });

    it("returns to normal state on cancel", async () => {
      const user = userEvent.setup();
      render(<MapSelector {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Rename map" }));
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });

  describe("delete", () => {
    it("shows confirmation dialog when delete is clicked", async () => {
      const user = userEvent.setup();
      render(<MapSelector {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Delete map" }));

      expect(
        screen.getByText('Delete "Default Map" and all its tracks?'),
      ).toBeInTheDocument();
    });

    it("calls onDeleteMap when confirmed", async () => {
      const user = userEvent.setup();
      render(<MapSelector {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Delete map" }));
      await user.click(screen.getByRole("button", { name: "Delete" }));

      expect(defaultProps.onDeleteMap).toHaveBeenCalledWith(1);
    });

    it("does not call onDeleteMap when cancelled", async () => {
      const user = userEvent.setup();
      render(<MapSelector {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Delete map" }));
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(defaultProps.onDeleteMap).not.toHaveBeenCalled();
    });

    it("disables delete button when only one map exists", () => {
      render(<MapSelector {...defaultProps} maps={[mockMaps[0]]} />);

      const deleteButton = screen.getByRole("button", { name: "Delete map" });
      expect(deleteButton).toBeDisabled();
    });

    it("does not open dialog when delete is disabled", async () => {
      const user = userEvent.setup();
      render(<MapSelector {...defaultProps} maps={[mockMaps[0]]} />);

      await user.click(screen.getByRole("button", { name: "Delete map" }));

      expect(
        screen.queryByText(/Delete ".*" and all its tracks\?/),
      ).not.toBeInTheDocument();
    });
  });

  describe("mode switching", () => {
    it("switches from create to rename mode", async () => {
      const user = userEvent.setup();
      render(<MapSelector {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Create new map" }));
      expect(screen.getByPlaceholderText("New map name")).toBeInTheDocument();

      fireEvent.keyDown(screen.getByPlaceholderText("New map name"), {
        key: "Escape",
      });

      await user.click(screen.getByRole("button", { name: "Rename map" }));
      expect(screen.getByPlaceholderText("Rename map")).toBeInTheDocument();
    });
  });
});
