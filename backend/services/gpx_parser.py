import gpxpy
import numpy as np
from datetime import datetime
from typing import List, Dict, Tuple, Any
from ..models.gpx_data import ParsedGPXData


class GPXParser:
    @staticmethod
    def infer_activity_type(filename: str) -> str:
        filename_lower = filename.lower()

        ACTIVITY_PATTERNS = [
            (["mountain bike", "mountain biking"], "Cycling"),
            (["downhill skiing"], "Downhill Skiing"),
            (["walk", "walking"], "Walking"),
            (["run", "running"], "Running"),
            (["cycl", "bik", "mtb"], "Cycling"),
            (["swim", "swimming"], "Swimming"),
            (["multisport", "triathlon"], "Multisport"),
            (["other"], "Other"),
        ]

        for patterns, activity_type in ACTIVITY_PATTERNS:
            if any(pattern in filename_lower for pattern in patterns):
                return activity_type

        return "Unknown"

    def parse(self, content: bytes) -> ParsedGPXData:
        gpx = gpxpy.parse(content.decode("utf-8"))

        creator = gpx.creator

        coordinates = []
        elevations = []
        timestamps = []

        for track in gpx.tracks:
            for segment in track.segments:
                for point in segment.points:
                    coordinates.append((point.longitude, point.latitude))
                    if point.elevation:
                        elevations.append(point.elevation)
                    if point.time:
                        timestamps.append(point.time)

        if not coordinates:
            raise ValueError("No track points found in GPX file")

        distance = self._calculate_distance(coordinates)
        duration = self._calculate_duration(timestamps)
        speed_stats = self._calculate_speed(coordinates, timestamps)
        elevation_stats = self._calculate_elevation(elevations)
        bounds = self._calculate_bounds(coordinates)
        activity_date = timestamps[0] if timestamps else datetime.utcnow()

        return ParsedGPXData(
            coordinates=coordinates,
            distance_meters=distance,
            duration_seconds=duration,
            avg_speed_ms=speed_stats["avg"],
            max_speed_ms=speed_stats["max"],
            min_speed_ms=speed_stats["min"],
            segment_speeds=speed_stats["speeds"],
            elevation_gain_meters=elevation_stats["gain"],
            elevation_loss_meters=elevation_stats["loss"],
            bounds_min_lat=bounds["min_lat"],
            bounds_max_lat=bounds["max_lat"],
            bounds_min_lon=bounds["min_lon"],
            bounds_max_lon=bounds["max_lon"],
            activity_date=activity_date,
            creator=creator,
        )

    def _calculate_distance(self, coordinates: List[Tuple[float, float]]) -> float:
        return float(np.sum(self._calculate_segment_distances(coordinates)))

    def _calculate_duration(self, timestamps: List[datetime]) -> int:
        if len(timestamps) < 2:
            return 0
        return int((timestamps[-1] - timestamps[0]).total_seconds())

    def _calculate_speed(
        self, coordinates: List[Tuple[float, float]], timestamps: List[datetime]
    ) -> Dict[str, Any]:
        if len(coordinates) < 2 or len(timestamps) < 2:
            return {"avg": 0.0, "max": 0.0, "min": 0.0, "speeds": []}

        segment_distances = self._calculate_segment_distances(coordinates)
        segment_durations = np.array(
            [
                (timestamps[i + 1] - timestamps[i]).total_seconds()
                for i in range(len(timestamps) - 1)
            ]
        )

        valid_mask = segment_durations > 0
        if not np.any(valid_mask):
            return {"avg": 0.0, "max": 0.0, "min": 0.0, "speeds": []}

        segment_speeds = np.zeros_like(segment_distances)
        segment_speeds[valid_mask] = (
            segment_distances[valid_mask] / segment_durations[valid_mask]
        )

        total_distance = float(np.sum(segment_distances))
        total_duration = float(np.sum(segment_durations))
        avg_speed = total_distance / total_duration if total_duration > 0 else 0.0

        valid_speeds = segment_speeds[valid_mask]

        return {
            "avg": avg_speed,
            "max": float(np.max(valid_speeds)),
            "min": float(np.min(valid_speeds)),
            "speeds": segment_speeds.tolist(),
        }

    def _calculate_segment_distances(
        self, coordinates: List[Tuple[float, float]]
    ) -> np.ndarray:
        if len(coordinates) < 2:
            return np.array([])

        coords_array = np.array(coordinates)
        lons = np.radians(coords_array[:, 0])
        lats = np.radians(coords_array[:, 1])

        dlons = np.diff(lons)
        dlats = np.diff(lats)

        lat1 = lats[:-1]
        lat2 = lats[1:]

        a = (
            np.sin(dlats / 2) ** 2
            + np.cos(lat1) * np.cos(lat2) * np.sin(dlons / 2) ** 2
        )
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))

        R = 6371000
        return R * c

    def _calculate_elevation(self, elevations: List[float]) -> Dict[str, float]:
        if len(elevations) < 2:
            return {"gain": 0.0, "loss": 0.0}

        elev_array = np.array(elevations)
        diffs = np.diff(elev_array)

        gain = float(np.sum(diffs[diffs > 0]))
        loss = float(np.sum(np.abs(diffs[diffs < 0])))

        return {"gain": gain, "loss": loss}

    def _calculate_bounds(
        self, coordinates: List[Tuple[float, float]]
    ) -> Dict[str, float]:
        coords_array = np.array(coordinates)

        return {
            "min_lat": float(np.min(coords_array[:, 1])),
            "max_lat": float(np.max(coords_array[:, 1])),
            "min_lon": float(np.min(coords_array[:, 0])),
            "max_lon": float(np.max(coords_array[:, 0])),
        }
