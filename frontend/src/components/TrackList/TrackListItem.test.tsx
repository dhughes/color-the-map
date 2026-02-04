import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TrackListItem } from "./TrackListItem";
import type { Track } from "../../types/track";

describe("TrackListItem", () => {
  const mockTrack: Track = {
    id: 1,
    user_id: "test-user-123",
    hash: "abc123",
    name: "Test Track",
    filename: "test.gpx",
    creator: null,
    activity_type: "Cycling",
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

  const mockOnToggleVisibility = vi.fn();
  const mockOnSelect = vi.fn();
  const mockOnDoubleClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders track name", () => {
    render(
      <TrackListItem
        track={mockTrack}
        isSelected={false}
        onSelect={mockOnSelect}
        onToggleVisibility={mockOnToggleVisibility}
        onDoubleClick={mockOnDoubleClick}
      />,
    );

    expect(screen.getByText("Test Track")).toBeInTheDocument();
  });

  it("renders activity type", () => {
    render(
      <TrackListItem
        track={mockTrack}
        isSelected={false}
        onSelect={mockOnSelect}
        onToggleVisibility={mockOnToggleVisibility}
        onDoubleClick={mockOnDoubleClick}
      />,
    );

    expect(screen.getByText("Cycling")).toBeInTheDocument();
  });

  it("renders distance", () => {
    render(
      <TrackListItem
        track={mockTrack}
        isSelected={false}
        onSelect={mockOnSelect}
        onToggleVisibility={mockOnToggleVisibility}
        onDoubleClick={mockOnDoubleClick}
      />,
    );

    expect(screen.getByText("5.0 km")).toBeInTheDocument();
  });

  it("calls onToggleVisibility when eye icon clicked", () => {
    render(
      <TrackListItem
        track={mockTrack}
        isSelected={false}
        onSelect={mockOnSelect}
        onToggleVisibility={mockOnToggleVisibility}
        onDoubleClick={mockOnDoubleClick}
      />,
    );

    const button = screen.getByRole("button", { name: /hide track/i });
    fireEvent.click(button);

    expect(mockOnToggleVisibility).toHaveBeenCalledTimes(1);
  });

  it("renders selected state with CSS class", () => {
    const { container } = render(
      <TrackListItem
        track={mockTrack}
        isSelected={true}
        onSelect={mockOnSelect}
        onToggleVisibility={mockOnToggleVisibility}
        onDoubleClick={mockOnDoubleClick}
      />,
    );

    expect(container.querySelector(".selected")).toBeInTheDocument();
  });

  it("calls onDoubleClick when track item is double-clicked", () => {
    render(
      <TrackListItem
        track={mockTrack}
        isSelected={false}
        onSelect={mockOnSelect}
        onToggleVisibility={mockOnToggleVisibility}
        onDoubleClick={mockOnDoubleClick}
      />,
    );

    const trackItem = screen.getByText("Test Track").closest(".track-item");
    fireEvent.doubleClick(trackItem!);

    expect(mockOnDoubleClick).toHaveBeenCalledTimes(1);
  });

  it("calls onSelect when track item is single-clicked", () => {
    render(
      <TrackListItem
        track={mockTrack}
        isSelected={false}
        onSelect={mockOnSelect}
        onToggleVisibility={mockOnToggleVisibility}
        onDoubleClick={mockOnDoubleClick}
      />,
    );

    const trackItem = screen.getByText("Test Track").closest(".track-item");
    fireEvent.click(trackItem!);

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });

  it("displays 'Unknown' when activity_type is null", () => {
    const trackWithoutType = { ...mockTrack, activity_type: null };

    render(
      <TrackListItem
        track={trackWithoutType}
        isSelected={false}
        onSelect={mockOnSelect}
        onToggleVisibility={mockOnToggleVisibility}
        onDoubleClick={mockOnDoubleClick}
      />,
    );

    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });
});
