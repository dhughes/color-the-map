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

    expect(await screen.findByText("2 Tracks")).toBeInTheDocument();
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

    expect(await screen.findByText("2 Tracks Selected")).toBeInTheDocument();
  });

  describe("auto-scroll behavior", () => {
    let mockScrollIntoView: ReturnType<typeof vi.fn>;
    let queryClient: QueryClient;

    const mockItemNotVisible = () => {
      vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
        function (this: Element) {
          if (this.classList.contains("track-list-items")) {
            return {
              top: 0,
              bottom: 300,
              left: 0,
              right: 350,
              width: 350,
              height: 300,
            } as DOMRect;
          }
          return {
            top: 400,
            bottom: 450,
            left: 0,
            right: 350,
            width: 350,
            height: 50,
          } as DOMRect;
        },
      );
    };

    const mockItemVisible = () => {
      vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
        function (this: Element) {
          if (this.classList.contains("track-list-items")) {
            return {
              top: 0,
              bottom: 300,
              left: 0,
              right: 350,
              width: 350,
              height: 300,
            } as DOMRect;
          }
          return {
            top: 100,
            bottom: 150,
            left: 0,
            right: 350,
            width: 350,
            height: 50,
          } as DOMRect;
        },
      );
    };

    beforeEach(() => {
      mockScrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = mockScrollIntoView;

      queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      queryClient.setQueryData(["tracks"], mockTracks);
    });

    it("scrolls to track when selected from map and not visible", async () => {
      mockItemNotVisible();

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

    it("does not scroll when selected from map but already visible", async () => {
      mockItemVisible();

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
        expect(mockScrollIntoView).not.toHaveBeenCalled();
      });
    });

    it("scrolls when single track selected from sidebar and not visible", async () => {
      mockItemNotVisible();

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
        expect(mockScrollIntoView).toHaveBeenCalledWith({
          block: "center",
          behavior: "smooth",
        });
      });
    });

    it("does not scroll when single track selected from sidebar but already visible", async () => {
      mockItemVisible();

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

    it("does not scroll when multiple tracks selected from sidebar", async () => {
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
            selectedTrackIds={new Set([1, 2])}
            anchorTrackId={1}
            onSelect={vi.fn()}
            onSelectRange={vi.fn()}
            onZoomToTrack={vi.fn()}
            lastSelectedTrackId={2}
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
