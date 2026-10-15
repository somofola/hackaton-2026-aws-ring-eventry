# Comprehensive Deployment Guide: Laravel (API) & React (Frontend) on AWS
## Architecture: AWS Amplify (React) + Amazon Lightsail VPS (Laravel + Local PostgreSQL) + Amazon S3

This architecture delivers high performance, automated CI/CD for your frontend, and predictable flat-rate costs (\$5.00–\$6.00/month baseline configuration).

---

## Part 1: Setting Up the Amazon Lightsail Instance

### 1. Launch the Server
1. Open the **Amazon Lightsail Console** (https://amazon.com).
2. Click **Create instance**.
3. **Select your instance location:** Choose a region geographically close to your core users.
4. **Pick your instance image:** Select **Linux/Unix** and choose the **Ubuntu 24.04 LTS** blueprint.
5. **Choose your instance plan:** Select the **\$5.00 USD/month** plan (1 GB RAM, 1 vCPU, 40 GB SSD, 2 TB Transfer).
6. **Identify your instance:** Name it `laravel-backend-api`.
7. Click **Create instance**.

### 2. Configure Static IP & Networking
1. In the Lightsail dashboard, navigate to the **Networking** tab.
2. Click **Create static IP**, attach it to your `laravel-backend-api` instance, name it, and click **Create**.
3. Under your instance management dashboard, go to the **Networking** tab and verify the **IPv4 Firewall**.
4. Ensure **HTTP (Port 80)** and **HTTPS (Port 443)** rules are added.

---

## Part 2: Installing LEMP Stack & Initializing Laravel

Connect to your instance via the Lightsail browser SSH terminal or your local terminal to execute system setups.

### 1. Install System Dependencies
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
sudo apt install nginx postgresql postgresql-contrib php8.3-fpm php8.3-pgsql php8.3-curl php8.3-xml php8.3-bcmath php8.3-mbstring php8.3-zip php8.3-sqlite3 php8.3-cli unzip nano redis-server php8.3-redis -y
sudo systemctl enable --now redis-server
```

Verify redis is running and the PHP extension is loaded:
```bash
redis-cli ping          # expect: PONG
php -m | grep -i redis  # expect: redis
```

Laravel's `CACHE_DRIVER=redis` in `.env` (required for cache tagging used by the events cache) depends on this. If `CACHE_DRIVER` was changed or redis installed *after* an earlier `config:cache`, the cached config won't pick it up — re-run `php artisan config:clear && php artisan config:cache` and restart php-fpm (`sudo systemctl restart php8.3-fpm`) so OPcache drops any stale compiled config.

### 2. Configure Local PostgreSQL Database
```bash
sudo -u postgres psql
```
Execute the following SQL queries to establish your production database layer:
```sql
CREATE DATABASE laravel_db;
CREATE USER laravel_user WITH ENCRYPTED PASSWORD 'YourSecurePasswordHere';
GRANT ALL PRIVILEGES ON DATABASE laravel_db TO laravel_user;
ALTER DATABASE laravel_db OWNER TO laravel_user;
\c laravel_db
CREATE EXTENSION IF NOT EXISTS pgcrypto;
\q
```

### 3. Deploy and Initialize Laravel Code
```bash
# Install Composer Globally
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Initialize Project Directory Location
sudo mkdir -p /var/www/laravel-api
sudo chown -R $USER:$USER /var/www/laravel-api
cd /var/www/laravel-api

# Clone Code Repository
git clone <your-laravel-repo-url> .
composer install --no-dev --optimize-autoloader

# Recreate storage subdirectories (git doesn't track empty dirs, so a fresh
# clone is often missing these — Laravel will 500 on cache/view/session writes without them)
mkdir -p storage/framework/{cache,cache/data,sessions,views,testing}

# Set Standard Web Framework Permissions
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R ug+rwx storage bootstrap/cache
```

### 4. Setup Application Environment Variables
```bash
cp .env.example .env
php artisan key:generate
nano .env
```
Ensure your database parameters target your local configuration block:
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=laravel_db
DB_USERNAME=laravel_user
DB_PASSWORD=YourSecurePasswordHere
```
Save your edits, then execute database structural blueprints and cache compiling loops:
```bash
php artisan migrate --force
php artisan config:cache
php artisan route:cache
```

**Optional — if you also ran `--seed`:** the seeded admin account (`admin@cardconnect.com` / `password`) ships with an unverified email and a weak default password. Verify the email and set a real password before exposing this instance publicly:
```bash
php artisan tinker --execute="\$u=\App\Models\User::where('email','admin@cardconnect.com')->first(); \$u->email_verified_at=now(); \$u->password=\Illuminate\Support\Facades\Hash::make('YourNewStrongPasswordHere'); \$u->save();"
```

### 5. Configure Nginx Server Blocks
Create a custom web configuration mapping entry point:
```bash
sudo nano /etc/nginx/sites-available/laravel-api
```
Paste the configuration tracking snippet into the file:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/laravel-api/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;
    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.ht {
        deny all;
    }
}
```
Link and activate the virtual host block:
```bash
sudo ln -s /etc/nginx/sites-available/laravel-api /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## Part 3: Setting Up Let's Encrypt SSL Certificates

