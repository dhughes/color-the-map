from dataclasses import dataclass
from datetime import datetime
from typing import List


@dataclass
class ParsedGPXData:
    coordinates: List[List[float]]
    distance_meters: float
    duration_seconds: int
    avg_speed_ms: float
    max_speed_ms: float
    min_speed_ms: float
    elevation_gain_meters: float
    elevation_loss_meters: float
    bounds_min_lat: float
    bounds_max_lat: float
    bounds_min_lon: float
    bounds_max_lon: float
    activity_date: datetime
