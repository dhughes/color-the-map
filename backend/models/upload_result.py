from dataclasses import dataclass
from .track import Track


@dataclass
class UploadResult:
    duplicate: bool
    track: Track
