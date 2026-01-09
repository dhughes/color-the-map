import gpxpy
from datetime import datetime
from typing import List, Dict
from math import radians, sin, cos, sqrt, atan2
from ..models.gpx_data import ParsedGPXData


class GPXParser:
    def parse(self, content: bytes) -> ParsedGPXData:
        gpx = gpxpy.parse(content.decode("utf-8"))

        coordinates = []
        elevations = []
        timestamps = []

        for track in gpx.tracks:
            for segment in track.segments:
                for point in segment.points:
                    coordinates.append([point.longitude, point.latitude])
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
        )

    def _calculate_distance(self, coordinates: List[List[float]]) -> float:
        total = 0.0
        for i in range(1, len(coordinates)):
            lon1, lat1 = coordinates[i - 1]
            lon2, lat2 = coordinates[i]

            R = 6371000
            phi1 = radians(lat1)
            phi2 = radians(lat2)
            dphi = radians(lat2 - lat1)
            dlambda = radians(lon2 - lon1)

            a = sin(dphi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(dlambda / 2) ** 2
            c = 2 * atan2(sqrt(a), sqrt(1 - a))
            total += R * c

        return total

    def _calculate_duration(self, timestamps: List[datetime]) -> int:
        if len(timestamps) < 2:
            return 0
        return int((timestamps[-1] - timestamps[0]).total_seconds())

    def _calculate_speed(self, distance: float, duration: int) -> Dict[str, float]:
        avg_speed = distance / duration if duration > 0 else 0
        return {"avg": avg_speed, "max": avg_speed, "min": avg_speed}

    def _calculate_elevation(self, elevations: List[float]) -> Dict[str, float]:
        gain = 0.0
        loss = 0.0

        for i in range(1, len(elevations)):
            diff = elevations[i] - elevations[i - 1]
            if diff > 0:
                gain += diff
            else:
                loss += abs(diff)

        return {"gain": gain, "loss": loss}

    def _calculate_bounds(self, coordinates: List[List[float]]) -> Dict[str, float]:
        lons = [coord[0] for coord in coordinates]
        lats = [coord[1] for coord in coordinates]

        return {
            "min_lat": min(lats),
            "max_lat": max(lats),
            "min_lon": min(lons),
            "max_lon": max(lons),
        }
