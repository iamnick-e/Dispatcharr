"""
Test-only settings that swap PostgreSQL for SQLite so tests can run
without a live database server.  Inherits everything from the main
settings module and only overrides what's necessary.
"""

import os

# Provide SECRET_KEY before importing main settings (it reads env vars)
os.environ.setdefault("DJANGO_SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("DISPATCHARR_TESTING", "1")

from dispatcharr.settings import *  # noqa: F401, F403

SECRET_KEY = "test-secret-key-not-for-production"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# Remove apps that spin up background services incompatible with test env
_SKIP_APPS = {
    "apps.hdhr",                 # starts SSDP multicast sockets
    "apps.hdhr.apps.HdhrConfig",
    "apps.proxy",                # starts HLS proxy server with Redis connections
    "apps.proxy.apps.ProxyConfig",
    "apps.proxy.ts_proxy",       # starts TS proxy with Redis connections + cleanup thread
    "daphne",                    # ASGI server – not needed for unit tests
}
INSTALLED_APPS = [app for app in INSTALLED_APPS if app not in _SKIP_APPS]  # noqa: F405

# Speed up password hashing in tests
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Silence celery/redis noise during tests - use eager mode so no broker needed
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BROKER_URL = "memory://"
CELERY_RESULT_BACKEND = "cache+memory://"
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = False
CELERY_BROKER_CONNECTION_MAX_RETRIES = 0
CELERY_BROKER_TRANSPORT_OPTIONS = {"max_retries": 0}
# Use a dummy Redis URL that won't actually try to connect
REDIS_HOST = "localhost"

# Disable channels layers (avoids needing Redis)
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

# Don't run migrations for unrelated apps (avoids Postgres-specific SQL)
MIGRATION_MODULES = {
    "vod": None,
}
