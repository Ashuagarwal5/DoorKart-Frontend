# Admin panel with Docker

`Admin/Frontend/compose.yaml` runs the admin panel on its own, talking to a backend that is
deployed somewhere else (for example `https://api.doorkart.in`). The repository-root
`compose.yaml` starts the database, API and admin panel together instead. Run everything below
from the `Admin/Frontend` folder. Docker with Compose is required.

## How it works

The browser only talks to the admin panel's own address. The Next.js server forwards
`/api/v1/admin/*` and `/uploads/*` requests to the backend address you configure. The sign-in
cookie therefore belongs to the admin panel's domain, and no CORS setup is needed for it.

## First start

```bash
cp .env.docker.example .env.docker
```

Edit `.env.docker`: set `NEXT_PUBLIC_API_BASE_URL` to your backend origin (no trailing slash,
no `/api/v1`). Then:

```bash
npm run docker:up
```

Open `http://localhost:3000` (change the port with `ADMIN_PORT`).

## Commands

| Command | What it does |
|---|---|
| `npm run docker:up` | Build and start the admin panel in the background |
| `npm run docker:down` | Stop and remove the container |
| `npm run docker:logs` | Follow the logs |
| `npm run docker:ps` | Show status and health |

Without npm: `docker compose --env-file .env.docker <command>`.

## Changing the backend address

The address is baked into the build. Edit `NEXT_PUBLIC_API_BASE_URL` in `.env.docker`, then run
`npm run docker:up` again so the image is rebuilt.

## Going live

1. Serve the admin panel over **HTTPS** with a reverse proxy in front of port 3000. The
   production backend sets a secure sign-in cookie, which browsers only accept over HTTPS.
2. The backend must be reachable from this server and run with `NODE_ENV=production`.
3. Set the backend's `CORS_ORIGINS` to the admin panel's address as a precaution.
4. Create the first admin on the backend with `npm run docker:admin-create` (see the Backend
   Docker guide), then sign in.

## Notes

- Uploads and the database live with the backend; the admin panel stores nothing.
- `.env.docker` is ignored by Git; its example file is tracked.
