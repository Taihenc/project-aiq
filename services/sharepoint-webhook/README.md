# SharePoint Webhook Service

This service handles SharePoint webhook notifications and file synchronization for AINGO.

## Database Migrations

This service uses Alembic for tracked schema revisions.
Delta-link state is also persisted in SQLite and migrated from the legacy JSON file when revision `0002` is applied.
Migrations are applied manually; service startup does not run Alembic automatically.

Apply the latest revision:

```bash
uv run alembic upgrade head
```

Create a new revision after changing the SQLModel schema:

```bash
uv run alembic revision --autogenerate -m "describe change"
```
