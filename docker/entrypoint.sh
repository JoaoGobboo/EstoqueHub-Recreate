#!/bin/sh
set -eu

database_path="${DB_DATABASE:-/var/lib/laravel/database.sqlite}"
database_directory="$(dirname "$database_path")"

mkdir -p "$database_directory"

if [ ! -f "$database_path" ]; then
    : > "$database_path"
fi

# SQLite needs write access to both the database and its parent directory for
# journal/WAL files. Avoid recursively touching the whole application on start.
chown www-data:www-data "$database_directory" "$database_path"
chmod 775 "$database_directory"
chmod 664 "$database_path"

if [ -z "${APP_KEY:-}" ]; then
    key_file="$database_directory/.app-key"

    if [ ! -s "$key_file" ]; then
        umask 077
        php artisan key:generate --show --no-ansi > "$key_file"
    fi

    export APP_KEY="$(cat "$key_file")"
fi

php artisan migrate --force --no-interaction

exec docker-php-entrypoint "$@"
