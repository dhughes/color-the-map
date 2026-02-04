from dataclasses import dataclass
from typing import List, Tuple


@dataclass
class TrackGeometryData:
    track_id: int
    coordinates: List[Tuple[float, float]]
