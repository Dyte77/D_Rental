// k6 stress test: deliberately targets the database connection pool's
// configured maximum (default 10 for `pg`), rather than just generating
// raw traffic. With more than 10 truly simultaneous requests, some MUST
// queue and wait for a connection to free up — this test is designed to
// surface exactly that queuing behavior, not general hardware limits.

import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  // A short, sharp burst rather than a gradual ramp — we WANT many
  // requests to land at the exact same instant, to genuinely exceed
  // the pool's max connection count simultaneously.
  scenarios: {
    pool_stress: {
      executor: "constant-vus",
      vus: 200, // deliberately more than the pool's default max of 10
      duration: "15s",
    },
  },
};

export default function () {
  const res = http.get("http://localhost:3000/api/listings");
  check(res, { "status is 200": (r) => r.status === 200 });
  // No sleep() here — we want requests firing as fast as possible,
  // specifically to keep pressure on the pool throughout the run.
}