export interface Env {
  p6: D1Database;
}

const worker = {
  async getUsers(env: Env): Promise<Record<string, unknown>[]> {
    const { results } = await env.p6.prepare("SELECT * FROM users;").all();
    return results;
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok" });
    }

    const name = url.searchParams.get("name") ?? "carluwu";
    const users = await worker.getUsers(env);
    return new Response(
      `holuwu soy ${name}\n\n${JSON.stringify(users, null, 2)}\n`,
      { headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  },
};

export default worker satisfies ExportedHandler<Env>;
