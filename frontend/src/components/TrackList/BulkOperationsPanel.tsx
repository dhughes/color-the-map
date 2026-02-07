import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkUpdateTracks } from "../../api/client";
import type { Track } from "../../types/track";
import {
  formatDateShort,
  formatDistance,
  formatDuration,
  formatElevation,
} from "../../utils/formatters";

interface BulkOperationsPanelProps {
  tracks: Track[];
  mapId: number | null;
  allActivityTypes: string[];
  onDelete: () => void;
}

function sumOptional(values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => v != null && v > 0);
  return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) : null;
}

export function BulkOperationsPanel({
  tracks,
  mapId,
  allActivityTypes,
  onDelete,
}: BulkOperationsPanelProps) {
  const queryClient = useQueryClient();

  const commonActivityType = useMemo(() => {
    const types = tracks.map((t) => t.activity_type || "");
    const firstType = types[0];
    return types.every((t) => t === firstType) ? firstType : "";
  }, [tracks]);

  const [activityType, setActivityType] = useState(commonActivityType);

  useEffect(() => {
    setActivityType(commonActivityType);
  }, [commonActivityType]);

  const trackIds = useMemo(() => tracks.map((t) => t.id), [tracks]);

  const updateMutation = useMutation({
    mutationFn: (updates: { activity_type?: string }) =>
      mapId !== null
        ? bulkUpdateTracks(mapId, trackIds, updates)
        : Promise.reject(new Error("No map selected")),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["tracks", mapId] });
      const previousTracks = queryClient.getQueryData(["tracks", mapId]);
      queryClient.setQueryData(["tracks", mapId], (old: Track[] | undefined) =>
        old?.map((t) => (trackIds.includes(t.id) ? { ...t, ...updates } : t)),
      );
      return { previousTracks };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTracks) {
        queryClient.setQueryData(["tracks", mapId], context.previousTracks);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracks", mapId] });
    },
  });

  const handleActivityTypeSave = () => {
    const trimmedType = activityType.trim();
    if (trimmedType) {
      updateMutation.mutate({ activity_type: trimmedType });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const totalDistance = sumOptional(tracks.map((t) => t.distance_meters));
  const totalDuration = sumOptional(tracks.map((t) => t.duration_seconds));
  const totalElevationGain = sumOptional(
    tracks.map((t) => t.elevation_gain_meters),
  );
  const totalElevationLoss = sumOptional(
    tracks.map((t) => t.elevation_loss_meters),
  );

  const dateRange = useMemo(() => {
    if (tracks.length === 0) return "";
    const dates = tracks.map((t) => new Date(t.activity_date).getTime());
    const minDate = new Date(Math.min(...dates)).toISOString();
    const maxDate = new Date(Math.max(...dates)).toISOString();
    return formatDateShort(minDate) === formatDateShort(maxDate)
      ? formatDateShort(minDate)
      : `${formatDateShort(minDate)} – ${formatDateShort(maxDate)}`;
  }, [tracks]);

  const datalistId = "bulk-activity-types";

  return (
    <div className="track-details-panel">
      <div className="track-details-content">
        <div className="track-details-scrollable">
          <div className="track-details-stat track-details-stat-full">
            <span className="track-details-stat-label">Date Range</span>
            <span className="track-details-stat-value">{dateRange}</span>
          </div>

          <div className="track-details-field">
            <label htmlFor="bulk-activity-type">Activity Type</label>
            <input
              id="bulk-activity-type"
              type="text"
              list={datalistId}
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              onBlur={handleActivityTypeSave}
              onKeyDown={handleKeyDown}
              placeholder="Change activity type..."
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
            {formatDistance(totalDistance) && (
              <div className="track-details-stat">
                <span className="track-details-stat-label">Total Distance</span>
                <span className="track-details-stat-value">
                  {formatDistance(totalDistance)}
                </span>
              </div>
            )}

            {formatDuration(totalDuration) && (
              <div className="track-details-stat">
                <span className="track-details-stat-label">Total Duration</span>
                <span className="track-details-stat-value">
                  {formatDuration(totalDuration)}
                </span>
              </div>
            )}

            {formatElevation(totalElevationGain) && (
              <div className="track-details-stat">
                <span className="track-details-stat-label">
                  <span className="track-details-stat-icon">↑</span> Total Gain
                </span>
                <span className="track-details-stat-value">
                  {formatElevation(totalElevationGain)}
                </span>
              </div>
            )}

            {formatElevation(totalElevationLoss) && (
              <div className="track-details-stat">
                <span className="track-details-stat-label">
                  <span className="track-details-stat-icon">↓</span> Total Loss
                </span>
                <span className="track-details-stat-value">
                  {formatElevation(totalElevationLoss)}
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
            Delete {tracks.length} Tracks
          </button>
        </div>
      </div>
    </div>
  );
}
