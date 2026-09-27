#!/usr/bin/env node
// A/B benchmark: the API Gateway with @nestjs/axios against the same gateway
// with nestjs-axios-undici. Each side is a checkout with its own node_modules
// and a built dist/ (`npx nest build api-gateway`). Rounds alternate A, B, A, B
// so machine noise hits both sides equally.
//
// Usage:
//   node bench/run.js --a <checkout> --b <checkout> [--rounds 3] [--duration 20s] [--vus 50] [--k6 k6]
// Writes bench/results.json and prints a Markdown table.
const { spawn, fork, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => (arg.startsWith('--') ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs), []),
);
const sides = [
  { key: 'a', label: args['a-label'] || '@nestjs/axios', root: path.resolve(args.a) },
  { key: 'b', label: args['b-label'] || 'nestjs-axios-undici', root: path.resolve(args.b) },
];
const rounds = Number(args.rounds || 3);
const duration = args.duration || '20s';
const vus = String(args.vus || 50);
const k6 = args.k6 || 'k6';
const port = 3900;
const secret = 'bench-secret-at-least-16-chars';

const env = {
  ...process.env,
  NODE_ENV: 'production',
  API_GATEWAY_PORT: String(port),
  AUTH_SERVICE_URL: 'http://127.0.0.1:4001',
  PRODUCT_SERVICE_URL: 'http://127.0.0.1:4002',
  ORDER_SERVICE_URL: 'http://127.0.0.1:4004',
  INVENTORY_SERVICE_URL: 'http://127.0.0.1:4005',
  // Required by the shared env schema; the gateway never connects to these.
  POSTGRES_HOST: 'unused', POSTGRES_USER: 'unused', POSTGRES_PASSWORD: 'unused', POSTGRES_DB: 'unused',
  REDIS_HOST: 'unused', RABBITMQ_URL: 'amqp://unused',
  JWT_SECRET: secret,
};
for (const key of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']) delete env[key];

const jwt = require(require.resolve('jsonwebtoken', { paths: [sides[0].root] }));
const token = jwt.sign({ sub: 'bench-user', email: 'bench@example.com' }, secret, { expiresIn: '2h' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stop = (child) =>
  child.exitCode !== null || child.signalCode !== null ? Promise.resolve() : new Promise((r) => { child.once('exit', r); child.kill(); });
// user + system CPU time of a process, in milliseconds (Linux /proc).
function cpuMs(pid) {
  const fields = fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' ');
  return ((Number(fields[11]) + Number(fields[12])) * 1000) / 100;
}

async function waitForGateway() {
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/products/p-1`, { headers: { authorization: `Bearer ${token}` } });
      if (res.status === 200) return;
    } catch {}
    await sleep(100);
  }
  throw new Error('gateway did not start');
}

async function measure(side) {
  const gateway = spawn(process.execPath, [path.join(side.root, 'dist/apps/api-gateway/main.js')], {
    cwd: side.root, env, stdio: 'ignore',
  });
  try {
    await waitForGateway();
    const summaryFile = path.join(__dirname, `.summary-${side.key}.json`);
    const k6Env = { ...env, BASE_URL: `http://127.0.0.1:${port}`, TOKEN: token, VUS: vus };
    // Warm up, then measure.
    execFileSync(k6, ['run', '-q', '--duration', '5s', path.join(__dirname, 'load.js')], { env: k6Env, stdio: 'ignore' });
    const cpuStart = cpuMs(gateway.pid);
    execFileSync(k6, ['run', '-q', '--duration', duration, '--summary-export', summaryFile, path.join(__dirname, 'load.js')], { env: k6Env, stdio: 'ignore' });
    const cpu = cpuMs(gateway.pid) - cpuStart;
    const m = JSON.parse(fs.readFileSync(summaryFile, 'utf8')).metrics;
    fs.rmSync(summaryFile);
    const requests = m.http_reqs.count;
    return {
      rps: m.http_reqs.rate,
      avgMs: m.http_req_duration.avg,
      p95Ms: m.http_req_duration['p(95)'],
      failedChecks: m.checks.fails,
      gatewayCpuMsPerRequest: cpu / requests,
      requests,
    };
  } finally {
    await stop(gateway);
  }
}

(async () => {
  const mocks = fork(path.join(__dirname, 'mock-services.js'), { stdio: 'ignore' });
  await new Promise((r) => mocks.once('message', r));
  const results = { a: [], b: [] };
  try {
    for (let round = 1; round <= rounds; round++) {
      for (const side of round % 2 ? sides : [...sides].reverse()) {
        const r = await measure(side);
        results[side.key].push(r);
        console.error(`round ${round} ${side.label}: ${r.rps.toFixed(0)} req/s, p95 ${r.p95Ms.toFixed(1)} ms, ${r.gatewayCpuMsPerRequest.toFixed(3)} ms CPU/req, ${r.failedChecks} failed checks`);
      }
    }
  } finally {
    await stop(mocks);
  }
  const median = (xs) => { const s = [...xs].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const summary = Object.fromEntries(sides.map((s) => [s.key, {
    label: s.label,
    rps: median(results[s.key].map((r) => r.rps)),
    avgMs: median(results[s.key].map((r) => r.avgMs)),
    p95Ms: median(results[s.key].map((r) => r.p95Ms)),
    gatewayCpuMsPerRequest: median(results[s.key].map((r) => r.gatewayCpuMsPerRequest)),
    failedChecks: results[s.key].reduce((n, r) => n + r.failedChecks, 0),
  }]));
  const { a, b } = summary;
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({ node: process.version, rounds, duration, vus: Number(vus), summary, results }, null, 2) + '\n');
  const pct = (x, y) => `${(((y - x) / x) * 100).toFixed(0)}%`;
  console.log(`| Median of ${rounds} rounds, ${duration} each, ${vus} VUs, Node ${process.version} | ${a.label} | ${b.label} | Change |`);
  console.log('|---|---:|---:|---:|');
  console.log(`| Requests/s | ${a.rps.toFixed(0)} | ${b.rps.toFixed(0)} | ${(b.rps / a.rps).toFixed(2)}x |`);
  console.log(`| Average latency | ${a.avgMs.toFixed(1)} ms | ${b.avgMs.toFixed(1)} ms | ${pct(a.avgMs, b.avgMs)} |`);
  console.log(`| p95 latency | ${a.p95Ms.toFixed(1)} ms | ${b.p95Ms.toFixed(1)} ms | ${pct(a.p95Ms, b.p95Ms)} |`);
  console.log(`| Gateway CPU per request | ${a.gatewayCpuMsPerRequest.toFixed(3)} ms | ${b.gatewayCpuMsPerRequest.toFixed(3)} ms | ${pct(a.gatewayCpuMsPerRequest, b.gatewayCpuMsPerRequest)} |`);
  console.log(`| Failed checks | ${a.failedChecks} | ${b.failedChecks} | |`);
})().catch((error) => { console.error(error); process.exit(1); });
