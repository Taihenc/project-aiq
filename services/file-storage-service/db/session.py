import os

from sqlmodel import SQLModel, create_engine

DATABASE_URL = "sqlite:///{}".format(os.getenv("DB_PATH", "file_metadata.db"))

# check_same_thread=False is required for SQLite when FastAPI spawns worker threads.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)


def create_db_and_tables() -> None:
    """Create all tables defined in SQLModel models. Safe to call multiple times.

    Schema migrations are managed by Alembic. Run `alembic upgrade head` to apply them.
    """
    SQLModel.metadata.create_all(engine)
