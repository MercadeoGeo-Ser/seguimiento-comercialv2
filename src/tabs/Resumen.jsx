import { Fragment, useEffect, useState } from "react";
import { RANGOS } from "../constants.js";

function colorTasaCaptura(tasa) {
  const valor = parseFloat(tasa);
  if (valor >= 90) return "#16a34a";
  if (valor >= 70) return "#d97706";
  return "#dc2626";
}

function colorEtapa(etapa) {
  if (etapa === "Contacto inicial") return { bg: "#ede9fe", color: "#6d28d9" };
  if (etapa === "No contesta") return { bg: "#fef9c3", color: "#854d0e" };
  if (etapa.includes("cotización") || etapa.includes("Cotización")) return { bg: "#dbeafe", color: "#1d4ed8" };
  if (etapa.includes("Ganado")) return { bg: "#dcfce7", color: "#16a34a" };
  if (etapa.includes("Perdido")) return { bg: "#fef2f2", color: "#dc2626" };
  return { bg: "#f1f5f9", color: "#64748b" };
}

function tiempoRelativo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const horas = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);
  if (mins < 60) return `hace ${mins} min`;
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${dias} día${dias > 1 ? "s" : ""}`;
}

function limpiarComentario(texto) {
  return (texto || "—").replace(/\[\/?(p|br)\]/gi, " ").trim() || "—";
}

function colorCalificacion(calificacion) {
  if (calificacion === "FRÍO") return { bg: "#dbeafe", color: "#1d4ed8" };
  if (calificacion === "CALIENTE") return { bg: "#fef2f2", color: "#dc2626" };
  return null;
}

const COLOR_PREFIJO_TIPIFICACION = {
  SEG: { bg: "#dcfce7", color: "#16a34a" },
  NC: { bg: "#fff7ed", color: "#c2410c" },
  DES: { bg: "#fef2f2", color: "#dc2626" },
  APL: { bg: "#dbeafe", color: "#1d4ed8" },
  EFE: { bg: "#f3e8ff", color: "#7e22ce" },
};

function formatearTipificacion(tipificacion) {
  const match = tipificacion.match(/^\(([A-Z]+)\)\s*(.+)$/);
  if (!match) return { texto: tipificacion, colores: { bg: "#f1f5f9", color: "#64748b" } };
  const [, prefijo, texto] = match;
  return { texto, colores: COLOR_PREFIJO_TIPIFICACION[prefijo] || { bg: "#f1f5f9", color: "#64748b" } };
}

function SkeletonSubTabla() {
  return (
    <div style={{ padding: "16px 32px" }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 14, width: "100%", marginBottom: 10 }} />
      ))}
    </div>
  );
}

function SubTablaAsesor({ asesorId, range, desde, hasta }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setLoading(true);
      const qs = new URLSearchParams({ range, asesor: asesorId });
      if (range === "custom") {
        qs.set("desde", desde);
        qs.set("hasta", hasta);
      }

      try {
        const response = await fetch(`/api/leads?${qs.toString()}`);
        const data = await response.json();
        if (cancelado) return;
        setLeads(data.ok ? data.leads : []);
      } catch {
        if (!cancelado) setLeads([]);
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [asesorId, range, desde, hasta]);

  if (loading) return <SkeletonSubTabla />;

  if (leads.length === 0) {
    return (
      <div style={{ padding: "16px 32px", fontSize: 13, color: "#94a3b8" }}>
        Sin deals en este período
      </div>
    );
  }

  return (
    <table className="table" style={{ margin: 0 }}>
      <thead>
        <tr>
          <th style={{ paddingLeft: 32 }}>Cliente</th>
          <th>Formulario</th>
          <th>Etapa</th>
          <th>Calificación</th>
          <th>Tipificación</th>
          <th>Causal pérdida</th>
          <th>Comentarios</th>
          <th>Observaciones</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        {leads.map((lead) => {
          const badge = colorEtapa(lead.etapa);
          const califColores = colorCalificacion(lead.calificacion);
          const tipificacion = lead.tipificacionAkira ? formatearTipificacion(lead.tipificacionAkira) : null;
          return (
            <tr key={lead.id} style={{ background: "white" }}>
              <td style={{ paddingLeft: 32, fontWeight: 500 }}>{lead.cliente}</td>
              <td style={{ fontSize: 13, color: "#6366f1" }}>{lead.formulario || "—"}</td>
              <td>
                <span
                  style={{
                    background: badge.bg,
                    color: badge.color,
                    padding: "2px 8px",
                    borderRadius: 20,
                    fontSize: 12,
                  }}
                >
                  {lead.etapa}
                </span>
              </td>
              <td>
                {califColores ? (
                  <span
                    style={{
                      background: califColores.bg,
                      color: califColores.color,
                      padding: "2px 8px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {lead.calificacion}
                  </span>
                ) : (
                  <span style={{ color: "#cbd5e1" }}>—</span>
                )}
              </td>
              <td>
                {tipificacion ? (
                  <span
                    style={{
                      background: tipificacion.colores.bg,
                      color: tipificacion.colores.color,
                      padding: "2px 8px",
                      borderRadius: 20,
                      fontSize: 12,
                    }}
                  >
                    {tipificacion.texto}
                  </span>
                ) : (
                  <span style={{ color: "#cbd5e1" }}>—</span>
                )}
              </td>
              <td style={{ fontSize: 12, color: "#dc2626", fontWeight: 500 }}>
                {lead.causalPerdida || ""}
              </td>
              <td style={{ fontSize: 12, color: "#64748b", maxWidth: 300 }}>
                {limpiarComentario(lead.comentarios)}
              </td>
              <td style={{ fontSize: 12, color: "#64748b", maxWidth: 250 }}>
                {lead.observaciones ? lead.observaciones.slice(0, 80) : "—"}
                {lead.observaciones?.length > 80 ? "..." : ""}
              </td>
              <td style={{ fontSize: 13, color: "#94a3b8" }}>{tiempoRelativo(lead.fechaCreacion)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
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
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [asesores, setAsesores] = useState([]);
  const [totales, setTotales] = useState({ totalLeads: 0, metaAds: 0, ganados: 0, conversion: "0.0" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [captura, setCaptura] = useState({ totalMeta: 0, totalBitrix: 0 });
  const [porEtapa, setPorEtapa] = useState({});
  const [totalLeads, setTotalLeads] = useState(0);
  const [expandido, setExpandido] = useState(null);

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
        const [perfData, metaData] = await Promise.all([
          fetch(`/api/perf?${qs.toString()}`).then((r) => r.json()),
          fetch(`/api/meta?${qs.toString()}`).then((r) => r.json()),
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
  }, [range, desde, hasta]);

  useEffect(() => {
    if (!rangoListo) return;
    let cancelado = false;

    async function cargarEtapas() {
      const qs = new URLSearchParams({ range });
      if (range === "custom") {
        qs.set("desde", desde);
        qs.set("hasta", hasta);
      }

      try {
        const response = await fetch(`/api/leads?${qs.toString()}`);
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
  }, [range, desde, hasta]);

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
                <Fragment key={a.id}>
                  <tr
                    onClick={() => setExpandido(expandido === a.id ? null : a.id)}
                    style={{ cursor: "pointer", background: expandido === a.id ? "#f8fafc" : "white" }}
                  >
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>
                          {expandido === a.id ? "▼" : "▶"}
                        </span>
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

                  {expandido === a.id && (
                    <tr>
                      <td colSpan={7} style={{ padding: 0, background: "#f8fafc" }}>
                        <SubTablaAsesor asesorId={a.id} range={range} desde={desde} hasta={hasta} />
                      </td>
                    </tr>
                  )}
                </Fragment>
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
