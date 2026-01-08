import pytest
from backend.services.storage_service import StorageService


@pytest.fixture
def storage(tmp_path):
    return StorageService(tmp_path)


def test_calculate_hash(storage):
    content = b"<gpx>test</gpx>"
    hash1 = storage.calculate_hash(content)

    assert len(hash1) == 64
    assert isinstance(hash1, str)

    hash2 = storage.calculate_hash(content)
    assert hash1 == hash2


def test_minify_removes_whitespace(storage):
    content_with_whitespace = b"<gpx>\n  <trk>\n    <name>Test</name>\n  </trk>\n</gpx>"
    content_minified = b"<gpx><trk><name>Test</name></trk></gpx>"

    hash1 = storage.calculate_hash(content_with_whitespace)
    hash2 = storage.calculate_hash(content_minified)

    assert hash1 == hash2


def test_store_gpx(storage):
    content = b"<gpx>test content</gpx>"
    gpx_hash = storage.calculate_hash(content)

    file_path = storage.store_gpx(gpx_hash, content)

    assert file_path.exists()
    assert file_path.read_bytes() == content


def test_store_gpx_idempotent(storage):
    content = b"<gpx>test</gpx>"
    gpx_hash = storage.calculate_hash(content)

    path1 = storage.store_gpx(gpx_hash, content)
    path2 = storage.store_gpx(gpx_hash, content)

    assert path1 == path2
    assert path1.exists()


def test_load_gpx(storage):
    content = b"<gpx>test load</gpx>"
    gpx_hash = storage.calculate_hash(content)

    storage.store_gpx(gpx_hash, content)
    loaded = storage.load_gpx(gpx_hash)

    assert loaded == content


def test_load_nonexistent_gpx(storage):
    result = storage.load_gpx("nonexistent_hash")
    assert result is None


def test_delete_gpx(storage):
    content = b"<gpx>test delete</gpx>"
    gpx_hash = storage.calculate_hash(content)

    storage.store_gpx(gpx_hash, content)
    assert storage.delete_gpx(gpx_hash) is True

    assert storage.load_gpx(gpx_hash) is None


def test_delete_nonexistent_gpx(storage):
    assert storage.delete_gpx("nonexistent") is False
