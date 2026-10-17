import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 2.x load script targeting realistic concurrent usage (§78)
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Warm-up
    { duration: '1m', target: 250 },   // Moderate load
    { duration: '2m', target: 500 },   // High load
    { duration: '2m', target: 1000 },  // Peak 1,000 active concurrent users
    { duration: '30s', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<800'],
    http_req_failed: ['rate<0.01'], // <1% failure rate
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:8000';

export default function () {
  // 1. Browse Global Feed
  const resFeed = http.get(`${BASE_URL}/`);
  check(resFeed, {
    'feed status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // 2. Search Posts & Notices
  const resSearch = http.get(`${BASE_URL}/search?q=anonymous`);
  check(resSearch, {
    'search status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // 3. Inspect Community Notices
  const resNotices = http.get(`${BASE_URL}/notices`);
  check(resNotices, {
    'notices status is 200': (r) => r.status === 200,
  });

  sleep(2);
}
