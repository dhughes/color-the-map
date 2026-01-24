import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import * as apiClient from "./api/client";
import type { Track } from "./types/track";

vi.mock("./api/client");
vi.mock("./hooks/useViewportGeometries", () => ({
  useViewportGeometries: vi.fn(() => ({
    geometries: [],
    isLoading: false,
    loadingCount: 0,
    error: null,
    onViewportChange: vi.fn(),
    retryFetch: vi.fn(),
  })),
}));
vi.mock("./components/Map", () => ({
  Map: vi.fn(({ onMapReady }) => {
    const mockZoomToBounds = vi.fn();
    if (onMapReady) {
      onMapReady(mockZoomToBounds);
    }
    return <div data-testid="mock-map">Map</div>;
  }),
}));

describe("App - Zoom to Track Feature", () => {
  let queryClient: QueryClient;

  const mockTrackWithBounds: Track = {
    id: 1,
    hash: "abc123",
    name: "Track with Bounds",
    filename: "track1.gpx",
    activity_type: "Cycling",
    activity_type_inferred: "Cycling",
    activity_date: "2025-01-01T10:00:00Z",
    uploaded_at: "2025-01-01T10:05:00Z",
    distance_meters: 5000,
    duration_seconds: 1800,
    avg_speed_ms: 2.78,
    max_speed_ms: 5.0,
    min_speed_ms: 1.0,
    elevation_gain_meters: 100,
    elevation_loss_meters: 95,
    bounds_min_lat: 35.9,
    bounds_min_lon: -79.1,
    bounds_max_lat: 35.95,
    bounds_max_lon: -79.05,
    visible: true,
    description: null,
    created_at: "2025-01-01T10:05:00Z",
    updated_at: "2025-01-01T10:05:00Z",
  };

  const mockTrackWithNullBounds: Track = {
    ...mockTrackWithBounds,
    id: 2,
    name: "Track without Bounds",
    bounds_min_lat: null,
    bounds_min_lon: null,
    bounds_max_lat: null,
    bounds_max_lon: null,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    vi.mocked(apiClient.listTracks).mockResolvedValue([
      mockTrackWithBounds,
      mockTrackWithNullBounds,
    ]);
  });

  it("renders the app with track list", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Track with Bounds")).toBeInTheDocument();
    });
  });

  it("handles tracks with null bounds gracefully", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Track without Bounds")).toBeInTheDocument();
    });
  });
});
