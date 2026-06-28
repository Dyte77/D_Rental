process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const pool = require("../db");

describe("Refresh token rotation", () => {
  const testUser = {
    full_name: "Refresh Test User",
    email: "refreshtest@example.com",
    phone: "0788222111",
    password: "testpassword123",
    role: "tenant",
  };

  afterAll(async () => {
    // Clean up the test user — refresh_tokens rows cascade-delete automatically
    // since they reference users(id) ON DELETE CASCADE.
    await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
    await pool.end();
  });

  beforeAll(async () => {
    await request(app).post("/api/auth/register").send(testUser);
  });

  test("login issues both an access token and a refresh token", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  test("refresh token can be used once to get a new token pair", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });
    const originalRefreshToken = loginRes.body.refreshToken;

    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: originalRefreshToken });

    expect(refreshRes.statusCode).toBe(200);
    expect(refreshRes.body.accessToken).toBeDefined();
    expect(refreshRes.body.refreshToken).toBeDefined();
    // The new refresh token must be different from the one we just used —
    // this is the actual "rotation" part.
    expect(refreshRes.body.refreshToken).not.toBe(originalRefreshToken);
  });

  test("reusing an already-rotated refresh token is rejected", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });
    const originalRefreshToken = loginRes.body.refreshToken;

    // First use — this should succeed and rotate the token.
    await request(app).post("/api/auth/refresh").send({ refreshToken: originalRefreshToken });

    // Second use of the SAME (now-dead) token — this is the theft scenario.
    const reuseRes = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: originalRefreshToken });

    expect(reuseRes.statusCode).toBe(401);
    expect(reuseRes.body.error).toMatch(/reuse detected/i);
  });

  test("detecting reuse revokes the entire token family, including the newest token", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });
    const originalRefreshToken = loginRes.body.refreshToken;

    // Rotate once — get a legitimate "newest" token.
    const firstRefreshRes = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: originalRefreshToken });
    const newestRefreshToken = firstRefreshRes.body.refreshToken;

    // Trigger reuse detection by reusing the original (already dead) token.
    await request(app).post("/api/auth/refresh").send({ refreshToken: originalRefreshToken });

    // The newest token, though never itself misused, should now ALSO be dead,
    // since the whole family was revoked.
    const newestTokenRes = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: newestRefreshToken });

    expect(newestTokenRes.statusCode).toBe(401);
  });

  test("logout revokes the refresh token", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });
    const refreshToken = loginRes.body.refreshToken;

    const logoutRes = await request(app).post("/api/auth/logout").send({ refreshToken });
    expect(logoutRes.statusCode).toBe(200);

    // The same token should no longer work for refreshing.
    const refreshAfterLogoutRes = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken });

    expect(refreshAfterLogoutRes.statusCode).toBe(401);
  });
});