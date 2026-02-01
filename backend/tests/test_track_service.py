import pytest
from pathlib import Path
from backend.services.track_service import TrackService
from backend.services.gpx_parser import GPXParser
from backend.services.storage_service import StorageService


@pytest.fixture
def track_service(test_gpx_dir):
    storage = StorageService(test_gpx_dir)
    parser = GPXParser()
    return TrackService(storage, parser)


@pytest.fixture
def sample_gpx():
    test_dir = Path(__file__).parent
    gpx_path = (
        test_dir / ".." / ".." / "sample-gpx-files" / "Cycling 2025-12-19T211415Z.gpx"
    )
    with open(gpx_path, "rb") as f:
        return f.read()


@pytest.mark.asyncio
async def test_upload_track(track_service, sample_gpx, async_db_session):
    result = await track_service.upload_track(
        "test.gpx", sample_gpx, "test-user-id", async_db_session
    )
    await async_db_session.commit()

    assert result.duplicate is False
    assert result.track.name == "test"
    assert result.track.distance_meters > 0
    assert result.track.hash


@pytest.mark.asyncio
async def test_duplicate_detection(track_service, sample_gpx, async_db_session):
    await track_service.upload_track(
        "test.gpx", sample_gpx, "test-user-id", async_db_session
    )
    await async_db_session.commit()

    result = await track_service.upload_track(
        "test2.gpx", sample_gpx, "test-user-id", async_db_session
    )

    assert result.duplicate is True
    assert result.track.name == "test"


@pytest.mark.asyncio
async def test_list_tracks(track_service, sample_gpx, async_db_session):
    await track_service.upload_track(
        "track1.gpx", sample_gpx, "test-user-id", async_db_session
    )
    await async_db_session.commit()

    tracks = await track_service.list_tracks("test-user-id", async_db_session)

    assert len(tracks) == 1
    assert tracks[0].name == "track1"


@pytest.mark.asyncio
async def test_get_track_geometry(track_service, sample_gpx, async_db_session):
    result = await track_service.upload_track(
        "test.gpx", sample_gpx, "test-user-id", async_db_session
    )
    track_id = result.track.id
    await async_db_session.commit()

    geometry = await track_service.get_track_geometry(
        track_id, "test-user-id", async_db_session
    )

    assert geometry is not None
    assert geometry.track_id == track_id
    assert len(geometry.coordinates) > 0
    assert isinstance(geometry.coordinates[0], tuple)


@pytest.mark.asyncio
async def test_get_multiple_geometries(track_service, async_db_session):
    test_dir = Path(__file__).parent
    gpx1_path = (
        test_dir / ".." / ".." / "sample-gpx-files" / "Cycling 2025-12-19T211415Z.gpx"
    )
    gpx2_path = test_dir / ".." / ".." / "sample-gpx-files" / "Walking 2031.gpx"

    with open(gpx1_path, "rb") as f:
        content1 = f.read()
    with open(gpx2_path, "rb") as f:
        content2 = f.read()

    result1 = await track_service.upload_track(
        "track1.gpx", content1, "test-user-id", async_db_session
    )
    result2 = await track_service.upload_track(
        "track2.gpx", content2, "test-user-id", async_db_session
    )
    await async_db_session.commit()

    track_ids = [result1.track.id, result2.track.id]
    geometries = await track_service.get_multiple_geometries(
        track_ids, "test-user-id", async_db_session
    )

    assert len(geometries) == 2
    assert geometries[0].track_id == result1.track.id
    assert geometries[1].track_id == result2.track.id


@pytest.mark.asyncio
async def test_update_track_visibility(track_service, sample_gpx, async_db_session):
    result = await track_service.upload_track(
        "test.gpx", sample_gpx, "test-user-id", async_db_session
    )
    track_id = result.track.id
    await async_db_session.commit()

    assert result.track.visible is True

    updated = await track_service.update_track(
        track_id, {"visible": False}, "test-user-id", async_db_session
    )
    await async_db_session.commit()

    assert updated is not None
    assert updated.visible is False
    assert updated.id == track_id


@pytest.mark.asyncio
async def test_update_nonexistent_track(track_service, async_db_session):
    result = await track_service.update_track(
        9999, {"visible": False}, "test-user-id", async_db_session
    )
    assert result is None


