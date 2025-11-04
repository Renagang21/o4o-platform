import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },   // Ramp up to 100 users
    { duration: '1m', target: 300 },    // Ramp up to 300 users (stress)
    { duration: '1m', target: 500 },    // Ramp up to 500 users (heavy stress)
    { duration: '30s', target: 0 },     // Ramp down to 0
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],     // Allow up to 5% errors under stress
    http_req_duration: ['p(95)<2000'],  // p95 should be under 2s even under stress
  },
};

const BASE_URL = 'http://127.0.0.1:3001';

export default function () {
  const endpoints = [
    '/metrics',
    '/health',
  ];
  
  // Randomly select an endpoint
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${BASE_URL}${endpoint}`);
  
  check(res, {
    'status is 200 or 503': (r) => r.status === 200 || r.status === 503,
    'response time < 5s': (r) => r.timings.duration < 5000,
  });
  
  sleep(0.1); // Very short sleep to maximize load
}
