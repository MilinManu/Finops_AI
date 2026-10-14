"""Fast, bounded static analysis for FinOps AI project repositories."""

import ast
import json
import os
import re
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

MAX_FILES = 1500
MAX_FILE_BYTES = 256 * 1024
MAX_SIGNAL_FILES = 24
MAX_SIGNAL_CHARS = 16000
MAX_SIGNAL_CANDIDATES = MAX_SIGNAL_FILES * 4
MAX_HTML_PAGES = 20
MAX_EVIDENCE = 300

IGNORED_DIRS = {
    ".git", ".venv", "venv", "env", "__pycache__", "node_modules",
    "dist", "build", ".next", ".idea", ".vscode", "site-packages",
    ".turbo", ".cache", "coverage", "vendor", "out", "target",
    ".yarn", ".pnpm-store", "storybook-static", "playwright-report",
    "test-results", ".pytest_cache", ".mypy_cache", ".ruff_cache",
}

EXTENSION_LANGUAGES = {
    ".py": "Python", ".pyw": "Python", ".pyi": "Python",
    ".js": "JavaScript", ".mjs": "JavaScript", ".cjs": "JavaScript",
    ".jsx": "JavaScript", ".ts": "TypeScript", ".mts": "TypeScript",
    ".cts": "TypeScript", ".tsx": "TypeScript", ".java": "Java",
    ".c": "C", ".h": "C/C++ Header", ".cc": "C++", ".cpp": "C++",
    ".cxx": "C++", ".hpp": "C++ Header", ".hh": "C++ Header",
    ".hxx": "C++ Header", ".cs": "C#", ".go": "Go", ".rs": "Rust",
    ".php": "PHP", ".rb": "Ruby", ".swift": "Swift", ".kt": "Kotlin",
    ".kts": "Kotlin", ".scala": "Scala", ".sc": "Scala",
    ".groovy": "Groovy", ".gradle": "Gradle/Groovy", ".dart": "Dart",
    ".lua": "Lua", ".pl": "Perl", ".pm": "Perl", ".r": "R",
    ".rmd": "R Markdown", ".jl": "Julia", ".m": "MATLAB/Objective-C",
    ".mlx": "MATLAB", ".ipynb": "Jupyter Notebook", ".hs": "Haskell",
    ".lhs": "Haskell", ".ex": "Elixir", ".exs": "Elixir",
    ".erl": "Erlang", ".hrl": "Erlang Header", ".clj": "Clojure",
    ".cljs": "ClojureScript", ".cljc": "Clojure", ".edn": "EDN",
    ".fs": "F#", ".fsx": "F#", ".fsi": "F#", ".ml": "OCaml",
    ".mli": "OCaml", ".plsql": "PL/SQL", ".sql": "SQL", ".prql": "PRQL",
    ".f": "Fortran", ".for": "Fortran", ".f90": "Fortran", ".f95": "Fortran",
    ".cob": "COBOL", ".cbl": "COBOL", ".sol": "Solidity", ".vy": "Vyper",
    ".asm": "Assembly", ".s": "Assembly", ".v": "Verilog/SystemVerilog",
    ".sv": "SystemVerilog", ".vhd": "VHDL", ".vhdl": "VHDL",
    ".sh": "Shell", ".bash": "Shell", ".zsh": "Shell", ".fish": "Fish",
    ".ps1": "PowerShell", ".psm1": "PowerShell", ".bat": "Batch", ".cmd": "Batch",
    ".html": "HTML", ".htm": "HTML", ".xhtml": "XHTML", ".css": "CSS",
    ".scss": "SCSS", ".sass": "Sass", ".less": "Less", ".vue": "Vue SFC",
    ".svelte": "Svelte", ".astro": "Astro", ".json": "JSON", ".jsonc": "JSONC",
    ".json5": "JSON5", ".xml": "XML", ".xsd": "XML Schema", ".xsl": "XSLT",
    ".xslt": "XSLT", ".yaml": "YAML", ".yml": "YAML", ".toml": "TOML",
    ".ini": "INI", ".proto": "Protocol Buffers", ".graphql": "GraphQL",
    ".gql": "GraphQL", ".tf": "Terraform/HCL", ".tfvars": "Terraform/HCL",
    ".hcl": "HCL", ".dockerfile": "Dockerfile", ".make": "Makefile",
    ".mk": "Makefile", ".md": "Markdown", ".mdx": "MDX", ".tex": "LaTeX",
    ".feature": "Gherkin", ".robot": "Robot Framework",
}

