import pandas as pd
import joblib

import os
from preprocess import preprocess_input
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load model and feature columns only once
model = joblib.load(os.path.join(BASE_DIR, "..", "models", "cloud_model.pkl"))
feature_columns = joblib.load(os.path.join(BASE_DIR, "..", "models", "model_features.pkl"))


# -------------------------------
# VM Recommendation
# -------------------------------
vm_catalog = pd.read_csv(
    os.path.join(BASE_DIR, "vm_catalog.csv")
)
storage_catalog = pd.read_csv(
    os.path.join(BASE_DIR, "storage_catalog.csv")
)
region_pricing = pd.read_csv(
    os.path.join(BASE_DIR, "region_pricing.csv")
)
def recommend_vm(predicted_vcpu, predicted_ram, deployment_region):

    # Filter VMs available in the requested region
    regional_vms = vm_catalog[
        vm_catalog["region"] == deployment_region
    ]

    if regional_vms.empty:
        return None

    # Filter VMs that satisfy the predicted requirements
    suitable = regional_vms[
        (regional_vms["vcpu"] >= predicted_vcpu) &
        (regional_vms["ram_gb"] >= predicted_ram)
    ].copy()

    if suitable.empty:
        return None

    # Get the regional price multiplier
    region_data = region_pricing[
        region_pricing["region"] == deployment_region
    ]

    if region_data.empty:
        return None

    multiplier = float(region_data.iloc[0]["price_multiplier"])

    # Calculate region-adjusted hourly price
    suitable["regional_price_per_hour"] = (
        suitable["price_per_hour"] * multiplier
    )

    # Choose cheapest VM after regional pricing
    best = suitable.sort_values(
        "regional_price_per_hour"
    ).iloc[0]

    return (
        str(best["provider"]),
        str(best["vm_type"]),
        float(best["regional_price_per_hour"])
    )
def calculate_storage_cost(provider, storage_required_gb):
    suitable_storage = storage_catalog[
        storage_catalog["provider"] == provider
    ]

    if suitable_storage.empty:
        return None, None

    suitable_storage = suitable_storage.copy()

    suitable_storage["storage_cost"] = (
        suitable_storage["price_per_gb_month"] *
        storage_required_gb
    )

    best_storage = suitable_storage.sort_values(
        "storage_cost"
    ).iloc[0]

    storage_type = str(best_storage["storage_type"])
    storage_cost = float(round(best_storage["storage_cost"], 2))

    return storage_type, storage_cost    
# def recommend_vm(vcpu, ram):
#     if vcpu <= 2 and ram <= 4:
#         return "AWS t3.medium", 0.0416

#     elif vcpu <= 4 and ram <= 8:
#         return "AWS t3.xlarge", 0.1664

#     elif vcpu <= 8 and ram <= 16:
#         return "AWS c5.2xlarge", 0.34

#     else:
#         return "AWS c5.4xlarge", 0.68


# -------------------------------
# Prediction Function
# -------------------------------
#  """
#     Predicts required cloud resources and recommends a VM.

#     Returns:
#         dict:
#             Predicted vCPU
#             Predicted RAM
#             Recommended VM
#             Price per Hour
#             Monthly Cost
#             Yearly Cost
#     """
def predict_resources(
    application_type,
    expected_users_per_day,
    concurrent_users,
    storage_required_gb,
    deployment_region,
    traffic_pattern
    
):
    

    # Create input dataframe
    input_df = pd.DataFrame([{
        "application_type": application_type,
        "expected_users_per_day": expected_users_per_day,
        "concurrent_users": concurrent_users,
        "storage_required_gb": storage_required_gb,
        "deployment_region": deployment_region,
        "traffic_pattern": traffic_pattern
    }])

    # One-hot encode
    

    input_df = preprocess_input(
        input_df,
        feature_columns
    )

    # Predict
    prediction = model.predict(input_df)

    predicted_vcpu = max(1, int(round(prediction[0][0])))
    predicted_ram = max(1, int(round(prediction[0][1])))

    # Recommend VM
    # cloud_provider, vm_type, price_per_hour = recommend_vm(
    #     predicted_vcpu,
    #     predicted_ram,
    #     deployment_region
    # )
    
    vm_recommendation = recommend_vm(
        predicted_vcpu,
        predicted_ram,
        deployment_region
    )

    if vm_recommendation is None:
        raise ValueError(
            f"No suitable VM found in region '{deployment_region}' "
            f"for {predicted_vcpu} vCPUs and {predicted_ram} GB RAM."
        )

    cloud_provider, vm_type, price_per_hour = vm_recommendation

    storage_type, storage_cost = calculate_storage_cost(
        cloud_provider,
        storage_required_gb
    )

    if storage_cost is None:
        raise ValueError(
            f"No storage option found for provider '{cloud_provider}'."
        )

    
    if cloud_provider is None:
        raise ValueError(
            f"No suitable VM found in region '{deployment_region}' "
            f"for {predicted_vcpu} vCPUs and {predicted_ram} GB RAM."
        )


    # storage_type, storage_cost = calculate_storage_cost(
    #     cloud_provider,
    #     storage_required_gb
    # )

    compute_monthly_cost = float(
        round(price_per_hour * 24 * 30, 2)
    )

    total_monthly_cost = float(
        round(compute_monthly_cost + storage_cost, 2)
    )

    yearly_cost = float(
        round(total_monthly_cost * 12, 2)
    )

    return {
        "Predicted vCPU": predicted_vcpu,
        "Predicted RAM (GB)": predicted_ram,
        "cloud_provider": cloud_provider,
        "Recommended VM": vm_type,
        "Price per Hour ($)": price_per_hour,
        "Storage Type": storage_type,
        "Compute Monthly Cost ($)": compute_monthly_cost,
        "Storage Monthly Cost ($)": storage_cost,
        "Total Monthly Cost ($)": total_monthly_cost,
        "Yearly Cost ($)": yearly_cost
    }
# comment this main before integrating wit fastapi
#used only for local testing 
if __name__ == "__main__":
    # print("Program Started")

    result = predict_resources(
        application_type="E-commerce",
        expected_users_per_day=10000,
        concurrent_users=250,
        storage_required_gb=37,
        deployment_region="europe-west",
        traffic_pattern="medium"
        
     )

    print(result)