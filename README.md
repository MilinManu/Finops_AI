# FinOps AI --- Intelligent Cloud Cost Optimization

FinOps AI analyzes a software project, estimates its compute
requirements, and compares virtual-machine costs across **AWS, Microsoft
Azure, and Google Cloud Platform (GCP)**.

## Features

-   **Analyze a project:** Submit a public GitHub repository URL or
    upload a ZIP archive.
-   **Detect the technology stack:** Identify languages, frameworks,
    databases, APIs, and infrastructure files.
-   **Classify the workload:** Use a local Ollama language model, with a
    rule-based fallback.
-   **Estimate resources:** Predict required vCPU and RAM from workload
    inputs using a trained machine-learning model.
-   **Compare cloud costs:** Match predicted resources against the
    project's cloud VM catalog and estimate hourly, monthly, and yearly
    costs.
-   **Track activity:** Use account authentication and analysis history.

## Tech Stack

-   **Frontend:** React, TypeScript, Vite, Tailwind CSS
-   **Backend:** Python, FastAPI, Uvicorn
-   **Machine learning:** scikit-learn, Pandas, NumPy
-   **Local AI:** Ollama
-   **Data and pricing:** CSV catalogs; SQLite for
    authentication/history

## Requirements

-   Python 3.10 or later
-   Node.js 18 or later and npm
-   Git
-   Ollama (recommended for AI-based workload classification)

## Run Locally

### 1. Clone the repository

``` bash
git clone https://github.com/MilinManu/Finops_AI.git
cd Finops_AI
```

### 2. Set up the backend

Create and activate a virtual environment.

**Windows PowerShell**

``` powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux**

``` bash
python3 -m venv .venv
source .venv/bin/activate
```

Install the Python dependencies and start the API:

``` bash
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

The API runs at `http://127.0.0.1:8000`. Interactive API documentation
is available at `http://127.0.0.1:8000/docs`.

### 3. Install and start Ollama

Download and install Ollama from
[ollama.com/download](https://ollama.com/download).

Pull the model used by the local AI service:

``` bash
ollama pull qwen2.5:3b
```

Confirm that the model is installed:

``` bash
ollama list
```

Ollama normally runs as a background service after installation. If it
is not running, start it in a separate terminal:

``` bash
ollama serve
```

To test the model directly:

``` bash
ollama run qwen2.5:3b
```

Enter a prompt, then type `/bye` to exit. Keep Ollama running while
using AI-based classification. If Ollama is unavailable, the application
may use its rule-based fallback.

### 4. Start the React frontend

Open a **second terminal** from the repository root:

``` bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

### Optional: Streamlit interface

If you want to use the Python demo interface instead, install the
dependencies above and run:

``` bash
python -m streamlit run frontend/app.py
```

The Streamlit interface is optional; the recommended interface is
React + Vite.

## API Endpoints

  -----------------------------------------------------------------------
  Method                  Endpoint                Purpose
  ----------------------- ----------------------- -----------------------
  `POST`                  `/api/predict`          Predict compute
                                                  resources and compare
                                                  cloud VM costs

  `POST`                  `/api/analyze/git`      Analyze a public GitHub
                                                  repository

  `POST`                  `/api/analyze/zip`      Analyze an uploaded ZIP
                                                  project

  `POST`                  `/api/auth/register`    Create an account

  `POST`                  `/api/auth/login`       Log in and receive a
                                                  token

  `GET`                   `/api/auth/me`          Get the current user's
                                                  profile

  `GET`                   `/api/auth/history`     Retrieve saved
                                                  analysis/prediction
                                                  history
  -----------------------------------------------------------------------

For request schemas and interactive testing, visit
`http://127.0.0.1:8000/docs` after starting the backend.

## Project Layout

``` text
analyzer/   Git/ZIP handling and static code analysis
backend/    FastAPI routes, authentication, and Ollama integration
datasets/   Machine-learning training data
frontend/   React + TypeScript application and optional Streamlit UI
jupyter/    Model exploration, training, and evaluation notebooks
ml/         Prediction logic and cloud pricing/catalog data
models/     Trained model artifacts
```

## Notes

-   Cloud prices are estimates based on the repository's bundled
    catalogs and pricing assumptions; they may not reflect current
    provider prices.
-   Resource recommendations are estimates, not a substitute for
    production monitoring or load testing.
-   Only analyze repositories and archives you are authorized to use.

