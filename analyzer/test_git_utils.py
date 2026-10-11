
from analyzer.git_utils import validate_git_url


def test_valid_urls():
    assert validate_git_url(
        "https://github.com/pallets/flask"
    ) == "https://github.com/pallets/flask.git"

    assert validate_git_url(
        "https://github.com/pallets/flask.git"
    ) == "https://github.com/pallets/flask.git"


def test_invalid_urls():
    invalid_urls = [
        "http://github.com/pallets/flask",
        "https://example.com/pallets/flask",
        "https://github.com/",
        "https://github.com/pallets/flask?token=abc",
        "https://user:password@github.com/pallets/flask",
    ]

    for url in invalid_urls:
        try:
            validate_git_url(url)
        except ValueError:
            continue
        raise AssertionError(f"URL should have been rejected: {url}")


if __name__ == "__main__":
    test_valid_urls()
    test_invalid_urls()
    print("All Git URL validation tests passed!")
