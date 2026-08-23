# URL Shortener

A backend URL shortening service built with Node.js, Express, and MongoDB — featuring JWT-based authentication and atomic, collision-safe short code generation.

## Features

- User registration and login with bcrypt password hashing
- JWT authentication via httpOnly cookies
- Atomic counter-based short code generation (base62 encoded)
- Public redirect endpoint - no login required to use a shortened link
- Short links tied to the authenticated user who created them

## Tech Stack

- Node.js / Express
- MongoDB with Mongoose
- JWT (jsonwebtoken)
- bcrypt for password hashing
- cookie-parser for auth cookies

## How it works

1. A user registers and logs in, receiving a JWT stored in an httpOnly cookie.
2. When shortening a URL, the server atomically increments a counter (using MongoDB's `$inc`) to avoid ID collisions under concurrent requests.
3. That counter value is base62-encoded into a short, unique code.
4. Visiting the short link redirects (HTTP 302) to the original long URL - this endpoint is public, since anyone can click a shared link.

## Setup

1. Clone this repo
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill in real values
4. Run `npm run dev`

## API Endpoints

| Method | Endpoint              | Auth required | Description              |
|--------|-----------------------|----------------|---------------------------|
| POST   | /api/url/register     | No             | Register a new user       |
| POST   | /api/url/login        | No             | Log in, sets auth cookie  |
| POST   | /api/url/shorten_url  | Yes            | Shorten a long URL        |
| GET    | /:shortCode           | No             | Redirect to the long URL  |

## What I learned

Building this project deepened my understanding of:
- Race conditions and atomic database operations
- Base-N number encoding (base62)
- Password security (bcrypt vs. plain hashing)
- JWT-based stateless authentication
- Express middleware and the request/response lifecycle
