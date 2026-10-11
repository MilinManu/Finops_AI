
import ast
import json
import re
from html.parser import HTMLParser
from pathlib import Path


MAX_FILES = 5000
MAX_FILE_BYTES = 1024 * 1024

IGNORED_DIRS = {
    ".git", ".venv", "venv", "env", "__pycache__",
    "node_modules", "dist", "build", ".next",
    ".idea", ".vscode", "site-packages",
}

EXTENSION_LANGUAGES = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".java": "Java",
    ".cpp": "C++",
    ".cc": "C++",
    ".c": "C",
    ".cs": "C#",
    ".go": "Go",
    ".rs": "Rust",
    ".php": "PHP",
    ".rb": "Ruby",
    ".swift": "Swift",
    ".kt": "Kotlin",
    ".sql": "SQL",
}

FRAMEWORKS = {
    "FastAPI": ["fastapi"],
    "Flask": ["flask"],
    "Django": ["django"],
    "Streamlit": ["streamlit"],
    "Spring Boot": ["spring-boot", "spring boot"],
    "Express": ["express"],
    "NestJS": ["@nestjs/core", "nestjs"],
    "React": ["react"],
    "Next.js": ["next"],
    "Vue": ["vue"],
    "Angular": ["@angular/core"],
    "Fastify": ["fastify"],
    "Laravel": ["laravel"],
    "Ruby on Rails": ["rails"],
}

DATABASE_PATTERNS = {
    "PostgreSQL": [
        "psycopg", "postgresql", "postgres://", "postgresql://",
        "postgresql+",
    ],
    "MySQL": ["mysql", "pymysql", "mysqlclient"],
    "SQLite": ["sqlite", "sqlite3"],
    "MongoDB": ["mongodb", "pymongo", "mongoose"],
    "Redis": ["redis"],
    "SQL Server": ["pyodbc", "mssql"],
    "DynamoDB": ["dynamodb", "boto3"],
}

WORKER_PACKAGES = [
    "celery", "rq", "dramatiq", "huey", "arq",
]


def _read_text(path: Path) -> str:
    try:
        if path.stat().st_size > MAX_FILE_BYTES:
            return ""
        return path.read_text(encoding="utf-8", errors="ignore")
    except (OSError, UnicodeError):
        return ""


def _collect_files(root: Path) -> list[Path]:
    files = []

    for path in root.rglob("*"):
        if any(part in IGNORED_DIRS for part in path.parts):
            continue

        if path.is_file():
            files.append(path)

        if len(files) >= MAX_FILES:
            break

    return files


def _python_routes(text: str) -> tuple[list[dict], int]:
    """Extract simple Python route decorators using AST."""
    routes = []
    websocket_count = 0

    try:
        tree = ast.parse(text)
    except (SyntaxError, ValueError):
        return routes, websocket_count

    methods = {"get", "post", "put", "patch", "delete",
               "options", "head", "api_route", "route"}

    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue

        for decorator in node.decorator_list:
            call = decorator if isinstance(decorator, ast.Call) else None
            target = call.func if call else decorator

            if isinstance(target, ast.Attribute):
                method = target.attr.lower()
            elif isinstance(target, ast.Name):
                method = target.id.lower()
            else:
                continue

            if method in {"websocket", "websocket_route"}:
                websocket_count += 1
                continue

            if method not in methods:
                continue

            path = None
            if call and call.args:
                first = call.args[0]
                if isinstance(first, ast.Constant) and isinstance(
                    first.value, str
                ):
                    path = first.value

            routes.append({
                "method": method.upper(),
                "path": path,
                "function": node.name,
                "file": None,
            })

    return routes, websocket_count


def _count_compose_services(text: str):
    """Best-effort service count without requiring PyYAML."""
    try:
        import yaml

        data = yaml.safe_load(text)
        if isinstance(data, dict) and isinstance(data.get("services"), dict):
            return len(data["services"])
    except Exception:
        pass

    count = 0
    in_services = False
    services_indent = None

    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue

        indent = len(line) - len(line.lstrip())
        stripped = line.strip()

        if indent == 0 and stripped == "services:":
            in_services = True
            services_indent = None
            continue

        if in_services:
            if indent == 0:
                break

            if stripped.startswith("-"):
                continue

            if stripped.endswith(":"):
                if services_indent is None:
                    services_indent = indent
                    count += 1
                elif indent == services_indent:
                    count += 1

    return count if in_services else None



