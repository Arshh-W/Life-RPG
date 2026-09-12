from fastapi import FastAPI

app = FastAPI(title="Life RPG API", version="0.1.0")


@app.get("/", tags=["system"])
async def root() -> dict[str, str]:
    return {"status": "ok"}
