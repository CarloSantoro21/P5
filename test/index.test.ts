import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import worker from "../src/index";

const call = (path: string) =>
  worker.fetch(new Request(`https://example.com${path}`), env);

beforeEach(async () => {
  await env.p6.exec("CREATE TABLE IF NOT EXISTS users (Name TEXT)");
  await env.p6.exec("DELETE FROM users");
});

describe("getUsers", () => {
  it("returns an empty list when there are no users", async () => {
    expect(await worker.getUsers(env)).toEqual([]);
  });

  it("returns every row in the users table", async () => {
    await env.p6.exec("INSERT INTO users (Name) VALUES ('Carlo'), ('Ana')");
    expect(await worker.getUsers(env)).toEqual([
      { Name: "Carlo" },
      { Name: "Ana" },
    ]);
  });
});

describe("fetch", () => {
  it("responds to /health with ok", async () => {
    const res = await call("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("greets carluwu by default and lists users", async () => {
    await env.p6.exec("INSERT INTO users (Name) VALUES ('Carlo')");
    const res = await call("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(await res.text()).toBe(
      `holuwu soy carluwu\n\n${JSON.stringify([{ Name: "Carlo" }], null, 2)}\n`,
    );
  });

  it("greets the name passed as a query param", async () => {
    const res = await call("/?name=Ana");
    expect(await res.text()).toBe("holuwu soy Ana\n\n[]\n");
  });
});
