import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import tempfile
from pathlib import Path
import time
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    force=True,
)

logger = logging.getLogger(__name__)

from fastapi import UploadFile, File

from analyzer.zip_utils import safe_extract_zip
from analyzer.git_utils import download_git_repository
from analyzer.static_analyzer import analyze_project
from backend.schemas import GitAnalysisRequest, ProjectAnalysisResponse
from backend.ollama_service import analyze_project_facts

parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(parent_dir)
sys.path.append(os.path.join(parent_dir, "ml"))

from ml.predict import predict_resources
from backend.schemas import PredictionRequest, PredictionResponse
from backend.auth import init_db, auth_router

# Initialize authentication SQLite database
init_db()

app = FastAPI(
    title="FinOps AI Cost Optimizer API",
    description="API to predict cloud resource requirements and recommend cost-effective virtual machines.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount authentication router for reusable-auth integration
app.include_router(auth_router, prefix="/api/auth")
app.include_router(auth_router, prefix="/auth")
app.include_router(auth_router, prefix="/api")


@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to the FinOps AI Cost Optimizer API. Visit /docs for documentation."
    }


@app.post("/api/predict", response_model=PredictionResponse)
def predict_cloud_resources(request: PredictionRequest):
    try:
        result = predict_resources(
            application_type=request.application_type,
            expected_users_per_day=request.expected_users_per_day,
            concurrent_users=request.concurrent_users,
            storage_required_gb=request.storage_required_gb,
            deployment_region=request.deployment_region,
            traffic_pattern=request.traffic_pattern
        )

        return PredictionResponse(
            predicted_vcpu=result["Predicted vCPU"],
            predicted_ram_gb=result["Predicted RAM (GB)"],
            cloud_provider=result.get("cloud_provider"),
            recommended_vm=result.get("Recommended VM"),
            price_per_hour_usd=result.get("Price per Hour ($)"),
            monthly_cost_usd=result.get("Total Monthly Cost ($)"),
            yearly_cost_usd=result.get("Yearly Cost ($)")
        )

    except KeyError as ke:
        raise HTTPException(
            status_code=500,
            detail=f"Inference output missing expected key: {str(ke)}"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred during prediction: {str(e)}"
        )

MAX_UPLOAD_BYTES = 50 * 1024 * 1024


def _analyze_workload_safely(static_result: dict) -> dict:
    """Run Ollama and expose the underlying error during debugging."""
    try:
        return analyze_project_facts(static_result)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return {
            "status": "unavailable",
            "message": str(exc),
        }


def _get_project_root(directory: str) -> Path:
    """Use the inner project folder when a ZIP has one wrapper folder."""
    root = Path(directory).resolve()
    entries = list(root.iterdir())

    if (
        len(entries) == 1
        and entries[0].is_dir()
        and entries[0].name not in {".git", "__pycache__"}
    ):
        return entries[0]

    return root


@app.post(
    "/api/analyze/zip",
    response_model=ProjectAnalysisResponse,
)
async def analyze_zip_project(
    file: UploadFile = File(...),
):
    """Analyze a project supplied as a ZIP file."""
    if not file.filename or Path(file.filename).suffix.lower() != ".zip":
        raise HTTPException(
            status_code=400,
            detail="Please upload a .zip file.",
        )

    upload_path = None
    extracted_dir = None

    try:
        # Stream the upload to disk and enforce the size limit.
        with tempfile.NamedTemporaryFile(
            suffix=".zip", delete=False
        ) as temp_file:
            upload_path = temp_file.name
            total_bytes = 0

            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break

                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail="ZIP upload exceeds the 50 MB limit.",
                    )

                temp_file.write(chunk)

        extracted_dir = safe_extract_zip(upload_path)
        project_root = _get_project_root(extracted_dir)
        result = analyze_project(str(project_root))
        workload_analysis = _analyze_workload_safely(result)
        
        return ProjectAnalysisResponse(
            source_type="zip",
            project_name=project_root.name,
            files_scanned=result["files_scanned"],
            static_analysis=result,
            workload_analysis=workload_analysis,
        )

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="ZIP analysis failed. Check the uploaded project and server logs.",
        ) from exc
    finally:
        await file.close()

        if upload_path:
            Path(upload_path).unlink(missing_ok=True)

        if extracted_dir:
            shutil.rmtree(extracted_dir, ignore_errors=True)



@app.post(
    "/api/analyze/git",
    response_model=ProjectAnalysisResponse,
)
def analyze_git_project(request: GitAnalysisRequest):
    """Analyze a public GitHub repository and log stage timings."""
    repository_dir = None
    request_start = time.perf_counter()

    try:
        # Stage 1: Download repository
        stage_start = time.perf_counter()
        logger.info("Git analysis: starting repository download")

        repository_dir = download_git_repository(request.repository_url)

        logger.info(
            "Git analysis: repository download completed in %.2f seconds",
            time.perf_counter() - stage_start,
        )

        project_root = Path(repository_dir).resolve()

        # Stage 2: Static code analysis
        stage_start = time.perf_counter()
        logger.info("Git analysis: starting static analysis")

        result = analyze_project(str(project_root))

        logger.info(
            "Git analysis: static analysis completed in %.2f seconds; "
            "files scanned: %s",
            time.perf_counter() - stage_start,
            result.get("files_scanned", "unknown"),
        )

        # Stage 3: Ollama workload analysis
        stage_start = time.perf_counter()
        logger.info("Git analysis: starting workload analysis")

        workload_analysis = _analyze_workload_safely(result)

        logger.info(
    "Git analysis: workload analysis completed in %.2f seconds; "
    "application type: %s",
    time.perf_counter() - stage_start,
    workload_analysis.get("application_type", "unknown"),
)

        # Stage 4: Build API response
        response = ProjectAnalysisResponse(
            source_type="git",
            project_name=project_root.name,
            files_scanned=result["files_scanned"],
            static_analysis=result,
            workload_analysis=workload_analysis,
        )

        logger.info(
            "Git analysis: request completed in %.2f seconds",
            time.perf_counter() - request_start,
        )

        return response

    except ValueError as exc:
        logger.warning("Git analysis input error: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    except RuntimeError as exc:
        logger.warning("Git analysis runtime error: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    except Exception as exc:
        logger.exception("Git repository analysis failed")
        raise HTTPException(
            status_code=500,
            detail="Git repository analysis failed. Check the server logs.",
        ) from exc

    finally:
        if repository_dir:
            shutil.rmtree(repository_dir, ignore_errors=True)

        logger.info(
            "Git analysis: request cleanup finished; total elapsed %.2f seconds",
            time.perf_counter() - request_start,
        )
