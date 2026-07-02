import { useEffect, useState } from "react";

const RANGOS = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
];

const PRIMERA_ETAPA_RAW = "C49:NEW";

function SummaryCard({ label, value }) {
  return (
    <div className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function SkeletonRows({ cols }) {
  return (
    <tbody>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export default function WhatsAppLeads() {
  const [range, setRange] = useState("today");
  const [leads, setLeads] = useState([]);
  const [campanas, setCampanas] = useState([]);
  const [totalGasto, setTotalGasto] = useState("0.00");
  const [costoPorMensaje, setCostoPorMensaje] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setLoading(true);
      setError(null);

      try {
        const [leadsRes, metaRes] = await Promise.all([
          fetch(`/api/leads?range=${range}&fuente=${encodeURIComponent("WhatsApp")}`),
          fetch(`/api/meta?tipo=whatsapp&range=${range}`),
        ]);
        const leadsData = await leadsRes.json();
        const metaData = await metaRes.json();
        if (cancelado) return;

        if (!leadsData.ok) throw new Error(leadsData.error || "Error al cargar Bitrix");
        if (!metaData.ok) throw new Error(metaData.error || "Error al cargar campañas de Meta");

        setLeads(leadsData.leads);
        setCampanas(metaData.campanas);
        setTotalGasto(metaData.totalGasto);
        setCostoPorMensaje(metaData.costoPorMensaje);
      } catch (err) {
        if (!cancelado) {
          setError(err.message);
          setLeads([]);
          setCampanas([]);
          setTotalGasto("0.00");
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
  }, [range]);

  const sinGestionar = leads.filter((lead) => lead.etapaRaw === PRIMERA_ETAPA_RAW).length;

  return (
    <div className="flex flex-col gap-6 p-6">
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
        <SummaryCard label="Deals WhatsApp" value={leads.length} />
        <SummaryCard label="Sin gestionar" value={sinGestionar} />
        <SummaryCard label="Gasto en campañas" value={`$${totalGasto}`} />
        <SummaryCard label="Costo por conversación" value={`$${costoPorMensaje}`} />
      </div>

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-700">Deals WhatsApp en Bitrix</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Asesor</th>
                <th className="px-4 py-3">Etapa</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            {loading ? (
              <SkeletonRows cols={4} />
            ) : (
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 text-gray-700">{lead.cliente}</td>
                    <td className="px-4 py-3 text-gray-700">{lead.asesor || "Sin asignar"}</td>
                    <td className="px-4 py-3 text-gray-700">{lead.etapa}</td>
                    <td className="px-4 py-3 text-gray-500">{lead.fechaDisplay}</td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>

          {!loading && !error && leads.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-gray-500">
              Sin leads de WhatsApp en este período
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-700">Campañas Meta (mensajes)</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Nombre campaña</th>
                <th className="px-4 py-3">Gasto</th>
                <th className="px-4 py-3">Impresiones</th>
                <th className="px-4 py-3">Mensajes iniciados</th>
              </tr>
            </thead>
            {loading ? (
              <SkeletonRows cols={4} />
            ) : (
              <tbody>
                {campanas.map((c) => (
                  <tr key={c.nombre} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 text-gray-700">{c.nombre}</td>
                    <td className="px-4 py-3 text-gray-700">${c.gasto.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-700">{c.impresiones}</td>
                    <td className="px-4 py-3 text-gray-700">{c.mensajes}</td>
                  </tr>
                ))}
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
    </div>
  );
}
