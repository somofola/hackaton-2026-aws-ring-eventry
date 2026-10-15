#!/bin/bash
# Lightsail launch script (paste into "Launch script" field when creating the instance).
# Covers Part 2-5 of aws_deployment_steps.md. Part 1 (instance + static IP) is a console step,
# Part 6 (Amplify) is a separate frontend step. Fill in the CONFIG block before use.
set -euo pipefail

# ---------------- CONFIG ----------------
DOMAIN="yourdomain.com"
REPO_URL="<your-laravel-repo-url>"
APP_DIR="/var/www/laravel-api"
DB_NAME="laravel_db"
DB_USER="laravel_user"
DB_PASS="ChangeMeSecurePassword"
PHP_VERSION="8.3"
FRONTEND_ORIGINS="https://yourfrontenddomain.com"
# -----------------------------------------

sudo apt update && sudo apt upgrade -y
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
sudo apt install -y nginx postgresql postgresql-contrib \
  php${PHP_VERSION}-fpm php${PHP_VERSION}-pgsql php${PHP_VERSION}-curl \
  php${PHP_VERSION}-xml php${PHP_VERSION}-bcmath php${PHP_VERSION}-mbstring \
  php${PHP_VERSION}-zip php${PHP_VERSION}-sqlite3 php${PHP_VERSION}-cli \
  unzip nano certbot python3-certbot-nginx

# --- PostgreSQL ---
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
CREATE DATABASE ${DB_NAME};
CREATE USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASS}';
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};
SQL
sudo -u postgres psql -d "${DB_NAME}" -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# --- Composer ---
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# --- Laravel app ---
sudo mkdir -p "${APP_DIR}"
sudo chown -R "$(whoami):$(whoami)" "${APP_DIR}"
git clone "${REPO_URL}" "${APP_DIR}"
cd "${APP_DIR}"
composer install --no-dev --optimize-autoloader
sudo chown -R www-data:www-data storage bootstrap/cache

cp .env.example .env
php artisan key:generate
# NOTE: edit .env by hand (or sed below) for APP_URL, SSO/payment secrets, etc.
sed -i "s|APP_ENV=.*|APP_ENV=production|" .env
sed -i "s|APP_DEBUG=.*|APP_DEBUG=false|" .env
sed -i "s|APP_URL=.*|APP_URL=https://${DOMAIN}|" .env
sed -i "s|DB_CONNECTION=.*|DB_CONNECTION=pgsql|" .env
sed -i "s|DB_HOST=.*|DB_HOST=127.0.0.1|" .env
sed -i "s|DB_PORT=.*|DB_PORT=5432|" .env
sed -i "s|DB_DATABASE=.*|DB_DATABASE=${DB_NAME}|" .env
sed -i "s|DB_USERNAME=.*|DB_USERNAME=${DB_USER}|" .env
sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=${DB_PASS}|" .env

php artisan migrate --force
# DO NOT run --seed on production (UserSeeder ships demo/admin accounts with password "password")
php artisan config:cache
php artisan route:cache

# --- CORS ---
php -r "
\$f = 'config/cors.php';
\$c = file_get_contents(\$f);
\$c = preg_replace(\"/'allowed_origins' => \[.*?\],/s\", \"'allowed_origins' => ['${FRONTEND_ORIGINS}'],\", \$c);
file_put_contents(\$f, \$c);
"
php artisan config:cache

# --- Nginx ---
sudo tee /etc/nginx/sites-available/laravel-api > /dev/null <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};
    root ${APP_DIR}/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;
    charset utf-8;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php\$ {
        fastcgi_pass unix:/var/run/php/php${PHP_VERSION}-fpm.sock;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.ht {
        deny all;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/laravel-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# --- SSL (requires DNS already pointed at this instance's static IP) ---
sudo certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "admin@${DOMAIN}" --redirect || \
  echo "certbot failed — likely DNS not propagated yet. Re-run manually: sudo certbot --nginx -d ${DOMAIN}"

echo "Done. Verify: sudo certbot renew --dry-run"
