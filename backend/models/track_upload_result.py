from dataclasses import dataclass
from .track import Track


@dataclass
class TrackUploadResult:
    duplicate: bool
    track: Track
