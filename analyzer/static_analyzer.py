
import ast
import json
import re
import os
from html.parser import HTMLParser
from pathlib import Path


MAX_FILES = 5000
MAX_FILE_BYTES = 1024 * 1024
MAX_SIGNAL_FILES = 24
MAX_SIGNAL_CHARS = 16000

IGNORED_DIRS = {
    ".git", ".venv", "venv", "env", "__pycache__",
    "node_modules", "dist", "build", ".next",
    ".idea", ".vscode", "site-packages",
}

EXTENSION_LANGUAGES = {
    # Common general-purpose and backend languages
    ".py": "Python", ".pyw": "Python", ".pyi": "Python",
    ".js": "JavaScript", ".mjs": "JavaScript", ".cjs": "JavaScript",
    ".jsx": "JavaScript", ".ts": "TypeScript", ".mts": "TypeScript",
    ".cts": "TypeScript", ".tsx": "TypeScript",
    ".java": "Java", ".c": "C", ".h": "C/C++ Header",
    ".cc": "C++", ".cpp": "C++", ".cxx": "C++", ".hpp": "C++ Header",
    ".hh": "C++ Header", ".hxx": "C++ Header", ".cs": "C#",
    ".go": "Go", ".rs": "Rust", ".php": "PHP", ".rb": "Ruby",
    ".swift": "Swift", ".kt": "Kotlin", ".kts": "Kotlin",
    ".scala": "Scala", ".sc": "Scala", ".groovy": "Groovy", ".gradle": "Gradle/Groovy",
    ".dart": "Dart", ".lua": "Lua", ".pl": "Perl", ".pm": "Perl",
    ".r": "R", ".rmd": "R Markdown", ".jl": "Julia", ".m": "MATLAB/Objective-C",
    ".mlx": "MATLAB", ".ipynb": "Jupyter Notebook",
    ".hs": "Haskell", ".lhs": "Haskell", ".ex": "Elixir", ".exs": "Elixir",
    ".erl": "Erlang", ".hrl": "Erlang Header", ".clj": "Clojure",
    ".cljs": "ClojureScript", ".cljc": "Clojure", ".edn": "EDN",
    ".fs": "F#", ".fsx": "F#", ".fsi": "F#", ".ml": "OCaml", ".mli": "OCaml",
    ".plsql": "PL/SQL", ".sql": "SQL", ".prql": "PRQL",
    ".f": "Fortran", ".for": "Fortran", ".f90": "Fortran", ".f95": "Fortran",
    ".cob": "COBOL", ".cbl": "COBOL", ".sol": "Solidity", ".vy": "Vyper",
    ".asm": "Assembly", ".s": "Assembly", ".v": "Verilog/SystemVerilog",
    ".sv": "SystemVerilog", ".vhd": "VHDL", ".vhdl": "VHDL",
    ".sh": "Shell", ".bash": "Shell", ".zsh": "Shell", ".fish": "Fish",
    ".ps1": "PowerShell", ".psm1": "PowerShell", ".bat": "Batch", ".cmd": "Batch",
    ".html": "HTML", ".htm": "HTML", ".xhtml": "XHTML",
    ".css": "CSS", ".scss": "SCSS", ".sass": "Sass", ".less": "Less",
    ".vue": "Vue SFC", ".svelte": "Svelte", ".astro": "Astro",
    ".json": "JSON", ".jsonc": "JSONC", ".json5": "JSON5",
    ".xml": "XML", ".xsd": "XML Schema", ".xsl": "XSLT", ".xslt": "XSLT",
    ".yaml": "YAML", ".yml": "YAML", ".toml": "TOML", ".ini": "INI",
    ".proto": "Protocol Buffers", ".graphql": "GraphQL", ".gql": "GraphQL",
    ".tf": "Terraform/HCL", ".tfvars": "Terraform/HCL", ".hcl": "HCL",
    ".dockerfile": "Dockerfile", ".make": "Makefile", ".mk": "Makefile",
    ".md": "Markdown", ".mdx": "MDX", ".tex": "LaTeX",
    ".feature": "Gherkin", ".robot": "Robot Framework",
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
    "Bootstrap": ["bootstrap"],
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


def _is_test_or_fixture(path: Path) -> bool:
    parts = {part.casefold() for part in path.parts}
    name = path.name.casefold()
    return bool(
        parts.intersection({"test", "tests", "__tests__", "fixtures", "fixture", "mocks", "__mocks__"})
        or name.startswith(("test_", "tests_"))
        or name.endswith(("_test.py", ".test.js", ".test.jsx", ".test.ts", ".test.tsx", ".spec.js", ".spec.ts"))
    )


def _file_priority(path: Path, root: Path) -> tuple:
    """Prioritize purpose docs, manifests, entry points and production source."""
    rel = path.relative_to(root).as_posix().casefold()
    name = path.name.casefold()
    parts = set(path.parts)
    score = 50
    if name.startswith("readme") or name in {"about.md", "description.md"}:
        score = 0
    elif name in {"pyproject.toml", "package.json", "composer.json", "pom.xml", "cargo.toml", "go.mod", "gemfile", "requirements.txt"}:
        score = 5
    elif name in {"index.html", "app.py", "main.py", "app.jsx", "app.tsx", "app.vue", "main.js", "main.ts", "server.py", "manage.py"}:
        score = 10
    elif any(part in rel for part in ("/src/", "/app/", "/pages/", "/components/", "/routes/", "/controllers/", "/models/", "/views/", "/api/", "/features/")):
        score = 20
    if _is_test_or_fixture(path):
        score += 100
    # Stable ordering makes results reproducible.
    return score, len(path.parts), rel


def _collect_files(root: Path) -> list[Path]:
    """Walk without descending into dependency/build/cache directories."""
    files = []
    ignored = {name.casefold() for name in IGNORED_DIRS}
    for current, dirs, names in os.walk(root, followlinks=False):
        dirs[:] = sorted(d for d in dirs if d.casefold() not in ignored and not d.casefold().startswith((".git", ".venv")))
        for name in names:
            path = Path(current) / name
            try:
                if path.is_file() and not path.is_symlink():
                    files.append(path)
            except OSError:
                continue
    return sorted(files, key=lambda p: _file_priority(p, root))


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

    discovered_files = _collect_files(root)
    scan_truncated = len(discovered_files) > MAX_FILES
    files = discovered_files[:MAX_FILES]
    relative_files = [p.relative_to(root).as_posix() for p in files]

    languages = set()
    language_file_counts = {}
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
    project_text_signals = []

    for path in files:
        rel = path.relative_to(root).as_posix()
        name = path.name.lower()
        text = _read_text(path)

        if path.suffix.lower() in EXTENSION_LANGUAGES:
            language = EXTENSION_LANGUAGES[path.suffix.lower()]
            languages.add(language)
            language_file_counts[language] = language_file_counts.get(language, 0) + 1

        if text:
            # Bound memory and prevent test/fixture text from polluting runtime signals.
            if not _is_test_or_fixture(path):
                all_text.append(text[:5000])

            # Keep a bounded sample of high-value project files; final selection is ranked below.
            # Never send environment files, secrets, or arbitrary entire repositories.
            lower_rel = rel.lower()
            # Padding the relative path makes root-level folders (e.g. components/)
            # match the same folder rules as nested paths (e.g. src/components/).
            padded_rel = "/" + lower_rel.strip("/") + "/"
            sensitive_name = name.startswith(".env") or any(
                token in name for token in ("secret", "credential", "private_key", "id_rsa")
            )
            high_value_name = (
                name in {
                    "readme", "readme.md", "readme.rst", "readme.txt",
                    "models.py", "views.py", "routes.py", "route.py",
                    "controllers.py", "controller.py", "urls.py", "schema.py",
                    "entities.py", "server.py", "app.py", "main.py",
                }
                or name in {"package.json", "pyproject.toml", "requirements.txt"}
                or any(part in padded_rel for part in (
                    "/models/", "/routes/", "/controllers/", "/views/",
                    "/templates/", "/pages/", "/api/", "/components/",
                    "/app/", "/screens/", "/features/",
                ))
            )
            source_suffixes = {
                ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".php",
                ".rb", ".go", ".rs", ".cs", ".html", ".htm", ".vue", ".svelte",
            }
            if (
                high_value_name and not sensitive_name
                and path.suffix.lower() in source_suffixes | {".md", ".rst", ".txt", ".json", ".toml"}
                and len(project_text_signals) < MAX_FILES
            ):
                project_text_signals.append({
                    "file": rel,
                    "text_excerpt": text[:2200],
                })

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

        if path.suffix.lower() == ".py" and not _is_test_or_fixture(path):
            found_routes, found_websockets = _python_routes(text)
            for route in found_routes:
                route["file"] = rel
            routes.extend(found_routes)
            websocket_count += found_websockets

    combined_text = "\n".join(all_text).lower()

    # Prefer package manifests and source-level import patterns over generic
    # substring matching, which can mistake ordinary words like "next" for
    # Next.js or incidental "vue" text for Vue.
    package_names = set()
    for path in files:
        if path.name.lower() == "package.json":
            try:
                package_data = json.loads(_read_text(path) or "{}")
                for section in ("dependencies", "devDependencies", "peerDependencies"):
                    values = package_data.get(section, {})
                    if isinstance(values, dict):
                        package_names.update(str(name).lower() for name in values)
            except (json.JSONDecodeError, AttributeError, TypeError):
                pass

    source_text = "\n".join(
        _read_text(path) for path in files
        if path.suffix.lower() in {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py", ".java", ".php", ".rb", ".go"}
    ).lower()
    for framework, patterns in FRAMEWORKS.items():
        if framework == "Bootstrap":
            has_bootstrap_file = any("bootstrap" in path.name.lower() for path in files)
            has_bootstrap_reference = bool(re.search(
                r"bootstrap(?:\.min)?\.css|bootstrap(?:\.bundle)?(?:\.min)?\.js|class=[\"'][^\"']*\b(?:container-fluid|row|col-md-|navbar-expand|btn-primary)\b",
                combined_text,
            ))
            if "bootstrap" in package_names or has_bootstrap_file or has_bootstrap_reference:
                frameworks.add(framework)
        elif framework == "Next.js":
            if "next" in package_names or re.search(r"from\s+[\"']next/|require\([\"']next(?:/|[\"'])", source_text):
                frameworks.add(framework)
        elif framework == "Vue":
            if "vue" in package_names or re.search(r"from\s+[\"']vue[\"']|createApp\s*\(", source_text):
                frameworks.add(framework)
        elif framework == "React":
            if "react" in package_names or re.search(r"from\s+[\"']react[\"']", source_text):
                frameworks.add(framework)
        elif any(pattern in combined_text for pattern in patterns):
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

    # Select the most informative files within a strict character budget.
    # Keep README/manifests/entry points ahead of arbitrary component order.
    project_text_signals.sort(key=lambda item: _file_priority(root / item.get("file", ""), root))
    selected_signals = []
    remaining_chars = MAX_SIGNAL_CHARS
    for item in project_text_signals:
        if len(selected_signals) >= MAX_SIGNAL_FILES or remaining_chars <= 0:
            break
        excerpt = str(item.get("text_excerpt", ""))[:min(1400, remaining_chars)]
        if not excerpt.strip():
            continue
        selected_signals.append({"file": item.get("file", ""), "text_excerpt": excerpt})
        remaining_chars -= len(excerpt)

    # These are source-code indicators, not measured production workload.
    return {
        "project_root_name": root.name,
        "files_scanned": len(files),
        "files_discovered": len(discovered_files),
        "file_scan_limit_reached": scan_truncated,
        "languages": sorted(languages),
        "language_file_counts": dict(sorted(language_file_counts.items())),
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
        "project_text_signals": selected_signals,
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
