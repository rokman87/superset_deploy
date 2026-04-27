# syntax=docker/dockerfile:1.7

######################################################################
# Common build args
######################################################################
ARG PY_VER=3.11.13-slim-bookworm
ARG BUILDPLATFORM=linux/amd64
ARG BUILD_TRANSLATIONS=true

######################################################################
# Node stage to build frontend assets
######################################################################
FROM --platform=${BUILDPLATFORM} node:20-bookworm-slim AS superset-node-ci

ARG BUILD_TRANSLATIONS
ARG DEV_MODE=false
ARG NPM_BUILD_CMD=build

ENV BUILD_TRANSLATIONS=${BUILD_TRANSLATIONS}
ENV DEV_MODE=${DEV_MODE}
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
ENV NODE_OPTIONS=--max_old_space_size=6144
ENV BUILD_CMD=${NPM_BUILD_CMD}
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY docker/ /app/docker/

RUN /app/docker/apt-install.sh \
    build-essential \
    python3 \
    zstd \
    git \
    ca-certificates \
    chromium

RUN /app/docker/frontend-mem-nag.sh

WORKDIR /app/superset-frontend

RUN mkdir -p /app/superset/static/assets /app/superset/translations

COPY superset-frontend /app/superset-frontend

RUN --mount=type=cache,target=/root/.cache \
    --mount=type=cache,target=/root/.npm \
    if [ "$DEV_MODE" = "false" ]; then \
        npm config set legacy-peer-deps true && \
        npm config set registry https://registry.npmjs.org/ && \
        npm config set prefer-offline true && \
        npm config set maxsockets 5 && \
        npm config set fetch-retries 10 && \
        npm config set fetch-retry-mintimeout 20000 && \
        npm config set fetch-retry-maxtimeout 120000 && \
        npm config set fetch-timeout 1200000 && \
        npm config set progress false && \
        echo "Running npm install" && \
        npm install --legacy-peer-deps --no-audit --no-fund; \
    else \
        echo "Skipping npm install in dev mode"; \
    fi

######################################################################
# Frontend build stage
######################################################################
FROM superset-node-ci AS superset-node

ARG DEV_MODE=false
ENV DEV_MODE=${DEV_MODE}
ENV NODE_OPTIONS=--max_old_space_size=12288

RUN --mount=type=cache,target=/root/.npm \
    if [ "$DEV_MODE" = "false" ]; then \
        echo "Running 'npm run ${BUILD_CMD}'"; \
        npm run ${BUILD_CMD}; \
    else \
        echo "Skipping 'npm run ${BUILD_CMD}' in dev mode"; \
    fi

COPY superset/translations /app/superset/translations

RUN if [ "$BUILD_TRANSLATIONS" = "true" ]; then \
        npm run build-translation; \
    fi && \
    rm -rf /app/superset/translations/*/*/*.po && \
    rm -rf /app/superset/translations/*/*/*.mo

######################################################################
# Base python layer
######################################################################
FROM python:${PY_VER} AS python-base

ARG SUPERSET_HOME=/app/superset_home

ENV SUPERSET_HOME=${SUPERSET_HOME}
ENV PATH=/app/.venv/bin:${PATH}

# More tolerant network settings for uv
ENV UV_HTTP_TIMEOUT=120
ENV UV_HTTP_RETRIES=10
ENV UV_INDEX=https://pypi.org/simple

RUN mkdir -p ${SUPERSET_HOME}

RUN useradd --user-group -d ${SUPERSET_HOME} -m --no-log-init --shell /bin/bash superset \
    && chmod -R 1777 ${SUPERSET_HOME} \
    && chown -R superset:superset ${SUPERSET_HOME}

