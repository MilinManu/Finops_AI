
import logging
import os
import re
import shutil
import subprocess
import tempfile
import time
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

MAX_DOWNLOAD_SECONDS = 120


def validate_git_url(url: str) -> str:
    """Allow public HTTPS GitHub repository URLs only."""
    url = url.strip()
    parsed = urlparse(url)

    if parsed.scheme != "https":
        raise ValueError("Only HTTPS Git repository URLs are supported.")

    if parsed.hostname not in {"github.com", "www.github.com"}:
        raise ValueError("Only GitHub repositories are currently supported.")

    if parsed.username or parsed.password:
        raise ValueError("Do not include credentials in the repository URL.")

    if parsed.port is not None:
        raise ValueError("Custom URL ports are not supported.")

    if parsed.query or parsed.fragment:
        raise ValueError("Remove query parameters and fragments from the URL.")

    match = re.fullmatch(
        r"/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?/?",
        parsed.path,
    )

    if not match:
        raise ValueError(
            "Enter a GitHub repository URL, such as "
            "https://github.com/owner/repository"
        )

    owner, repo = match.groups()

    if owner in {".", ".."} or repo in {".", ".."}:
        raise ValueError("Invalid repository path.")

    return f"https://github.com/{owner}/{repo}.git"


def download_git_repository(url: str) -> str:
    """
    Clone a public GitHub repository into a temporary directory.

    Returns the directory containing the downloaded project.
    The caller must remove it after analysis.
    """
    git_url = validate_git_url(url)
    temp_dir = tempfile.mkdtemp(prefix="finops_git_")

    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"
    env["GIT_CONFIG_NOSYSTEM"] = "1"
    env["GIT_LFS_SKIP_SMUDGE"] = "1"

    command = [
        "git",
        "-c", "protocol.file.allow=never",
        "-c", "protocol.ext.allow=never",
        "-c", "core.longpaths=true",
        "clone",
        "--depth", "1",
        "--single-branch",
        "--no-recurse-submodules",
        "--filter=blob:limit=1m",
        "--",
        git_url,
        temp_dir,
    ]

    start = time.perf_counter()

    try:
        logger.info("Git download: starting shallow clone")

        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=MAX_DOWNLOAD_SECONDS,
            env=env,
            check=False,
        )

        elapsed = time.perf_counter() - start
        logger.info("Git download: clone process finished in %.2f seconds",
                    elapsed)

        if result.returncode != 0:
            has_files = (
                os.path.isdir(temp_dir)
                and any(name != ".git" for name in os.listdir(temp_dir))
            )

            if "Clone succeeded" in result.stderr and has_files:
                logger.warning(
                    "Git clone reported checkout problems; continuing "
                    "because project files are present."
                )
                return temp_dir

            raise RuntimeError(
                "Repository download failed. Check that the repository "
                "is public and the Git URL is correct. "
                + result.stderr[-1000:]
            )

        logger.info("Git download: repository ready for analysis")
        return temp_dir

    except subprocess.TimeoutExpired as exc:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise RuntimeError(
            f"Repository download exceeded {MAX_DOWNLOAD_SECONDS} seconds."
        ) from exc

    except Exception:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise
