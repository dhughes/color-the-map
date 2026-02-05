from dataclasses import dataclass
from typing import List, Tuple, Optional


@dataclass
class TrackGeometryData:
    track_id: int
    coordinates: List[Tuple[float, float]]
    segment_speeds: Optional[List[float]] = None