@pytest.mark.asyncio
async def test_delete_single_track(
    track_service, sample_gpx, async_db_session, test_gpx_dir
):
    result = await track_service.upload_track(
        "test.gpx", sample_gpx, "test-user-id", async_db_session
    )
    track_id = result.track.id
    gpx_hash = result.track.hash
    await async_db_session.commit()

    gpx_file_path = test_gpx_dir / f"test-user-id_{gpx_hash}.gpx"
    assert gpx_file_path.exists()

    delete_result = await track_service.delete_tracks(
        [track_id], "test-user-id", async_db_session
    )
    await async_db_session.commit()

    # Delete files after successful commit (mimicking route handler behavior)
    for user_id, gpx_hash in delete_result.get("files_to_delete", []):
        track_service.storage.delete_gpx(user_id, gpx_hash)

    assert delete_result["deleted"] == 1
    assert delete_result["failed"] == 0
    assert len(delete_result["errors"]) == 0

    assert (
        await track_service.get_track_metadata(
            track_id, "test-user-id", async_db_session
        )
        is None
    )
    assert not gpx_file_path.exists()


@pytest.mark.asyncio
async def test_delete_multiple_tracks(track_service, async_db_session):
    test_dir = Path(__file__).parent
    gpx1_path = (
        test_dir / ".." / ".." / "sample-gpx-files" / "Cycling 2025-12-19T211415Z.gpx"
    )
    gpx2_path = test_dir / ".." / ".." / "sample-gpx-files" / "Walking 2031.gpx"

    with open(gpx1_path, "rb") as f:
        content1 = f.read()
    with open(gpx2_path, "rb") as f:
        content2 = f.read()

    result1 = await track_service.upload_track(
        "track1.gpx", content1, "test-user-id", async_db_session
    )
    result2 = await track_service.upload_track(
        "track2.gpx", content2, "test-user-id", async_db_session
    )
    await async_db_session.commit()

    track_ids = [result1.track.id, result2.track.id]

    delete_result = await track_service.delete_tracks(
        track_ids, "test-user-id", async_db_session
    )
    await async_db_session.commit()

    assert delete_result["deleted"] == 2
    assert delete_result["failed"] == 0
    assert len(delete_result["errors"]) == 0

    assert (
        await track_service.get_track_metadata(
            result1.track.id, "test-user-id", async_db_session
        )
        is None
    )
    assert (
        await track_service.get_track_metadata(
            result2.track.id, "test-user-id", async_db_session
        )
        is None
    )


@pytest.mark.asyncio
async def test_delete_nonexistent_track(track_service, async_db_session):
    delete_result = await track_service.delete_tracks(
        [9999], "test-user-id", async_db_session
    )

    assert delete_result["deleted"] == 0
    assert delete_result["failed"] == 1
    assert len(delete_result["errors"]) == 1
    assert "9999" in delete_result["errors"][0]


@pytest.mark.asyncio
async def test_delete_continues_on_failure(track_service, sample_gpx, async_db_session):
    result1 = await track_service.upload_track(
        "track1.gpx", sample_gpx, "test-user-id", async_db_session
    )
    track_id = result1.track.id
    await async_db_session.commit()

    delete_result = await track_service.delete_tracks(
        [9999, track_id, 8888], "test-user-id", async_db_session
    )
    await async_db_session.commit()

    assert delete_result["deleted"] == 1
    assert delete_result["failed"] == 2
    assert len(delete_result["errors"]) == 2

    assert (
        await track_service.get_track_metadata(
            track_id, "test-user-id", async_db_session
        )
        is None
    )


@pytest.mark.asyncio
async def test_upload_infers_activity_type_from_filename(
    track_service, sample_gpx, async_db_session
):
    result = await track_service.upload_track(
        "Walking 2031.gpx", sample_gpx, "test-user-id", async_db_session
    )
    await async_db_session.commit()

    assert result.track.activity_type == "Walking"


@pytest.mark.asyncio
async def test_upload_cycling_filename(track_service, async_db_session):
    test_dir = Path(__file__).parent
    gpx_path = (
        test_dir / ".." / ".." / "sample-gpx-files" / "Cycling 2025-12-19T211415Z.gpx"
    )
    with open(gpx_path, "rb") as f:
        content = f.read()

    result = await track_service.upload_track(
        "Cycling 2025-12-19T211415Z.gpx", content, "test-user-id", async_db_session
    )
    await async_db_session.commit()

    assert result.track.activity_type == "Cycling"
    assert result.track.filename == "Cycling 2025-12-19T211415Z.gpx"


@pytest.mark.asyncio
async def test_upload_unknown_filename(track_service, sample_gpx, async_db_session):
    result = await track_service.upload_track(
        "route_2025-03-01_5.31pm.gpx", sample_gpx, "test-user-id", async_db_session
    )
    await async_db_session.commit()

    assert result.track.activity_type == "Unknown"
