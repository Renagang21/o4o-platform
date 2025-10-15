# Post-Deploy Verification Checklist

Use this checklist after auto-deploys to confirm services are healthy. Adjust hostnames and processes to your environment.

## Prep
- Hosts: `admin.neture.co.kr`, `shop.neture.co.kr`, `signage.neture.co.kr`, `forum.neture.co.kr` (update as needed).
- Access: production server SSH, PM2 CLI, and Nginx reload permission.

## Quick Sanity
- Confirm deployed commit on server matches GitHub:
  - `git -C /var/www/o4o-platform rev-parse --short HEAD`
- PM2 process health:
  - `pm2 ls`
  - `pm2 describe o4o-webserver` and/or `pm2 describe o4o-admin`
  - `pm2 logs --lines 200 --timestamp`

## HTTP/Health Checks
- Admin Dashboard: `curl -fsS https://admin.neture.co.kr/ || curl -I https://admin.neture.co.kr/`
- Main Site (shop): `curl -fsS https://shop.neture.co.kr/ || curl -I https://shop.neture.co.kr/`
- API server (example paths): `curl -fsS https://admin.neture.co.kr/api/health || curl -fsS https://shop.neture.co.kr/api/status`
- Verify status 200 and no errors in PM2 logs.

## Nginx & TLS
- Syntax check: `sudo nginx -t`
- Reload if config updated: `sudo systemctl reload nginx`
- TLS/HTTP status: `curl -Iv https://admin.neture.co.kr | grep "HTTP/"`

## Smoke Tests
- Login page loads (no JS console errors).
- Basic API call succeeds (e.g., fetch menu/categories in admin).
- Critical pages render: home, product detail, cart/checkout (if applicable).

## Migrations (if release included DB changes)
- Apply/verify migrations (TypeORM): ensure migrations ran successfully and tables/columns exist.

## Rollback (if needed)
- Environment-only changes: `pm2 reload <process> --update-env`
- PM2 Deploy (if configured): `pm2 deploy ecosystem.config.cjs production revert 1`
- Manual fallback: checkout previous commit and `pm2 reload <process>`

## Monitor
- Tail logs for 5–10 minutes after deploy: `pm2 logs`
- Create a follow-up issue for any regressions observed.

