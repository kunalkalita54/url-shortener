# URL Shortener Frontend

React/Vite frontend for the accompanying URL Shortener backend. It calls these exact API endpoints:

- `POST /api/url/register`
- `POST /api/url/login`
- `POST /api/url/shorten_url`
- `GET /api/url/getUrlAnalytics/:shortCode`
- `GET /:shortCode` (opened through the short URL returned by the API)

## Run locally

1. Start MongoDB and Redis, then start the backend from the repository root with `npm run dev`.
2. Copy `.env.example` to `.env`; the default backend address is `http://localhost:3000`.
3. Install and start this app:

   ```bash
   npm install
   npm run dev
   ```

The Vite development server proxies `/api` requests to the backend. This keeps the backend's `httpOnly` authentication cookie on `localhost` without adding CORS configuration to the existing Express app.

For a deployed frontend, serve it behind the same origin/reverse proxy as the API, or add deliberate CORS-with-credentials support to the backend.


