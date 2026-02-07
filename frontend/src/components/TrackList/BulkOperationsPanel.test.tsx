import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BulkOperationsPanel } from "./BulkOperationsPanel";
import type { Track } from "../../types/track";

vi.mock("../../api/client", () => ({
  bulkUpdateTracks: vi.fn(() => Promise.resolve({ updated: 2 })),
}));

const createMockTrack = (overrides: Partial<Track> = {}): Track => ({
  id: 1,
  user_id: "user-1",
  hash: "abc123",
  name: "Test Track",
  filename: "test.gpx",
  creator: "Test App",
  activity_type: "Running",
  activity_date: "2024-03-15T08:00:00Z",
  uploaded_at: "2024-03-15T10:00:00Z",
  distance_meters: 5000,
  duration_seconds: 1800,
  avg_speed_ms: 2.78,
  max_speed_ms: 4.17,
  min_speed_ms: 1.39,
  elevation_gain_meters: 50,
  elevation_loss_meters: 45,
  bounds_min_lat: 35.9,
  bounds_max_lat: 36.0,
  bounds_min_lon: -79.1,
  bounds_max_lon: -79.0,
  visible: true,
  created_at: "2024-03-15T10:00:00Z",
  updated_at: "2024-03-15T10:00:00Z",
  ...overrides,
});

const mockTracks: Track[] = [
  createMockTrack({
    id: 1,
    name: "Morning Run",
    activity_date: "2024-03-15T08:00:00Z",
    distance_meters: 5000,
    duration_seconds: 1800,
    elevation_gain_meters: 50,
    elevation_loss_meters: 45,
  }),
  createMockTrack({
    id: 2,
    name: "Evening Walk",
    activity_date: "2024-03-20T18:00:00Z",
    distance_meters: 3000,
    duration_seconds: 2400,
    elevation_gain_meters: 30,
    elevation_loss_meters: 35,
  }),
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
};

describe("BulkOperationsPanel", () => {
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders combined statistics", () => {
    render(
      <BulkOperationsPanel
        tracks={mockTracks}
        mapId={1}
        allActivityTypes={["Running", "Walking"]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText("8.0 km")).toBeInTheDocument();
    expect(screen.getByText("1:10:00")).toBeInTheDocument();
    expect(screen.getAllByText("80 m")).toHaveLength(2);
  });

  it("renders date range for multiple dates", () => {
    render(
      <BulkOperationsPanel
        tracks={mockTracks}
        mapId={1}
        allActivityTypes={["Running", "Walking"]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText(/Mar 15, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Mar 20, 2024/)).toBeInTheDocument();
  });

  it("renders single date when all tracks have same date", () => {
    const sameDateTracks = [
      createMockTrack({ id: 1, activity_date: "2024-03-15T08:00:00Z" }),
      createMockTrack({ id: 2, activity_date: "2024-03-15T18:00:00Z" }),
    ];

    render(
      <BulkOperationsPanel
        tracks={sameDateTracks}
        mapId={1}
        allActivityTypes={[]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    const dateElement = screen.getByText("Mar 15, 2024");
    expect(dateElement).toBeInTheDocument();
    expect(screen.queryByText("–")).not.toBeInTheDocument();
  });

  it("renders activity type input with datalist", () => {
    render(
      <BulkOperationsPanel
        tracks={mockTracks}
        mapId={1}
        allActivityTypes={["Running", "Walking", "Cycling"]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    const datalist = document.getElementById("bulk-activity-types");
    expect(datalist).toBeInTheDocument();
    expect(datalist?.querySelectorAll("option")).toHaveLength(3);
  });

  it("calls bulkUpdateTracks on activity type blur when value entered", async () => {
    const { bulkUpdateTracks } = await import("../../api/client");

    render(
      <BulkOperationsPanel
        tracks={mockTracks}
        mapId={1}
        allActivityTypes={["Running", "Walking"]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    const activityInput = screen.getByLabelText("Activity Type");
    fireEvent.change(activityInput, { target: { value: "Hiking" } });
    fireEvent.blur(activityInput);

    await waitFor(() => {
      expect(bulkUpdateTracks).toHaveBeenCalledWith(1, [1, 2], {
        activity_type: "Hiking",
      });
    });
  });

  it("does not call bulkUpdateTracks when activity type is empty", async () => {
    const { bulkUpdateTracks } = await import("../../api/client");

    const mixedActivityTracks = [
      createMockTrack({ id: 1, activity_type: "Running" }),
      createMockTrack({ id: 2, activity_type: "Walking" }),
    ];

    render(
      <BulkOperationsPanel
        tracks={mixedActivityTracks}
        mapId={1}
        allActivityTypes={["Running", "Walking"]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    const activityInput = screen.getByLabelText("Activity Type");
    fireEvent.blur(activityInput);

    await waitFor(() => {
      expect(bulkUpdateTracks).not.toHaveBeenCalled();
    });
  });

  it("blurs input on Enter key press", () => {
    render(
      <BulkOperationsPanel
        tracks={mockTracks}
        mapId={1}
        allActivityTypes={["Running", "Walking"]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    const activityInput = screen.getByLabelText("Activity Type");
    activityInput.focus();
    expect(document.activeElement).toBe(activityInput);

    fireEvent.keyDown(activityInput, { key: "Enter" });

    expect(document.activeElement).not.toBe(activityInput);
  });

  it("renders delete button with track count", () => {
    render(
      <BulkOperationsPanel
        tracks={mockTracks}
        mapId={1}
        allActivityTypes={[]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText("Delete 2 Tracks")).toBeInTheDocument();
  });

  it("calls onDelete when delete button is clicked", () => {
    render(
      <BulkOperationsPanel
        tracks={mockTracks}
        mapId={1}
        allActivityTypes={[]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    fireEvent.click(screen.getByText("Delete 2 Tracks"));
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it("handles tracks with null optional fields", () => {
    const tracksWithNulls = [
      createMockTrack({
        id: 1,
        distance_meters: null,
        duration_seconds: null,
        elevation_gain_meters: null,
        elevation_loss_meters: null,
      }),
      createMockTrack({
        id: 2,
        distance_meters: null,
        duration_seconds: null,
        elevation_gain_meters: null,
        elevation_loss_meters: null,
      }),
    ];

    render(
      <BulkOperationsPanel
        tracks={tracksWithNulls}
        mapId={1}
        allActivityTypes={[]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.queryByText("km")).not.toBeInTheDocument();
    expect(screen.queryByText("Total Duration")).not.toBeInTheDocument();
  });

  it("handles mix of tracks with and without optional data", () => {
    const mixedTracks = [
      createMockTrack({
        id: 1,
        distance_meters: 5000,
        duration_seconds: 1800,
      }),
      createMockTrack({
        id: 2,
        distance_meters: null,
        duration_seconds: null,
      }),
    ];

    render(
      <BulkOperationsPanel
        tracks={mixedTracks}
        mapId={1}
        allActivityTypes={[]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText("5.0 km")).toBeInTheDocument();
    expect(screen.getByText("30:00")).toBeInTheDocument();
  });
});
