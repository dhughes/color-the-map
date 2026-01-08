CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    filename TEXT NOT NULL,
    activity_type TEXT,
    activity_type_inferred TEXT,
    activity_date TIMESTAMP NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    distance_meters REAL,
    duration_seconds INTEGER,
    avg_speed_ms REAL,
    max_speed_ms REAL,
    min_speed_ms REAL,
    elevation_gain_meters REAL,
    elevation_loss_meters REAL,

    bounds_min_lat REAL,
    bounds_min_lon REAL,
    bounds_max_lat REAL,
    bounds_max_lon REAL,

    visible BOOLEAN DEFAULT TRUE,
    description TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tracks_hash ON tracks(hash);
CREATE INDEX IF NOT EXISTS idx_tracks_date ON tracks(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_type ON tracks(activity_type);

CREATE VIRTUAL TABLE IF NOT EXISTS track_spatial USING rtree(
    id,
    min_lat, max_lat,
    min_lon, max_lon
);
