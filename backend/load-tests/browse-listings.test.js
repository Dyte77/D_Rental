// k6 load test: simulates many tenants browsing/searching listings at once.
// This is the single highest-traffic read path in the whole app, so it's
// the most important one to understand under load.

import http from "k6/http";
import { check, sleep } from "k6";

// "options" tells k6 HOW to ramp up load over time, rather than just
// firing a fixed number of requests all at once.
export const options = {
  stages: [
    { duration: "10s", target: 50 },  // ramp up to 50 virtual users over 10 seconds
    { duration: "20s", target: 50 },  // hold steady at 50 virtual users for 20 seconds
    { duration: "10s", target: 0 },   // ramp back down to 0
  ],
};

// "default function" is what each virtual user actually does, repeatedly,
// for the whole duration of the test.
export default function () {
  const res = http.get("http://localhost:3000/api/listings");

  // "check" lets us assert things about each response, similar to Jest's
  // expect() — but these results get aggregated into a pass/fail percentage
  // across potentially thousands of requests, not just one.
  check(res, {
    "status is 200": (r) => r.status === 200,
    "response has listings array": (r) => JSON.parse(r.body).listings !== undefined,
  });

  // A short pause between each virtual user's requests, simulating a real
  // person briefly looking at results before searching again — without
  // this, k6 would fire requests as fast as physically possible, which
  // isn't a realistic browsing pattern.
  sleep(1);
}