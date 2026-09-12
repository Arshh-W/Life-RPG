# Life RPG Backend

FastAPI backend for authentication, PostgreSQL persistence, player progression, activity history, and ownership-scoped quest CRUD.

## Start PostgreSQL

From the repository root:

```powershell
docker compose up -d postgres
```

Copy `.env.example` to `.env` and replace `SECRET_KEY` with a random value before using this outside local development.

## Run locally

From this directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`.
Interactive API documentation is available at `http://127.0.0.1:8000/docs`.
Database readiness is reported by `GET /health`; it returns HTTP 503 with a safe error message when PostgreSQL is unavailable.

The API creates the development tables on startup. Production deployments should use versioned migrations instead of `create_all`.

## API surface

- `POST /api/auth/register` and `POST /api/auth/login`
- `GET /api/auth/me`
- `GET|POST /api/tasks`
- `PATCH|DELETE /api/tasks/{task_id}`
- `POST /api/tasks/{task_id}/complete`
- `GET /api/progression/categories`
- `GET /api/progression/profile`
- `GET /api/economy/shop` and `GET /api/economy/inventory`
- `POST /api/economy/items/{item_id}/purchase`

XP rewards, coin rewards, and attribute targets are assigned by the server from the task category. Completion records an activity log, updates the user's non-linear level, attribute, discipline, coins, and consecutive-day streak. Purchases lock the shop item and spend the authenticated user's balance in one transaction.
