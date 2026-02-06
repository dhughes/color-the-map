from dataclasses import dataclass, field
from typing import List, Optional, Tuple


@dataclass
class TrackGeometryData:
    track_id: int
    coordinates: List[Tuple[float, float]]
    segment_speeds: Optional[List[float]] = field(default=None)
