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

function tiempoRelativo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const horas = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);
  if (mins < 60) return `hace ${mins} min`;
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${dias} día${dias > 1 ? "s" : ""}`;
}

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
        setCached(Boolean(metaData.cached));
      } catch (err) {
        if (!cancelado) {
          setError(err.message);
          setLeads([]);
          setCampanas([]);
          setTotalGasto("0.00");
          setTotalMensajes(0);
          setCostoPorMensaje(0);
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

  const totalDeals = leads.length;
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <div className="metric-card" style={{ borderLeftColor: "#16a34a" }}>
          <div className="metric-label">Deals WhatsApp</div>
          <div className="metric-value">{totalDeals}</div>
          <div className="metric-sub">en Bitrix CRM</div>
        </div>
        <div className="metric-card" style={{ borderLeftColor: "#f59e0b" }}>
          <div className="metric-label">Sin Gestionar</div>
          <div className="metric-value">{sinGestionar}</div>
          <div className="metric-sub">contacto inicial</div>
        </div>
        <div className="metric-card" style={{ borderLeftColor: "#6366f1" }}>
          <div className="metric-label">Gasto Campañas</div>
          <div className="metric-value" style={{ fontSize: "1.5rem" }}>
            ${Number(totalGasto).toLocaleString("es-CO")}
          </div>
          <div className="metric-sub">período seleccionado</div>
        </div>
        <div className="metric-card" style={{ borderLeftColor: "#0ea5e9" }}>
          <div className="metric-label">Costo por Conv.</div>
          <div className="metric-value" style={{ fontSize: "1.5rem" }}>
            ${Number(costoPorMensaje).toLocaleString("es-CO")}
          </div>
          <div className="metric-sub">{totalMensajes} conversaciones</div>
        </div>
      </div>

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span>💬</span> Deals WhatsApp en Bitrix
          <span style={{ fontSize: 12, fontWeight: 400, color: "#94a3b8", marginLeft: "auto" }}>
            {totalDeals} registros
          </span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Asesor</th>
              <th>Etapa</th>
              <th>Comentarios</th>
              <th>Fecha</th>
            </tr>
          </thead>
          {loading ? (
            <SkeletonRows cols={5} />
          ) : (
            <tbody>
              {leads.map((lead) => {
                const asesorInfo = asesorPorId(lead.asesorId);
                const badge = colorEtapa(lead.etapa);
                const comentario = (lead.comentarios || "—").replace(/\[\/?(p|br)\]/gi, " ").trim();
                return (
                  <tr key={lead.id}>
                    <td style={{ fontWeight: 500 }}>{lead.cliente}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          className="avatar"
                          style={{ background: asesorInfo?.color || "#9ca3af", width: 28, height: 28, fontSize: 12 }}
                        >
                          {lead.asesor ? lead.asesor.charAt(0).toUpperCase() : "?"}
                        </div>
                        <span style={{ fontSize: 13 }}>{lead.asesor || "Sin asignar"}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          padding: "2px 10px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        {lead.etapa}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: "#64748b", maxWidth: 250 }}>
                      {comentario.slice(0, 100)}
                      {comentario.length > 100 ? "..." : ""}
                    </td>
                    <td style={{ fontSize: 13, color: "#94a3b8" }}>{tiempoRelativo(lead.fechaCreacion)}</td>
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

      <div className="card">
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span>📱</span> Campañas WhatsApp en Meta
          {cached && (
            <span
              style={{
                fontSize: 11,
                background: "#f0fdf4",
                color: "#16a34a",
                border: "1px solid #bbf7d0",
                borderRadius: 20,
                padding: "2px 10px",
                marginLeft: "auto",
              }}
            >
              ⚡ Caché · 30 min
            </span>
          )}
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Campaña</th>
              <th>Gasto</th>
              <th>Impresiones</th>
              <th>Conversaciones</th>
              <th>Deals en Bitrix</th>
              <th>Costo/Conv.</th>
            </tr>
          </thead>
          {loading ? (
            <SkeletonRows cols={6} />
          ) : (
            <tbody>
              {campanas.map((c) => {
                const costoConv = c.mensajes > 0 ? c.gasto / c.mensajes : 0;
                return (
                  <tr key={c.nombre}>
                    <td style={{ fontWeight: 500, maxWidth: 300, fontSize: 13 }}>{c.nombre}</td>
                    <td style={{ fontWeight: 600 }}>${Number(c.gasto).toLocaleString("es-CO")}</td>
                    <td style={{ color: "#64748b" }}>{Number(c.impresiones).toLocaleString("es-CO")}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: "#16a34a", fontSize: 15 }}>{c.mensajes}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: "#6366f1" }}>{totalDeals}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: "#0ea5e9" }}>
                      ${Number(costoConv).toLocaleString("es-CO", { maximumFractionDigits: 2 })}
                    </td>
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
