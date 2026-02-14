# Caddy access logs and request correlation

## Current config

- **Request ID:** `request_id` is enabled; `header_up X-Request-Id {request_id}` forwards the ID to the API. The API echoes or generates it and returns it in the response header.
- **Logs:** When Caddy runs non-interactively (e.g. systemd/Docker), access logs go to stderr in **JSON** by default.

## Optional: explicit JSON access log

To force JSON format and include request ID in log entries, you can add a `log` block to your server:

```caddyfile
api.videotext.io {
    request_id
    log {
        output stdout
        format json
    }
    # ... rest of config (handle @options, handle reverse_proxy)
}
```

Caddy’s default JSON access log includes fields such as `request_id`, `method`, `uri`, `status`, `duration`, and `size`. Check the [Caddy log directive](https://caddyserver.com/docs/caddyfile/directives/log) for the exact schema.

## Correlating with API/worker

1. From the browser or client, read the response header **x-request-id** (or use the one you sent).
2. In Caddy logs: `grep "<request_id>" /var/log/caddy/access.log` (or `jq 'select(.request_id=="<id>")'` if logs are JSON lines).
3. In API/worker logs: `grep "<request_id>"` in your structured logs (or search in Sentry by tag `request_id`).

This links a single user request across Caddy → API → worker.
