// k6 load test: simulates many landlords creating listings simultaneously.
// Unlike browsing (a read), this hits validation AND a real database
// INSERT on every single request — a meaningfully different load profile.

import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "10s", target: 20 },
    { duration: "20s", target: 20 },
    { duration: "10s", target: 0 },
  ],
};

// "setup" runs ONCE, before any virtual users start their loops — perfect
// for one-time work like logging in, rather than every VU logging in
// separately on every single iteration.
export function setup() {
  const loginRes = http.post(
    "http://localhost:3000/api/auth/login",
    JSON.stringify({ email: "loadtest@example.com", password: "loadtestpass123" }),
    { headers: { "Content-Type": "application/json" } }
  );

  const accessToken = JSON.parse(loginRes.body).accessToken;
  return { accessToken };
}

// "data" here is whatever setup() returned — k6 passes it into every
// virtual user's default function automatically.
export default function (data) {
  const payload = JSON.stringify({
    title: `Load test listing ${Math.random().toString(36).substring(2, 8)}`,
    price_per_month: 200000,
    room_type: "single",
    district: "Wakiso",
  });

  const res = http.post("http://localhost:3000/api/listings", payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.accessToken}`,
    },
  });

  check(res, {
    "status is 201": (r) => r.status === 201,
  });

  sleep(1);
}