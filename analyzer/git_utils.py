
import os
import re
import shutil
import subprocess
import tempfile
from urllib.parse import urlparse


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
    The caller must remove that directory after analysis.
    """
    git_url = validate_git_url(url)
    temp_dir = tempfile.mkdtemp(prefix="finops_git_")

    # Restrict Git operations to HTTPS and disable interactive prompts.
    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"
    env["GIT_CONFIG_NOSYSTEM"] = "1"
    env["GIT_LFS_SKIP_SMUDGE"] = "1"

    try:
        result = subprocess.run(
            [
                "git",
                "-c", "protocol.file.allow=never",
                "-c", "protocol.ext.allow=never",
                "clone",
                "--depth", "1",
                "--single-branch",
                "--no-recurse-submodules",
                "--filter=blob:limit=1m",
                "--",
                git_url,
                temp_dir,
            ],
            capture_output=True,
            text=True,
            timeout=MAX_DOWNLOAD_SECONDS,
            env=env,
            check=False,
        )

        if result.returncode != 0:
            raise RuntimeError(
                "Repository download failed. Check that the repository "
                "is public and the Git URL is correct. "
                + result.stderr[-1000:]
            )

        return temp_dir

    except Exception:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise
