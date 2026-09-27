# API Gateway: @nestjs/axios vs nestjs-axios-undici

This branch changes one import in the API Gateway. Every `HttpModule` and `HttpService` import from `@nestjs/axios` now comes from [`nestjs-axios-undici`](https://github.com/yordan-kanchelov/nestjs-axios-undici) 1.0.0, in 6 files. Nothing else in the application changed. It typechecks and builds with no other edits, including `forwardHttpRequest`, which still reads `error.response` through axios' `AxiosError` type.

```diff
-import { HttpModule } from '@nestjs/axios';
+import { HttpModule } from 'nestjs-axios-undici';
```

## Results

Same machine, same build settings, 5 alternating rounds of 20 seconds at 50 virtual users, Node.js 22.22.2. The table shows the median round.

| | @nestjs/axios | nestjs-axios-undici | Change |
|---|---:|---:|---:|
| Requests/s | 1,131 | 2,007 | 1.77x |
| Average latency | 44.1 ms | 24.8 ms | 44% lower |
| p95 latency | 59.9 ms | 33.9 ms | 43% lower |
| Gateway CPU per request | 0.957 ms | 0.542 ms | 43% lower |
| Failed checks | 0 | 0 | |

Every round agreed: 1,102 to 1,159 requests/s with `@nestjs/axios`, 1,965 to 2,030 with nestjs-axios-undici. Raw numbers per round are in [`results.json`](results.json).

## What's measured

The gateway runs as built (`npx nest build api-gateway`), with its middleware, JWT guard, validation pipe and exception filter. The services behind it are replaced by [`mock-services.js`](mock-services.js), which answers instantly with fixed JSON. That isolates the gateway, so the numbers show what the HTTP client costs. With real services the latency added by the downstream calls dominates, and the gap in latency shrinks. The CPU saving per request stays.

[k6](https://k6.io) sends a mix of real gateway routes with a valid JWT ([`load.js`](load.js)):

- 55% `GET /products/:id`
- 20% `GET /products`
- 10% `POST /orders`
- 10% `GET /inventory/items/:productId`
- 5% `GET /products/missing`, which Product Service answers with a 404. The gateway turns it into its own 404 through `forwardHttpRequest`'s `error.response` handling.

Each request checks the status code. Gateway CPU is read from `/proc` before and after the measured window and divided by the request count.

## Run it yourself

You need Node.js 22+, k6, and a Linux machine (for the CPU reading).

```bash
# This branch
npm ci && npx nest build api-gateway

# The upstream commit this branch starts from, as the baseline
git worktree add ../swiftcart-baseline dd8ccf5
(cd ../swiftcart-baseline && npm ci && npx nest build api-gateway)

node bench/run.js --a ../swiftcart-baseline --b . --rounds 5 --duration 20s
```
