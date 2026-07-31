FROM composer:2 AS vendor

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts

COPY app ./app
COPY artisan ./artisan
COPY bootstrap ./bootstrap
COPY config ./config
COPY database ./database
COPY public ./public
COPY resources ./resources
COPY routes ./routes
COPY storage ./storage
COPY tests ./tests
COPY phpunit.xml ./phpunit.xml
COPY package.json vite.config.ts tsconfig.json ./

RUN rm -f bootstrap/cache/*.php \
    && php artisan package:discover --ansi


FROM node:22-bookworm AS node


FROM php:8.4-cli-bookworm AS frontend

COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules

RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

WORKDIR /app

COPY --from=vendor /app ./
RUN npm install \
    && php artisan wayfinder:generate --with-form \
    && npm run build


FROM php:8.4-apache-bookworm AS runtime

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public

RUN apt-get update \
    && apt-get install -y --no-install-recommends libonig-dev libsqlite3-dev \
    && docker-php-ext-install mbstring pdo_sqlite \
    && a2enmod rewrite \
    && sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' \
        /etc/apache2/sites-available/*.conf \
        /etc/apache2/apache2.conf \
        /etc/apache2/conf-available/*.conf \
    && sed -ri -e 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf \
    && printf 'ServerName localhost\n' > /etc/apache2/conf-available/server-name.conf \
    && a2enconf server-name \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY --from=vendor /app/app ./app
COPY --from=vendor /app/artisan ./artisan
COPY --from=vendor /app/bootstrap ./bootstrap
COPY --from=vendor /app/config ./config
COPY --from=vendor /app/composer.json ./composer.json
COPY --from=vendor /app/database ./database
COPY --from=vendor /app/public ./public
COPY --from=vendor /app/resources ./resources
COPY --from=vendor /app/routes ./routes
COPY --from=vendor /app/storage ./storage
COPY --from=vendor /app/tests ./tests
COPY --from=vendor /app/phpunit.xml ./phpunit.xml
COPY --from=vendor /app/vendor ./vendor
COPY --from=frontend /app/public/build ./public/build

RUN mkdir -p \
        storage/app/private \
        storage/app/public \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD php -r "exit(@file_get_contents('http://127.0.0.1/up') === false ? 1 : 0);"

CMD ["sh", "-lc", "set -eu; database_path=\"${DB_DATABASE:-/var/lib/laravel/database.sqlite}\"; mkdir -p \"$(dirname \"$database_path\")\"; if [ ! -f \"$database_path\" ]; then touch \"$database_path\"; fi; if [ -z \"${APP_KEY:-}\" ]; then key_file=\"/var/lib/laravel/.app-key\"; if [ ! -s \"$key_file\" ]; then php artisan key:generate --show --no-ansi > \"$key_file\"; fi; export APP_KEY=\"$(cat \"$key_file\")\"; fi; php artisan migrate --force --no-interaction; chown -R www-data:www-data \"$(dirname \"$database_path\")\" storage bootstrap/cache; exec apache2-foreground"]
