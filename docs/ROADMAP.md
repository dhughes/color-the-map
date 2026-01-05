# Color The Map - Feature Roadmap

## Overview

This document outlines the sequential implementation plan for Color The Map. Each feature builds on previous ones and has a corresponding detailed implementation prompt in `feature-prompts/`.

**Development Approach**: Incremental feature delivery using AI agents with the `feature-dev` skill.

---

## Feature Implementation Sequence

### Feature 1: MVP Walking Skeleton
**Prompt**: [`01-mvp-walking-skeleton.md`](./feature-prompts/01-mvp-walking-skeleton.md)
**Status**: Not Started
**Dependencies**: None (first feature)
**Estimated Complexity**: Medium
**Timeline**: 3-5 days

**What it delivers:**
- Upload a single GPX file
- See it rendered on the map
- Basic track metadata displayed
- Full stack working end-to-end
- Successfully deploys to production

**Success Criteria:**
- [ ] User can upload a .gpx file via web interface
- [ ] File is stored by SHA256 hash in data/gpx/
- [ ] Track metadata saved to SQLite
- [ ] Track renders on map centered on track bounds
- [ ] Display: filename, distance, date
- [ ] Deploys successfully via deploy-to-prod.sh
- [ ] All relative paths work correctly in production

**Key Components:**
- FastAPI backend with upload endpoint
- Content-addressable GPX storage
- SQLite database with basic schema
- React frontend with MapLibre
- Upload component
- Deployment scripts updated with frontend build

---

### Feature 2: Multi-Track Rendering & Management
**Prompt**: [`02-multi-track-rendering.md`](./feature-prompts/02-multi-track-rendering.md)
**Status**: Not Started
**Dependencies**: Feature 1 (MVP must work)
**Estimated Complexity**: Medium-High
**Timeline**: 4-6 days

**What it delivers:**
- Display multiple tracks on map simultaneously
- Track list in right sidebar
- Basic track selection (single click)
- Track visibility toggles (eye icon)
- Viewport-based track loading for performance

**Success Criteria:**
- [ ] Can upload and view multiple tracks at once
- [ ] Right sidebar shows scrollable track list
- [ ] Track list items show: name, activity type, eye icon
- [ ] Clicking track in list selects it
- [ ] Clicking eye icon toggles visibility
- [ ] Only tracks in viewport (+ padding) are loaded
- [ ] R*Tree spatial index queries working
- [ ] Mobile view hides sidebar, shows map only
- [ ] Performance: renders 50+ tracks smoothly

**Key Components:**
- Track list component with virtual scrolling
- Track list item component
- Visibility toggle UI
- Spatial query service (R*Tree)
- Viewport change detection
- Selection state management
- Mobile responsive layout

---

### Feature 3: Bulk Upload & Deduplication
**Prompt**: [`03-bulk-upload-deduplication.md`](./feature-prompts/03-bulk-upload-deduplication.md)
**Status**: Not Started
**Dependencies**: Features 1-2
**Estimated Complexity**: Medium
**Timeline**: 3-4 days

**What it delivers:**
- Drag-and-drop multiple GPX files
- Upload progress dialog
- Duplicate detection (skip silently, center on existing)
- Activity type inference from filename
- Error handling for corrupted files

**Success Criteria:**
- [ ] Drag-and-drop zone accepts multiple files
- [ ] Progress dialog shows: % complete, activity counts, errors
- [ ] Duplicate files skipped, viewport centers on existing tracks
- [ ] Activity type inferred from filename patterns
- [ ] Failed files skipped, shown in summary
- [ ] Max file size enforced (10 MB)
- [ ] Import completes and centers viewport on new/existing tracks
- [ ] Can import 50+ files without browser hanging

**Key Components:**
- Drag-and-drop upload interface
- Progress dialog component
- Activity inference service
- Hash-based deduplication
- Batch upload API endpoint
- Error summary display

---

### Feature 4: Track Selection & Management
**Prompt**: [`04-track-management.md`](./feature-prompts/04-track-management.md)
**Status**: Not Started
**Dependencies**: Features 1-3
**Estimated Complexity**: Medium-High
**Timeline**: 4-5 days

**What it delivers:**
- Multi-select tracks (Cmd/Ctrl+click)
- Track details panel (single selection)
- Bulk operations panel (multi-selection)
- Edit track metadata (name, activity type, description)
- Delete tracks with confirmation
- Track isolation mode (show only selected track)

**Success Criteria:**
- [ ] Cmd/Ctrl+click adds/removes from selection
- [ ] Selected tracks highlighted in list and on map
- [ ] Single selection shows details panel with editable fields
- [ ] Details panel shows: name, type, date, distance, speeds, elevation gain/loss
- [ ] Can edit name, activity type, description in details panel
- [ ] Can delete single track from details panel (with confirmation)
- [ ] Multi-selection shows: count, combined stats, bulk actions
- [ ] Bulk visibility toggle works
- [ ] Bulk activity type change works
- [ ] Isolation mode: hides all other tracks, zooms to fit selected track
- [ ] Clicking map doesn't exit isolation (explicit action required)
- [ ] Selection cleared on filter change

**Key Components:**
- Selection state management (React Context)
- Track details panel component
- Bulk operations panel component
- Edit track API endpoint
- Delete track API endpoint
- Bulk update API endpoints
- Combined statistics calculation
- Isolation mode logic

---

### Feature 5: Filtering & Search
**Prompt**: [`05-filtering-search.md`](./feature-prompts/05-filtering-search.md)
**Status**: Not Started
**Dependencies**: Features 1-4
**Estimated Complexity**: Medium
**Timeline**: 3-4 days

