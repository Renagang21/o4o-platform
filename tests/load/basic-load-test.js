import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'errors': ['rate<0.01'],
    'http_reqs': ['rate>50'],  // At least 50 req/s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3001';

export default function () {
  // Test metrics endpoint
  const metricsRes = http.get(`${BASE_URL}/metrics`);
  
  check(metricsRes, {
    'metrics status is 200': (r) => r.status === 200,
    'metrics response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  errorRate.add(metricsRes.status !== 200);
  responseTime.add(metricsRes.timings.duration);
  
  sleep(1);
}
