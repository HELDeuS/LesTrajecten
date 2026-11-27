"use client";

import { useCallback, useEffect, useState } from "react";

type LogItem = {
  id: number;
  kind: string;
  input: string;
  output: string;
  createdAt: string;
  userName: string;
  userEmail: string;
};

type TestResult = {
  ok: boolean;
  baseUrl?: string;
  model?: string;
  latencyMs?: number;
  answer?: string;
  error?: string;
};

export default function AiAdmin() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<TestResult | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/ai/log");
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runTest() {
    setTesting(true);
    setTest(null);
    const res = await fetch("/api/ai/test", { method: "POST" });
    const data = await res.json().catch(() => ({ ok: false, error: "onbekende fout" }));
    setTest(data);
    setTesting(false);
    load();
  }

  const fmt = (d: string) => new Date(d).toLocaleString("nl-NL");

  return (
    <div className="card p-6 space-y-5">
      <div>
        <h2 className="font-semibold text-lg">AI-log &amp; connectiviteit</h2>
        <p className="text-sm text-slate-500">
          Controleer of de geconfigureerde LLM correct wordt aangesproken en bekijk de laatste aanroepen (incl.
          mislukte pogingen).
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={runTest} className="btn-primary" disabled={testing}>
          {testing ? "AI wordt getest..." : "🔌 AI-verbinding testen"}
        </button>
        <button onClick={load} className="btn-secondary">
          Log verversen
        </button>
      </div>

      {test && (
        <div
          className={`text-sm rounded-lg px-3 py-2 ${
            test.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {test.ok ? (
            <p>
              <strong>Verbinding OK</strong> — endpoint <code>{test.baseUrl}</code>, model <code>{test.model}</code>,
              responstijd {test.latencyMs} ms. Antwoord: &ldquo;{test.answer}&rdquo;
            </p>
          ) : (
            <p>
              <strong>Verbinding mislukt</strong> — endpoint <code>{test.baseUrl}</code>, model <code>{test.model}</code>
              . Fout: {test.error}
            </p>
          )}
        </div>
      )}

      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-96 overflow-y-auto">
        {logs.length === 0 && <p className="p-4 text-sm text-slate-500">Nog geen AI-aanroepen gelogd.</p>}
        {logs.map((l) => {
          const isError = l.kind.startsWith("error:");
          return (
            <div key={l.id}>
              <button
                className="w-full flex items-center justify-between gap-4 p-3 text-left"
                onClick={() => setOpenId(openId === l.id ? null : l.id)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    <span className={`badge mr-2 ${isError ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                      {l.kind}
                    </span>
                    <span className="text-xs text-slate-400">
                      {l.userName} · {fmt(l.createdAt)}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 truncate">{(isError ? l.output : l.input).slice(0, 120)}</p>
                </div>
                <span className="text-slate-400">{openId === l.id ? "▾" : "▸"}</span>
              </button>
              {openId === l.id && (
                <div className="px-3 pb-3 space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Invoer</p>
                    <pre className="text-xs bg-slate-50 rounded-lg p-2 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {l.input}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Uitvoer</p>
                    <pre
                      className={`text-xs rounded-lg p-2 whitespace-pre-wrap max-h-40 overflow-y-auto ${
                        isError ? "bg-red-50 text-red-800" : "bg-slate-50"
                      }`}
                    >
                      {l.output}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-400">
        Invoer en uitvoer zijn afgekapt tot 8.000 tekens per aanroep. Foutieve aanroepen worden gelogd met prefix
        &ldquo;error:&rdquo;.
      </p>
    </div>
  );
}
