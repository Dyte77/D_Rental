// k6 load test: a single, simple browsing scenario used purely to find
// where THIS specific machine's load-generation and/or server capacity
// starts to break down, by running the same test at increasing VU counts.
//
// IMPORTANT CONTEXT: this machine is running BOTH the load generator (k6)
// AND the server under test (Node + Postgres) at the same time. Results
// at very high VU counts reflect combined local resource exhaustion, not
// a clean, isolated measurement of server-only capacity.

import http from "k6/http";
import { check, sleep } from "k6";

// Change this single number between runs to step up the load gradually.
const TARGET_VUS = 3000;

export const options = {
  stages: [
    { duration: "10s", target: TARGET_VUS },
    { duration: "20s", target: TARGET_VUS },
    { duration: "10s", target: 0 },
  ],
};

export default function () {
  const res = http.get("http://localhost:3000/api/listings");
  check(res, { "status is 200": (r) => r.status === 200 });
  sleep(1);
}