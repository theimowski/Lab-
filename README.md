# Todo

Minimalistic Todo web app — TypeScript on [Bun](https://bun.sh), no frameworks, no build step. Persists to SQLite (`todos.db`).

## Run

```sh
bun install
bun dev
```

The dev server listens on `0.0.0.0:3000` and hot-reloads on file changes. On startup it prints both the local and LAN URLs:

```
Todo app ready on port 3000
  local:   http://localhost:3000
  network: http://192.168.x.x:3000
```

## Live preview on your phone

**Same Wi‑Fi as the dev machine** — open the `network:` URL on your phone. If it doesn't load, allow port 3000 through the host firewall.

**Dev box on a different network** (cloud workspace, container, etc.) — start a tunnel in a second terminal:

```sh
bunx cloudflared tunnel --url http://localhost:3000
```

It prints a public `https://*.trycloudflare.com` URL — open that on your phone.

## Layout

```
server.ts     Bun.serve + sqlite (API + static HTML)
client.ts     vanilla TS frontend
index.html    markup + viewport meta
styles.css    mobile-first, dark/light auto
```

## API

| Method | Path              | Body              | Returns       |
| ------ | ----------------- | ----------------- | ------------- |
| GET    | `/api/todos`      | —                 | `Todo[]`      |
| POST   | `/api/todos`      | `{ "text": "…" }` | `Todo` (201)  |
| PATCH  | `/api/todos/:id`  | —                 | `Todo` toggled|
| DELETE | `/api/todos/:id`  | —                 | 204           |