# Only read likely text/config/source files. Other extensions still contribute to
# language counts, but opening binary/media files is unnecessary for this analysis.
TEXT_EXTENSIONS = {
    ".py", ".pyw", ".pyi", ".js", ".mjs", ".cjs", ".jsx", ".ts", ".mts",
    ".cts", ".tsx", ".java", ".c", ".h", ".cc", ".cpp", ".cxx", ".hpp",
    ".hh", ".hxx", ".cs", ".go", ".rs", ".php", ".rb", ".swift", ".kt",
    ".kts", ".scala", ".sc", ".groovy", ".gradle", ".dart", ".lua", ".pl",
    ".pm", ".r", ".rmd", ".jl", ".m", ".mlx", ".hs", ".lhs", ".ex", ".exs",
    ".erl", ".hrl", ".clj", ".cljs", ".cljc", ".edn", ".fs", ".fsx", ".fsi",
    ".ml", ".mli", ".plsql", ".sql", ".prql", ".f", ".for", ".f90", ".f95",
    ".cob", ".cbl", ".sol", ".vy", ".asm", ".s", ".v", ".sv", ".vhd", ".vhdl",
    ".sh", ".bash", ".zsh", ".fish", ".ps1", ".psm1", ".bat", ".cmd", ".html",
    ".htm", ".xhtml", ".css", ".scss", ".sass", ".less", ".vue", ".svelte",
    ".astro", ".json", ".jsonc", ".json5", ".xml", ".xsd", ".xsl", ".xslt",
    ".yaml", ".yml", ".toml", ".ini", ".proto", ".graphql", ".gql", ".tf",
    ".tfvars", ".hcl", ".md", ".mdx", ".tex", ".feature", ".robot", ".txt",
    ".rst", ".cfg", ".conf", ".properties", ".gradle", ".dockerignore",
}

FRAMEWORKS = {
    "FastAPI": ["fastapi"], "Flask": ["flask"], "Django": ["django"],
    "Streamlit": ["streamlit"], "Spring Boot": ["spring-boot", "spring boot"],
    "Express": ["express"], "NestJS": ["@nestjs/core", "nestjs"],
    "React": ["react"], "Next.js": ["next"], "Vue": ["vue"],
    "Angular": ["@angular/core"], "Fastify": ["fastify"], "Laravel": ["laravel"],
    "Ruby on Rails": ["rails"], "Bootstrap": ["bootstrap"],
}

DATABASE_PATTERNS = {
    "PostgreSQL": ["psycopg", "postgresql", "postgres://", "postgresql://", "postgresql+"],
    "MySQL": ["mysql", "pymysql", "mysqlclient"],
    "SQLite": ["sqlite", "sqlite3"],
    "MongoDB": ["mongodb", "pymongo", "mongoose"],
    "Redis": ["redis"],
    "SQL Server": ["pyodbc", "mssql"],
    "DynamoDB": ["dynamodb", "boto3"],
}

WORKER_PACKAGES = ["celery", "rq", "dramatiq", "huey", "arq"]
SOURCE_SUFFIXES = {
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py", ".java", ".php",
    ".rb", ".go", ".rs", ".cs", ".vue", ".svelte", ".astro",
}
MANIFEST_NAMES = {
    "package.json", "pyproject.toml", "requirements.txt", "composer.json",
    "pom.xml", "cargo.toml", "go.mod", "gemfile", "docker-compose.yml",
    "docker-compose.yaml", "compose.yml", "compose.yaml",
}


