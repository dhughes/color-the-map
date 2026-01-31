# Database Migrations

**NOTE: As of 2026-01-31, this project now uses Alembic for database migrations.**

The manual SQL migrations in this directory are from the legacy migration system and are preserved for historical reference only. All new migrations should be created using Alembic.

## Alembic Migration Commands

### Create a new migration

```bash
# Auto-generate migration from model changes
source venv/bin/activate
alembic revision --autogenerate -m "Description of changes"

# Manually create empty migration template
alembic revision -m "Description of changes"
```

### Run migrations

```bash
# Run all pending migrations
source venv/bin/activate
alembic upgrade head

# Run specific migration
alembic upgrade <revision_id>

# Rollback one migration
alembic downgrade -1
```

### Check migration status

```bash
# Show current migration version
alembic current

# Show migration history
alembic history
```

## Production Deployment

Migrations are automatically run by the deployment script:

```bash
# From local machine
./deploy-to-prod.sh

# Or manually on server
ssh dhughes@ssh.doughughes.net
cd ~/apps/color-the-map
./deploy.sh  # This runs alembic upgrade head
```

## Legacy Manual Migrations (Deprecated)

The following SQL migrations were used before Alembic was set up. They are preserved for reference but should not be used for new migrations.

### 001_make_hash_unique_per_user.sql (2026-01-26)

**Purpose**: Make hash unique per user instead of globally unique.

**Why**: Different users should be able to upload the same GPX file independently.

**What it does**:
- Drops the global unique constraint on `tracks.hash`
- Creates a composite unique index on `(user_id, hash)`

**Status**: Applied to production. Superseded by Alembic baseline migration.
