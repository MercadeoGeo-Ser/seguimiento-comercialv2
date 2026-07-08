import { useEffect, useState } from "react";
import { ASESORES } from "../constants.js";

const RANGOS = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
];

const FUENTES = [
  { value: "", label: "Todas" },
  { value: "Meta Ads", label: "Meta Ads" },
  { value: "Orgánico Social", label: "Orgánico Social" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Otro", label: "Otro" },
];

const FUENTE_BADGE = {
  "Meta Ads": "bg-blue-100 text-blue-700",
  "Orgánico Social": "bg-green-100 text-green-700",
  WhatsApp: "bg-orange-100 text-orange-700",
  Otro: "bg-gray-100 text-gray-700",
};

const PRIMERA_ETAPA_RAW = "C49:NEW";

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

function SkeletonRows() {
  return (
    <tbody>
      {Array.from({ length: 6 }).map((_, i) => (
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

function SummaryPill({ label, value }) {
  return (
    <div className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function colorTasaCaptura(tasa) {
  const valor = parseFloat(tasa);
  if (valor >= 90) return "#16a34a";
  if (valor >= 70) return "#d97706";
  return "#dc2626";
}

export default function LiveFeed() {
  const [range, setRange] = useState("today");
  const [asesor, setAsesor] = useState("");
  const [fuente, setFuente] = useState("");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEtapa, setFiltroEtapa] = useState(null);
  const [captura, setCaptura] = useState({ totalMeta: 0, totalBitrix: 0 });
  const [huerfanos, setHuerfanos] = useState([]);

  useEffect(() => {
    let cancelado = false;

    async function cargarCaptura() {
      try {
        const [leadsRes, metaLeadsRes] = await Promise.all([
          fetch(`/api/leads?range=${range}`).then((r) => r.json()),
          fetch(`/api/meta?leads=1&range=${range}`).then((r) => r.json()),
        ]);
        if (cancelado) return;

        if (leadsRes.ok && metaLeadsRes.ok) {
          const telefonosBitrix = new Set(
            (leadsRes.leads || [])
              .map((l) => l.telefono?.replace(/\D/g, "").slice(-10))
              .filter(Boolean)
          );

          const huerfanosDetectados = (metaLeadsRes.leads || [])
            .filter((l) => {
              const tel = l.telefono?.replace(/\D/g, "").slice(-10);
              return tel && !telefonosBitrix.has(tel);
            })
            .map((l) => ({
              ...l,
              id: `meta_${l.id}`,
              huerfano: true,
              etapa: "Sin registrar en Bitrix",
              asesor: "—",
            }));

          setCaptura({
            totalMeta: metaLeadsRes.total || 0,
            totalBitrix: (leadsRes.leads || []).length,
          });
          setHuerfanos(huerfanosDetectados);
        }
      } catch {
        if (!cancelado) {
          setCaptura({ totalMeta: 0, totalBitrix: 0 });
          setHuerfanos([]);
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

      const params = new URLSearchParams({ range });
      if (asesor) params.set("asesor", asesor);
      if (fuente) params.set("fuente", fuente);

      try {
        const response = await fetch(`/api/leads?${params.toString()}`);
        const data = await response.json();
        if (cancelado) return;

        if (!data.ok) {
          setError(data.error || "Error al cargar los leads");
          setLeads([]);
        } else {
          setLeads(data.leads);
        }
      } catch (err) {
        if (!cancelado) {
          setError(err.message);
          setLeads([]);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [range, asesor, fuente]);

  const sinGestionarCount = leads.filter((lead) => lead.etapaRaw === PRIMERA_ETAPA_RAW).length;
  const otrosCount = leads.filter(
    (lead) => lead.fuente === "WhatsApp" || lead.fuente === "Orgánico Social"
  ).length;

  const tasaCaptura =
    captura.totalMeta > 0 ? ((captura.totalBitrix / captura.totalMeta) * 100).toFixed(1) : "0";

  const totalLeads = leads.length;
  const porEtapa = {};
  leads.forEach((lead) => {
    porEtapa[lead.etapa] = (porEtapa[lead.etapa] || 0) + 1;
  });

  const leadsMostrados = filtroEtapa ? leads.filter((lead) => lead.etapa === filtroEtapa) : leads;

  const mostrarHuerfanos =
    !asesor &&
    (!fuente || fuente === "Meta Ads") &&
    (!filtroEtapa || filtroEtapa === "Sin registrar en Bitrix");
  const filasTabla = mostrarHuerfanos ? [...leadsMostrados, ...huerfanos] : leadsMostrados;

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

        <select
          value={fuente}
          onChange={(e) => setFuente(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
        >
          {FUENTES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SummaryPill label="Leads Meta" value={<span className="text-blue-600">{captura.totalMeta}</span>} />
        <SummaryPill label="En Bitrix" value={captura.totalBitrix} />
        <SummaryPill
          label="Tasa captura"
          value={<span style={{ color: colorTasaCaptura(tasaCaptura) }}>{tasaCaptura}%</span>}
        />
        <SummaryPill
          label="Perdidos"
          value={<span className={huerfanos.length > 0 ? "text-red-600" : "text-gray-900"}>{huerfanos.length}</span>}
        />
        <SummaryPill label="Sin gestionar" value={sinGestionarCount} />
        <SummaryPill label="Otros" value={otrosCount} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {Object.entries(porEtapa)
          .sort((a, b) => b[1] - a[1])
          .map(([etapa, count]) => {
            const pct = ((count / totalLeads) * 100).toFixed(0);
            return (
              <div
                key={etapa}
                style={{
                  background: "#f1f5f9",
                  borderRadius: 20,
                  padding: "4px 12px",
                  fontSize: 13,
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  cursor: "pointer",
                  border: filtroEtapa === etapa ? "2px solid #6366f1" : "2px solid transparent",
                }}
                onClick={() => setFiltroEtapa(filtroEtapa === etapa ? null : etapa)}
              >
                <span style={{ fontWeight: 600 }}>{etapa}</span>
                <span style={{ color: "#6366f1", fontWeight: 700 }}>{count}</span>
                <span style={{ color: "#94a3b8" }}>{pct}%</span>
              </div>
            );
          })}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Negociación</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Fuente</th>
              <th className="px-4 py-3">Formulario</th>
              <th className="px-4 py-3">Asesor</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Etapa</th>
            </tr>
          </thead>
          {loading ? (
            <SkeletonRows />
          ) : (
            <tbody>
              {filasTabla.map((lead) => {
                if (lead.huerfano) {
                  return (
                    <tr key={lead.id} style={{ background: "#fffbeb", borderLeft: "3px solid #f59e0b" }}>
                      <td className="px-4 py-3" style={{ color: "#92400e", fontWeight: 500 }}>
                        ⚠️ Meta #{lead.id.replace("meta_", "")}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{lead.nombre}</td>
                      <td className="px-4 py-3">
                        <span className="badge badge-meta">Meta Ads</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{lead.formulario}</td>
                      <td className="px-4 py-3" style={{ color: "#94a3b8" }}>—</td>
                      <td className="px-4 py-3 text-gray-500">{tiempoRelativo(lead.createdTime)}</td>
                      <td className="px-4 py-3">
                        <span
                          style={{
                            background: "#fef9c3",
                            color: "#854d0e",
                            padding: "2px 10px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          ⚠️ Sin registrar en Bitrix
                        </span>
                      </td>
                    </tr>
                  );
                }

                const asesorInfo = asesorPorId(lead.asesorId);
                return (
                  <tr key={lead.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-900">#{lead.id}</td>
                    <td className="px-4 py-3 text-gray-700">{lead.cliente}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          FUENTE_BADGE[lead.fuente] || FUENTE_BADGE.Otro
                        }`}
                      >
                        {lead.fuente}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{lead.formulario || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: asesorInfo?.color || "#9ca3af" }}
                        >
                          {lead.asesor ? lead.asesor.charAt(0).toUpperCase() : "?"}
                        </span>
                        <span className="text-gray-700">{lead.asesor || "Sin asignar"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500" title={lead.fechaDisplay}>
                      {tiempoRelativo(lead.fechaCreacion)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{lead.etapa}</td>
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>

        {!loading && !error && filasTabla.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-gray-500">
            {filtroEtapa ? "Sin leads en esta etapa" : "Sin leads en este período"}
          </div>
        )}

        {!loading && error && (
          <div className="px-4 py-10 text-center text-sm text-red-600">{error}</div>
        )}
      </div>
    </div>
  );
}
