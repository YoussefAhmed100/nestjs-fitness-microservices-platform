# Fitness Microservices Platform

A production-oriented microservices backend built with **NestJS**, **Drizzle ORM**, **Neon (Serverless Postgres)**, and **RabbitMQ**, following **Event-Driven Architecture** principles. The system is structured as a single monorepo containing an API Gateway and four independent domain services.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Communication Patterns](#communication-patterns)
- [Services](#services)
  - [API Gateway](#1-api-gateway)
  - [Auth Service](#2-auth-service)
  - [Product Service](#3-product-service-planned)
  - [Order Service](#4-order-service-planned)
  - [Notification Service](#5-notification-service-planned)
- [Error Handling Strategy](#error-handling-strategy)
- [Database Strategy](#database-strategy)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Roadmap](#roadmap)

---

## Architecture Overview

```
                              ┌─────────────────────┐
                              │        Client        │
                              │   (Web / Mobile /    │
                              │       Postman)        │
                              └──────────┬────────────┘
                                         │ HTTP
                                         ▼
                              ┌─────────────────────┐
                              │     API Gateway       │
                              │  (HTTP entrypoint,    │
                              │  validation, guards)  │
                              └──────────┬────────────┘
                                         │
                          RabbitMQ (RPC request/response
                            + async event publishing)
                                         │
         ┌───────────────┬───────────────┼───────────────┬────────────────┐
         ▼               ▼               ▼               ▼                
  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────────┐
  │ Auth Service │ │Product Svc  │ │ Order Svc   │ │Notification Svc│
  │ (RMQ only)   │ │ (RMQ only)  │ │ (RMQ only)  │ │ (consumer only)│
  └──────┬───────┘ └──────┬──────┘ └──────┬──────┘ └────────────────┘
         │                │                │
      Neon DB          Neon DB          Neon DB
      (auth_db)      (product_db)      (order_db)
```

Each service is an independent NestJS application with its own database, its own RabbitMQ queue, and no direct dependency on any other service's internals. All cross-service communication happens exclusively through RabbitMQ — there is no direct HTTP or TCP communication between services.

---

## Tech Stack

| Concern | Choice | Reasoning |
|---|---|---|
| Framework | NestJS (monorepo mode) | Native support for multiple apps + shared libs in one workspace |
| ORM | Drizzle ORM | Type-safe, lightweight, SQL-first — no heavy runtime overhead |
| Database | Neon (Serverless Postgres) | Database-per-service, HTTP-based driver, scales to zero |
| Messaging | RabbitMQ | Single broker for both synchronous RPC calls and asynchronous events |
| Auth | JWT (access + refresh, rotation) | Stateless access tokens, revocable refresh tokens |
| Containerization | Docker / docker-compose | Local RabbitMQ broker, consistent dev environment |
| Validation | class-validator / class-transformer | Declarative DTO validation enforced at the Gateway |

---

## Monorepo Structure

```
fitness-platform/
├── apps/
│   ├── gateway/          → HTTP entrypoint, the only public-facing service
│   ├── auth/              → Authentication & authorization microservice
│   ├── product/           → Product catalog microservice (in progress)
│   ├── order/             → Order processing microservice (in progress)
│   └── notification/      → Event-driven notification consumer (in progress)
├── libs/
│   └── common/            → Shared code used by every app
│       ├── constants/      → QUEUES and PATTERNS (message routing keys)
│       ├── events/         → Event DTOs (e.g. UserRegisteredEvent, OrderCreatedEvent)
│       ├── dto/             → Shared request DTOs (RegisterDto, LoginDto, etc.)
│       └── filters/         → Exception filters (RMQ-context and HTTP-context)
├── docker-compose.yml      → RabbitMQ broker (management UI on :15672)
├── nest-cli.json           → Monorepo project definitions
└── .env.example
```

### Why a monorepo with `libs/common`?

All services need to agree on the exact shape of events and message patterns. Keeping these contracts in a single shared library guarantees that if a contract changes, it changes in exactly one place — every service importing `@app/common` picks up the change at compile time instead of silently drifting out of sync.

---

## Communication Patterns

Two types of inter-service communication exist, both over the **same RabbitMQ broker** (deliberately — a single broker to monitor and reason about, rather than mixing RabbitMQ with TCP transports):

### 1. Synchronous (Request/Response)
Used when the caller needs an actual answer before continuing (e.g., the Gateway validating a JWT against the Auth Service).

```typescript
const result = await firstValueFrom(
  client.send(PATTERNS.AUTH_VALIDATE_TOKEN, { token })
);
```

### 2. Asynchronous (Fire-and-forget Events)
Used for side effects that shouldn't block the main flow (e.g., notifying the Notification Service after a user registers).

```typescript
client.emit(PATTERNS.USER_REGISTERED, new UserRegisteredEvent(...));
```

**Why RabbitMQ for both instead of RabbitMQ + TCP:**
- Native load balancing across multiple consumer instances of the same service (no manual service discovery needed)
- A single message broker to operate, monitor, and debug (via the RabbitMQ Management UI)
- Built-in queue durability and retry semantics that a raw TCP transport doesn't provide

---

## Services

### 1. API Gateway

The **only HTTP-facing application** in the system. Responsibilities:

- Exposes REST endpoints consumed by clients (Postman, frontend, mobile apps)
- Runs a global `ValidationPipe` — this is where `class-validator` DTO rules are actually enforced
- Forwards validated requests to the appropriate microservice via `ClientProxy.send()` / `.emit()`
- `JwtAuthGuard` protects routes that require authentication by calling the Auth Service's token-validation pattern over RabbitMQ before allowing the request through
- `GlobalExceptionFilter` normalizes all error sources — NestJS `HttpException`s, `RpcException` payloads returned from downstream services, and RabbitMQ timeout/unavailability errors — into one consistent JSON error shape

**Port:** `3000` (HTTP)

### 2. Auth Service

A **pure RabbitMQ microservice** (no HTTP server) responsible for identity and tokens. Own database: `auth_db`.

**Message Patterns (sync):**
| Pattern | Purpose |
|---|---|
| `auth.register` | Create a new user, hash password with bcrypt, emit `user.registered` event |
| `auth.login` | Validate credentials, issue access + refresh token pair |
| `auth.refresh` | Rotate refresh token, issue a new token pair |
| `auth.logout` | Revoke all active refresh tokens for a user |
| `auth.validate_token` | Verify an access token's signature and expiry (used by the Gateway's guard) |

**Token strategy:**
- **Access token**: short-lived (15 minutes), signed with a dedicated `JWT_ACCESS_SECRET`
- **Refresh token**: long-lived (7 days), stored **hashed** (SHA-256) in the database — never in plaintext
- **Rotation on use**: every refresh call immediately revokes the used refresh token and issues a new one. If a revoked token is replayed (e.g., stolen and reused after the legitimate client already rotated it), the request is rejected — this is the mechanism that detects token theft

**Error handling inside the service:** all domain errors are thrown as `RpcException({ statusCode, message })` rather than NestJS HTTP exceptions (`UnauthorizedException`, `ConflictException`, etc.), since HTTP exceptions have no meaning inside a pure RMQ transport context. A dedicated `AllRpcExceptionsFilter` (from `libs/common`) is registered globally in the service's `main.ts` to propagate these errors cleanly back through RabbitMQ to the calling Gateway.

**Schema (`auth_db`):**
- `users` — id, email (unique), hashed password, name, isActive, timestamps
- `refresh_tokens` — id, userId (FK, cascade delete), tokenHash, isRevoked, expiresAt, createdAt

### 3. Product Service *(planned)*

Will own the product catalog: CRUD operations, stock management, and an atomic stock-decrement operation (`UPDATE ... WHERE stock >= quantity`) to prevent race conditions when multiple orders compete for the same inventory at checkout. Own database: `product_db`.

### 4. Order Service *(planned)*

Will orchestrate order creation: validating product availability (sync call to Product Service), persisting the order, and publishing an `order.created` event for downstream consumers (Notification Service, and potentially Product Service for stock reconciliation). Own database: `order_db`.

### 5. Notification Service *(planned)*

A pure event consumer with **no exposed message patterns of its own** — it only listens to `notification_queue` for events like `user.registered` and `order.created`, and triggers side effects (emails, push notifications) accordingly. Has no database ownership requirement beyond what's needed for notification history/auditing.

---

## Error Handling Strategy

A recurring architectural detail worth calling out explicitly: **there are two separate exception filters, for two separate transport contexts**, and mixing them up causes a runtime crash (`response.status is not a function`) since a pure RMQ context has no HTTP `Response` object.

| Filter | Location | Context | Purpose |
|---|---|---|---|
| `AllRpcExceptionsFilter` | `libs/common` | Inside every microservice (Auth, Product, Order) | Passes the `RpcException` payload through cleanly over RabbitMQ back to the caller |
| `GlobalExceptionFilter` | `apps/gateway` | Inside the Gateway only | Catches `HttpException`s, `RpcException` payloads returned from services, and RMQ timeout errors — writes a single consistent JSON response back to the HTTP client |

**Rule of thumb:** any service that only listens on RabbitMQ (`Transport.RMQ`, no HTTP server) throws `RpcException`, never `UnauthorizedException`/`ConflictException`/etc. Only the Gateway — the sole HTTP-facing app — is allowed to produce actual HTTP status responses.

---

## Database Strategy

**Database-per-service** — enforced literally, not just logically. Each service has its own Neon project/connection string (`DATABASE_URL_AUTH`, `DATABASE_URL_PRODUCT`, `DATABASE_URL_ORDER`), and no service is permitted to query another service's tables directly. Any data a service needs from another domain is obtained either through a synchronous RPC call or by consuming an event — never through a shared database connection.

The Neon **HTTP driver** (`drizzle-orm/neon-http`) is used rather than the WebSocket/serverless pooled driver, since none of the current services require multi-statement transactions spanning multiple connections — a deliberate simplicity trade-off that can be revisited if a service later needs it.

---

## Getting Started

### Prerequisites
- Node.js v24+
- Docker & Docker Compose
- A Neon account with one project per service (or one project with separate databases)

### 1. Clone and install

```bash
git clone <repo-url>
cd fitness-platform
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in DATABASE_URL_AUTH, DATABASE_URL_PRODUCT, DATABASE_URL_ORDER,
# RABBITMQ_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
```

### 3. Start RabbitMQ

```bash
docker compose up -d
```

Management UI available at `http://localhost:15672` (default credentials: `admin` / `admin123`).

### 4. Run database migrations

```bash
npx drizzle-kit generate --config=apps/auth/drizzle.config.ts
npx drizzle-kit migrate --config=apps/auth/drizzle.config.ts
```

### 5. Start the services (each in its own terminal)

```bash
npm run start:dev auth
npm run start:dev gateway
```

### 6. Test via Postman or curl

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ahmed Mohamed","email":"ahmed@example.com","password":"StrongPassword123!"}'
```

---

## Environment Variables

| Variable | Used By | Description |
|---|---|---|
| `RABBITMQ_URL` | All services | RabbitMQ connection string |
| `DATABASE_URL_AUTH` | Auth Service | Neon connection string for `auth_db` |
| `DATABASE_URL_PRODUCT` | Product Service | Neon connection string for `product_db` |
| `DATABASE_URL_ORDER` | Order Service | Neon connection string for `order_db` |
| `JWT_ACCESS_SECRET` | Auth Service | Signing secret for short-lived access tokens |
| `JWT_REFRESH_SECRET` | Auth Service | Signing secret for refresh token operations |

---

## Roadmap

- [x] Monorepo + RabbitMQ infra setup
- [x] Shared event contracts and message patterns (`libs/common`)
- [x] Auth Service — register, login, JWT access/refresh rotation
- [x] API Gateway — HTTP entrypoint, validation, guards, unified error handling
- [ ] Product Service — CRUD + atomic stock management
- [ ] Order Service — order creation, product validation, `order.created` event
- [ ] Notification Service — event consumer for `user.registered` / `order.created`
- [ ] Docker Compose full stack (all services containerized, not just RabbitMQ)
- [ ] CI pipeline (lint, build, test per service)
