# Database Migrations

Manual database migrations for the color-the-map application.

## How to Run Migrations

### Production

```bash
# SSH to production server
ssh dhughes@ssh.doughughes.net

# Navigate to app directory
cd ~/apps/color-the-map

# Backup the database first (IMPORTANT!)
cp data/color-the-map.db data/color-the-map.db.backup-$(date +%Y%m%d-%H%M%S)

# Run the migration
sqlite3 data/color-the-map.db < migrations/001_make_hash_unique_per_user.sql

# Restart the service
sudo systemctl restart color-the-map
```

### Local Development

```bash
# From project root
sqlite3 data/color-the-map.db < migrations/001_make_hash_unique_per_user.sql
```

## Migration History

### 001_make_hash_unique_per_user.sql (2026-01-26)

**Purpose**: Make hash unique per user instead of globally unique.

**Why**: Different users should be able to upload the same GPX file independently. The previous global unique constraint prevented this.

**What it does**:
- Drops the global unique constraint on `tracks.hash`
- Creates a composite unique index on `(user_id, hash)`
- Preserves all existing data
- Maintains all other indexes

**Required**: Yes - existing databases must run this migration to allow multiple users to upload the same GPX files.
