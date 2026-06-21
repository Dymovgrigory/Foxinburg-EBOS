FROM python:3.13-slim

WORKDIR /app/backend

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libreoffice-writer \
    libreoffice-impress \
    libreoffice-calc \
    libreoffice-java-common \
    default-jre-headless \
    fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

# LibreOffice в headless-режиме требует стабильный HOME для профиля пользователя
ENV HOME=/tmp/libreoffice-home
RUN mkdir -p /tmp/libreoffice-home

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

ENV PYTHONPATH=/app/backend
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Сначала применяем миграции, затем запускаем приложение
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'"]
