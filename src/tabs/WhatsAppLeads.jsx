import { useEffect, useState } from "react";
import { ASESORES, RANGOS } from "../constants.js";

const PRIMERA_ETAPA_RAW = "C49:NEW";

const colorEtapa = (etapa) => {
  if (etapa === "Contacto inicial") return { bg: "#ede9fe", color: "#6d28d9" };
  if (etapa === "No contesta") return { bg: "#fef9c3", color: "#854d0e" };
  if (etapa.includes("cotización") || etapa.includes("Cotización")) return { bg: "#dbeafe", color: "#1d4ed8" };
  if (etapa.includes("Ganado")) return { bg: "#dcfce7", color: "#16a34a" };
  if (etapa.includes("Perdido")) return { bg: "#fef2f2", color: "#dc2626" };
  return { bg: "#f1f5f9", color: "#64748b" };
};

function asesorPorId(id) {
  return ASESORES.find((a) => a.id === id);
}

function SkeletonRows({ cols }) {
  return (
    <tbody>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} style={{ padding: "14px 16px" }}>
              <div className="skeleton" style={{ height: 16, width: "100%" }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export default function WhatsAppLeads() {
  const [range, setRange] = useState("today");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [leads, setLeads] = useState([]);
  const [campanas, setCampanas] = useState([]);
  const [totalGasto, setTotalGasto] = useState("0.00");
  const [totalMensajes, setTotalMensajes] = useState(0);
  const [costoPorMensaje, setCostoPorMensaje] = useState(0);
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
      qsLeads.set("fuente", "WhatsApp");
      const qsMeta = new URLSearchParams(qs);
      qsMeta.set("tipo", "whatsapp");

      try {
        const [leadsRes, metaRes] = await Promise.all([
          fetch(`/api/leads?${qsLeads.toString()}`),
          fetch(`/api/meta?${qsMeta.toString()}`),
        ]);
        const leadsData = await leadsRes.json();
        const metaData = await metaRes.json();
        if (cancelado) return;

        if (!leadsData.ok) throw new Error(leadsData.error || "Error al cargar Bitrix");
        if (!metaData.ok) throw new Error(metaData.error || "Error al cargar campañas de Meta");

        setLeads(leadsData.leads);
        setCampanas(metaData.campanas);
        setTotalGasto(metaData.totalGasto);
        setTotalMensajes(metaData.totalMensajes);
        setCostoPorMensaje(metaData.costoPorMensaje);
      } catch (err) {
        if (!cancelado) {
          setError(err.message);
          setLeads([]);
          setCampanas([]);
          setTotalGasto("0.00");
          setTotalMensajes(0);
          setCostoPorMensaje(0);
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

  const sinGestionar = leads.filter((lead) => lead.etapaRaw === PRIMERA_ETAPA_RAW).length;

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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <div className="metric-card" style={{ borderLeftColor: "#16a34a" }}>
          <div className="metric-label">Deals WhatsApp</div>
          <div className="metric-value">{leads.length}</div>
        </div>
        <div className="metric-card" style={{ borderLeftColor: "#f59e0b" }}>
          <div className="metric-label">Sin Gestionar</div>
          <div className="metric-value">{sinGestionar}</div>
        </div>
        <div className="metric-card" style={{ borderLeftColor: "#6366f1" }}>
          <div className="metric-label">Gasto Campañas</div>
          <div className="metric-value">${totalGasto}</div>
        </div>
        <div className="metric-card" style={{ borderLeftColor: "#0ea5e9" }}>
          <div className="metric-label">Costo por Conversación</div>
          <div className="metric-value">${costoPorMensaje}</div>
        </div>
      </div>

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-700">Reconciliación Meta → Bitrix</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <div className="metric-card" style={{ borderLeftColor: "#6366f1" }}>
            <div className="metric-label">Conversaciones Meta</div>
            <div className="metric-value">{totalMensajes}</div>
          </div>
          <div className="metric-card" style={{ borderLeftColor: "#0ea5e9" }}>
            <div className="metric-label">Deals en Bitrix</div>
            <div className="metric-value">{leads.length}</div>
          </div>
          <div className="metric-card" style={{ borderLeftColor: "#ef4444" }}>
            <div className="metric-label">Sin convertir</div>
            <div className="metric-value">{totalMensajes - leads.length}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
          Deals WhatsApp en Bitrix
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Asesor</th>
              <th>Etapa</th>
              <th>Fecha</th>
            </tr>
          </thead>
          {loading ? (
            <SkeletonRows cols={4} />
          ) : (
            <tbody>
              {leads.map((lead) => {
                const asesorInfo = asesorPorId(lead.asesorId);
                const badge = colorEtapa(lead.etapa);
                return (
                  <tr key={lead.id}>
                    <td>{lead.cliente}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          className="avatar"
                          style={{ backgroundColor: asesorInfo?.color || "#9ca3af", width: 28, height: 28, fontSize: 12 }}
                        >
                          {lead.asesor ? lead.asesor.charAt(0).toUpperCase() : "?"}
                        </span>
                        <span>{lead.asesor || "Sin asignar"}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: badge.bg, color: badge.color }}>
                        {lead.etapa}
                      </span>
                    </td>
                    <td style={{ color: "#94a3b8" }}>{lead.fechaDisplay}</td>
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>

        {!loading && !error && leads.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-gray-500">
            Sin leads de WhatsApp en este período
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
          💬 Campañas de WhatsApp en Meta
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Campaña</th>
              <th>Gasto</th>
              <th>Impresiones</th>
              <th>Conversaciones iniciadas</th>
              <th>Costo por conv.</th>
            </tr>
          </thead>
          {loading ? (
            <SkeletonRows cols={5} />
          ) : (
            <tbody>
              {campanas.map((c) => {
                const costoConv = c.mensajes > 0 ? c.gasto / c.mensajes : 0;
                return (
                  <tr key={c.nombre}>
                    <td style={{ fontWeight: 500 }}>{c.nombre}</td>
                    <td>${Number(c.gasto).toLocaleString("es-CO")}</td>
                    <td>{Number(c.impresiones).toLocaleString("es-CO")}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: "#16a34a" }}>{c.mensajes}</span>
                    </td>
                    <td>${Number(costoConv).toLocaleString("es-CO", { maximumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>

        {!loading && !error && campanas.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-gray-500">
            Sin campañas de mensajes activas en este período
          </div>
        )}
      </div>
    </div>
  );
}
