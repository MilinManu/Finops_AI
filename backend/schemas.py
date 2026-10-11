from pydantic import BaseModel, Field
from typing import Optional
from typing import Any

class PredictionRequest(BaseModel):
    application_type: str = Field(..., description="Type of application (e.g., E-Commerce, Blog, Web App)", json_schema_extra={"example": "E-Commerce"})
    expected_users_per_day: int = Field(..., description="Expected number of daily users", json_schema_extra={"example": 25000})
    concurrent_users: int = Field(..., description="Expected peak concurrent users", json_schema_extra={"example": 600})
    storage_required_gb: int = Field(..., description="Storage required in GB", json_schema_extra={"example": 300})
    deployment_region: str = Field(..., description="Cloud deployment region (e.g., ap-south-1)", json_schema_extra={"example": "ap-south-1"})
    traffic_pattern: str = Field(..., description="Traffic pattern: Low, Medium, High, etc.", json_schema_extra={"example": "High"})

class PredictionResponse(BaseModel):
    predicted_vcpu: int = Field(..., description="Predicted number of vCPUs required")
    predicted_ram_gb: int = Field(..., description="Predicted RAM in GB required")
    cloud_provider: Optional[str] = Field(None, description="Recommended Cloud Provider")
    recommended_vm: Optional[str] = Field(None, description="Recommended VM instance type")
    price_per_hour_usd: Optional[float] = Field(None, description="Estimated hourly cost in USD")
    monthly_cost_usd: Optional[float] = Field(None, description="Estimated monthly cost in USD")
    yearly_cost_usd: Optional[float] = Field(None, description="Estimated yearly cost in USD")
class GitAnalysisRequest(BaseModel):
    repository_url: str = Field(
        ...,
        description="Public GitHub repository URL",
        json_schema_extra={
            "example": "https://github.com/pallets/flask"
        },
    )


class ProjectAnalysisResponse(BaseModel):
    source_type: str = Field(
        ...,
        description="Project source: zip or git",
    )
    project_name: str
    files_scanned: int
    static_analysis: dict[str, Any]
    workload_analysis: Optional[dict[str, Any]] = None
