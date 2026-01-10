from dataclasses import dataclass
from typing import List, Tuple


@dataclass
class TrackGeometry:
    track_id: int
    coordinates: List[Tuple[float, float]]
