# 0002: NestJS with Fastify

## Decision

Use NestJS for backend application structure and Fastify as the HTTP adapter.

## Rationale

NestJS gives a stable module and dependency injection model. Fastify keeps the HTTP layer portable and efficient. The API runs as a regular Node.js process and in Docker without hosting-specific application code.
