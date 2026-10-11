
import os
import shutil
import stat
import tempfile
import zipfile
from pathlib import Path, PurePosixPath, PureWindowsPath


MAX_ARCHIVE_BYTES = 50 * 1024 * 1024
MAX_EXTRACTED_BYTES = 200 * 1024 * 1024
MAX_ENTRIES = 5000
MAX_SINGLE_FILE_BYTES = 50 * 1024 * 1024


def safe_extract_zip(zip_path: str) -> str:
    """Extract a ZIP into a temporary directory and return its path."""
    if not zipfile.is_zipfile(zip_path):
        raise ValueError("The uploaded file is not a valid ZIP archive.")

    if os.path.getsize(zip_path) > MAX_ARCHIVE_BYTES:
        raise ValueError("ZIP archive exceeds the 50 MB limit.")

    destination = tempfile.mkdtemp(prefix="finops_zip_")
    total_size = 0

    try:
        with zipfile.ZipFile(zip_path) as archive:
            entries = archive.infolist()

            if len(entries) > MAX_ENTRIES:
                raise ValueError("ZIP contains too many entries.")

            for entry in entries:
                name = entry.filename

                if "\x00" in name:
                    raise ValueError("ZIP contains an invalid filename.")

                posix_path = PurePosixPath(name)
                windows_path = PureWindowsPath(name)

                if (
                    posix_path.is_absolute()
                    or windows_path.is_absolute()
                    or windows_path.drive
                    or ".." in posix_path.parts
                    or ".." in windows_path.parts
                ):
                    raise ValueError("ZIP contains an unsafe file path.")

                unix_mode = entry.external_attr >> 16
                if stat.S_ISLNK(unix_mode):
                    raise ValueError("ZIP symbolic links are not allowed.")

                if entry.file_size > MAX_SINGLE_FILE_BYTES:
                    raise ValueError("A file inside the ZIP exceeds 50 MB.")

                total_size += entry.file_size
                if total_size > MAX_EXTRACTED_BYTES:
                    raise ValueError("Extracted ZIP contents exceed 200 MB.")

            root = Path(destination).resolve()

            for entry in entries:
                if entry.is_dir():
                    continue

                relative = Path(*PurePosixPath(entry.filename).parts)
                target = (root / relative).resolve()

                if target != root and root not in target.parents:
                    raise ValueError("ZIP contains an unsafe file path.")

                target.parent.mkdir(parents=True, exist_ok=True)

                with archive.open(entry) as source, open(target, "wb") as output:
                    shutil.copyfileobj(source, output)

        return destination

    except Exception:
        shutil.rmtree(destination, ignore_errors=True)
        raise
