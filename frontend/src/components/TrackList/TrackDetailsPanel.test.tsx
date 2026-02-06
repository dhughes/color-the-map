import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TrackDetailsPanel } from "./TrackDetailsPanel";
import type { Track } from "../../types/track";

vi.mock("../../api/client", () => ({
  updateTrack: vi.fn(() => Promise.resolve({})),
}));

const mockTrack: Track = {
  id: 1,
  user_id: "user-1",
  hash: "abc123",
  name: "Morning Run",
  filename: "morning-run.gpx",
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
};

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

describe("TrackDetailsPanel", () => {
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders track name in editable input", () => {
    render(
      <TrackDetailsPanel
        track={mockTrack}
        allActivityTypes={["Running"]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    expect(nameInput.value).toBe("Morning Run");
  });

  it("renders activity type in editable input", () => {
    render(
      <TrackDetailsPanel
        track={mockTrack}
        allActivityTypes={["Running"]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    const activityInput = screen.getByLabelText("Activity") as HTMLInputElement;
    expect(activityInput.value).toBe("Running");
  });

  it("renders track metadata", () => {
    render(
      <TrackDetailsPanel
        track={mockTrack}
        allActivityTypes={["Running"]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText("5.0 km")).toBeInTheDocument();
    expect(screen.getByText("30:00")).toBeInTheDocument();
    expect(screen.getByText("10.0 km/h")).toBeInTheDocument();
    expect(screen.getByText("50 m")).toBeInTheDocument();
    expect(screen.getByText("45 m")).toBeInTheDocument();
  });

  it("allows editing the name", () => {
    render(
      <TrackDetailsPanel
        track={mockTrack}
        allActivityTypes={["Running"]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Evening Walk" } });
    expect(nameInput.value).toBe("Evening Walk");
  });

  it("calls updateTrack on name blur when value changed", async () => {
    const { updateTrack } = await import("../../api/client");

    render(
      <TrackDetailsPanel
        track={mockTrack}
        allActivityTypes={["Running"]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    const nameInput = screen.getByLabelText("Name");
    fireEvent.change(nameInput, { target: { value: "Evening Walk" } });
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(updateTrack).toHaveBeenCalledWith(1, { name: "Evening Walk" });
    });
  });

  it("does not call updateTrack when name is unchanged", async () => {
    const { updateTrack } = await import("../../api/client");

    render(
      <TrackDetailsPanel
        track={mockTrack}
        allActivityTypes={["Running"]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    const nameInput = screen.getByLabelText("Name");
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(updateTrack).not.toHaveBeenCalled();
    });
  });

  it("calls updateTrack on activity type blur when value changed", async () => {
    const { updateTrack } = await import("../../api/client");

    render(
      <TrackDetailsPanel
        track={mockTrack}
        allActivityTypes={["Running"]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    const activityInput = screen.getByLabelText("Activity");
    fireEvent.change(activityInput, { target: { value: "Walking" } });
    fireEvent.blur(activityInput);

    await waitFor(() => {
      expect(updateTrack).toHaveBeenCalledWith(1, { activity_type: "Walking" });
    });
  });

  it("renders datalist with activity type suggestions", () => {
    render(
      <TrackDetailsPanel
        track={mockTrack}
        allActivityTypes={["Running", "Walking", "Cycling"]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    const datalist = document.getElementById(`activity-types-${mockTrack.id}`);
    expect(datalist).toBeInTheDocument();
    expect(datalist?.querySelectorAll("option")).toHaveLength(3);
  });

  it("handles track with null optional fields", () => {
    const trackWithNulls: Track = {
      ...mockTrack,
      distance_meters: null,
      duration_seconds: null,
      avg_speed_ms: null,
      max_speed_ms: null,
      min_speed_ms: null,
      elevation_gain_meters: null,
      elevation_loss_meters: null,
      activity_type: null,
    };

    render(
      <TrackDetailsPanel
        track={trackWithNulls}
        allActivityTypes={[]}
        onDelete={mockOnDelete}
      />,
      {
        wrapper: createWrapper(),
      },
    );

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.queryByText("km")).not.toBeInTheDocument();
  });

  it("resets empty name to original on blur", async () => {
    const { updateTrack } = await import("../../api/client");

    render(
      <TrackDetailsPanel
        track={mockTrack}
        allActivityTypes={["Running"]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "" } });
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(nameInput.value).toBe("Morning Run");
      expect(updateTrack).not.toHaveBeenCalled();
    });
  });

  it("blurs name input on Enter key press", () => {
    render(
      <TrackDetailsPanel
        track={mockTrack}
        allActivityTypes={["Running"]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    const nameInput = screen.getByLabelText("Name");
    nameInput.focus();
    expect(document.activeElement).toBe(nameInput);

    fireEvent.keyDown(nameInput, { key: "Enter" });

    expect(document.activeElement).not.toBe(nameInput);
  });

  it("blurs activity type input on Enter key press", () => {
    render(
      <TrackDetailsPanel
        track={mockTrack}
        allActivityTypes={["Running"]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    const activityInput = screen.getByLabelText("Activity");
    activityInput.focus();
    expect(document.activeElement).toBe(activityInput);

    fireEvent.keyDown(activityInput, { key: "Enter" });

    expect(document.activeElement).not.toBe(activityInput);
  });

  it("renders delete button", () => {
    render(
      <TrackDetailsPanel
        track={mockTrack}
        allActivityTypes={["Running"]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    const deleteButton = screen.getByRole("button", { name: /delete track/i });
    expect(deleteButton).toBeInTheDocument();
  });

  it("calls onDelete when delete button clicked", () => {
    render(
      <TrackDetailsPanel
        track={mockTrack}
        allActivityTypes={["Running"]}
        onDelete={mockOnDelete}
      />,
      { wrapper: createWrapper() },
    );

    const deleteButton = screen.getByRole("button", { name: /delete track/i });
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });
});
