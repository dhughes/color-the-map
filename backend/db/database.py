import sqlite3
from pathlib import Path
from contextlib import contextmanager


class Database:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row

        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")

        schema_path = Path(__file__).parent / "schema.sql"
        with open(schema_path) as f:
            conn.executescript(f.read())

        conn.close()

    @contextmanager
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
