-- Migration: Make hash unique per user instead of globally
-- Date: 2026-01-26
--
-- This migration:
-- 1. Drops the global unique constraint on tracks.hash
-- 2. Creates a composite unique index on (user_id, hash)
--
-- This allows different users to upload the same GPX file independently.

-- SQLite doesn't support DROP CONSTRAINT, so we need to recreate the table

BEGIN TRANSACTION;

-- Create new table with correct constraints
CREATE TABLE tracks_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(36) NOT NULL,
    hash VARCHAR(64) NOT NULL,
    name VARCHAR NOT NULL,
    filename VARCHAR NOT NULL,
    activity_type VARCHAR,
    activity_type_inferred VARCHAR,
    activity_date DATETIME NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    distance_meters FLOAT,
    duration_seconds INTEGER,
    avg_speed_ms FLOAT,
    max_speed_ms FLOAT,
    min_speed_ms FLOAT,
    elevation_gain_meters FLOAT,
    elevation_loss_meters FLOAT,
    bounds_min_lat FLOAT,
    bounds_min_lon FLOAT,
    bounds_max_lat FLOAT,
    bounds_max_lon FLOAT,
    visible BOOLEAN DEFAULT 1,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table
INSERT INTO tracks_new SELECT * FROM tracks;

-- Drop old table
DROP TABLE tracks;

-- Rename new table
ALTER TABLE tracks_new RENAME TO tracks;

-- Recreate indexes
CREATE INDEX idx_tracks_hash ON tracks(hash);
CREATE INDEX idx_tracks_date ON tracks(activity_date);
CREATE INDEX idx_tracks_type ON tracks(activity_type);
CREATE INDEX idx_tracks_user_id ON tracks(user_id);
CREATE UNIQUE INDEX idx_tracks_user_hash ON tracks(user_id, hash);

COMMIT;
