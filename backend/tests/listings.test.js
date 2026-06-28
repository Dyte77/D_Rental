process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const pool = require("../db");

describe("Listing endpoints", () => {
  const landlord = {
    full_name: "Test Landlord",
    email: "jestlandlord@example.com",
    phone: "0788222333",
    password: "landlordpass123",
    role: "landlord",
  };

  const tenant = {
    full_name: "Test Tenant",
    email: "jesttenant@example.com",
    phone: "0788333444",
    password: "tenantpass123",
    role: "tenant",
  };

  let landlordToken;
  let tenantToken;
  let createdListingId;

  beforeAll(async () => {
    await request(app).post("/api/auth/register").send(landlord);
    await request(app).post("/api/auth/register").send(tenant);

    const landlordLogin = await request(app).post("/api/auth/login").send({
      email: landlord.email,
      password: landlord.password,
    });
    landlordToken = landlordLogin.body.accessToken;

    const tenantLogin = await request(app).post("/api/auth/login").send({
      email: tenant.email,
      password: tenant.password,
    });
    tenantToken = tenantLogin.body.accessToken;
  });

  afterAll(async () => {
    await pool.query("DELETE FROM users WHERE email IN ($1, $2)", [landlord.email, tenant.email]);
    await pool.end();
  });

  const validListing = {
    title: "Jest test listing self-contained",
    price_per_month: 250000,
    room_type: "self-contained",
    district: "Wakiso",
  };

  test("tenant cannot create a listing", async () => {
    const res = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${tenantToken}`)
      .send(validListing);

    expect(res.statusCode).toBe(403);
  });

  test("landlord can create a listing", async () => {
    const res = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${landlordToken}`)
      .send(validListing);

    expect(res.statusCode).toBe(201);
    expect(res.body.listing.title).toBe(validListing.title);
    createdListingId = res.body.listing.id;
  });

  test("rejects a listing with a negative price", async () => {
    const res = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${landlordToken}`)
      .send({ ...validListing, price_per_month: -100 });

    expect(res.statusCode).toBe(400);
  });

  test("anonymous user can browse listings", async () => {
    const res = await request(app).get("/api/listings");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.listings)).toBe(true);
  });

  test("anonymous user sees locked details on listing detail view", async () => {
    const res = await request(app).get(`/api/listings/${createdListingId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.listing.locked).toBe(true);
    expect(res.body.listing.district).toBeUndefined();
  });

  test("logged-in user sees full listing details", async () => {
    const res = await request(app)
      .get(`/api/listings/${createdListingId}`)
      .set("Authorization", `Bearer ${tenantToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.listing.locked).toBe(false);
    expect(res.body.listing.district).toBe(validListing.district);
  });

  test("tenant cannot delete the landlord's listing", async () => {
    const res = await request(app)
      .delete(`/api/listings/${createdListingId}`)
      .set("Authorization", `Bearer ${tenantToken}`);

    expect(res.statusCode).toBe(403);
  });

  test("landlord can delete their own listing", async () => {
    const res = await request(app)
      .delete(`/api/listings/${createdListingId}`)
      .set("Authorization", `Bearer ${landlordToken}`);

    expect(res.statusCode).toBe(200);
  });
});