import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { createApp } from "../../src/app.js";
import { closeDbPool } from "../../src/db.js";
import { closeRedis } from "../../src/redis.js";

describe("Order API Integration Tests", () => {
  const app = createApp();

  let accessToken: string;

  const testEmail = `order.integration.${Date.now()}@example.com`;
  const testPassword = "ValidPassword123!";

  beforeAll(async () => {
    // Create a user for the order tests
    const registerRes = await request(app).post("/auth/register").send({
      email: testEmail,
      password: testPassword,
      first_name: "Order",
      last_name: "Integration",
      role: "CUSTOMER",
    });

    expect(registerRes.status).toBe(201);

    // Login and get access token
    const loginRes = await request(app).post("/auth/login").send({
      email: testEmail,
      password: testPassword,
      client_type: "WEB",
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeDefined();

    accessToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await Promise.all([closeDbPool(), closeRedis()]);
  });

  it("GET /orders should reject unauthenticated requests with 401", async () => {
    const res = await request(app).get("/orders");
    expect(res.status).toBe(401);
  });

  it("GET /orders should return orders array when authenticated", async () => {
    const res = await request(app)
      .get("/orders?limit=5")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.orders)).toBe(true);
  });

  it("POST /orders should reject unauthenticated requests with 401", async () => {
    const res = await request(app).post("/orders").send({
      items: [],
    });
    expect(res.status).toBe(401);
  });

  it("POST /orders should return 400 for invalid items list", async () => {
    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        items: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
