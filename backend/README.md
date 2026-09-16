# URL Shortener

A backend service for creating and resolving shortened URLs, built to explore systems-level tradeoffs rather than just CRUD. It uses MongoDB for persistent data, Redis for redirect caching, locking, and rate limiting, and BullMQ to move click-analytics writes off the request path.

## What it does

- Registers users with bcrypt-hashed passwords.
- Authenticates users with a JWT stored in an `httpOnly` cookie (seven-day expiry).
- Creates a unique short code by atomically incrementing a MongoDB counter and encoding its value in base62 — no collision checks needed.
- Validates submitted URLs: only `http` and `https` URLs are accepted, and URLs longer than 2,048 characters are rejected.
- Publicly redirects `/:shortCode` with HTTP 302, serving from a Redis cache when possible.
- Queues every redirect as a click event and processes it asynchronously in a separate worker, recording IP, user agent, parsed device type, parsed browser, and referrer.
- Exposes a single-query analytics endpoint (`$facet`) that returns total clicks, a clicks-over-time series, top referrers, device breakdown, and browser breakdown.

## Architecture & design decisions

These are the pieces meant to demonstrate more than tutorial-level implementation:

- **Base62 short codes via atomic counter.** Rather than generating a random code and checking for collisions, a single MongoDB document is atomically incremented with `$inc` and the resulting integer is encoded in base62. Guarantees uniqueness with one write instead of a generate-and-retry loop.
- **Cache-aside with a distributed lock.** Redirects check Redis first; on a miss, the service takes a short `SET NX PX` lock before reading MongoDB and repopulating the cache. `NX` ensures only one request wins the read; `PX` auto-expires the lock if the process crashes mid-fill. Losers poll Redis on a short retry loop instead of all hitting MongoDB at once — this is the classic thundering-herd problem under concurrent cache misses, solved with a mutex rather than letting every request fall through.
- **Async click tracking via BullMQ.** Redirects enqueue a click event and return immediately; a separate worker process consumes the queue, parses the user agent, and writes to MongoDB. This keeps analytics writes off the hot redirect path entirely — BullMQ affects write-path latency for analytics, not read-path redirect latency, and is intentionally decoupled from caching.
- **Sliding-window rate limiting on Redis sorted sets.** Per-IP request timestamps are stored in a sorted set and trimmed to a rolling window, giving a smoother limit than fixed-window counters (which allow bursts at window boundaries).
- **Compound indexing for analytics queries.** Query patterns that filter and sort together (e.g. by `shortCode` and `timestamp`) use a compound index rather than separate single-field indexes, since MongoDB can only use one index per query clause efficiently otherwise. `Url.shortCode` already has an implicit index via `unique: true`.
- **Single `$facet` aggregation for analytics.** All five analytics metrics (total clicks, time series, referrers, device, browser) run as independent sub-pipelines over one `$match`-filtered set in a single MongoDB round-trip, instead of five separate queries.

## Stack

- Node.js (ES modules) and Express 5
- MongoDB and Mongoose
- Redis, BullMQ, and ioredis
- JWT, bcrypt, cookie-parser, validator, and ua-parser-js

## Requirements

- Node.js and npm
- A MongoDB instance
- A Redis instance (required by redirects and the BullMQ worker)

## Setup

```bash
git clone https://github.com/kunalkalita54/url-shortener.git
cd url-shortener
npm install
```

Create `.env` from the supplied example:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Configure the variables:

```dotenv
JWT_SECRET=replace-with-a-long-random-secret
BASE_URL=http://localhost:3000
MONGO_URI=your-mongodb-connection-string

# Optional: defaults to redis://localhost:6379 when omitted
REDIS_URL=redis://localhost:6379
```

Start the API server:

```bash
npm run dev
```

The server listens on port `3000`. The repository has no separate production start script; run `node index.js` to start the same entry point without nodemon.

In another terminal, start the click-event worker:

```bash
node src/worker.js
```

The worker must be running for queued redirect events to be written to the `Click` collection.

## API

The API is mounted at `/api/url`. Authentication is cookie-based: log in first, then send the returned `token` cookie when calling protected endpoints.

| Method | Endpoint | Authentication | Current behavior |
| --- | --- | --- | --- |
| `POST` | `/api/url/register` | No | Creates a user from `username`, `email`, and `password`. |
| `POST` | `/api/url/login` | No | Verifies `email` and `password`; sets the `token` cookie. |
| `POST` | `/api/url/shorten_url` | Yes | Creates a code for `long_url` and returns the short and original URLs. |
| `GET` | `/:shortCode` | No | Looks up the code and responds with a 302 redirect. |
| `GET` | `/api/url/getUrlAnalytics/:shortCode` | Yes | Returns aggregated click analytics for a short code owned by the authenticated user. |

