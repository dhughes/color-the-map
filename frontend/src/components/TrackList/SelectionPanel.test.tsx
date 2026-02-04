import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SelectionPanel } from "./SelectionPanel";
import type { Track } from "../../types/track";

const createTrack = (overrides: Partial<Track> = {}): Track => ({
  id: 1,
  name: "Test Track",
  activity_type: "Cycling",
  activity_date: "2025-01-15T10:00:00Z",
  distance_meters: 5000,
  duration_seconds: 1800,
  avg_speed_ms: 2.78,
  max_speed_ms: 5.0,
  elevation_gain_meters: 100,
  elevation_loss_meters: 80,
  visible: true,
  hash: "abc123",
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
          selectedTrack={null}
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
          selectedTrack={null}
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
          selectedTrack={track}
          selectedTracks={[]}
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
          selectedTrack={null}
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
          selectedTrack={null}
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
          selectedTrack={track}
          selectedTracks={[]}
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
          selectedTrack={null}
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
          selectedTrack={track}
          selectedTracks={[]}
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
          selectedTrack={null}
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
});
