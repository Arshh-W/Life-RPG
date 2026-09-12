# Life RPG Backend

Minimal FastAPI backend foundation for the Life RPG application.

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
