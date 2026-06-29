import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

const originalFrontendUrl = process.env.FRONTEND_URL;

afterEach(() => {
    process.env.FRONTEND_URL = originalFrontendUrl;
    vi.resetModules();
});

describe("CORS middleware", () => {
    it("permits the configured frontend origin for preflight requests", async () => {
        process.env.FRONTEND_URL = "https://fenrir.example.com";
        vi.resetModules();

        const { buildApp } = await import("../app");
        const app = buildApp();

        const response = await request(app)
            .options("/health")
            .set("Origin", "https://fenrir.example.com")
            .set("Access-Control-Request-Method", "GET");

        expect(response.status).toBe(204);
        expect(response.headers["access-control-allow-origin"]).toBe("https://fenrir.example.com");
        expect(response.headers["access-control-allow-credentials"]).toBe("true");
    });
});
