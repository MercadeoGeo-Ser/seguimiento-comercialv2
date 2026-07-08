import { useEffect, useState } from "react";
import { RANGOS } from "../constants.js";

function DiffBadge({ diff }) {
  return (
    <span
      style={{
        background: diff > 0 ? "#fef2f2" : "#f0fdf4",
        color: diff > 0 ? "#dc2626" : "#16a34a",
        fontWeight: 700,
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: 13,
      }}
    >
      {diff > 0 ? `+${diff}` : diff}
    </span>
  );
}

function SkeletonRows() {
  return (
    <tbody>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 4 }).map((__, j) => (
            <td key={j} style={{ padding: "14px 16px" }}>
              <div className="skeleton" style={{ height: 16, width: "100%" }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

function combinarPorFormulario(porFormularioMeta, leadsBitrix) {
  const conteoBitrix = {};
  for (const lead of leadsBitrix) {
    if (!lead.formulario) continue;
    conteoBitrix[lead.formulario] = (conteoBitrix[lead.formulario] || 0) + 1;
  }

  return porFormularioMeta.map(({ nombre, leads: leadsMeta }) => {
    const leadsCRM = conteoBitrix[nombre] || 0;
    return { nombre, leadsMeta, leadsCRM, diferencia: leadsMeta - leadsCRM };
  });
}

export default function MetaVsCRM() {
  const [range, setRange] = useState("today");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [filas, setFilas] = useState([]);
  const [totalMeta, setTotalMeta] = useState(0);
  const [totalCRM, setTotalCRM] = useState(0);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const rangoListo = range !== "custom" || (desde && hasta);

  useEffect(() => {
    if (!rangoListo) return;
    let cancelado = false;

    async function cargar() {
      setLoading(true);
      setError(null);

      const qs = new URLSearchParams({ range });
      if (range === "custom") {
        qs.set("desde", desde);
        qs.set("hasta", hasta);
      }
      const qsLeads = new URLSearchParams(qs);
      qsLeads.set("fuente", "Meta Ads");

      try {
        const [metaRes, leadsRes] = await Promise.all([
          fetch(`/api/meta?${qs.toString()}`),
          fetch(`/api/leads?${qsLeads.toString()}`),
        ]);
        const metaData = await metaRes.json();
        const leadsData = await leadsRes.json();
        if (cancelado) return;

        if (!metaData.ok) throw new Error(metaData.error || "Error al cargar Meta");
        if (!leadsData.ok) throw new Error(leadsData.error || "Error al cargar Bitrix");

        setTotalMeta(metaData.totalMeta);
        setTotalCRM(leadsData.total);
        setCached(Boolean(metaData.cached));
        setFilas(combinarPorFormulario(metaData.porFormulario, leadsData.leads));
      } catch (err) {
        if (!cancelado) {
          setError(err.message);
          setFilas([]);
          setTotalMeta(0);
          setTotalCRM(0);
          setCached(false);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [range, desde, hasta]);

  const diferenciaTotal = totalMeta - totalCRM;

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

        {range === "custom" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 14 }}
            />
            <span style={{ color: "#94a3b8" }}>→</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 14 }}
            />
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <div className="metric-card" style={{ borderLeftColor: "#6366f1" }}>
          <div className="metric-label">Meta Ads</div>
          <div className="metric-value">{totalMeta}</div>
        </div>
        <div className="metric-card" style={{ borderLeftColor: "#0ea5e9" }}>
          <div className="metric-label">En Bitrix</div>
          <div className="metric-value">{totalCRM}</div>
        </div>
        <div
          className="metric-card"
          style={{ borderLeftColor: diferenciaTotal > 0 ? "#ef4444" : "#16a34a" }}
        >
          <div className="metric-label">Diferencia</div>
          <div
            className="metric-value"
            style={{ color: diferenciaTotal > 0 ? "#ef4444" : "#16a34a" }}
          >
            {diferenciaTotal}
          </div>
        </div>
      </div>

      {cached && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 20,
            padding: "4px 12px",
            fontSize: 12,
            color: "#16a34a",
            marginBottom: 16,
          }}
        >
          ⚡ Datos en caché · se actualiza cada 30 min
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Formulario</th>
              <th>Leads Meta</th>
              <th>Leads Bitrix</th>
              <th>Diferencia</th>
            </tr>
          </thead>
          {loading ? (
            <SkeletonRows />
          ) : (
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.nombre}>
                  <td>{fila.nombre}</td>
                  <td>{fila.leadsMeta}</td>
                  <td>{fila.leadsCRM}</td>
                  <td>
                    <DiffBadge diff={fila.diferencia} />
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>

        {!loading && !error && filas.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-gray-500">
            Sin datos en este período
          </div>
        )}

        {!loading && error && (
          <div className="px-4 py-10 text-center text-sm text-red-600">{error}</div>
        )}
      </div>
    </div>
  );
}
