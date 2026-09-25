import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Reporter, TestCase, TestModule } from "vitest/node";

interface CaseRow {
  id: string;
  title: string;
  state: string;
  duration: number;
  evidence: string[];
  errors: string[];
}

const STATE_LABEL: Record<string, string> = {
  passed: "PASÓ",
  failed: "FALLÓ",
  skipped: "OMITIDO",
  pending: "PENDIENTE",
};

const escape = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function toRow(test: TestCase): CaseRow {
  const [id, ...rest] = test.name.split(": ");
  return {
    id,
    title: rest.join(": ") || test.name,
    state: test.result().state,
    duration: Math.round(test.diagnostic()?.duration ?? 0),
    evidence: test.annotations().filter((a) => a.type === "evidence").map((a) => a.message),
    errors: (test.result().errors ?? []).map((e) => e.message),
  };
}

// Writes a self-contained HTML UAT report (and a GitHub job summary when in CI).
export default class UatReporter implements Reporter {
  constructor(private outputFile = "./uat-report/uat-report.html") {}

  onTestRunEnd(testModules: ReadonlyArray<TestModule>) {
    const rows = testModules.flatMap((m) => [...m.children.allTests()].map(toRow));
    const passed = rows.filter((r) => r.state === "passed").length;
    const failed = rows.filter((r) => r.state === "failed").length;
    const skipped = rows.length - passed - failed;
    const accepted = failed === 0 && passed > 0;

    const sha = process.env.GITHUB_SHA ?? "local";
    const runUrl = process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : undefined;
    const meta: [string, string][] = [
      ["Proyecto", "P5 Cloudflare Worker"],
      ["Ambiente", process.env.UAT_ENVIRONMENT ?? "production"],
      ["URL probada", process.env.UAT_BASE_URL ?? ""],
      ["Referencia", process.env.UAT_REFERENCE_URL ?? "—"],
      ["Commit", sha.slice(0, 7)],
      ["Ejecutado por", process.env.GITHUB_ACTOR ?? "local"],
      ["Fecha", new Date().toISOString()],
    ];

    const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>UAT Report</title>
<style>
  :root { --bg:#fff; --fg:#1f2328; --muted:#59636e; --line:#d1d9e0; --ok:#1a7f37; --bad:#d1242f; --skip:#9a6700; --code:#f6f8fa; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0d1117; --fg:#e6edf3; --muted:#9198a1; --line:#3d444d; --ok:#3fb950; --bad:#f85149; --skip:#d29922; --code:#151b23; } }
  body { background:var(--bg); color:var(--fg); font:15px/1.5 system-ui,sans-serif; margin:0 auto; max-width:960px; padding:24px 16px; }
  h1 { margin:0 0 4px; } .muted { color:var(--muted); }
  .verdict { display:inline-block; margin:16px 0; padding:6px 14px; border-radius:6px; font-weight:700; color:#fff; background:${accepted ? "var(--ok)" : "var(--bad)"}; }
  table { border-collapse:collapse; width:100%; margin:12px 0 24px; }
  th, td { border:1px solid var(--line); padding:6px 10px; text-align:left; vertical-align:top; }
  th { width:160px; } .passed { color:var(--ok); } .failed { color:var(--bad); } .skipped { color:var(--skip); }
  .case { border:1px solid var(--line); border-radius:8px; padding:12px 16px; margin:12px 0; }
  .case h3 { margin:0 0 8px; font-size:16px; }
  pre { background:var(--code); padding:10px; border-radius:6px; overflow-x:auto; white-space:pre-wrap; word-break:break-word; margin:6px 0; }
</style>
</head>
<body>
<h1>UAT Report</h1>
<div class="muted">User Acceptance Testing del Worker desplegado</div>
<div class="verdict">${accepted ? "ACEPTADO" : "NO ACEPTADO"}</div>
<table>${meta.map(([k, v]) => `<tr><th>${k}</th><td>${escape(v)}</td></tr>`).join("")}
${runUrl ? `<tr><th>Pipeline</th><td><a href="${escape(runUrl)}">${escape(runUrl)}</a></td></tr>` : ""}
<tr><th>Resultado</th><td>${passed} pasaron · ${failed} fallaron · ${skipped} omitidos · ${rows.length} total</td></tr></table>
<h2>Casos de prueba</h2>
<table><tr><th>ID</th><th>Criterio de aceptación</th><th>Resultado</th><th>Duración</th></tr>
${rows.map((r) => `<tr><td>${escape(r.id)}</td><td>${escape(r.title)}</td><td class="${r.state}">${STATE_LABEL[r.state] ?? r.state}</td><td>${r.duration} ms</td></tr>`).join("\n")}
</table>
<h2>Evidencia</h2>
${rows.map((r) => `<div class="case"><h3>${escape(r.id)} — <span class="${r.state}">${STATE_LABEL[r.state] ?? r.state}</span></h3>
<div>${escape(r.title)}</div>
${r.evidence.map((e) => `<pre>${escape(e)}</pre>`).join("")}
${r.errors.map((e) => `<pre class="failed">${escape(e)}</pre>`).join("")}
${r.evidence.length + r.errors.length === 0 ? `<div class="muted">Sin evidencia registrada.</div>` : ""}</div>`).join("\n")}
</body>
</html>
`;
    mkdirSync(dirname(this.outputFile), { recursive: true });
    writeFileSync(this.outputFile, html);
    console.log(`UAT report written to ${this.outputFile}`);

    if (process.env.GITHUB_STEP_SUMMARY) {
      const md = [
        `## UAT Report — ${accepted ? "✅ ACEPTADO" : "❌ NO ACEPTADO"}`,
        `URL: ${process.env.UAT_BASE_URL} · Commit: \`${sha.slice(0, 7)}\``,
        "",
        "| ID | Criterio de aceptación | Resultado | Duración |",
        "| --- | --- | --- | --- |",
        ...rows.map((r) => `| ${r.id} | ${r.title} | ${STATE_LABEL[r.state] ?? r.state} | ${r.duration} ms |`),
        "",
      ].join("\n");
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
    }
  }
}
