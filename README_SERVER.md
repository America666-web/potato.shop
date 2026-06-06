# Запуск сервера KuzPotato

## Быстрый старт

### Вариант 1: Python (рекомендуется)
```bash
cd "c:\Users\sandr\Desktop\Проект_картошка_AUTH"
python server.py
```

Сервер запустится на http://localhost:3000

### Вариант 2: Node.js (если установлен)
```bash
cd "c:\Users\sandr\Desktop\Проект_картошка_AUTH"
npm install
node server.js
```

## База данных

Таблица `users` содержит:
- `id` - уникальный ID
- `email` - логин пользователя
- `password` - хэшированный пароль (bcrypt)
- `role` - роль (user/admin)
- `status` - статус (active/disabled)
- `created_at` - дата создания

## Тестовый аккаунт

**Логин:** fortter  
**Пароль:** 4205  
**Роль:** admin

## API endpoints

- `POST /api/register` - регистрация нового пользователя
- `POST /api/login` - вход в систему
- `GET /api/me` - информация о текущем пользователе
- `POST /api/logout` - выход из системы

## Остановка сервера

Нажмите `Ctrl+C` в терминале