class _HTMLSignalParser(HTMLParser):
    """Extract visible text and metadata from HTML without executing it."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title_parts = []
        self.headings = []
        self.description = []
        self.visible_text = []
        self._capture = None
        self._skip_depth = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        tag = tag.lower()
        if tag in {"script", "style", "noscript", "svg"}:
            self._skip_depth += 1
        if tag == "title":
            self._capture = "title"
        elif tag in {"h1", "h2", "h3"}:
            self._capture = "heading"
            self._current_heading = []
        elif tag == "meta" and attrs.get("name", "").lower() == "description":
            content = (attrs.get("content") or "").strip()
            if content:
                self.description.append(content)

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in {"script", "style", "noscript", "svg"} and self._skip_depth:
            self._skip_depth -= 1
        if tag == "title" and self._capture == "title":
            self._capture = None
        elif tag in {"h1", "h2", "h3"} and self._capture == "heading":
            heading = " ".join(getattr(self, "_current_heading", [])).strip()
            if heading:
                self.headings.append(heading)
            self._capture = None

    def handle_data(self, data):
        value = " ".join(data.split())
        if not value or self._skip_depth:
            return
        if self._capture == "title":
            self.title_parts.append(value)
        elif self._capture == "heading":
            self._current_heading.append(value)
        self.visible_text.append(value)


def _extract_html_signals(text: str) -> dict:
    parser = _HTMLSignalParser()
    try:
        parser.feed(text)
        parser.close()
    except Exception:
        pass
    # Keep this compact so project analysis remains safe to send to a local model.
    return {
        "title": " ".join(parser.title_parts).strip()[:300],
        "description": parser.description[:5],
        "headings": parser.headings[:30],
        "text_excerpt": " ".join(parser.visible_text)[:2500],
    }


def analyze_project(project_root: str) -> dict:
    """Inspect a project directory and return structured evidence."""
    root = Path(project_root).resolve()

    if not root.is_dir():
        raise ValueError("Project directory does not exist.")

    files = _collect_files(root)
    relative_files = [p.relative_to(root).as_posix() for p in files]

    languages = set()
    evidence = []
    all_text = []
    routes = []
    websocket_count = 0

    has_dockerfile = False
    compose_services = None
    has_kubernetes = False
    has_redis = False
    has_workers = False
    databases = set()
    frameworks = set()
    ml_libraries = set()
    html_pages = []

    for path in files:
        rel = path.relative_to(root).as_posix()
        name = path.name.lower()
        text = _read_text(path)

        if path.suffix.lower() in EXTENSION_LANGUAGES:
            languages.add(EXTENSION_LANGUAGES[path.suffix.lower()])

        if text:
            all_text.append(text)

        if path.suffix.lower() in {".html", ".htm"}:
            signals = _extract_html_signals(text)
            if any([signals["title"], signals["description"], signals["headings"], signals["text_excerpt"]]):
                page = {"file": rel, **signals}
                html_pages.append(page)
                if signals["title"]:
                    evidence.append({"file": rel, "fact": f"HTML page title: {signals['title']}"})
                for heading in signals["headings"][:12]:
                    evidence.append({"file": rel, "fact": f"HTML heading: {heading}"})
                for description in signals["description"]:
                    evidence.append({"file": rel, "fact": f"HTML meta description: {description}"})

        if name == "dockerfile" or name.startswith("dockerfile."):
            has_dockerfile = True
            evidence.append({
                "file": rel,
                "fact": "Dockerfile detected",
            })

        if name in {"docker-compose.yml", "docker-compose.yaml",
                    "compose.yml", "compose.yaml"}:
            compose_services = _count_compose_services(text)
            evidence.append({
                "file": rel,
                "fact": "Docker Compose configuration detected",
            })

        if "k8s" in path.parts or "kubernetes" in path.parts:
            has_kubernetes = True

        if path.suffix.lower() == ".py":
            found_routes, found_websockets = _python_routes(text)
            for route in found_routes:
                route["file"] = rel
            routes.extend(found_routes)
            websocket_count += found_websockets

    combined_text = "\n".join(all_text).lower()

    for framework, patterns in FRAMEWORKS.items():
        if any(pattern in combined_text for pattern in patterns):
            frameworks.add(framework)

    for database, patterns in DATABASE_PATTERNS.items():
        if any(pattern in combined_text for pattern in patterns):
            databases.add(database)

    has_redis = "Redis" in databases
    has_workers = any(
        re.search(rf"\b{re.escape(package)}\b", combined_text)
        for package in WORKER_PACKAGES
    )

    for library in [
        "scikit-learn", "sklearn", "torch", "tensorflow",
        "keras", "xgboost", "lightgbm",
    ]:
        if library in combined_text:
            ml_libraries.add(library)

    for framework in sorted(frameworks):
        evidence.append({"fact": f"{framework} detected"})

    for database in sorted(databases):
        evidence.append({"fact": f"{database} usage indicator detected"})

    for library in sorted(ml_libraries):
        evidence.append({"fact": f"ML library indicator: {library}"})

    if has_workers:
        evidence.append({"fact": "Background worker package detected"})

    if has_kubernetes:
        evidence.append({"fact": "Kubernetes-related directory detected"})

    # These are source-code indicators, not measured production workload.
    return {
        "project_root_name": root.name,
        "files_scanned": len(files),
        "file_scan_limit_reached": len(files) >= MAX_FILES,
        "languages": sorted(languages),
        "frameworks": sorted(frameworks),
        "api_endpoint_count": len(routes),
        "api_endpoints": routes[:200],
        "websocket_count": websocket_count,
        "databases_detected": sorted(databases),
        "redis_detected": has_redis,
        "background_workers_detected": has_workers,
        "dockerfile_detected": has_dockerfile,
        "docker_compose_service_count": compose_services,
        "kubernetes_detected": has_kubernetes,
        "ml_libraries_detected": sorted(ml_libraries),
        "html_pages_analyzed": len(html_pages),
        "html_content_signals": html_pages[:20],
        "evidence": evidence[:300],
        "storage_required_gb": None,
        "storage_note": (
            "Source code alone cannot reliably establish production "
            "storage requirements. Ask the user or measure project data."
        ),
        "workload_note": (
            "These are static code indicators. Real traffic, concurrent "
            "users, CPU utilization, and RAM usage are not measured."
        ),
        "files_sample": relative_files[:100],
    }
