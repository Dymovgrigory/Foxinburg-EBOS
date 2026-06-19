# Деплой FOXINBURG EBOS на сервер

## Требования

- Сервер с Ubuntu 22.04/24.04 (2 vCPU, 2 GB RAM, 10 GB диск — минимум).
- Домен `foxinburg.ru` с A-записью на IP сервера.
- Открытые порты 80 и 443.

## Быстрый старт

1. Подключиться к серверу по SSH:

```bash
ssh user@<IP_СЕРВЕРА>
```

2. Установить git и клонировать репозиторий:

```bash
sudo apt update && sudo apt install -y git
git clone <URL_РЕПОЗИТОРИЯ> /opt/foxinburg
cd /opt/foxinburg
```

3. Создать файл окружения:

```bash
cp .env.production.example .env.production
nano .env.production
```

Заполнить пароли и секреты.

4. Запустить деплой:

```bash
sudo bash scripts/deploy.sh
```

Скрипт автоматически:
- установит Docker и Docker Compose,
- соберёт образы backend и frontend,
- получит SSL-сертификат Let’s Encrypt,
- запустит PostgreSQL, Redis, backend, nginx,
- применит миграции Alembic,
- настроит автообновление SSL.

5. Открыть сайт:

```
https://foxinburg.ru
```

## DNS

В управлении доменом `foxinburg.ru` (Yandex Cloud / Яндекс.Бизнес) создать A-запись:

```
foxinburg.ru → <IP_СЕРВЕРА>
www.foxinburg.ru → <IP_СЕРВЕРА>
```

## Повторный деплой

После обновления кода:

```bash
cd /opt/foxinburg
git pull
sudo docker compose -f docker-compose.prod.yml up -d --build
sudo docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

## Логи

```bash
sudo docker compose -f docker-compose.prod.yml logs -f
sudo docker compose -f docker-compose.prod.yml logs -f backend
sudo docker compose -f docker-compose.prod.yml logs -f frontend
```
