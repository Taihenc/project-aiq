# Search Flow Service

Service for managing Search workflows.

## Architecture

This project follows the **Clean Architecture** pattern.

```
src/
├── core/
│   ├── application/    # Application logic (Use Cases, Ports, DTOs)
│   └── domain/         # Domain entities and business logic
├── infrastructure/     # Implementation details
│   ├── adapter/        # Input (API) and Output (DB, external services) adapters
│   └── config/         # Configuration and settings
└── main.py             # Entry point
```

## Getting Started

### Prerequisites

- Python 3.11+
<!-- - [uv](https://github.com/astral-sh/uv) (recommended) -->

### Installation

```bash
uv sync
```

### Running the service

```bash
uv run python src/main.py
```
