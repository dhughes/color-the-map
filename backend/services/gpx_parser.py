import gpxpy
import numpy as np
from datetime import datetime
from typing import List, Dict, Tuple
from ..models.gpx_data import ParsedGPXData


class GPXParser:
    @staticmethod
    def infer_activity_type(filename: str) -> str:
        filename_lower = filename.lower()

        if "mountain bike" in filename_lower or "mountain biking" in filename_lower:
            return "Cycling"

        if "downhill skiing" in filename_lower or "downhill" in filename_lower:
            return "Downhill Skiing"

        if any(word in filename_lower for word in ["walk", "walking"]):
            return "Walking"
        if any(word in filename_lower for word in ["run", "running"]):
            return "Running"
        if any(word in filename_lower for word in ["cycl", "bik", "mtb"]):
            return "Cycling"
        if any(word in filename_lower for word in ["swim", "swimming"]):
            return "Swimming"
        if "skiing" in filename_lower:
            return "Downhill Skiing"
        if any(word in filename_lower for word in ["multisport", "triathlon"]):
            return "Multisport"
        if "other" in filename_lower:
            return "Other"

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
        speed_stats = self._calculate_speed(distance, duration)
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
        if len(coordinates) < 2:
            return 0.0

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
        distances = R * c

        return float(np.sum(distances))

    def _calculate_duration(self, timestamps: List[datetime]) -> int:
        if len(timestamps) < 2:
            return 0
        return int((timestamps[-1] - timestamps[0]).total_seconds())

    def _calculate_speed(self, distance: float, duration: int) -> Dict[str, float]:
        avg_speed = distance / duration if duration > 0 else 0
        return {"avg": avg_speed, "max": avg_speed, "min": avg_speed}

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
