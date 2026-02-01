# Caddy HTTPS reverse proxy (api.videotext.io)

**Prerequisite:** DNS for `api.videotext.io` must point to your server's public IP. Until then, Caddy cannot obtain a TLS certificate and HTTPS will fail.

## Steps (run on the production server, e.g. Ubuntu)

### 1. Check ports 80 and 443 are free

```bash
sudo ss -tlnp | grep -E ':80\s|:443\s'
```

If output is empty, ports are free. If something is listening, stop that service or choose another approach.

### 2. Install Caddy (official package repository)

```bash
sudo apt-get update
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update
sudo apt-get install -y caddy
```

### 3. Deploy Caddyfile

Copy the project's `deploy/Caddyfile` to Caddy's config:

```bash
sudo cp /path/to/project/deploy/Caddyfile /etc/caddy/Caddyfile
```

Or create it manually:

```
api.videotext.io {
    reverse_proxy localhost:3001
}
```

### 4. Restart Caddy

```bash
sudo systemctl restart caddy
sudo systemctl status caddy
```

### 5. Verify HTTPS

```bash
curl -sS https://api.videotext.io/health
```

Expected: `{"status":"ok"}` from your API.

---

**Note:** This Caddyfile proxies to `localhost:3001`. If your API runs in Docker with `ports: "3002:3001"`, the API is on the host at port **3002**. Then either change the Caddyfile to `reverse_proxy localhost:3002` or change Docker to map `3001:3001` (and ensure nothing else uses 3001).
