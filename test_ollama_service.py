
from backend.ollama_service import analyze_project_facts

sample_facts = {
    "project_root_name": "sample_api",
    "files_scanned": 12,
    "languages": ["Python"],
    "frameworks": ["FastAPI"],
    "api_endpoint_count": 5,
    "databases_detected": ["PostgreSQL"],
    "redis_detected": False,
    "background_workers_detected": True,
    "dockerfile_detected": True,
    "docker_compose_service_count": 2,
    "kubernetes_detected": False,
    "ml_libraries_detected": [],
    "storage_required_gb": None,
    "workload_note": (
        "Real traffic and resource usage are not measured."
    ),
}

result = analyze_project_facts(sample_facts)
print(result)
