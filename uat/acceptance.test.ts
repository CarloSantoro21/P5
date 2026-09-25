import { describe, expect, it, type TestContext } from "vitest";

const baseUrl = process.env.UAT_BASE_URL?.replace(/\/$/, "");
const referenceUrl = process.env.UAT_REFERENCE_URL?.replace(/\/$/, "");

if (!baseUrl) {
  throw new Error("UAT_BASE_URL must point to the deployed Worker");
}

// Fetches a path on the deployed Worker and records the response as evidence.
async function get(path: string, { annotate }: TestContext, origin = baseUrl!) {
  const url = `${origin}${path}`;
  const res = await fetch(url);
  const body = await res.text();
  await annotate(
    `GET ${url} → ${res.status} (${res.headers.get("content-type")})\n${body}`,
    "evidence",
  );
  return { res, body };
}

function parseUsers(body: string): unknown {
  return JSON.parse(body.slice(body.indexOf("\n\n") + 2));
}

describe(`UAT on ${baseUrl}`, () => {
  it("UAT-01: /health reports the service is up", async (ctx) => {
    const { res, body } = await get("/health", ctx);
    expect(res.status).toBe(200);
    expect(JSON.parse(body)).toEqual({ status: "ok" });
  });

  it("UAT-02: / greets carluwu and lists the users from D1", async (ctx) => {
    const { res, body } = await get("/", ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(body.startsWith("holuwu soy carluwu\n\n")).toBe(true);

    const users = parseUsers(body);
    expect(Array.isArray(users)).toBe(true);
    expect((users as unknown[]).length).toBeGreaterThan(0);
  });

  it("UAT-03: / greets the name passed as ?name=", async (ctx) => {
    const { res, body } = await get("/?name=Ana", ctx);
    expect(res.status).toBe(200);
    expect(body.startsWith("holuwu soy Ana\n\n")).toBe(true);
  });

  it.runIf(referenceUrl)(
    "UAT-04: shows the same users as the reference Worker (shared D1 p6)",
    async (ctx) => {
      const target = await get("/", ctx);
      const reference = await get("/", ctx, referenceUrl);
      expect(parseUsers(target.body)).toEqual(parseUsers(reference.body));
    },
  );
});
