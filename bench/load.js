// k6 load script for the API Gateway. Run through bench/run.js, which sets
// BASE_URL and TOKEN. A mix of real gateway routes:
//   55% GET /products/:id   20% GET /products   10% POST /orders
//   10% GET /inventory/items/:id   5% GET /products/missing (a 404 from Product Service)
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL;
const params = {
  headers: { Authorization: `Bearer ${__ENV.TOKEN}`, 'Content-Type': 'application/json' },
};

export const options = {
  vus: Number(__ENV.VUS || 50),
  duration: __ENV.DURATION || '20s',
  discardResponseBodies: true,
};

export default function () {
  const roll = Math.random();
  const id = `p-${1 + Math.floor(Math.random() * 20)}`;
  if (roll < 0.55) {
    check(http.get(`${BASE_URL}/products/${id}`, params), { 'product 200': (r) => r.status === 200 });
  } else if (roll < 0.75) {
    check(http.get(`${BASE_URL}/products`, params), { 'list 200': (r) => r.status === 200 });
  } else if (roll < 0.85) {
    const body = JSON.stringify({ items: [{ productId: id, quantity: 1 }] });
    check(http.post(`${BASE_URL}/orders`, body, params), { 'order 201': (r) => r.status === 201 });
  } else if (roll < 0.95) {
    check(http.get(`${BASE_URL}/inventory/items/${id}`, params), { 'inventory 200': (r) => r.status === 200 });
  } else {
    check(http.get(`${BASE_URL}/products/missing`, params), { 'missing 404': (r) => r.status === 404 });
  }
}
