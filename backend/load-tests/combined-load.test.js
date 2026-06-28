// k6 load test: simulates tenants browsing and landlords creating listings
// AT THE SAME TIME — a more realistic picture of real traffic than testing
// either behavior in isolation.

import http from "k6/http";
import { check, sleep } from "k6";

// "scenarios" lets us define multiple independent load patterns that run
// concurrently, rather than one single default function for everyone.
export const options = {
  scenarios: {
    tenants_browsing: {
      executor: "ramping-vus",
      exec: "browseListings",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 1000 },
        { duration: "20s", target: 1000 },
        { duration: "10s", target: 0 },
      ],
    },
    landlords_posting: {
      executor: "ramping-vus",
      exec: "createListing",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 500 },
        { duration: "20s", target: 500 },
        { duration: "10s", target: 0 },
      ],
    },
  },
};

export function setup() {
  const loginRes = http.post(
    "http://localhost:3000/api/auth/login",
    JSON.stringify({ email: "loadtest@example.com", password: "loadtestpass123" }),
    { headers: { "Content-Type": "application/json" } }
  );
  const accessToken = JSON.parse(loginRes.body).accessToken;
  return { accessToken };
}

// This function is what the "tenants_browsing" scenario's virtual users run.
export function browseListings() {
  const res = http.get("http://localhost:3000/api/listings");
  check(res, { "browse: status is 200": (r) => r.status === 200 });
  sleep(1);
}

// This function is what the "landlords_posting" scenario's virtual users run.
export function createListing(data) {
  const payload = JSON.stringify({
    title: `Combined load test ${Math.random().toString(36).substring(2, 8)}`,
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

  check(res, { "create: status is 201": (r) => r.status === 201 });
  sleep(1);
}