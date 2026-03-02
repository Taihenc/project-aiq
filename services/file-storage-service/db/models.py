from typing import Optional

from sqlalchemy import Column, String
from sqlmodel import Field, SQLModel


class File(SQLModel, table=True):
    __tablename__ = "files"

    id: str = Field(primary_key=True)
    s3_key: Optional[str] = None
    file_name: str
    # "metadata" shadows SQLAlchemy's Table.metadata — use file_metadata as
    # the Python attribute name but persist as column "metadata".
    file_metadata: Optional[str] = Field(
        default=None, sa_column=Column("metadata", String)
    )
    status: str
    status_updated_at: Optional[str] = None
    source_id: Optional[str] = Field(
        default=None, sa_column=Column("source_id", String, index=True)
    )
