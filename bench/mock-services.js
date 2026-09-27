// Stand-ins for the services behind the API Gateway: auth, product, order
// and inventory. They answer instantly with fixed JSON, so the benchmark
// measures the gateway itself: routing, JWT checks, and the HTTP client
// that forwards each request.
// Usage: node bench/mock-services.js  (ports 4001, 4002, 4004, 4005)
const http = require('node:http');

const product = (id) => ({
  id,
  name: `Product ${id}`,
  description: 'A product returned by the mock Product Service.',
  price: 19.99,
  currency: 'USD',
  tags: ['bench', 'mock'],
  createdAt: '2026-01-01T00:00:00.000Z',
});
const products = Array.from({ length: 20 }, (_, i) => product(`p-${i + 1}`));

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(json),
  });
  res.end(json);
}

function readBody(req, cb) {
  let data = '';
  req.on('data', (chunk) => (data += chunk));
  req.on('end', () => cb(data ? JSON.parse(data) : undefined));
}

const routes = {
  4001(req, res) {
    readBody(req, () => send(res, 200, { accessToken: 'mock-token' }));
  },
  4002(req, res) {
    const url = req.url.split('?')[0];
    if (req.method === 'GET' && url === '/products') return send(res, 200, products);
    const match = url.match(/^\/products\/([^/]+)$/);
    if (req.method === 'GET' && match) {
      if (match[1] === 'missing') return send(res, 404, { statusCode: 404, message: 'Product not found' });
      return send(res, 200, product(match[1]));
    }
    send(res, 404, { statusCode: 404, message: 'Not found' });
  },
  4004(req, res) {
    readBody(req, (body) =>
      send(res, 201, { id: 'o-1', status: 'PENDING', items: body?.items ?? [] }),
    );
  },
  4005(req, res) {
    const match = req.url.match(/^\/inventory\/items\/([^/?]+)/);
    send(res, 200, { productId: match ? match[1] : 'p-1', quantity: 42, reserved: 3 });
  },
};

for (const [port, handler] of Object.entries(routes)) {
  const server = http.createServer(handler);
  server.keepAliveTimeout = 60_000;
  server.listen(Number(port), '127.0.0.1');
}
process.send?.('ready');
