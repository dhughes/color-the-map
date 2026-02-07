import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTrack } from "../../api/client";
import type { Track } from "../../types/track";
import {
  formatDateLong,
  formatDistance,
  formatDuration,
  formatSpeed,
  formatElevation,
} from "../../utils/formatters";

interface TrackDetailsPanelProps {
  track: Track;
  mapId: number | null;
  allActivityTypes: string[];
  onDelete: () => void;
}

export function TrackDetailsPanel({
  track,
  mapId,
  allActivityTypes,
  onDelete,
}: TrackDetailsPanelProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(track.name);
  const [activityType, setActivityType] = useState(track.activity_type || "");

  const updateMutation = useMutation({
    mutationFn: (updates: { name?: string; activity_type?: string }) =>
      mapId !== null
        ? updateTrack(mapId, track.id, updates)
        : Promise.reject(new Error("No map selected")),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["tracks", mapId] });
      const previousTracks = queryClient.getQueryData(["tracks", mapId]);
      queryClient.setQueryData(["tracks", mapId], (old: Track[] | undefined) =>
        old?.map((t) => (t.id === track.id ? { ...t, ...updates } : t)),
      );
      return { previousTracks };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTracks) {
        queryClient.setQueryData(["tracks", mapId], context.previousTracks);
      }
    },
  });

  const handleNameSave = () => {
    const trimmedName = name.trim();
    if (trimmedName && trimmedName !== track.name) {
      updateMutation.mutate({ name: trimmedName });
    } else if (!trimmedName) {
      setName(track.name);
    }
  };

  const handleActivityTypeSave = () => {
    const trimmedType = activityType.trim();
    if (trimmedType !== (track.activity_type || "")) {
      updateMutation.mutate({ activity_type: trimmedType || undefined });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const datalistId = useMemo(() => `activity-types-${track.id}`, [track.id]);

  return (
    <div className="track-details-panel">
      <div className="track-details-content">
        <div className="track-details-scrollable">
          <div className="track-details-stat track-details-stat-full">
            <span className="track-details-stat-label">Date</span>
            <span className="track-details-stat-value">
              {formatDateLong(track.activity_date)}
            </span>
          </div>

          <div className="track-details-field">
            <label htmlFor="track-name">Name</label>
            <input
              id="track-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleKeyDown}
              className="track-details-input"
            />
          </div>

          <div className="track-details-field">
            <label htmlFor="track-activity-type">Activity</label>
            <input
              id="track-activity-type"
              type="text"
              list={datalistId}
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              onBlur={handleActivityTypeSave}
              onKeyDown={handleKeyDown}
              placeholder="Unknown"
              className="track-details-input"
            />
            <datalist id={datalistId}>
              {allActivityTypes.map((type) => (
                <option key={type} value={type} />
              ))}
            </datalist>
          </div>

          <div className="track-details-divider" />

          <div className="track-details-stats">
            {formatDistance(track.distance_meters) && (
              <div className="track-details-stat">
                <span className="track-details-stat-label">Distance</span>
                <span className="track-details-stat-value">
                  {formatDistance(track.distance_meters)}
                </span>
              </div>
            )}

            {formatDuration(track.duration_seconds) && (
              <div className="track-details-stat">
                <span className="track-details-stat-label">Duration</span>
                <span className="track-details-stat-value">
                  {formatDuration(track.duration_seconds)}
                </span>
              </div>
            )}

            {formatSpeed(track.avg_speed_ms) && (
              <div className="track-details-stat">
                <span className="track-details-stat-label">Avg Speed</span>
                <span className="track-details-stat-value">
                  {formatSpeed(track.avg_speed_ms)}
                </span>
              </div>
            )}

            {formatSpeed(track.max_speed_ms) && (
              <div className="track-details-stat">
                <span className="track-details-stat-label">Max Speed</span>
                <span className="track-details-stat-value">
                  {formatSpeed(track.max_speed_ms)}
                </span>
              </div>
            )}

            {formatElevation(track.elevation_gain_meters) && (
              <div className="track-details-stat">
                <span className="track-details-stat-label">
                  <span className="track-details-stat-icon">↑</span> Gain
                </span>
                <span className="track-details-stat-value">
                  {formatElevation(track.elevation_gain_meters)}
                </span>
              </div>
            )}

            {formatElevation(track.elevation_loss_meters) && (
              <div className="track-details-stat">
                <span className="track-details-stat-label">
                  <span className="track-details-stat-icon">↓</span> Loss
                </span>
                <span className="track-details-stat-value">
                  {formatElevation(track.elevation_loss_meters)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="track-details-footer">
          <button
            className="track-details-delete-button"
            onClick={onDelete}
            type="button"
          >
            Delete Track
          </button>
        </div>
      </div>
    </div>
  );
}
