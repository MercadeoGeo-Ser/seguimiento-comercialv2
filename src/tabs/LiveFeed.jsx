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

export default function LiveFeed() {
  const [range, setRange] = useState("today");
  const [asesor, setAsesor] = useState("");
  const [fuente, setFuente] = useState("");
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          setTotal(0);
        } else {
          setLeads(data.leads);
          setTotal(data.total);
        }
      } catch (err) {
        if (!cancelado) {
          setError(err.message);
          setLeads([]);
          setTotal(0);
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

  const metaAdsCount = leads.filter((lead) => lead.fuente === "Meta Ads").length;
  const sinGestionarCount = leads.filter((lead) => lead.etapaRaw === PRIMERA_ETAPA_RAW).length;
  const otrosCount = leads.filter(
    (lead) => lead.fuente === "WhatsApp" || lead.fuente === "Orgánico Social"
  ).length;

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
        <SummaryPill label="Total leads" value={total} />
        <SummaryPill label="Meta Ads" value={metaAdsCount} />
        <SummaryPill label="Sin gestionar" value={sinGestionarCount} />
        <SummaryPill label="Otros" value={otrosCount} />
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
              {leads.map((lead) => {
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

        {!loading && !error && total === 0 && (
          <div className="px-4 py-10 text-center text-sm text-gray-500">
            Sin leads en este período
          </div>
        )}

        {!loading && error && (
          <div className="px-4 py-10 text-center text-sm text-red-600">{error}</div>
        )}
      </div>
    </div>
  );
}
