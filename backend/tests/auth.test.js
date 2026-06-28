process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const pool = require("../db");

describe("Auth endpoints", () => {
  const testUser = {
    full_name: "Test User",
    email: "jesttest@example.com",
    phone: "0788111222",
    password: "testpassword123",
    role: "tenant",
  };

  afterAll(async () => {
    await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
    await pool.end();
  });

  test("registers a new user successfully", async () => {
    const res = await request(app).post("/api/auth/register").send(testUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.password_hash).toBeUndefined();
  });

  test("rejects registration with an invalid email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...testUser, email: "not-a-valid-email" });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("rejects duplicate email registration", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...testUser, phone: "0788999888" });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  test("logs in successfully with correct credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  test("rejects login with wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: "wrongpassword",
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("rejects account deletion with wrong password", async () => {
  const loginRes = await request(app).post("/api/auth/login").send({
    email: testUser.email,
    password: testUser.password,
  });
  const token = loginRes.body.accessToken;

  const res = await request(app)
    .delete("/api/auth/account")
    .set("Authorization", `Bearer ${token}`)
    .send({ password: "wrongpassword" });

  expect(res.statusCode).toBe(401);
});

test("deletes own account with correct password, and token becomes invalid afterward", async () => {
  const loginRes = await request(app).post("/api/auth/login").send({
    email: testUser.email,
    password: testUser.password,
  });
  const token = loginRes.body.accessToken;

  const deleteRes = await request(app)
    .delete("/api/auth/account")
    .set("Authorization", `Bearer ${token}`)
    .send({ password: testUser.password });

  expect(deleteRes.statusCode).toBe(200);

  const profileRes = await request(app)
    .get("/api/auth/profile")
    .set("Authorization", `Bearer ${token}`);

  expect(profileRes.statusCode).toBe(401);
});
});