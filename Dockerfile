# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22
ARG PHP_VERSION=8.4

FROM composer:2 AS vendor

WORKDIR /app

# Dependencies change much less frequently than the application source. Keeping
# this layer isolated prevents PHP dependencies from being reinstalled on every
# code change, while the cache mount accelerates lock-file updates.
COPY composer.json composer.lock ./
RUN --mount=type=cache,id=estoquehub-composer,target=/tmp/composer-cache,sharing=locked \
    COMPOSER_CACHE_DIR=/tmp/composer-cache composer install \
        --no-dev \
        --no-interaction \
        --no-progress \
        --prefer-dist \
        --no-scripts \
        --no-autoloader

COPY app ./app
COPY artisan ./artisan
COPY bootstrap ./bootstrap
COPY config ./config
COPY database ./database
COPY routes ./routes

RUN rm -f bootstrap/cache/*.php \
    && composer dump-autoload \
        --no-dev \
        --classmap-authoritative \
        --no-interaction

# Static/frontend sources do not affect Composer's classmap. Keeping them after
# dump-autoload avoids PHP work when only the interface changes.
COPY public ./public
COPY resources ./resources
COPY storage ./storage


FROM node:${NODE_VERSION}-bookworm AS node


FROM php:${PHP_VERSION}-cli-bookworm AS frontend

COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules

RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

WORKDIR /app

# npm ci is intentionally placed before the application source. Editing React,
# CSS or Blade files now rebuilds only Wayfinder/Vite instead of node_modules.
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,id=estoquehub-npm,target=/root/.npm,sharing=locked \
    npm ci \
        --ignore-scripts \
        --no-audit \
        --no-fund \
        --prefer-offline

COPY --from=vendor /app ./
COPY vite.config.ts tsconfig.json ./

RUN npm run build


FROM php:${PHP_VERSION}-apache-bookworm AS runtime

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
    && apt-get install -y --no-install-recommends libonig-dev libsqlite3-dev \
    && docker-php-ext-install -j"$(nproc)" mbstring pdo_sqlite opcache \
    && a2enmod rewrite \
    && sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' \
        /etc/apache2/sites-available/*.conf \
        /etc/apache2/apache2.conf \
        /etc/apache2/conf-available/*.conf \
    && sed -ri -e 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf \
    && printf 'ServerName localhost\n' > /etc/apache2/conf-available/server-name.conf \
    && a2enconf server-name

COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/zz-estoquehub-opcache.ini
COPY docker/entrypoint.sh /usr/local/bin/estoquehub-entrypoint

WORKDIR /var/www/html

COPY --from=vendor /app ./
COPY --from=frontend /app/public/build ./public/build

RUN chmod 755 /usr/local/bin/estoquehub-entrypoint \
    && mkdir -p \
        storage/app/private \
        storage/app/public \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 80

HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=6 \
    CMD php -r "exit(@file_get_contents('http://127.0.0.1/up') === false ? 1 : 0);"

ENTRYPOINT ["estoquehub-entrypoint"]
CMD ["apache2-foreground"]