COPY --chmod=755 docker/*.sh /app/docker/

RUN pip install --no-cache-dir --upgrade pip setuptools wheel uv

RUN uv venv /app/.venv

######################################################################
# Python translation compiler layer
######################################################################
FROM python-base AS python-translation-compiler

ARG BUILD_TRANSLATIONS
ENV BUILD_TRANSLATIONS=${BUILD_TRANSLATIONS}

COPY requirements/translations.txt requirements/

RUN --mount=type=cache,target=/root/.cache/uv \
    . /app/.venv/bin/activate && \
    /app/docker/pip-install.sh --requires-build-essential -r requirements/translations.txt

COPY superset/translations/ /app/translations_mo/

RUN if [ "$BUILD_TRANSLATIONS" = "true" ]; then \
        pybabel compile -d /app/translations_mo || true; \
    fi && \
    rm -f /app/translations_mo/*/*/*.po && \
    rm -f /app/translations_mo/*/*/*.json

######################################################################
# Common Python app layer
######################################################################
FROM python-base AS python-common

ENV SUPERSET_HOME=/app/superset_home \
    HOME=/app/superset_home \
    SUPERSET_ENV=production \
    FLASK_APP="superset.app:create_app()" \
    PYTHONPATH=/app/pythonpath \
    SUPERSET_PORT=8088

COPY --chmod=755 docker/entrypoints /app/docker/entrypoints

WORKDIR /app

RUN mkdir -p \
      ${PYTHONPATH} \
      superset/static \
      requirements \
      superset-frontend \
      apache_superset.egg-info \
    && touch superset/static/version_info.json

ARG INCLUDE_CHROMIUM=false
ARG INCLUDE_FIREFOX=false

RUN --mount=type=cache,target=${SUPERSET_HOME}/.cache/uv \
    if [ "$INCLUDE_CHROMIUM" = "true" ] || [ "$INCLUDE_FIREFOX" = "true" ]; then \
        uv pip install playwright && \
        playwright install-deps && \
        if [ "$INCLUDE_CHROMIUM" = "true" ]; then playwright install chromium; fi && \
        if [ "$INCLUDE_FIREFOX" = "true" ]; then playwright install firefox; fi; \
    else \
        echo "Skipping browser installation"; \
    fi

COPY pyproject.toml setup.py MANIFEST.in README.md ./
COPY superset-frontend/package.json superset-frontend/
COPY scripts/check-env.py scripts/

COPY --chmod=755 ./docker/entrypoints/run-server.sh /usr/bin/

RUN /app/docker/apt-install.sh \
      curl \
      libsasl2-dev \
      libsasl2-modules-gssapi-mit \
      libpq-dev \
      libecpg-dev \
      libldap2-dev \
      chromium

COPY --from=superset-node /app/superset/static/assets superset/static/assets

COPY superset superset

RUN rm -f superset/translations/*/*/*.po || true

COPY --from=superset-node /app/superset/translations superset/translations
COPY --from=python-translation-compiler /app/translations_mo superset/translations

HEALTHCHECK CMD /app/docker/docker-healthcheck.sh
CMD ["/app/docker/entrypoints/run-server.sh"]
EXPOSE ${SUPERSET_PORT}

######################################################################
# Lean production image
######################################################################
FROM python-common AS lean

COPY requirements/base.txt requirements/

# First try with uv, fallback to pip if network with uv is unstable
RUN --mount=type=cache,target=${SUPERSET_HOME}/.cache/uv \
    --mount=type=cache,target=/root/.cache/pip \
    bash -lc '\
      set -e; \
      echo "Installing Python dependencies from requirements/base.txt"; \
      if ! /app/docker/pip-install.sh --requires-build-essential -r requirements/base.txt; then \
        echo "uv/pip-install.sh failed, falling back to plain pip"; \
        apt-get update && apt-get install -y --no-install-recommends build-essential && \
        python -m pip install --no-cache-dir -r requirements/base.txt && \
        apt-get purge -y build-essential && \
        apt-get autoremove -y && \
        rm -rf /var/lib/apt/lists/*; \
      fi'

RUN --mount=type=cache,target=${SUPERSET_HOME}/.cache/uv \
    --mount=type=cache,target=/root/.cache/pip \
    bash -lc '\
      set -e; \
      if ! uv pip install -e .; then \
        echo "uv editable install failed, falling back to pip editable install"; \
        python -m pip install --no-cache-dir -e .; \
      fi'

RUN python -m compileall /app/superset

USER superset

######################################################################
# Dev image
######################################################################
FROM python-common AS dev

RUN /app/docker/apt-install.sh \
    git \
    pkg-config \
    default-libmysqlclient-dev

COPY requirements/*.txt requirements/

RUN --mount=type=cache,target=${SUPERSET_HOME}/.cache/uv \
    --mount=type=cache,target=/root/.cache/pip \
    bash -lc '\
      set -e; \
      if ! /app/docker/pip-install.sh --requires-build-essential -r requirements/development.txt; then \
        echo "uv/pip-install.sh failed, falling back to plain pip"; \
        apt-get update && apt-get install -y --no-install-recommends build-essential && \
        python -m pip install --no-cache-dir -r requirements/development.txt && \
        apt-get purge -y build-essential && \
        apt-get autoremove -y && \
        rm -rf /var/lib/apt/lists/*; \
      fi'

RUN --mount=type=cache,target=${SUPERSET_HOME}/.cache/uv \
    --mount=type=cache,target=/root/.cache/pip \
    bash -lc '\
      set -e; \
      if ! uv pip install -e .; then \
        python -m pip install --no-cache-dir -e .; \
      fi'

RUN --mount=type=cache,target=${SUPERSET_HOME}/.cache/uv \
    --mount=type=cache,target=/root/.cache/pip \
    bash -lc '\
      set -e; \
      if ! uv pip install .[postgres]; then \
        python -m pip install --no-cache-dir ".[postgres]"; \
      fi'

RUN python -m compileall /app/superset

USER superset

######################################################################
# CI image
######################################################################
FROM lean AS ci

USER root

RUN --mount=type=cache,target=${SUPERSET_HOME}/.cache/uv \
    --mount=type=cache,target=/root/.cache/pip \
    bash -lc '\
      set -e; \
      if ! uv pip install .[postgres]; then \
        python -m pip install --no-cache-dir ".[postgres]"; \
      fi'

USER superset
CMD ["/app/docker/entrypoints/docker-ci.sh"]
