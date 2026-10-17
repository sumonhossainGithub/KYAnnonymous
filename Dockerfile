# Multi-stage production Dockerfile (§68)
# Stage 1: Build Frontend Assets with Node 24 LTS
FROM node:24-alpine AS frontend-builder
WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY resources/ ./resources/
COPY vite.config.ts tsconfig.json ./
RUN npm run build

# Stage 2: PHP 8.5 Production FPM Container
FROM php:8.5.0-fpm-alpine

# Install build dependencies & required PHP extensions
RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    icu-dev \
    libpng-dev \
    oniguruma-dev \
    linux-headers \
    $PHPIZE_DEPS \
    && docker-php-ext-install pdo pdo_pgsql intl mbstring pcntl opcache \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS

# Configure production OPcache and PHP defaults
RUN echo "opcache.enable=1" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.validate_timestamps=0" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "expose_php=Off" >> /usr/local/etc/php/conf.d/security.ini

WORKDIR /var/www/html

# Install Composer
COPY --from=composer:2.8 /usr/bin/composer /usr/bin/composer

# Copy application files
COPY . .

# Copy built frontend assets from Stage 1
COPY --from=frontend-builder /build/public/build ./public/build

# Install dependencies (production optimized)
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Set correct non-root permissions (§68)
RUN chown -R www-data:www-data storage bootstrap/cache

USER www-data

EXPOSE 9000
CMD ["php-fpm"]
