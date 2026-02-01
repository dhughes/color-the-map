import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TrackList } from "./TrackList";

const mockTracks = [
  {
    id: 1,
    name: "Track 1",
    activity_type: "Cycling",
    activity_date: "2025-01-01T10:00:00Z",
    distance_meters: 5000,
    visible: true,
  },
  {
    id: 2,
    name: "Track 2",
    activity_type: "Running",
    activity_date: "2025-01-02T10:00:00Z",
    distance_meters: 3000,
    visible: false,
  },
];

vi.mock("../../api/client", () => ({
  listTracks: vi.fn(() => Promise.resolve(mockTracks)),
  updateTrack: vi.fn(() => Promise.resolve(mockTracks[0])),
}));

describe("TrackList", () => {
  const mockSelectedTrackIds = new Set<number>();
  const mockOnSelect = vi.fn();
  const mockOnSelectRange = vi.fn();
  const mockOnZoomToTrack = vi.fn();

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it("renders track list header", async () => {
    render(
      <TrackList
        tracks={mockTracks}
        selectedTrackIds={mockSelectedTrackIds}
        anchorTrackId={null}
        onSelect={mockOnSelect}
        onSelectRange={mockOnSelectRange}
        onZoomToTrack={mockOnZoomToTrack}
        lastSelectedTrackId={null}
        selectionSource={null}
      />,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByText("Tracks")).toBeInTheDocument();
  });

  it("displays track count", async () => {
    render(
      <TrackList
        tracks={mockTracks}
        selectedTrackIds={mockSelectedTrackIds}
        anchorTrackId={null}
        onSelect={mockOnSelect}
        onSelectRange={mockOnSelectRange}
        onZoomToTrack={mockOnZoomToTrack}
        lastSelectedTrackId={null}
        selectionSource={null}
      />,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByText("2 tracks")).toBeInTheDocument();
  });

  it("renders track items", async () => {
    render(
      <TrackList
        tracks={mockTracks}
        selectedTrackIds={mockSelectedTrackIds}
        anchorTrackId={null}
        onSelect={mockOnSelect}
        onSelectRange={mockOnSelectRange}
        onZoomToTrack={mockOnZoomToTrack}
        lastSelectedTrackId={null}
        selectionSource={null}
      />,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByText("Track 1")).toBeInTheDocument();
    expect(await screen.findByText("Track 2")).toBeInTheDocument();
  });

  it("shows selected count when tracks selected", async () => {
    const selectedIds = new Set([1, 2]);

    render(
      <TrackList
        tracks={mockTracks}
        selectedTrackIds={selectedIds}
        anchorTrackId={null}
        onSelect={mockOnSelect}
        onSelectRange={mockOnSelectRange}
        onZoomToTrack={mockOnZoomToTrack}
        lastSelectedTrackId={null}
        selectionSource={null}
      />,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByText("2 selected")).toBeInTheDocument();
  });

  describe("auto-scroll behavior", () => {
    let mockScrollIntoView: ReturnType<typeof vi.fn>;
    let queryClient: QueryClient;

    beforeEach(() => {
      mockScrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = mockScrollIntoView;

      queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      queryClient.setQueryData(["tracks"], mockTracks);
    });

    it("scrolls to track when selected from map", async () => {
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <TrackList
            tracks={mockTracks}
            selectedTrackIds={new Set()}
            anchorTrackId={null}
            onSelect={vi.fn()}
            onSelectRange={vi.fn()}
            onZoomToTrack={vi.fn()}
            lastSelectedTrackId={null}
            selectionSource={null}
          />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Track 1")).toBeInTheDocument();
      });

      rerender(
        <QueryClientProvider client={queryClient}>
          <TrackList
            tracks={mockTracks}
            selectedTrackIds={new Set([1])}
            anchorTrackId={1}
            onSelect={vi.fn()}
            onSelectRange={vi.fn()}
            onZoomToTrack={vi.fn()}
            lastSelectedTrackId={1}
            selectionSource="map"
          />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(mockScrollIntoView).toHaveBeenCalledWith({
          block: "center",
          behavior: "smooth",
        });
      });
    });

    it("does not scroll when selected from sidebar", async () => {
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <TrackList
            tracks={mockTracks}
            selectedTrackIds={new Set()}
            anchorTrackId={null}
            onSelect={vi.fn()}
            onSelectRange={vi.fn()}
            onZoomToTrack={vi.fn()}
            lastSelectedTrackId={null}
            selectionSource={null}
          />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Track 1")).toBeInTheDocument();
      });

      rerender(
        <QueryClientProvider client={queryClient}>
          <TrackList
            tracks={mockTracks}
            selectedTrackIds={new Set([1])}
            anchorTrackId={1}
            onSelect={vi.fn()}
            onSelectRange={vi.fn()}
            onZoomToTrack={vi.fn()}
            lastSelectedTrackId={1}
            selectionSource="sidebar"
          />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(mockScrollIntoView).not.toHaveBeenCalled();
      });
    });

    it("does not scroll when selectionSource is null", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TrackList
            tracks={mockTracks}
            selectedTrackIds={new Set([1])}
            anchorTrackId={1}
            onSelect={vi.fn()}
            onSelectRange={vi.fn()}
            onZoomToTrack={vi.fn()}
            lastSelectedTrackId={1}
            selectionSource={null}
          />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Track 1")).toBeInTheDocument();
      });

      expect(mockScrollIntoView).not.toHaveBeenCalled();
    });

    it("does not scroll when lastSelectedTrackId is null", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TrackList
            tracks={mockTracks}
            selectedTrackIds={new Set()}
            anchorTrackId={null}
            onSelect={vi.fn()}
            onSelectRange={vi.fn()}
            onZoomToTrack={vi.fn()}
            lastSelectedTrackId={null}
            selectionSource="map"
          />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Track 1")).toBeInTheDocument();
      });

      expect(mockScrollIntoView).not.toHaveBeenCalled();
    });
  });
});
