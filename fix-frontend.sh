#!/bin/bash

echo "Инициализация фронтенда с правильными зависимостями..."

# Определяем команду docker compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "Ошибка: docker compose не найден"
    exit 1
fi

echo "Используется команда: $COMPOSE_CMD"

# Остановка контейнеров
$COMPOSE_CMD stop superset-node superset-websocket

# Удаление старых volumes
docker volume rm superset_frontend_node_modules websocket_node_modules websocket_dist 2>/dev/null

# Запуск контейнеров
$COMPOSE_CMD up -d superset-node superset-websocket

# Ожидание инициализации
echo "Ожидание установки зависимостей (30 секунд)..."
sleep 30

# Установка правильной версии query-string в superset-node
echo "Установка query-string в superset-node..."
docker exec superset_node bash -c "
  set -e
  echo 'Текущая директория:'
  pwd
  echo 'Содержимое:'
  ls -la
  
  echo 'Установка query-string@7.1.3...'
  npm install query-string@7.1.3 --save --legacy-peer-deps
  
  echo 'Проверка установки:'
  if [ -f node_modules/query-string/index.js ]; then
    echo '✓ query-string установлен успешно'
    ls -la node_modules/query-string/
  else
    echo '✗ query-string не установлен!'
    exit 1
  fi
  
  echo 'Пересборка фронтенда...'
  npm run build
"

# Проверка результата
if [ $? -eq 0 ]; then
    echo "✓ query-string успешно установлен в superset-node"
else
    echo "✗ Ошибка при установке query-string в superset-node"
fi

# Установка зависимостей для websocket
echo "Установка зависимостей websocket..."
docker exec superset_websocket bash -c "
  set -e
  cd /home/superset-websocket
  echo 'Установка зависимостей websocket...'
  npm install --legacy-peer-deps
"

# Проверка результата
if [ $? -eq 0 ]; then
    echo "✓ Зависимости websocket успешно установлены"
else
    echo "✗ Ошибка при установке зависимостей websocket"
fi

# Перезапуск основного приложения
echo "Перезапуск основного приложения..."
$COMPOSE_CMD restart superset

echo "Готово! Проверьте логи:"
$COMPOSE_CMD logs --tail=50 superset-node