def _read_text(path: Path) -> str:
    """Read a bounded text file; return an empty string on unreadable files."""
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
        parts.intersection({
            "test", "tests", "__tests__", "fixtures", "fixture",
            "mocks", "__mocks__",
        })
        or name.startswith(("test_", "tests_"))
        or name.endswith((
            "_test.py", ".test.js", ".test.jsx", ".test.ts",
            ".test.tsx", ".spec.js", ".spec.ts",
        ))
    )


def _file_priority(path: Path, root: Path) -> tuple:
    """Prioritize project documentation, manifests, entry points and source files."""
    rel = path.relative_to(root).as_posix().casefold()
    name = path.name.casefold()
    score = 50
    if name.startswith("readme") or name in {"about.md", "description.md"}:
        score = 0
    elif name in {
        "pyproject.toml", "package.json", "composer.json", "pom.xml",
        "cargo.toml", "go.mod", "gemfile", "requirements.txt",
    }:
        score = 5
    elif name in {
        "index.html", "app.py", "main.py", "app.jsx", "app.tsx",
        "app.vue", "main.js", "main.ts", "server.py", "manage.py",
    }:
        score = 10
    elif any(
        part in f"/{rel}/"
        for part in (
            "/src/", "/app/", "/pages/", "/components/", "/routes/",
            "/controllers/", "/models/", "/views/", "/api/", "/features/",
        )
    ):
        score = 20
    if _is_test_or_fixture(path):
        score += 100
    return score, len(path.parts), rel


def _collect_files(root: Path) -> list[Path]:
    """Collect candidate files while pruning ignored directories during traversal."""
    files: list[Path] = []
    ignored = {name.casefold() for name in IGNORED_DIRS}
    for current, dirs, names in os.walk(root, followlinks=False):
        dirs[:] = sorted(
            d for d in dirs
            if d.casefold() not in ignored
            and not d.casefold().startswith((".git", ".venv"))
        )
        for name in names:
            path = Path(current) / name
            try:
                if not path.is_symlink():
                    files.append(path)
            except OSError:
                continue
    files.sort(key=lambda p: _file_priority(p, root))
    return files


def _python_routes(text: str) -> tuple[list[dict[str, Any]], int]:
    """Extract basic Python route decorators using the AST."""
    routes: list[dict[str, Any]] = []
    websocket_count = 0
    try:
        tree = ast.parse(text)
    except (SyntaxError, ValueError, TypeError):
        return routes, websocket_count

    methods = {
        "get", "post", "put", "patch", "delete", "options", "head",
        "api_route", "route",
    }
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
            route_path = None
            if call and call.args:
                first = call.args[0]
                if isinstance(first, ast.Constant) and isinstance(first.value, str):
                    route_path = first.value
            routes.append({
                "method": method.upper(),
                "path": route_path,
                "function": node.name,
                "file": None,
            })
    return routes, websocket_count


