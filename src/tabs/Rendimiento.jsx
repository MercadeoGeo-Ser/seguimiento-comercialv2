import { useEffect, useState } from "react";

const RANGOS = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
];

function Metric({ label, value }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-lg font-semibold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function AsesorCard({ asesor }) {
  const conversion = parseFloat(asesor.conversion) || 0;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: asesor.color }}
        >
          {asesor.nombre.charAt(0).toUpperCase()}
        </span>
        <div>
          <div className="font-semibold text-gray-900">{asesor.nombre}</div>
          <div className="text-xs text-gray-500">Asesor interno Geotours</div>
        </div>
      </div>

      <div>
        <div className="text-3xl font-bold text-gray-900">{asesor.totalLeads}</div>
        <div className="text-xs uppercase tracking-wide text-gray-500">Total Leads</div>
      </div>

      <div className="grid grid-cols-5 gap-2 border-y border-gray-100 py-3">
        <Metric label="Meta Ads" value={asesor.metaAds} />
        <Metric label="Sin gestionar" value={asesor.sinGestionar} />
        <Metric label="En gestión" value={asesor.enGestion} />
        <Metric label="Ganados" value={asesor.ganados} />
        <Metric label="Perdidos" value={asesor.perdidos} />
      </div>

      <div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, conversion)}%`, backgroundColor: asesor.color }}
          />
        </div>
        <div className="mt-2 text-2xl font-bold" style={{ color: asesor.color }}>
          {asesor.conversion}%
        </div>
        <div className="text-xs uppercase tracking-wide text-gray-500">Conversión</div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
        <div className="flex flex-col gap-1">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
      <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
      <div className="h-14 w-full animate-pulse rounded bg-gray-200" />
      <div className="h-8 w-full animate-pulse rounded bg-gray-200" />
    </div>
  );
}

export default function Rendimiento() {
  const [range, setRange] = useState("today");
  const [asesores, setAsesores] = useState([]);
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
          setError(data.error || "Error al cargar el rendimiento");
          setAsesores([]);
        } else {
          setAsesores(data.asesores);
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

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : asesores.map((asesor) => <AsesorCard key={asesor.id} asesor={asesor} />)}
      </div>
    </div>
  );
}
