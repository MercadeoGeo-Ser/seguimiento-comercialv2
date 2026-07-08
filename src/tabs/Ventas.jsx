import { useEffect, useState } from "react";
import { ASESORES, RANGOS, TRM } from "../constants.js";

const FUENTE_CLASS = {
  "Meta Ads": "badge-meta",
  "Orgánico Social": "badge-organico",
  WhatsApp: "badge-whatsapp",
  Otro: "badge-otro",
};

function asesorPorId(id) {
  return ASESORES.find((a) => a.id === id);
}

function formatoMoneda(valor) {
  return `$${Number(valor).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}

function formatoFecha(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
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
      {Array.from({ length: 4 }).map((_, i) => (
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

export default function Ventas() {
  const [range, setRange] = useState("today");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [asesor, setAsesor] = useState("");
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trm, setTrm] = useState(TRM);
  const [editTrm, setEditTrm] = useState(false);

  const rangoListo = range !== "custom" || (desde && hasta);

  useEffect(() => {
    if (!rangoListo) return;
    let cancelado = false;

    async function cargar() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ range, etapa: "ganado" });
      if (range === "custom") {
        params.set("desde", desde);
        params.set("hasta", hasta);
      }
      if (asesor) params.set("asesor", asesor);

      try {
        const response = await fetch(`/api/leads?${params.toString()}`);
        const data = await response.json();
        if (cancelado) return;

        if (!data.ok) {
          setError(data.error || "Error al cargar las ventas");
          setVentas([]);
        } else {
          setVentas(data.leads);
        }
      } catch (err) {
        if (!cancelado) {
          setError(err.message);
          setVentas([]);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [range, desde, hasta, asesor]);

  const ventasConUSD = ventas.map((v) => ({
    ...v,
    valorUSD: v.moneda === "COP" ? v.valor / trm : v.valor,
  }));

  const totalVentas = ventasConUSD.length;
  const valorTotalUSD = ventasConUSD.reduce((s, v) => s + (v.valorUSD || 0), 0);
  const ticketPromedio = totalVentas > 0 ? valorTotalUSD / totalVentas : 0;

  const porFormulario = {};
  ventasConUSD.forEach((v) => {
    const key = v.formulario || "Sin formulario";
    porFormulario[key] = (porFormulario[key] || 0) + 1;
  });
  const mejorFormulario =
    Object.entries(porFormulario).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
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

          <select
            value={asesor}
            onChange={(e) => setAsesor(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
          >
            <option value="">Todos</option>
            {ASESORES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <span style={{ color: "#94a3b8" }}>TRM:</span>
          {editTrm ? (
            <input
              type="number"
              value={trm}
              onChange={(e) => setTrm(Number(e.target.value))}
              onBlur={() => setEditTrm(false)}
              style={{ width: 80, padding: "2px 8px", borderRadius: 6, border: "1px solid #6366f1", fontSize: 13 }}
              autoFocus
            />
          ) : (
            <span
              onClick={() => setEditTrm(true)}
              style={{
                background: "#ede9fe",
                color: "#6d28d9",
                padding: "2px 10px",
                borderRadius: 20,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ${trm.toLocaleString()} COP/USD ✏️
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <MetricCard label="Total Ventas" value={totalVentas} color="#16a34a" />
        <MetricCard label="Valor Total USD" value={formatoMoneda(valorTotalUSD)} color="#6366f1" />
        <MetricCard label="Ticket Promedio" value={formatoMoneda(ticketPromedio)} color="#0ea5e9" />
        <MetricCard label="Mejor Formulario" value={mejorFormulario} color="#f59e0b" />
      </div>

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Asesor</th>
              <th>Formulario</th>
              <th>Fuente</th>
              <th>Valor original</th>
              <th>Valor USD</th>
              <th>Fecha cierre</th>
            </tr>
          </thead>
          {loading ? (
            <SkeletonRows />
          ) : (
            <tbody>
              {ventasConUSD.map((venta) => {
                const asesorInfo = asesorPorId(venta.asesorId);
                return (
                  <tr key={venta.id}>
                    <td>{venta.cliente}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          className="avatar"
                          style={{ backgroundColor: asesorInfo?.color || "#9ca3af", width: 28, height: 28, fontSize: 12 }}
                        >
                          {venta.asesor ? venta.asesor.charAt(0).toUpperCase() : "?"}
                        </span>
                        <span>{venta.asesor || "Sin asignar"}</span>
                      </div>
                    </td>
                    <td>{venta.formulario || "—"}</td>
                    <td>
                      <span className={`badge ${FUENTE_CLASS[venta.fuente] || "badge-otro"}`}>
                        {venta.fuente}
                      </span>
                    </td>
                    <td>
                      ${Number(venta.valor).toLocaleString("es-CO")} {venta.moneda}
                    </td>
                    <td style={{ fontWeight: 700, color: "#16a34a" }}>
                      {formatoMoneda(venta.valorUSD)}
                    </td>
                    <td style={{ color: "#94a3b8" }}>{formatoFecha(venta.fechaCierre)}</td>
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>

        {!loading && !error && ventasConUSD.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>
            💰 Sin ventas cerradas en este período
          </div>
        )}
      </div>
    </div>
  );
}