*Note: Ensure your domain pointer `yourdomain.com` maps to your Lightsail Static IP inside your DNS manager before running these lines.*

### 1. Run Certbot Encryption Tooling
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```
*   Follow the automated setup prompts, register your system email, and opt to **redirect all HTTP traffic automatically to secure HTTPS**.

### 2. Verify Cron Renewal Engine
```bash
sudo certbot renew --dry-run
```

---

## Part 4: Configuring Amazon S3 Bucket Integration

### 1. Provision Your Storage Bucket
1. Open the **Amazon S3 Console**.
2. Click **Create bucket** and declare a unique identifier name (e.g., `laravel-prod-assets-storage`).
3. Set your target region to match your instance region.
4. Set Object Ownership parameters to **ACLs enabled**, choosing **Bucket owner preferred**.
5. Under **Block Public Access settings**, uncheck **Block *all* public access**. (This allows the application to serve images publicly while maintaining private bucket security structures).
6. Agree to the security layout terms and click **Create bucket**.

### 2. Set Up Programmatic IAM Policies
1. Open the **Amazon IAM Console**.
2. Select **Users** → **Create user**. Name your user entity `laravel-s3-app-user`.
3. Under Permissions settings, choose **Attach policies directly**. Filter and assign **AmazonS3FullAccess**.
4. Finish generating the profile, navigate into your new user account card, and open the **Security credentials** tab.
5. Click **Create access key** -> Select **Application running outside AWS** and copy your secure **Access Key ID** and **Secret Access Key**.

### 3. Connect Laravel Disk Drivers
Install the programmatic S3 tracking package library within your backend instance terminal path:
```bash
cd /var/www/laravel-api
composer require league/flysystem-aws-s3-v3 "^3.0" --with-all-dependencies
```
Update your `.env` configuration data:
```bash
nano .env
```
```env
FILESYSTEM_DISK=s3

AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=laravel-prod-assets-storage
AWS_USE_PATH_STYLE_ENDPOINT=false
```
Flush caching configurations to instantiate settings:
```bash
php artisan config:clear
php artisan config:cache
```

---

## Part 5: Resolving Cross-Origin Resource Sharing (CORS)

Since your frontend and backend sit on independent domains, cross-origin request validations must be allowed.

1. Open your local Laravel project code and open `config/cors.php`.
2. Map your frontend tracking domains into the designated array block:
```php
'allowed_origins' => ['https://amplifyapp.com', 'https://yourfrontenddomain.com'],
```
3. Commit edits, update server repository trees, and clear operational data arrays:
```bash
php artisan config:cache
```

---

## Part 6: Hosting the React Application on AWS Amplify

### 1. Update API Calling Base URLs
Inside your local React source layouts, ensure configuration connection engines point explicitly to your live production server domain configuration:
```javascript
const API_URL = "https://yourdomain.com";
```
Commit all alterations and push changes to your linked remote repository (GitHub, GitLab, Bitbucket).

### 2. Connect Your Build Engine to AWS Amplify Hosting
1. Open the **AWS Amplify Console** (https://amazon.com).
2. Select **Create new app** -> Click **Host web app**.
3. Choose your repository host platform and complete account authorization requests.
4. Select the repository layout card alongside your targeted production branch (e.g., `main`).
5. Confirm framework configuration settings (Amplify detects frameworks like Vite or CRA automatically). Verify standard options output correctly:
   * **Base directory:** `dist` (Vite output target) or `build` (CRA target).
   * **Build command:** `npm run build`.
6. Click **Save and deploy**. Amplify compiles tracking assets and spins your live interface up instantly across their globally scaled CloudFront CDN edge loops.
