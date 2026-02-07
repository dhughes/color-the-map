import pytest
import pytest_asyncio
from backend.services.map_service import MapService


@pytest_asyncio.fixture
async def map_service():
    return MapService()


USER_ID = "test-user-123"
OTHER_USER_ID = "other-user-456"


@pytest.mark.asyncio
async def test_create_map(map_service, test_db_session):
    result = await map_service.create_map("Test Map", USER_ID, False, test_db_session)

    assert result.name == "Test Map"
    assert result.user_id == USER_ID
    assert result.is_default is False
    assert result.id is not None


@pytest.mark.asyncio
async def test_create_default_map(map_service, test_db_session):
    result = await map_service.create_map("Default", USER_ID, True, test_db_session)

    assert result.is_default is True


@pytest.mark.asyncio
async def test_get_map(map_service, test_db_session):
    created = await map_service.create_map("My Map", USER_ID, False, test_db_session)
    await test_db_session.commit()

    fetched = await map_service.get_map(created.id, USER_ID, test_db_session)
    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.name == "My Map"


@pytest.mark.asyncio
async def test_get_map_wrong_user(map_service, test_db_session):
    created = await map_service.create_map("My Map", USER_ID, False, test_db_session)
    await test_db_session.commit()

    fetched = await map_service.get_map(created.id, OTHER_USER_ID, test_db_session)
    assert fetched is None


@pytest.mark.asyncio
async def test_list_maps_ordered_default_first(map_service, test_db_session):
    await map_service.create_map("Zebra Map", USER_ID, False, test_db_session)
    await map_service.create_map("Alpha Map", USER_ID, True, test_db_session)
    await map_service.create_map("Beta Map", USER_ID, False, test_db_session)
    await test_db_session.commit()

    maps = await map_service.list_maps(USER_ID, test_db_session)
    assert len(maps) == 3
    assert maps[0].name == "Alpha Map"
    assert maps[0].is_default is True
    assert maps[1].name == "Beta Map"
    assert maps[2].name == "Zebra Map"


@pytest.mark.asyncio
async def test_list_maps_user_isolation(map_service, test_db_session):
    await map_service.create_map("User 1 Map", USER_ID, True, test_db_session)
    await map_service.create_map("User 2 Map", OTHER_USER_ID, True, test_db_session)
    await test_db_session.commit()

    maps = await map_service.list_maps(USER_ID, test_db_session)
    assert len(maps) == 1
    assert maps[0].name == "User 1 Map"


@pytest.mark.asyncio
async def test_update_map_name(map_service, test_db_session):
    created = await map_service.create_map("Original", USER_ID, False, test_db_session)
    await test_db_session.commit()

    updated = await map_service.update_map(
        created.id, {"name": "Renamed"}, USER_ID, test_db_session
    )
    assert updated is not None
    assert updated.name == "Renamed"


@pytest.mark.asyncio
async def test_update_map_wrong_user(map_service, test_db_session):
    created = await map_service.create_map("My Map", USER_ID, False, test_db_session)
    await test_db_session.commit()

    updated = await map_service.update_map(
        created.id, {"name": "Hacked"}, OTHER_USER_ID, test_db_session
    )
    assert updated is None


@pytest.mark.asyncio
async def test_delete_map(map_service, test_db_session):
    map1 = await map_service.create_map("Map 1", USER_ID, True, test_db_session)
    await map_service.create_map("Map 2", USER_ID, False, test_db_session)
    await test_db_session.commit()

    result = await map_service.delete_map(map1.id, USER_ID, test_db_session)
    assert result.deleted is True

    maps = await map_service.list_maps(USER_ID, test_db_session)
    assert len(maps) == 1


@pytest.mark.asyncio
async def test_cannot_delete_last_map(map_service, test_db_session):
    only_map = await map_service.create_map("Only Map", USER_ID, True, test_db_session)
    await test_db_session.commit()

    result = await map_service.delete_map(only_map.id, USER_ID, test_db_session)
    assert result.deleted is False
    assert result.error == "Cannot delete the last map"

    maps = await map_service.list_maps(USER_ID, test_db_session)
    assert len(maps) == 1


@pytest.mark.asyncio
async def test_delete_map_wrong_user(map_service, test_db_session):
    await map_service.create_map("Map 1", USER_ID, True, test_db_session)
    map2 = await map_service.create_map("Map 2", USER_ID, False, test_db_session)
    await test_db_session.commit()

    result = await map_service.delete_map(map2.id, OTHER_USER_ID, test_db_session)
    assert result.deleted is False


@pytest.mark.asyncio
async def test_ensure_default_map_creates_when_none_exist(map_service, test_db_session):
    default = await map_service.ensure_default_map(USER_ID, test_db_session)

    assert default.name == "My Map"
    assert default.is_default is True
    assert default.user_id == USER_ID


@pytest.mark.asyncio
async def test_ensure_default_map_returns_existing(map_service, test_db_session):
    existing = await map_service.create_map("Existing", USER_ID, True, test_db_session)
    await test_db_session.commit()

    default = await map_service.ensure_default_map(USER_ID, test_db_session)
    assert default.id == existing.id


@pytest.mark.asyncio
async def test_creating_default_unsets_others(map_service, test_db_session):
    await map_service.create_map("First Default", USER_ID, True, test_db_session)
    await map_service.create_map("Second Default", USER_ID, True, test_db_session)
    await test_db_session.commit()

    maps = await map_service.list_maps(USER_ID, test_db_session)
    defaults = [m for m in maps if m.is_default]
    assert len(defaults) == 1
    assert defaults[0].name == "Second Default"
