import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SelectionPanel } from "./SelectionPanel";
import type { Track } from "../../types/track";

const createTrack = (overrides: Partial<Track> = {}): Track => ({
  id: 1,
  user_id: "test-user-id",
  hash: "abc123",
  name: "Test Track",
  filename: "test-track.gpx",
  creator: null,
  activity_type: "Cycling",
  activity_date: "2025-01-15T10:00:00Z",
  uploaded_at: "2025-01-15T10:00:00Z",
  distance_meters: 5000,
  duration_seconds: 1800,
  avg_speed_ms: 2.78,
  max_speed_ms: 5.0,
  min_speed_ms: 1.0,
  elevation_gain_meters: 100,
  elevation_loss_meters: 80,
  bounds_min_lat: 35.9,
  bounds_max_lat: 35.92,
  bounds_min_lon: -79.06,
  bounds_max_lon: -79.05,
  visible: true,
  created_at: "2025-01-15T10:00:00Z",
  updated_at: "2025-01-15T10:00:00Z",
  ...overrides,
});

vi.mock("../../api/client", () => ({
  updateTrack: vi.fn(() => Promise.resolve({})),
  bulkUpdateTracks: vi.fn(() => Promise.resolve({})),
}));

describe("SelectionPanel", () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  describe("header text", () => {
    it("displays total track count when no tracks are selected", () => {
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByText("6 Tracks")).toBeInTheDocument();
    });

    it("displays singular form for one total track with no selection", () => {
      render(
        <SelectionPanel
          totalTracks={1}
          selectedTracks={[]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByText("1 Track")).toBeInTheDocument();
    });

    it("displays '1 Track Selected' when one track is selected", () => {
      const track = createTrack();
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[track]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByText("1 Track Selected")).toBeInTheDocument();
    });

    it("displays 'N Tracks Selected' when multiple tracks are selected", () => {
      const tracks = [
        createTrack({ id: 1 }),
        createTrack({ id: 2 }),
        createTrack({ id: 3 }),
      ];
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={tracks}
          allActivityTypes={[]}
          onDelete={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByText("3 Tracks Selected")).toBeInTheDocument();
    });
  });

  describe("content rendering", () => {
    it("renders no content below header when no tracks are selected", () => {
      const { container } = render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByText("6 Tracks")).toBeInTheDocument();
      expect(
        container.querySelector(".track-details-panel"),
      ).not.toBeInTheDocument();
    });

    it("renders TrackDetailsPanel content when one track is selected", () => {
      const track = createTrack({ name: "My Track" });
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[track]}
          allActivityTypes={["Cycling", "Running"]}
          onDelete={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByDisplayValue("My Track")).toBeInTheDocument();
    });

    it("renders BulkOperationsPanel content when multiple tracks are selected", () => {
      const tracks = [
        createTrack({ id: 1, activity_date: "2025-01-10T10:00:00Z" }),
        createTrack({ id: 2, activity_date: "2025-01-15T10:00:00Z" }),
      ];
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={tracks}
          allActivityTypes={["Cycling"]}
          onDelete={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByText("Date Range")).toBeInTheDocument();
    });
  });

  describe("delete functionality", () => {
    it("calls onDelete when single track delete button is clicked", async () => {
      const onDelete = vi.fn();
      const track = createTrack();
      const user = userEvent.setup();

      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[track]}
          allActivityTypes={[]}
          onDelete={onDelete}
        />,
        { wrapper: createWrapper() },
      );

      await user.click(screen.getByRole("button", { name: /delete track/i }));
      expect(onDelete).toHaveBeenCalled();
    });

    it("calls onDelete when bulk delete button is clicked", async () => {
      const onDelete = vi.fn();
      const tracks = [createTrack({ id: 1 }), createTrack({ id: 2 })];
      const user = userEvent.setup();

      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={tracks}
          allActivityTypes={[]}
          onDelete={onDelete}
        />,
        { wrapper: createWrapper() },
      );

      await user.click(
        screen.getByRole("button", { name: /delete 2 tracks/i }),
      );
      expect(onDelete).toHaveBeenCalled();
    });
  });

  describe("speed coloring controls", () => {
    it("shows speed coloring toggle button", () => {
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          speedColorEnabled={false}
          onToggleSpeedColor={vi.fn()}
          speedColorRelative="each"
          onToggleSpeedColorRelative={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(
        screen.getByRole("button", { name: /speed coloring/i }),
      ).toBeInTheDocument();
    });

    it("calls onToggleSpeedColor when speed button is clicked", async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup();

      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          speedColorEnabled={false}
          onToggleSpeedColor={onToggle}
          speedColorRelative="each"
          onToggleSpeedColorRelative={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      await user.click(screen.getByRole("button", { name: /speed coloring/i }));
      expect(onToggle).toHaveBeenCalled();
    });

    it("shows active style when speed coloring is enabled", () => {
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          speedColorEnabled={true}
          onToggleSpeedColor={vi.fn()}
          speedColorRelative="each"
          onToggleSpeedColorRelative={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      const button = screen.getByRole("button", { name: /speed coloring/i });
      expect(button.className).toContain("active");
    });

    it("shows relative mode button", () => {
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          speedColorEnabled={false}
          onToggleSpeedColor={vi.fn()}
          speedColorRelative="each"
          onToggleSpeedColorRelative={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(
        screen.getByRole("button", { name: /compare/i }),
      ).toBeInTheDocument();
    });

    it("disables relative mode button when speed coloring is off", () => {
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          speedColorEnabled={false}
          onToggleSpeedColor={vi.fn()}
          speedColorRelative="each"
          onToggleSpeedColorRelative={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      const button = screen.getByRole("button", { name: /compare/i });
      expect(button).toBeDisabled();
    });

    it("enables relative mode button when speed coloring is on", () => {
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          speedColorEnabled={true}
          onToggleSpeedColor={vi.fn()}
          speedColorRelative="each"
          onToggleSpeedColorRelative={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      const button = screen.getByRole("button", { name: /compare/i });
      expect(button).not.toBeDisabled();
    });

    it("calls onToggleSpeedColorRelative when relative mode button is clicked", async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup();

      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          speedColorEnabled={true}
          onToggleSpeedColor={vi.fn()}
          speedColorRelative="each"
          onToggleSpeedColorRelative={onToggle}
        />,
        { wrapper: createWrapper() },
      );

      await user.click(screen.getByRole("button", { name: /compare/i }));
      expect(onToggle).toHaveBeenCalled();
    });

    it("shows active style on relative mode button when set to all", () => {
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          speedColorEnabled={true}
          onToggleSpeedColor={vi.fn()}
          speedColorRelative="all"
          onToggleSpeedColorRelative={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      const button = screen.getByRole("button", { name: /compare/i });
      expect(button.className).toContain("active");
    });
  });

  describe("visibility toggle", () => {
    it("shows visibility button when one track is selected and callback provided", () => {
      const track = createTrack({ visible: true });
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[track]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          selectedTracksVisibility="all"
          onToggleSelectedTracksVisibility={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(
        screen.getByRole("button", { name: /hide selected tracks/i }),
      ).toBeInTheDocument();
    });

    it("shows visibility button when multiple tracks are selected", () => {
      const tracks = [
        createTrack({ id: 1, visible: true }),
        createTrack({ id: 2, visible: true }),
      ];
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={tracks}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          selectedTracksVisibility="all"
          onToggleSelectedTracksVisibility={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(
        screen.getByRole("button", { name: /hide selected tracks/i }),
      ).toBeInTheDocument();
    });

    it("does not show visibility button when no tracks are selected", () => {
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          selectedTracksVisibility="all"
          onToggleSelectedTracksVisibility={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(
        screen.queryByRole("button", { name: /hide selected tracks/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /show selected tracks/i }),
      ).not.toBeInTheDocument();
    });

    it("does not show visibility button when callback is not provided", () => {
      const track = createTrack({ visible: true });
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[track]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(
        screen.queryByRole("button", { name: /hide selected tracks/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /show selected tracks/i }),
      ).not.toBeInTheDocument();
    });

    it("shows 'Hide selected tracks' label when all tracks are visible", () => {
      const track = createTrack({ visible: true });
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[track]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          selectedTracksVisibility="all"
          onToggleSelectedTracksVisibility={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      const button = screen.getByRole("button", {
        name: /hide selected tracks/i,
      });
      expect(button).toBeInTheDocument();
    });

    it("shows 'Show selected tracks' label when all tracks are hidden", () => {
      const track = createTrack({ visible: false });
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[track]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          selectedTracksVisibility="none"
          onToggleSelectedTracksVisibility={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      const button = screen.getByRole("button", {
        name: /show selected tracks/i,
      });
      expect(button).toBeInTheDocument();
    });

    it("shows 'Show selected tracks' label when visibility is mixed", () => {
      const tracks = [
        createTrack({ id: 1, visible: true }),
        createTrack({ id: 2, visible: false }),
      ];
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={tracks}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          selectedTracksVisibility="mixed"
          onToggleSelectedTracksVisibility={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      const button = screen.getByRole("button", {
        name: /show selected tracks/i,
      });
      expect(button).toBeInTheDocument();
    });

    it("shows asterisk indicator when visibility is mixed", () => {
      const tracks = [
        createTrack({ id: 1, visible: true }),
        createTrack({ id: 2, visible: false }),
      ];
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={tracks}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          selectedTracksVisibility="mixed"
          onToggleSelectedTracksVisibility={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("does not show asterisk indicator when all visible", () => {
      const track = createTrack({ visible: true });
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[track]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          selectedTracksVisibility="all"
          onToggleSelectedTracksVisibility={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(screen.queryByText("*")).not.toBeInTheDocument();
    });

    it("does not show asterisk indicator when all hidden", () => {
      const track = createTrack({ visible: false });
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[track]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          selectedTracksVisibility="none"
          onToggleSelectedTracksVisibility={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(screen.queryByText("*")).not.toBeInTheDocument();
    });

    it("calls onToggleSelectedTracksVisibility when visibility button is clicked", async () => {
      const onToggle = vi.fn();
      const track = createTrack({ visible: true });
      const user = userEvent.setup();

      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[track]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          selectedTracksVisibility="all"
          onToggleSelectedTracksVisibility={onToggle}
        />,
        { wrapper: createWrapper() },
      );

      await user.click(
        screen.getByRole("button", { name: /hide selected tracks/i }),
      );
      expect(onToggle).toHaveBeenCalled();
    });
  });

  describe("hide unselected tracks", () => {
    it("shows hide unselected button when tracks are selected and callback provided", () => {
      const track = createTrack();
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[track]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          hasVisibleUnselectedTracks={true}
          onHideUnselectedTracks={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(
        screen.getByRole("button", { name: /hide unselected tracks/i }),
      ).toBeInTheDocument();
    });

    it("does not show hide unselected button when no tracks are selected", () => {
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          hasVisibleUnselectedTracks={true}
          onHideUnselectedTracks={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(
        screen.queryByRole("button", { name: /hide unselected tracks/i }),
      ).not.toBeInTheDocument();
    });

    it("does not show hide unselected button when callback is not provided", () => {
      const track = createTrack();
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[track]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(
        screen.queryByRole("button", { name: /hide unselected tracks/i }),
      ).not.toBeInTheDocument();
    });

    it("disables button when no visible unselected tracks exist", () => {
      const track = createTrack();
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[track]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          hasVisibleUnselectedTracks={false}
          onHideUnselectedTracks={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      const button = screen.getByRole("button", {
        name: /hide unselected tracks/i,
      });
      expect(button).toBeDisabled();
    });

    it("enables button when visible unselected tracks exist", () => {
      const track = createTrack();
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[track]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          hasVisibleUnselectedTracks={true}
          onHideUnselectedTracks={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      const button = screen.getByRole("button", {
        name: /hide unselected tracks/i,
      });
      expect(button).not.toBeDisabled();
    });

    it("calls onHideUnselectedTracks when button is clicked", async () => {
      const onHide = vi.fn();
      const track = createTrack();
      const user = userEvent.setup();

      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[track]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          hasVisibleUnselectedTracks={true}
          onHideUnselectedTracks={onHide}
        />,
        { wrapper: createWrapper() },
      );

      await user.click(
        screen.getByRole("button", { name: /hide unselected tracks/i }),
      );
      expect(onHide).toHaveBeenCalled();
    });

    it("shows disabled style when no visible unselected tracks", () => {
      const track = createTrack();
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[track]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          hasVisibleUnselectedTracks={false}
          onHideUnselectedTracks={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      const button = screen.getByRole("button", {
        name: /hide unselected tracks/i,
      });
      expect(button.className).toContain("disabled");
    });
  });

  describe("zoom to selected tracks", () => {
    it("shows zoom button when one track is selected", () => {
      const track = createTrack();
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[track]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          onZoomToSelectedTracks={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(
        screen.getByRole("button", { name: /zoom to selected tracks/i }),
      ).toBeInTheDocument();
    });

    it("shows zoom button when multiple tracks are selected", () => {
      const tracks = [createTrack({ id: 1 }), createTrack({ id: 2 })];
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={tracks}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          onZoomToSelectedTracks={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(
        screen.getByRole("button", { name: /zoom to selected tracks/i }),
      ).toBeInTheDocument();
    });

    it("does not show zoom button when no tracks are selected", () => {
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          onZoomToSelectedTracks={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(
        screen.queryByRole("button", { name: /zoom to selected tracks/i }),
      ).not.toBeInTheDocument();
    });

    it("does not show zoom button when callback is not provided", () => {
      const track = createTrack();
      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[track]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
        />,
        { wrapper: createWrapper() },
      );

      expect(
        screen.queryByRole("button", { name: /zoom to selected tracks/i }),
      ).not.toBeInTheDocument();
    });

    it("calls onZoomToSelectedTracks when zoom button is clicked", async () => {
      const onZoomToSelectedTracks = vi.fn();
      const track = createTrack();
      const user = userEvent.setup();

      render(
        <SelectionPanel
          totalTracks={6}
          selectedTracks={[track]}
          allActivityTypes={[]}
          onDelete={vi.fn()}
          onZoomToSelectedTracks={onZoomToSelectedTracks}
        />,
        { wrapper: createWrapper() },
      );

      await user.click(
        screen.getByRole("button", { name: /zoom to selected tracks/i }),
      );
      expect(onZoomToSelectedTracks).toHaveBeenCalled();
    });
  });
});
