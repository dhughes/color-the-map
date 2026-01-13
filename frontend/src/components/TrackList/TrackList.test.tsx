import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
        selectedTrackIds={mockSelectedTrackIds}
        anchorTrackId={null}
        onSelect={mockOnSelect}
        onSelectRange={mockOnSelectRange}
        onZoomToTrack={mockOnZoomToTrack}
      />,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByText("Tracks")).toBeInTheDocument();
  });

  it("displays track count", async () => {
    render(
      <TrackList
        selectedTrackIds={mockSelectedTrackIds}
        anchorTrackId={null}
        onSelect={mockOnSelect}
        onSelectRange={mockOnSelectRange}
        onZoomToTrack={mockOnZoomToTrack}
      />,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByText("2 tracks")).toBeInTheDocument();
  });

  it("renders track items", async () => {
    render(
      <TrackList
        selectedTrackIds={mockSelectedTrackIds}
        anchorTrackId={null}
        onSelect={mockOnSelect}
        onSelectRange={mockOnSelectRange}
        onZoomToTrack={mockOnZoomToTrack}
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
        selectedTrackIds={selectedIds}
        anchorTrackId={null}
        onSelect={mockOnSelect}
        onSelectRange={mockOnSelectRange}
        onZoomToTrack={mockOnZoomToTrack}
      />,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByText("2 selected")).toBeInTheDocument();
  });
});
