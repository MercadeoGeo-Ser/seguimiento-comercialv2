import { useEffect, useState } from "react";

const RANGOS = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
];

function SummaryCard({ label, value }) {
  return (
    <div className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <tbody>
      {Array.from({ length: 3 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100">
          {Array.from({ length: 7 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export default function Resumen() {
  const [range, setRange] = useState("today");
  const [asesores, setAsesores] = useState([]);
  const [totales, setTotales] = useState({ totalLeads: 0, metaAds: 0, ganados: 0, conversion: "0.0" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [captura, setCaptura] = useState({ totalMeta: 0, totalBitrix: 0 });
  const [porEtapa, setPorEtapa] = useState({});
  const [totalLeads, setTotalLeads] = useState(0);

  useEffect(() => {
    let cancelado = false;

    async function cargarCaptura() {
      try {
        const [leadsRes, metaRes] = await Promise.all([
          fetch(`/api/leads?range=${range}`),
          fetch(`/api/meta?range=${range}`),
        ]);
        const leadsJson = await leadsRes.json();
        const metaJson = await metaRes.json();
        if (cancelado) return;

        if (leadsJson.ok && metaJson.ok) {
          const leads = leadsJson.leads || [];
          const totalBitrix = leads.filter((l) => l.fuente === "Meta Ads").length;
          setCaptura({ totalMeta: metaJson.totalMeta || 0, totalBitrix });

          const etapas = {};
          leads.forEach((l) => {
            etapas[l.etapa] = (etapas[l.etapa] || 0) + 1;
          });
          setPorEtapa(etapas);
          setTotalLeads(leads.length);
        }
      } catch {
        if (!cancelado) {
          setCaptura({ totalMeta: 0, totalBitrix: 0 });
          setPorEtapa({});
          setTotalLeads(0);
        }
      }
    }

    cargarCaptura();
    return () => {
      cancelado = true;
    };
  }, [range]);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/perf?range=${range}`);
        const data = await response.json();
        if (cancelado) return;

        if (!data.ok) {
          setError(data.error || "Error al cargar el resumen");
          setAsesores([]);
        } else {
          setAsesores(data.asesores);
          setTotales(data.totales);
        }
      } catch (err) {
        if (!cancelado) {
          setError(err.message);
          setAsesores([]);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [range]);

  const perdidos = captura.totalMeta - captura.totalBitrix;
  const tasaCaptura =
    captura.totalMeta > 0 ? ((captura.totalBitrix / captura.totalMeta) * 100).toFixed(1) : "0";

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap gap-3">
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
        >
          {RANGOS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SummaryCard label="Total Leads" value={totales.totalLeads} />
        <SummaryCard label="Meta Ads" value={totales.metaAds} />
        <SummaryCard label="Ganados" value={totales.ganados} />
        <SummaryCard label="Conversión" value={`${totales.conversion}%`} />
      </div>

      {perdidos > 0 && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <div style={{ fontWeight: 600, color: "#dc2626", marginBottom: 4 }}>
            ⚠️ {perdidos} leads de Meta no registrados en Bitrix
          </div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Meta: {captura.totalMeta} · Bitrix: {captura.totalBitrix} · Tasa de captura:{" "}
            <strong
              style={{
                color: tasaCaptura >= 90 ? "#16a34a" : tasaCaptura >= 70 ? "#d97706" : "#dc2626",
              }}
            >
              {tasaCaptura}%
            </strong>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
          Distribución por etapa
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(porEtapa)
            .sort((a, b) => b[1] - a[1])
            .map(([etapa, count]) => (
              <div
                key={etapa}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 20,
                  padding: "4px 12px",
                  fontSize: 12,
                }}
              >
                <span style={{ color: "#374151" }}>{etapa}</span>
                <span style={{ fontWeight: 700, color: "#6366f1", marginLeft: 6 }}>{count}</span>
                <span style={{ color: "#94a3b8", marginLeft: 4 }}>
                  {((count / totalLeads) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Asesor</th>
              <th className="px-4 py-3">Total Leads</th>
              <th className="px-4 py-3">Meta Ads</th>
              <th className="px-4 py-3">Sin Gestionar</th>
              <th className="px-4 py-3">En Gestión</th>
              <th className="px-4 py-3">Ganados</th>
              <th className="px-4 py-3">Conversión</th>
            </tr>
          </thead>
          {loading ? (
            <SkeletonRows />
          ) : (
            <tbody>
              {asesores.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: a.color }}
                      >
                        {a.nombre.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-gray-700">{a.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{a.totalLeads}</td>
                  <td className="px-4 py-3 text-gray-700">{a.metaAds}</td>
                  <td className="px-4 py-3 text-gray-700">{a.sinGestionar}</td>
                  <td className="px-4 py-3 text-gray-700">{a.enGestion}</td>
                  <td className="px-4 py-3 text-gray-700">{a.ganados}</td>
                  <td className="px-4 py-3 text-gray-700">{a.conversion}%</td>
                </tr>
              ))}
            </tbody>
          )}
        </table>

        {!loading && error && (
          <div className="px-4 py-10 text-center text-sm text-red-600">{error}</div>
        )}
      </div>
    </div>
  );
}
