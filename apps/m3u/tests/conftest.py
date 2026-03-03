"""
Conftest for m3u tests.

Patches Celery task dispatch so that .delay() / .apply_async() calls in
Django signals (e.g. refresh_m3u_groups fired on M3UAccount.save) are
swallowed during unit tests.  This keeps tests fast and independent of
Redis/Celery infrastructure.
"""

import pytest
from unittest.mock import patch, MagicMock


@pytest.fixture(autouse=True)
def disable_celery_tasks():
    """Patch all Celery task dispatch methods to be no-ops for every test."""
    with patch("celery.app.task.Task.delay", return_value=MagicMock(id="test-task-id")):
        with patch(
            "celery.app.task.Task.apply_async",
            return_value=MagicMock(id="test-task-id"),
        ):
            yield