def _count_compose_services(text: str):
    """Best-effort Docker Compose service count without requiring PyYAML."""
    try:
        import yaml  # Optional dependency.
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
    """Extract basic visible text and metadata from HTML without executing it."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title_parts: list[str] = []
        self.headings: list[str] = []
        self.description: list[str] = []
        self.visible_text: list[str] = []
        self._capture = None
        self._current_heading: list[str] = []
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
            heading = " ".join(self._current_heading).strip()
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
    return {
        "title": " ".join(parser.title_parts).strip()[:300],
        "description": parser.description[:5],
        "headings": parser.headings[:30],
        "text_excerpt": " ".join(parser.visible_text)[:2500],
    }


def analyze_project(project_root: str) -> dict:
    """Inspect a project directory and return bounded, structured evidence."""
    root = Path(project_root).resolve()
    if not root.is_dir():
        raise ValueError("Project directory does not exist.")

    discovered_files = _collect_files(root)
    scan_truncated = len(discovered_files) > MAX_FILES
    files = discovered_files[:MAX_FILES]
    relative_files = [p.relative_to(root).as_posix() for p in files]

    languages: set[str] = set()
    language_file_counts: dict[str, int] = {}
    evidence: list[dict[str, str]] = []
    all_text: list[str] = []
    text_by_path: dict[Path, str] = {}
    routes: list[dict[str, Any]] = []
    websocket_count = 0
    has_dockerfile = False
    compose_services = None
    has_kubernetes = False
    databases: set[str] = set()
    frameworks: set[str] = set()
    ml_libraries: set[str] = set()
    html_pages: list[dict[str, Any]] = []
    project_text_signals: list[dict[str, str]] = []
    test_file_cache: dict[Path, bool] = {}

    for path in files:
        rel = path.relative_to(root).as_posix()
        name = path.name.lower()
        suffix = path.suffix.lower()
        language = EXTENSION_LANGUAGES.get(suffix)
        if language:
            languages.add(language)
            language_file_counts[language] = language_file_counts.get(language, 0) + 1

        is_dockerfile = name == "dockerfile" or name.startswith("dockerfile.")
        is_compose = name in {
            "docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml",
        }
        is_text_candidate = (
            suffix in TEXT_EXTENSIONS
            or is_dockerfile
            or is_compose
            or name in {
                "readme", "license", "makefile", "procfile", "gemfile", "go.mod",
                "cargo.toml", "requirements.txt", "pyproject.toml", "package.json",
                "composer.json", "pom.xml",
            }
        )

        if path not in test_file_cache:
            test_file_cache[path] = _is_test_or_fixture(path)
        is_test_file = test_file_cache[path]

        if not is_text_candidate:
            continue

        text = _read_text(path)
        text_by_path[path] = text
        if not text:
            continue

        if not is_test_file:
            all_text.append(text[:5000])

        lower_rel = rel.lower()
        padded_rel = "/" + lower_rel.strip("/") + "/"
        sensitive_name = name.startswith(".env") or any(
            token in name for token in ("secret", "credential", "private_key", "id_rsa")
        )
        high_value_name = (
            name.startswith("readme")
            or name in {
                "about.md", "description.md", "models.py", "views.py", "routes.py",
                "route.py", "controllers.py", "controller.py", "urls.py", "schema.py",
                "entities.py", "server.py", "app.py", "main.py", "package.json",
                "pyproject.toml", "requirements.txt", "index.html",
            }
            or any(
                part in padded_rel
                for part in (
                    "/models/", "/routes/", "/controllers/", "/views/", "/templates/",
                    "/pages/", "/api/", "/components/", "/app/", "/screens/", "/features/",
                )
            )
        )
        if (
            high_value_name
            and not sensitive_name
            and (
                suffix in SOURCE_SUFFIXES
                or suffix in {".md", ".rst", ".txt", ".json", ".toml", ".html", ".htm"}
            )
            and len(project_text_signals) < MAX_SIGNAL_CANDIDATES
        ):
            project_text_signals.append({"file": rel, "text_excerpt": text[:2200]})

        if suffix in {".html", ".htm"} and len(html_pages) < MAX_HTML_PAGES:
            signals = _extract_html_signals(text)
            if any((signals["title"], signals["description"], signals["headings"], signals["text_excerpt"])):
                html_pages.append({"file": rel, **signals})
                if signals["title"] and len(evidence) < MAX_EVIDENCE:
                    evidence.append({"file": rel, "fact": f"HTML page title: {signals['title']}"})
                for heading in signals["headings"][:12]:
                    if len(evidence) >= MAX_EVIDENCE:
                        break
                    evidence.append({"file": rel, "fact": f"HTML heading: {heading}"})
                for description in signals["description"]:
                    if len(evidence) >= MAX_EVIDENCE:
                        break
                    evidence.append({"file": rel, "fact": f"HTML meta description: {description}"})

        if is_dockerfile:
            has_dockerfile = True
            if len(evidence) < MAX_EVIDENCE:
                evidence.append({"file": rel, "fact": "Dockerfile detected"})
        if is_compose:
            compose_services = _count_compose_services(text)
            if len(evidence) < MAX_EVIDENCE:
                evidence.append({"file": rel, "fact": "Docker Compose configuration detected"})
        if any(part.lower() in {"k8s", "kubernetes"} for part in path.parts):
            has_kubernetes = True
        if suffix == ".py" and not is_test_file:
            found_routes, found_websockets = _python_routes(text)
            for route in found_routes:
                route["file"] = rel
            routes.extend(found_routes)
            websocket_count += found_websockets

    combined_text = "\n".join(all_text).lower()

    package_names: set[str] = set()
    for path in files:
        if path.name.lower() != "package.json":
            continue
        try:
            package_data = json.loads(text_by_path.get(path, "") or "{}")
            if not isinstance(package_data, dict):
                continue
            for section in ("dependencies", "devDependencies", "peerDependencies"):
                values = package_data.get(section, {})
                if isinstance(values, dict):
                    package_names.update(str(name).lower() for name in values)
        except (json.JSONDecodeError, AttributeError, TypeError):
            continue

    # Reuse bounded text rather than building another full source-code string.
    source_text = combined_text

    for framework, patterns in FRAMEWORKS.items():
        if framework == "Bootstrap":
            has_bootstrap_file = any("bootstrap" in path.name.lower() for path in files)
            has_bootstrap_reference = bool(re.search(
                r"""bootstrap(?:\.min)?\.css|bootstrap(?:\.bundle)?(?:\.min)?\.js|class=["'][^\\"']*\b(?:container-fluid|row|col-md-|navbar-expand|btn-primary)\b""",
                combined_text,
            ))
            if "bootstrap" in package_names or has_bootstrap_file or has_bootstrap_reference:
                frameworks.add(framework)
        elif framework == "Next.js":
            if "next" in package_names or re.search(
                r"""from\s+["']next/|require\(["']next(?:/|["'])""", source_text
            ):
                frameworks.add(framework)
        elif framework == "Vue":
            if "vue" in package_names or re.search(
                r"""from\s+["']vue["']|createApp\s*\(""", source_text
            ):
                frameworks.add(framework)
        elif framework == "React":
            if "react" in package_names or re.search(r"""from\s+["']react["']""", source_text):
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
    for library in ("scikit-learn", "sklearn", "torch", "tensorflow", "keras", "xgboost", "lightgbm"):
        if library in combined_text:
            ml_libraries.add(library)

    for framework in sorted(frameworks):
        if len(evidence) < MAX_EVIDENCE:
            evidence.append({"fact": f"{framework} detected"})
    for database in sorted(databases):
        if len(evidence) < MAX_EVIDENCE:
            evidence.append({"fact": f"{database} usage indicator detected"})
    for library in sorted(ml_libraries):
        if len(evidence) < MAX_EVIDENCE:
            evidence.append({"fact": f"ML library indicator: {library}"})
    if has_workers and len(evidence) < MAX_EVIDENCE:
        evidence.append({"fact": "Background worker package detected"})
    if has_kubernetes and len(evidence) < MAX_EVIDENCE:
        evidence.append({"fact": "Kubernetes-related directory detected"})

    project_text_signals.sort(
        key=lambda item: _file_priority(root / item.get("file", ""), root)
    )
    selected_signals: list[dict[str, str]] = []
    remaining_chars = MAX_SIGNAL_CHARS
    for item in project_text_signals:
        if len(selected_signals) >= MAX_SIGNAL_FILES or remaining_chars <= 0:
            break
        excerpt = str(item.get("text_excerpt", ""))[:min(1400, remaining_chars)]
        if not excerpt.strip():
            continue
        selected_signals.append({"file": item.get("file", ""), "text_excerpt": excerpt})
        remaining_chars -= len(excerpt)

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
        "html_content_signals": html_pages[:MAX_HTML_PAGES],
        "project_text_signals": selected_signals,
        "evidence": evidence[:MAX_EVIDENCE],
        "storage_required_gb": None,
        "storage_note": "Source code alone cannot reliably establish production storage requirements. Ask the user or measure project data.",
        "workload_note": "These are static code indicators. Real traffic, concurrent users, CPU utilization, and RAM usage are not measured.",
        "files_sample": relative_files[:100],
    }
