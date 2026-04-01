
## Why each line matters:

- `listen 80` — Nginx listens on port 80, the standard HTTP port. This is what you'll hit from your browser.
- `proxy_pass http://api:3000` — forwards the request to your NestJS container. Notice `api` is not an IP address — it's the **service name** from docker-compose. Docker's internal DNS resolves container names automatically.
- `proxy_http_version 1.1` — required for keep-alive connections to work properly.
- `proxy_set_header X-Real-IP` — passes the original client IP to NestJS. Without this, your app sees every request coming from Nginx's IP, not the real caller.
