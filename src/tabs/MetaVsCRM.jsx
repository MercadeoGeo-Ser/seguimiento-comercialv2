import { useEffect, useState } from "react";

const RANGOS = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
];

function SummaryCard({ label, value }) {
  return (
    <div className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <tbody>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100">
          {Array.from({ length: 4 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
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
  const [filas, setFilas] = useState([]);
  const [totalMeta, setTotalMeta] = useState(0);
  const [totalCRM, setTotalCRM] = useState(0);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setLoading(true);
      setError(null);

      try {
        const [metaRes, leadsRes] = await Promise.all([
          fetch(`/api/meta?range=${range}`),
          fetch(`/api/leads?range=${range}&fuente=${encodeURIComponent("Meta Ads")}`),
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
  }, [range]);

  const diferenciaTotal = totalMeta - totalCRM;

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
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SummaryCard label="Meta Ads" value={totalMeta} />
        <SummaryCard label="En Bitrix" value={totalCRM} />
        <SummaryCard
          label="Diferencia"
          value={
            <span className={diferenciaTotal > 0 ? "text-red-600" : "text-green-600"}>
              {diferenciaTotal}
            </span>
          }
        />
      </div>

      {cached && (
        <span style={{ fontSize: 11, color: "#94a3b8" }}>
          ⚡ Datos en caché · actualiza en 30 min
        </span>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Nombre formulario</th>
              <th className="px-4 py-3">Leads Meta</th>
              <th className="px-4 py-3">Leads Bitrix</th>
              <th className="px-4 py-3">Diferencia</th>
            </tr>
          </thead>
          {loading ? (
            <SkeletonRows />
          ) : (
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.nombre} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-gray-700">{fila.nombre}</td>
                  <td className="px-4 py-3 text-gray-700">{fila.leadsMeta}</td>
                  <td className="px-4 py-3 text-gray-700">{fila.leadsCRM}</td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      fila.diferencia > 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {fila.diferencia}
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
