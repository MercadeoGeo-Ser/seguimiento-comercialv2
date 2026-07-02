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
      {Array.from({ length: 3 }).map((_, i) => (
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

export default function Resumen() {
  const [range, setRange] = useState("today");
  const [asesores, setAsesores] = useState([]);
  const [totales, setTotales] = useState({ totalLeads: 0, metaAds: 0, ganados: 0, conversion: "0.0" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/perf?range=${range}`);
        const data = await response.json();
        if (cancelado) return;

        if (!data.ok) {
          setError(data.error || "Error al cargar el resumen");
          setAsesores([]);
        } else {
          setAsesores(data.asesores);
          setTotales(data.totales);
        }
      } catch (err) {
        if (!cancelado) {
          setError(err.message);
          setAsesores([]);
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
        <SummaryCard label="Total Leads" value={totales.totalLeads} />
        <SummaryCard label="Meta Ads" value={totales.metaAds} />
        <SummaryCard label="Ganados" value={totales.ganados} />
        <SummaryCard label="Conversión" value={`${totales.conversion}%`} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Asesor</th>
              <th className="px-4 py-3">Total Leads</th>
              <th className="px-4 py-3">Meta Ads</th>
              <th className="px-4 py-3">Sin Gestionar</th>
              <th className="px-4 py-3">En Gestión</th>
              <th className="px-4 py-3">Ganados</th>
              <th className="px-4 py-3">Conversión</th>
            </tr>
          </thead>
          {loading ? (
            <SkeletonRows />
          ) : (
            <tbody>
              {asesores.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: a.color }}
                      >
                        {a.nombre.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-gray-700">{a.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{a.totalLeads}</td>
                  <td className="px-4 py-3 text-gray-700">{a.metaAds}</td>
                  <td className="px-4 py-3 text-gray-700">{a.sinGestionar}</td>
                  <td className="px-4 py-3 text-gray-700">{a.enGestion}</td>
                  <td className="px-4 py-3 text-gray-700">{a.ganados}</td>
                  <td className="px-4 py-3 text-gray-700">{a.conversion}%</td>
                </tr>
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