### Register

```bash
curl -X POST http://localhost:3000/api/url/register \
  -H "Content-Type: application/json" \
  -d '{"username":"ada","email":"ada@example.com","password":"a-password"}'
```

### Log in

Save the authentication cookie so it can be used by protected routes:

```bash
curl -i -c cookies.txt -X POST http://localhost:3000/api/url/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com","password":"a-password"}'
```

### Shorten a URL

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/url/shorten_url \
  -H "Content-Type: application/json" \
  -d '{"long_url":"https://example.com/a/long/path"}'
```

Successful responses have this shape:

```json
{
  "message": "URL shortened successfully",
  "URL": {
    "shortURL": "http://localhost:3000/1",
    "longURL": "https://example.com/a/long/path"
  }
}
```

### Follow a short URL

```bash
curl -i http://localhost:3000/1
```

The service returns a `302` redirect to the stored `longURL`. A redirect also submits a click event to the `analytics-queue`. Note that `curl` does not send a `Referer` header, so click events generated this way will show a `null` referrer — that's expected, not a bug; it represents a direct visit rather than a missing feature.

### Get analytics

```bash
curl -b cookies.txt http://localhost:3000/api/url/getUrlAnalytics/1
```

```json
{
  "shortCode": "1",
  "totalClicks": 42,
  "clicksOverTime": [
    { "_id": "2026-09-14", "count": 12 },
    { "_id": "2026-09-15", "count": 30 }
  ],
  "topReferrers": [
    { "_id": null, "count": 20 },
    { "_id": "https://twitter.com/", "count": 15 }
  ],
  "deviceBreakdown": [
    { "_id": "desktop", "count": 30 },
    { "_id": "mobile", "count": 12 }
  ],
  "browserBreakdown": [
    { "_id": "Chrome", "count": 25 },
    { "_id": "Safari", "count": 17 }
  ]
}
```

## How codes and redirects work

When a user creates a short URL, MongoDB atomically increments the `url_count` counter with `$inc`. That number is converted to base62 using `0-9`, `a-z`, and `A-Z`, and stored as the URL's `shortCode`. This avoids generating a code by checking for collisions after the fact.

On a redirect, the service first checks Redis. A miss triggers a short Redis lock (`SET NX PX`) before reading MongoDB and repopulating the cache, so concurrent requests for the same freshly-expired code don't all fall through to the database at once. Every redirect — cache hit or miss — enqueues a click event containing the short code, timestamp, IP, user agent, and referrer header, which the worker consumes asynchronously and parses (via `ua-parser-js`) into device and browser fields before writing to MongoDB.

## Known limitations

- The redirect route's sliding-window rate limiter (10 requests per IP per 60 seconds, backed by a Redis sorted set) has not yet been verified end-to-end: the current code reads the raw Redis transaction result rather than its resolved numeric value. Confirm its actual behavior before relying on it in production.
- There are no automated tests configured yet. `npm test` is the default placeholder script and exits with an error.
- Referrer values depend entirely on the client sending a `Referer` header. Requests made via `curl`, most native mobile apps, and some privacy-focused browsers will always show up as `null` (direct visits) rather than a source.

## Roadmap

- React dashboard for viewing analytics visually instead of via raw JSON.
- Custom aliases and optional URL expiration.
- Lightweight test suite: unit tests for base62 encoding and JWT logic, integration tests for key routes (Jest, Supertest, `mongodb-memory-server`).
- Structured logging (`winston` or `pino`) and a `/health` endpoint.
- Benchmark documentation in a `benchmark/` folder with `autocannon` before/after latency numbers (p50, p99) for cached vs. uncached redirects.

## Repository layout

```text
index.js                         API entry point
src/app.js                       Express configuration and route mounting
src/controllers/                 Authentication, URL, redirect, and analytics handlers
src/models/                      MongoDB schemas for users, URLs, counter, and clicks
src/middlewares/                 JWT authentication and redirect rate limiter
src/config/                      MongoDB, Redis, and environment configuration
src/queue.js                     BullMQ click-event producer
src/worker.js                    BullMQ click-event consumer
src/utils/base62.util.js         Short-code encoding
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Runs `npx nodemon index.js`. |
| `npm test` | Placeholder script; no tests are configured. |