from dataclasses import dataclass
from datetime import datetime


@dataclass
class Map:
    id: int
    user_id: str
    name: str
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_sqlalchemy(cls, model) -> "Map":
        return cls(
            id=model.id,
            user_id=model.user_id,
            name=model.name,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
