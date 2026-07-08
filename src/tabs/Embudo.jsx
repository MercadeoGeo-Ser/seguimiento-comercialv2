import { useEffect, useState } from "react";
import { RANGOS } from "../constants.js";

// Color por etapa del pipeline Transaccional (categoryId 49)
const COLORES = {
  "C49:NEW": "#6366f1",
  "C49:UC_P9SE7Z": "#f59e0b",
  "C49:UC_5M8VT8": "#0ea5e9",
  "C49:UC_4Y8FTH": "#0ea5e9",
  "C49:PREPARATION": "#10b981",
  "C49:PREPAYMENT_INVOIC": "#10b981",
  "C49:UC_IG8XXA": "#10b981",
  "C49:FINAL_INVOICE": "#8b5cf6",
  "C49:UC_WMZ03O": "#8b5cf6",
  "C49:UC_YO6ROS": "#8b5cf6",
  "C49:UC_6A17DV": "#8b5cf6",
  "C49:UC_3J1LL7": "#f97316",
  "C49:UC_H36U8W": "#f97316",
  "C49:UC_FNYTZ5": "#f97316",
  "C49:WON": "#16a34a",
  "C49:LOSE": "#ef4444",
};

function FunnelRow({ etapa, ancho }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
      <div style={{ width: 48, textAlign: "right", fontSize: 20, fontWeight: 700, color: "#0f172a", flexShrink: 0 }}>
        {etapa.total}
      </div>
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            width: `${ancho}%`,
            height: 44,
            borderRadius: 8,
            background: COLORES[etapa.codigo] || "#94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "width 0.6s ease",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        />
      </div>
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>{etapa.nombre}</div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>{etapa.porcentaje}</div>
      </div>
    </div>
  );
}

function SkeletonFunnel() {
  return (
    <div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
          <div className="skeleton" style={{ width: 48, height: 20, flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <div className="skeleton" style={{ height: 44, width: `${80 - i * 10}%` }} />
          </div>
          <div className="skeleton" style={{ width: 200, height: 16, flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}

export default function Embudo() {
  const [range, setRange] = useState("today");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [etapas, setEtapas] = useState([]);
  const [totalEntradas, setTotalEntradas] = useState(0);
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

      try {
        const response = await fetch(`/api/embudo?${qs.toString()}`);
        const data = await response.json();
        if (cancelado) return;

        if (!data.ok) {
          setError(data.error || "Error al cargar el embudo");
          setEtapas([]);
          setTotalEntradas(0);
        } else {
          setEtapas(data.etapas);
          setTotalEntradas(data.totalEntradas || 0);
        }
      } catch (err) {
        if (!cancelado) {
          setError(err.message);
          setEtapas([]);
          setTotalEntradas(0);
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

  const etapasVisibles = etapas.filter((e) => e.total > 0 && e.codigo !== "C49:LOSE");
  const etapaPerdido = etapas.find((e) => e.codigo === "C49:LOSE");
  const maxDeals = etapasVisibles.length > 0 ? Math.max(...etapasVisibles.map((e) => e.total)) : 0;
  const anchoDe = (total) => (maxDeals > 0 ? (total / maxDeals) * 85 + 15 : 15);

  const cotizacionTotal = etapas.find((e) => e.codigo === "C49:UC_5M8VT8")?.total || 0;
  const cotizacionPct =
    totalEntradas > 0 ? ((cotizacionTotal / totalEntradas) * 100).toFixed(1) : "0";
  const ganadosTotal = etapas.find((e) => e.codigo === "C49:WON")?.total || 0;
  const tasaConversion =
    totalEntradas > 0 ? ((ganadosTotal / totalEntradas) * 100).toFixed(1) : "0";

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

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Pipeline Transaccional</div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>
            Etapas activas con deals en el período
          </div>
        </div>

        {loading ? (
          <SkeletonFunnel />
        ) : error ? (
          <div className="py-10 text-center text-sm text-red-600">{error}</div>
        ) : (
          <div>
            {etapasVisibles.map((etapa) => (
              <FunnelRow key={etapa.codigo} etapa={etapa} ancho={anchoDe(etapa.total)} />
            ))}
          </div>
        )}
      </div>

      {!loading && !error && etapaPerdido && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: "16px 24px",
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: "#dc2626", width: 48, textAlign: "right" }}>
            {etapaPerdido.total}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                background: "#ef4444",
                height: 44,
                borderRadius: 8,
                width: `${anchoDe(etapaPerdido.total)}%`,
              }}
            />
          </div>
          <div style={{ width: 200 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#dc2626" }}>❌ CERRADO — Perdido</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{etapaPerdido.porcentaje}</div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 24 }}>
          <div className="metric-card" style={{ borderLeftColor: "#6366f1" }}>
            <div className="metric-label">Total entradas</div>
            <div className="metric-value">{totalEntradas}</div>
          </div>
          <div className="metric-card" style={{ borderLeftColor: "#0ea5e9" }}>
            <div className="metric-label">Llegaron a cotización</div>
            <div className="metric-value">{cotizacionTotal}</div>
            <div className="metric-sub">{cotizacionPct}% del total</div>
          </div>
          <div className="metric-card" style={{ borderLeftColor: "#16a34a" }}>
            <div className="metric-label">Ganados</div>
            <div className="metric-value">{ganadosTotal}</div>
          </div>
          <div className="metric-card" style={{ borderLeftColor: "#f59e0b" }}>
            <div className="metric-label">Tasa conversión</div>
            <div className="metric-value" style={{ color: "#f59e0b" }}>
              {tasaConversion}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
