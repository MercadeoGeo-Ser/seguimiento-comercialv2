import { useEffect, useState } from "react";

const RANGOS = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
];

function colorTasaCaptura(tasa) {
  const valor = parseFloat(tasa);
  if (valor >= 90) return "#16a34a";
  if (valor >= 70) return "#d97706";
  return "#dc2626";
}

function MetricCard({ label, value, color }) {
  return (
    <div className="metric-card" style={{ borderLeftColor: color }}>
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <tbody>
      {Array.from({ length: 3 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 7 }).map((__, j) => (
            <td key={j} style={{ padding: "14px 16px" }}>
              <div className="skeleton" style={{ height: 16, width: "100%" }} />
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

    async function cargar() {
      setLoading(true);
      setError(null);

      try {
        const [perfData, metaData] = await Promise.all([
          fetch(`/api/perf?range=${range}`).then((r) => r.json()),
          fetch(`/api/meta?range=${range}`).then((r) => r.json()),
        ]);
        if (cancelado) return;

        if (!perfData.ok) {
          setError(perfData.error || "Error al cargar el resumen");
          setAsesores([]);
        } else {
          setAsesores(perfData.asesores);
          setTotales(perfData.totales);
        }

        setCaptura({
          totalMeta: metaData.totalMeta || 0,
          totalBitrix: perfData.totales?.metaAds || 0,
        });
      } catch (err) {
        if (!cancelado) {
          setError(err.message);
          setAsesores([]);
          setCaptura({ totalMeta: 0, totalBitrix: 0 });
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

  useEffect(() => {
    let cancelado = false;

    async function cargarEtapas() {
      try {
        const response = await fetch(`/api/leads?range=${range}`);
        const data = await response.json();
        if (cancelado) return;

        if (data.ok) {
          const leads = data.leads || [];
          const etapas = {};
          leads.forEach((l) => {
            etapas[l.etapa] = (etapas[l.etapa] || 0) + 1;
          });
          setPorEtapa(etapas);
          setTotalLeads(leads.length);
        }
      } catch {
        if (!cancelado) {
          setPorEtapa({});
          setTotalLeads(0);
        }
      }
    }

    cargarEtapas();
    return () => {
      cancelado = true;
    };
  }, [range]);

  const perdidos = captura.totalMeta - captura.totalBitrix;
  const tasaCaptura =
    captura.totalMeta > 0 ? ((captura.totalBitrix / captura.totalMeta) * 100).toFixed(1) : "0";

  return (
    <div className="flex flex-col gap-4">
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16 }}>
        <MetricCard label="Leads Meta" value={captura.totalMeta} color="#6366f1" />
        <MetricCard label="En Bitrix" value={captura.totalBitrix} color="#0ea5e9" />
        <MetricCard label="Tasa Captura" value={`${tasaCaptura}%`} color={colorTasaCaptura(tasaCaptura)} />
        <MetricCard label="Perdidos" value={perdidos} color="#ef4444" />
        <MetricCard label="Ganados" value={totales.ganados} color="#16a34a" />
        <MetricCard label="Conversión" value={`${totales.conversion}%`} color="#f59e0b" />
      </div>

      {perdidos > 0 && (
        <div
          style={{
            background: "linear-gradient(135deg, #fef2f2, #fff)",
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 600, color: "#dc2626" }}>
              {perdidos} leads de Meta no llegaron a Bitrix hoy
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>
              Meta: {captura.totalMeta} · Bitrix: {captura.totalBitrix} · Tasa captura: {tasaCaptura}%
            </div>
          </div>
        </div>
      )}

      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
          Distribución por etapa
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(porEtapa)
            .sort((a, b) => b[1] - a[1])
            .map(([etapa, count]) => (
              <div key={etapa} className="pill">
                <span style={{ fontWeight: 600 }}>{etapa}</span>
                <span style={{ color: "#6366f1", fontWeight: 700 }}>{count}</span>
                <span style={{ color: "#94a3b8" }}>{((count / totalLeads) * 100).toFixed(0)}%</span>
              </div>
            ))}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Asesor</th>
              <th>Total</th>
              <th>Meta Ads</th>
              <th>Sin gestionar</th>
              <th>En gestión</th>
              <th>Ganados</th>
              <th>Conversión</th>
            </tr>
          </thead>
          {loading ? (
            <SkeletonRows />
          ) : (
            <tbody>
              {asesores.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="avatar" style={{ backgroundColor: a.color }}>
                        {a.nombre.charAt(0).toUpperCase()}
                      </span>
                      <span>{a.nombre}</span>
                    </div>
                  </td>
                  <td>{a.totalLeads}</td>
                  <td>{a.metaAds}</td>
                  <td>{a.sinGestionar}</td>
                  <td>{a.enGestion}</td>
                  <td>{a.ganados}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 4, height: 6 }}>
                        <div
                          style={{
                            width: `${a.conversion}%`,
                            background: "#16a34a",
                            borderRadius: 4,
                            height: 6,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a", minWidth: 40 }}>
                        {a.conversion}%
                      </span>
                    </div>
                  </td>
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
