
import tempfile
from pathlib import Path

from analyzer.static_analyzer import analyze_project


def test_static_analyzer():
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)

        (root / "requirements.txt").write_text(
            "fastapi\nuvicorn\npsycopg2-binary\n"
            "redis\ncelery\nscikit-learn\n",
            encoding="utf-8",
        )

        (root / "main.py").write_text(
            """
from fastapi import FastAPI, WebSocket

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict")
def predict():
    return {"prediction": 1}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    pass
""",
            encoding="utf-8",
        )

        (root / "Dockerfile").write_text(
            "FROM python:3.12-slim\n",
            encoding="utf-8",
        )

        (root / "compose.yaml").write_text(
            """
services:
  api:
    build: .
  worker:
    build: .
  redis:
    image: redis
""",
            encoding="utf-8",
        )

        result = analyze_project(str(root))

        assert "Python" in result["languages"]
        assert "FastAPI" in result["frameworks"]
        assert result["api_endpoint_count"] == 2
        assert result["websocket_count"] == 1
        assert result["redis_detected"] is True
        assert result["background_workers_detected"] is True
        assert result["dockerfile_detected"] is True
        assert result["docker_compose_service_count"] == 3
        assert result["storage_required_gb"] is None
        assert "scikit-learn" in result["ml_libraries_detected"]

        print("All static analyzer tests passed!")


if __name__ == "__main__":
    test_static_analyzer()
