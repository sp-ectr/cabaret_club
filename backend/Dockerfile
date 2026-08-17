FROM python:3.12-slim

WORKDIR /app

# Устанавливаем быстрый менеджер uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Копируем и устанавливаем зависимости
COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-cache || pip install --no-cache-dir .

COPY . .

ENV PYTHONPATH="/app"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]