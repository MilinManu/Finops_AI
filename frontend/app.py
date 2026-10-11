import streamlit as st
import requests
import json

# Set page config
st.set_page_config(
    page_title="FinOps AI - Cost Optimizer",
    page_icon="💰",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Premium CSS Styling
st.markdown("""
<style>
    /* Main background and fonts */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    
    /* Gradient Title banner */
    .title-banner {
        background: linear-gradient(135deg, #1f4068, #162447, #070d19);
        color: #e4e4e4;
        padding: 2rem;
        border-radius: 12px;
        margin-bottom: 2rem;
        text-align: center;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }
    
    .title-banner h1 {
        font-weight: 700;
        margin-bottom: 0.5rem;
        color: #ffffff;
    }
    
    .title-banner p {
        font-weight: 300;
        font-size: 1.1rem;
        color: #b0c4de;
    }

    /* Metric Card styling */
    .metric-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 1.5rem;
        text-align: center;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .metric-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        border-color: #00adb5;
    }
    
    .metric-value {
        font-size: 2.2rem;
        font-weight: 700;
        color: #00adb5;
        margin-bottom: 0.5rem;
    }
    
    .metric-label {
        font-size: 0.9rem;
        color: #a0a0a0;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    /* Recommendation Card styling */
    .rec-card {
        background: linear-gradient(135deg, rgba(26, 26, 46, 0.95), rgba(22, 33, 62, 0.95));
        border: 2px solid #00adb5;
        border-radius: 16px;
        padding: 2rem;
        margin-top: 1.5rem;
        box-shadow: 0 10px 25px rgba(0, 173, 181, 0.15);
    }

    .rec-title {
        font-size: 1.3rem;
        font-weight: 600;
        color: #e4e4e4;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 0.8rem;
        margin-bottom: 1rem;
    }
    
    .rec-item {
        font-size: 1.1rem;
        margin-bottom: 0.6rem;
        color: #d1d1d1;
    }
    
    .rec-item strong {
        color: #ffffff;
    }
</style>
""", unsafe_allow_html=True)

# Title Banner
st.markdown("""
<div class="title-banner">
    <h1>FinOps AI Cost Optimizer</h1>
    <p>Predict cloud resource requirements and identify the most suitables virtual machines and cost estimates.</p>
</div>
""", unsafe_allow_html=True)

# Select how the user wants to analyze their project
st.markdown("## Choose Your Optimization Workflow")

workflow = st.radio(
    "How would you like to provide your application?",
    options=[
        "Manual Input",
        "Upload ZIP",
        "Git Repository",
    ],
    horizontal=True,
    help=(
        "Enter workload details manually, upload a ZIP project, "
        "or analyze a public GitHub repository."
    ),
)

st.divider()

# Define dropdown choices aligned with the model's features
APPLICATION_TYPES = [
    "E-Commerce",
    "Blog",
    "CRM",
    "Banking",
    "ERP",
    "Healthcare",
    "News Portal",
    "Portfolio",
    "Social Media",
    "Streaming"
]

REGIONS = [
    "asia-south",
    "us-east",
    "europe-west"
]

TRAFFIC_PATTERNS = [
    "High",
    "Medium",
    "Low"
]


def render_project_workload_form(result, form_key):
    """Use Ollama's inferred features and ask only for missing inputs."""

    workload = result.get("workload_analysis") or {}

    st.subheader("Project Analysis")
    st.write("Project:", result.get("project_name", "Unknown"))
    st.write("Files scanned:", result.get("files_scanned", 0))

    with st.expander("View Static Analysis"):
        st.json(result.get("static_analysis", {}))

    with st.expander("View Ollama Workload Interpretation"):
        st.json(workload)

    # Read Ollama predictions.
    inferred_type = workload.get("application_type")
    inferred_traffic = workload.get("traffic_pattern")
    inferred_storage = workload.get("storage_required_gb")

    valid_type = inferred_type in APPLICATION_TYPES
    valid_traffic = inferred_traffic in TRAFFIC_PATTERNS

    st.subheader("Workload Estimation")

    # Show automatically inferred features instead of asking again.
    col1, col2 = st.columns(2)

    with col1:
        if valid_type:
            st.success(f"Application type detected: {inferred_type}")
        else:
            st.warning("Application type could not be inferred reliably.")

    with col2:
        if valid_traffic:
            st.success(f"Estimated traffic pattern: {inferred_traffic}")
        else:
            st.warning("Traffic pattern could not be inferred reliably.")

    confidence = workload.get("confidence")
    if confidence:
        st.caption(f"Ollama analysis confidence: {confidence}")

    evidence = workload.get("evidence", [])
    if evidence:
        with st.expander("Why were these estimates selected?"):
            for item in evidence:
                st.write(f"- {item}")

    st.caption(
        "Application type and traffic pattern are inferred from repository "
        "evidence when possible. Actual production traffic cannot be "
        "confirmed from source code alone. Review all assumptions."
    )

    st.subheader("Provide Missing Workload Information")

    with st.form(form_key):

        # Ask for application type only when Ollama cannot classify it.
        if valid_type:
            application_type = inferred_type
            st.text_input(
                "Application Type (inferred)",
                value=inferred_type,
                disabled=True,
            )
        else:
            application_type = st.selectbox(
                "Application Type",
                options=APPLICATION_TYPES,
            )

        # Ask for traffic pattern only when Ollama cannot estimate it.
        if valid_traffic:
            traffic_pattern = inferred_traffic
            st.text_input(
                "Traffic Pattern (estimated)",
                value=inferred_traffic,
                disabled=True,
            )
        else:
            traffic_pattern = st.selectbox(
                "Traffic Pattern",
                options=TRAFFIC_PATTERNS,
            )

        expected_users_per_day = st.number_input(
            "Expected Users per Day",
            min_value=1,
            max_value=100000000,
            value=10000,
            step=1000,
            help="Estimate the number of users accessing the application daily.",
        )

        concurrent_users = st.number_input(
            "Peak Concurrent Users",
            min_value=1,
            max_value=5000000,
            value=250,
            step=50,
            help="Estimate how many users may use the application simultaneously.",
        )

        deployment_region = st.selectbox(
            "Deployment Region",
            options=REGIONS,
        )

        # Use storage from Ollama only when it returned a positive number.
        storage_is_inferred = (
            isinstance(inferred_storage, (int, float))
            and not isinstance(inferred_storage, bool)
            and inferred_storage > 0
        )

        if storage_is_inferred:
            storage_required_gb = st.number_input(
                "Storage Required (GB) — estimated",
                min_value=1,
                max_value=5000000,
                value=min(int(inferred_storage), 5000000),
                step=10,
                help="Review this estimate and adjust it if needed.",
            )
        else:
            storage_required_gb = st.number_input(
                "Storage Required (GB)",
                min_value=1,
                max_value=5000000,
                value=100,
                step=10,
                help="Enter the expected storage requirement.",
            )

        submitted = st.form_submit_button(
            "Predict Resources and Optimize Cost",
            type="primary",
            use_container_width=True,
        )

    if submitted:
        payload = {
            "application_type": application_type,
            "expected_users_per_day": int(expected_users_per_day),
            "concurrent_users": int(concurrent_users),
            "storage_required_gb": int(storage_required_gb),
            "deployment_region": deployment_region,
            "traffic_pattern": traffic_pattern,
        }

        try:
            response = requests.post(
                "http://127.0.0.1:8001/api/predict",
                json=payload,
                timeout=60,
            )

            if response.ok:
                prediction = response.json()

                st.success("Resource prediction completed!")
                st.subheader("Optimization Results")

                col1, col2 = st.columns(2)
                col1.metric(
                    "Predicted vCPU",
                    prediction["predicted_vcpu"],
                )
                col2.metric(
                    "Predicted RAM",
                    f'{prediction["predicted_ram_gb"]} GB',
                )

                st.write(
                    "**Cloud Provider:**",
                    prediction.get("cloud_provider", "N/A"),
                )
                st.write(
                    "**Recommended VM:**",
                    prediction.get("recommended_vm", "N/A"),
                )
                st.write(
                    "**Hourly Cost:**",
                    f'${prediction["price_per_hour_usd"]:.4f}',
                )
                st.write(
                    "**Monthly Cost:**",
                    f'${prediction["monthly_cost_usd"]:.2f}',
                )
                st.write(
                    "**Yearly Cost:**",
                    f'${prediction["yearly_cost_usd"]:.2f}',
                )

                with st.expander("View prediction details"):
                    st.json(prediction)

            else:
                st.error(
                    f"Prediction failed ({response.status_code}): "
                    f"{response.text[:1000]}"
                )

        except requests.exceptions.RequestException as exc:
            st.error(f"Could not reach the prediction backend: {exc}")

# Set up layout
if workflow == "Manual Input":
    # Set up layout
    col_inputs, col_results = st.columns([1, 1.2], gap="large")

    with col_inputs:
        st.subheader("Workload Specifications")
        
        with st.form("input_form"):
            # Application Characteristics
            application_type = st.selectbox(
                "Application Type",
                options=APPLICATION_TYPES,
                index=0,
                help="Select the type of application you are running."
            )
            
            # User details
            expected_users_per_day = st.number_input(
                "Expected Users per Day",
                min_value=1,
                max_value=100000000,
                value=10000,
                step=1000,
                help="Approximate number of unique users accessing the app daily."
            )
            
            concurrent_users = st.number_input(
                "Peak Concurrent Users",
                min_value=1,
                max_value=5000000,
                value=250,
                step=50,
                help="Expected peak concurrent active users."
            )
            
            # Storage required
            storage_required_gb = st.slider(
                "Storage Required (GB)",
                min_value=1,
                max_value=5000,
                value=100,
                step=10,
                help="Volume size needed in gigabytes."
            )
            
            # Region
            deployment_region = st.selectbox(
                "Deployment Region",
                options=REGIONS,
                index=0,
                help="Target deployment region."
            )
            
            # Traffic pattern
            traffic_pattern = st.selectbox(
                "Traffic Pattern",
                options=TRAFFIC_PATTERNS,
                index=1,
                help="Workload traffic intensity."
            )
            
            submit_button = st.form_submit_button(
                "Optimize Cloud Resources 🚀",
                use_container_width=True
            )

    with col_results:
        st.subheader("Optimization Recommendations")
        
        if submit_button:
            # Prepare request payload
            payload = {
                "application_type": application_type,
                "expected_users_per_day": int(expected_users_per_day),
                "concurrent_users": int(concurrent_users),
                "storage_required_gb": int(storage_required_gb),
                "deployment_region": deployment_region,
                "traffic_pattern": traffic_pattern
            }
            
            try:
                # Query FastAPI backend
                backend_url = "http://127.0.0.1:8000/api/predict"
                response = requests.post(
                    backend_url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    result = response.json()
                    
                    # Show results in a clean grid
                    col_cpu, col_ram = st.columns(2)
                    
                    with col_cpu:
                        st.markdown(f"""
                        <div class="metric-card">
                            <div class="metric-value">{result['predicted_vcpu']}</div>
                            <div class="metric-label">Predicted vCPUs</div>
                        </div>
                        """, unsafe_allow_html=True)
                        
                    with col_ram:
                        st.markdown(f"""
                        <div class="metric-card">
                            <div class="metric-value">{result['predicted_ram_gb']} GB</div>
                            <div class="metric-label">Predicted RAM</div>
                        </div>
                        """, unsafe_allow_html=True)
                    
                    # Render recommendation details
                    st.markdown(f"""
                    <div class="rec-card">
                        <div class="rec-title">Recommended Configuration</div>
                        <div class="rec-item">Cloud Provider: <strong>{result['cloud_provider']}</strong></div>
                        <div class="rec-item">VM Instance Type: <strong>{result['recommended_vm']}</strong></div>
                        <div class="rec-item">Hourly Price: <strong>${result['price_per_hour_usd']:.4f} / hr</strong></div>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    # Render cost breakdown
                    st.markdown("### Estimated Cost Breakdown")
                    col_hr, col_mo, col_yr = st.columns(3)
                    
                    with col_hr:
                        st.markdown(f"""
                        <div class="metric-card">
                            <div class="metric-value">${result['price_per_hour_usd']:.3f}</div>
                            <div class="metric-label">Hourly Cost</div>
                        </div>
                        """, unsafe_allow_html=True)
                        
                    with col_mo:
                        st.markdown(f"""
                        <div class="metric-card" style="border-color: #00adb5;">
                            <div class="metric-value" style="color: #00adb5;">${result['monthly_cost_usd']:.2f}</div>
                            <div class="metric-label">Monthly Cost</div>
                        </div>
                        """, unsafe_allow_html=True)
                        
                    with col_yr:
                        st.markdown(f"""
                        <div class="metric-card">
                            <div class="metric-value">${result['yearly_cost_usd']:.2f}</div>
                            <div class="metric-label">Yearly Cost</div>
                        </div>
                        """, unsafe_allow_html=True)
                    
                else:
                    st.error(f"Error {response.status_code}: Could not fetch recommendations. Please check backend logs.")
                    
            except requests.exceptions.ConnectionError:
                st.error("Could not connect to the FastAPI backend. Please make sure the server is running on http://127.0.0.1:8000")
            except Exception as e:
                st.error(f"An unexpected error occurred: {str(e)}")
                
        else:
            # Placeholder before form submission
            st.info("👈 Enter your application details and click 'Optimize Cloud Resources' to see recommendations.")
            
            # Show a summary list of features supported
            st.markdown("""
            ### Features Include:
            - **Automatic Spec Estimation:** Machine learning predicts vCPU and RAM requirements based on your expected traffic levels.
            - **Cheapest VM Selection:** Evaluates AWS, GCP, and Azure pricing tables to find the most cost-effective match.
            - **Billing Projections:** See instant hourly, monthly, and yearly cost breakdowns.
            """)


elif workflow == "Upload ZIP":
    st.subheader("Analyze Your Project ZIP")

    uploaded_file = st.file_uploader(
        "Upload your project",
        type=["zip"],
        help="Upload a ZIP containing your source code and configuration files.",
    )

    if st.button("Analyze ZIP Project", type="primary"):
        if uploaded_file is None:
            st.warning("Please upload a ZIP file first.")
        else:
            try:
                response = requests.post(
                    "http://127.0.0.1:8001/api/analyze/zip",
                    files={
                        "file": (
                            uploaded_file.name,
                            uploaded_file.getvalue(),
                            "application/zip",
                        )
                    },
                    timeout=180,
                )

                if response.ok:
                    st.session_state["zip_analysis_result"] = response.json()
                    st.success("Project analysis completed!")
                else:
                    st.error(
                        f"Analysis failed ({response.status_code}): "
                        f"{response.text[:1000]}"
                    )

            except requests.exceptions.RequestException as exc:
                st.error(f"Could not reach the backend: {exc}")

    result = st.session_state.get("zip_analysis_result")

    if result:
        render_project_workload_form(result, "zip_workload_form")


elif workflow == "Git Repository":
    st.subheader("Analyze a GitHub Repository")

    repository_url = st.text_input(
        "Public GitHub repository URL",
        placeholder="https://github.com/owner/repository",
    )

    if st.button("Analyze Git Repository", type="primary"):
        if not repository_url.strip():
            st.warning("Please enter a repository URL.")
        else:
            try:
                response = requests.post(
                    "http://127.0.0.1:8001/api/analyze/git",
                    json={"repository_url": repository_url.strip()},
                    timeout=180,
                )

                if response.ok:
                    st.session_state["git_analysis_result"] = response.json()
                    st.success("Project analysis completed!")
                else:
                    st.error(
                        f"Analysis failed ({response.status_code}): "
                        f"{response.text[:1000]}"
                    )

            except requests.exceptions.RequestException as exc:
                st.error(f"Could not reach the backend: {exc}")

    result = st.session_state.get("git_analysis_result")

    if result:
        render_project_workload_form(result, "git_workload_form")
