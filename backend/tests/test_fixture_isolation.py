"""
Test to verify that db_session fixture properly isolates tests via rollback.

These tests prove that:
1. Data written in one test does NOT leak into subsequent tests
2. The transaction.rollback() is effective and happens before session.close()
3. Each test starts with a clean database state

If the rollback order is incorrect (session.close() before transaction.rollback()),
these tests would fail because data from test_a would appear in test_b.
"""

from backend.auth.models import Track
from datetime import datetime


def test_isolation_a_insert_data(db_session):
    """First test: Insert a track with a known hash"""
    track = Track(
        user_id="isolation-test-user",
        hash="test-hash-12345",
        name="Isolation Test Track A",
        filename="test_a.gpx",
        activity_date=datetime(2025, 1, 1),
    )
    db_session.add(track)
    db_session.flush()

    # Verify the track exists within this test
    result = db_session.query(Track).filter_by(hash="test-hash-12345").first()
    assert result is not None
    assert result.name == "Isolation Test Track A"


def test_isolation_b_verify_clean_state(db_session):
    """Second test: Verify previous test data was rolled back

    This test MUST run after test_isolation_a_insert_data (pytest runs tests
    in order within the same file by default).

    If rollback is working correctly: No track with hash 'test-hash-12345' exists
    If rollback is broken: Track from test_a still exists (TEST FAILS)
    """
    result = db_session.query(Track).filter_by(hash="test-hash-12345").first()

    # This assertion proves rollback is working - previous test data is gone
    assert result is None, (
        "ROLLBACK FAILURE: Data from previous test leaked into this test! "
        "The track inserted in test_isolation_a_insert_data should have been "
        "rolled back but still exists. This means transaction.rollback() is "
        "not working, likely because session.close() was called first."
    )


def test_isolation_c_insert_different_data(db_session):
    """Third test: Insert different data to verify independent state"""
    track = Track(
        user_id="isolation-test-user",
        hash="test-hash-67890",
        name="Isolation Test Track C",
        filename="test_c.gpx",
        activity_date=datetime(2025, 1, 1),
    )
    db_session.add(track)
    db_session.flush()

    # Verify only OUR track exists, not the ones from previous tests
    all_tracks = db_session.query(Track).all()
    assert len(all_tracks) == 1
    assert all_tracks[0].hash == "test-hash-67890"
    assert all_tracks[0].name == "Isolation Test Track C"

    # Double-check previous test data doesn't exist
    assert db_session.query(Track).filter_by(hash="test-hash-12345").first() is None
