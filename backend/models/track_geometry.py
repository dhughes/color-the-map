from dataclasses import dataclass
from typing import List


@dataclass
class TrackGeometry:
    track_id: int
    coordinates: List[List[float]]
