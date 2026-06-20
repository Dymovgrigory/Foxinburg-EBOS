# CI/CD деплой

Настроен автоматический деплой на сервер `89.169.132.104` при push в `main`/`master`.

## Что делает деплой

1. Подключается к серверу по SSH.
2. Выполняет `git pull` в `/opt/foxinburg`.
3. Пересобирает и перезапускает контейнеры Docker.
4. Применяет миграции Alembic.

## Требования на сервере

- Проект клонирован в `/opt/foxinburg`.
- У пользователя, от имени которого идёт деплой, есть права:
  - на запись в `/opt/foxinburg`;
  - на выполнение `docker` и `docker compose` без sudo (или настроен sudo без пароля).

## Настройка SSH-ключа

На локальной машине сгенерируйте ключ (если ещё нет):

```bash
ssh-keygen -t ed25519 -C "foxinburg-deploy" -f ~/.ssh/foxinburg_deploy
```n
Скопируйте публичный ключ на сервер:

```bash
ssh-copy-id -i ~/.ssh/foxinburg_deploy.pub root@89.169.132.104
```

## GitHub Actions

Файл: `.github/workflows/deploy.yml`

Добавьте в Settings → Secrets and variables → Actions → Repository secrets:

| Secret            | Значение                                      |
|-------------------|-----------------------------------------------|
| `SSH_PRIVATE_KEY` | Содержимое приватного ключа `foxinburg_deploy`|
| `SSH_HOST`        | `89.169.132.104`                              |
| `SSH_USER`        | `root` (или другой пользователь с доступом)   |

## GitLab CI

Файл: `.gitlab-ci.yml`

Добавьте в Settings → CI/CD → Variables:

| Variable          | Значение                                      |
|-------------------|-----------------------------------------------|
| `SSH_PRIVATE_KEY` | Содержимое приватного ключа `foxinburg_deploy`|
| `SSH_HOST`        | `89.169.132.104`                              |
| `SSH_USER`        | `root` (или другой пользователь с доступом)   |

## Ручной запуск

GitHub Actions: Actions → Deploy to production → Run workflow.

GitLab CI: CI/CD → Pipelines → Run pipeline.