**What it delivers:**
- Filter tracks by activity type
- Filter tracks by date range
- Filters use AND logic (must match all)
- Filter UI in sidebar
- Clear filters button

**Success Criteria:**
- [ ] Activity type filter dropdown populated from existing tracks
- [ ] Date range filter with from/to inputs
- [ ] Filters applied on change (no submit button)
- [ ] Only matching tracks shown in list and on map
- [ ] Filter badge/chip shows active filters
- [ ] Clear filters button resets to show all
- [ ] Selection cleared when filters change
- [ ] URL query params preserve filter state (optional enhancement)
- [ ] Fast filtering with proper database indexes

**Key Components:**
- Activity type filter component
- Date range filter component
- Filter state management
- Filtered track list query
- Active filters display
- Clear filters button

---

### Feature 6: Statistics & Analytics
**Prompt**: [`06-statistics-analytics.md`](./feature-prompts/06-statistics-analytics.md)
**Status**: Not Started
**Dependencies**: Features 1-5
**Estimated Complexity**: Medium
**Timeline**: 3-4 days

**What it delivers:**
- Summary statistics panel
- Per-activity-type breakdowns
- Date range of all tracks
- Combined statistics for selected tracks
- Export statistics (future enhancement)

**Success Criteria:**
- [ ] Stats panel shows: total tracks, total distance, total duration
- [ ] Activity type breakdown (count + distance per type)
- [ ] Date range display (first activity to last activity)
- [ ] Stats update when tracks added/deleted
- [ ] Multi-select shows combined stats for selection
- [ ] Stats formatted nicely (km, hours, dates)
- [ ] Stats query is performant (uses DB aggregations)

**Key Components:**
- Stats summary component
- Activity breakdown component
- Stats API endpoint
- Combined stats calculation
- Display formatters (distance, duration, dates)

---

## Future Features (Post-MVP)

### Phase 2 Enhancements
- **Color-coding by speed**: Gradient tracks (red=slow, green=fast)
- **Track simplification UI**: Configure epsilon value
- **Track editing**: Split tracks, trim endpoints, merge tracks
- **Export functionality**: Download tracks, export to other formats

### Phase 3 Advanced Features
- **Coverage analysis**: Calculate % of city roads covered
- **Heatmap visualization**: Density map of most-traveled areas
- **Weather integration**: Historical weather for activities
- **Comparison views**: Compare multiple tracks side-by-side

### Phase 4 Social/Multi-User
- **User authentication**: Multi-user support
- **Shared tracks**: Share tracks with links
- **Public profiles**: Show your progress publicly
- **Leaderboards**: Compare with friends

---

## Complexity Ratings

**Low**: 1-2 days, straightforward implementation
**Medium**: 3-4 days, moderate complexity, some challenges
**Medium-High**: 4-6 days, significant complexity, multiple components
**High**: 7+ days, very complex, major architectural changes

---

## Testing Requirements

Each feature must have:
- [ ] Unit tests for core business logic
- [ ] Integration tests for API endpoints
- [ ] Component tests for key UI components
- [ ] Manual testing checklist completed
- [ ] All tests passing before merge
- [ ] 80% code coverage maintained

---

## Deployment Requirements

Each feature must:
- [ ] Work with relative paths (Caddy proxy compatibility)
- [ ] Deploy successfully via deploy-to-prod.sh
- [ ] Not break existing functionality
- [ ] Include database migrations if schema changes
- [ ] Update CLAUDE.md if architectural changes

---

## Feature Dependencies Graph

```
Feature 1 (MVP)
    ↓
Feature 2 (Multi-track + List)
    ↓
Feature 3 (Bulk Upload)
    ↓
Feature 4 (Selection + Management)
    ↓
Feature 5 (Filtering)
    ↓
Feature 6 (Statistics)
```

**Critical Path**: Features must be implemented in order. Each depends on previous features being complete and stable.

---

## Implementation Notes

### For AI Agents

When implementing each feature:
1. Read the corresponding feature prompt file first
2. Review ARCHITECTURE.md for technical context
3. Read the "Key Files" section to understand existing code
4. Follow the "Implementation Sequence" step-by-step
5. Write tests as you implement (TDD-ish approach)
6. Test deployment before considering feature complete

### For Developers

- Each feature is designed to be completable in a single focused session
- Features are scoped to deliver clear user value
- Dependencies are explicit - don't skip ahead
- If a feature feels too large, consider splitting it
- Update this roadmap if you deviate from the plan

---

## Current Status

**Last Updated**: 2026-01-05
**Active Feature**: None (ready to start Feature 1)
**Completed Features**: 0/6
**Overall Progress**: 0%

### Next Steps

1. Review ARCHITECTURE.md thoroughly
2. Read feature prompt: `01-mvp-walking-skeleton.md`
3. Use `feature-dev` skill to implement Feature 1
4. Update this roadmap when Feature 1 completes

---

## Success Metrics

**Feature 1 (MVP) Success**:
- Application deployed and accessible
- Can upload and view at least one GPX track
- Foundation ready for additional features

**Feature 2-6 Success**:
- All acceptance criteria met
- Tests passing (80% coverage)
- Deploys successfully
- No performance regressions

**Overall Project Success**:
- All 6 features implemented
- 100+ GPX files rendered smoothly
- Production deployment stable
- User can effectively track coverage progress

---

## Notes

- This roadmap is a living document - update as needed
- Feature complexity estimates are guidelines, not hard limits
- Dependencies are architectural, not time-based
- Each feature should be production-ready before moving to next
- Consider user feedback between features if real users are testing

---

**Document Version**: 1.0
**Status**: Ready for Feature 1 implementation
