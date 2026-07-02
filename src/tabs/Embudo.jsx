import { useEffect, useState } from "react";

const RANGOS = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
];

// Grupo visual por fase del pipeline Transaccional (categoryId 49)
const GRUPO_POR_ETAPA = {
  "C49:NEW": "inicio",
  "C49:UC_P9SE7Z": "inicio",
  "C49:UC_5M8VT8": "medio",
  "C49:UC_4Y8FTH": "medio",
  "C49:PREPARATION": "medio",
  "C49:PREPAYMENT_INVOIC": "medio",
  "C49:UC_IG8XXA": "medio",
  "C49:FINAL_INVOICE": "cierre",
  "C49:UC_WMZ03O": "cierre",
  "C49:UC_YO6ROS": "cierre",
  "C49:UC_6A17DV": "cierre",
  "C49:UC_3J1LL7": "cierre",
  "C49:UC_H36U8W": "cierre",
  "C49:UC_FNYTZ5": "cierre",
  "C49:WON": "ganado",
  "C49:LOSE": "perdido",
};

const COLOR_POR_GRUPO = {
  inicio: "bg-blue-500",
  medio: "bg-emerald-500",
  cierre: "bg-orange-500",
  ganado: "bg-green-800",
  perdido: "bg-red-500",
};

function FunnelRow({ etapa, ancho }) {
  const grupo = GRUPO_POR_ETAPA[etapa.codigo] || "medio";
  return (
    <div className="flex items-center gap-4">
      <div className="w-14 shrink-0 text-right text-lg font-semibold text-gray-900">
        {etapa.total}
      </div>
      <div className="flex flex-1 justify-center">
        <div
          className={`h-10 rounded ${COLOR_POR_GRUPO[grupo]}`}
          style={{ width: `${ancho}%` }}
        />
      </div>
      <div className="w-64 shrink-0 text-sm text-gray-700">
        {etapa.nombre} <span className="text-gray-400">· {etapa.porcentaje}</span>
      </div>
    </div>
  );
}

function SkeletonFunnel() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-5 w-14 shrink-0 animate-pulse rounded bg-gray-200" />
          <div className="flex flex-1 justify-center">
            <div
              className="h-10 animate-pulse rounded bg-gray-200"
              style={{ width: `${80 - i * 10}%` }}
            />
          </div>
          <div className="h-4 w-64 shrink-0 animate-pulse rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

export default function Embudo() {
  const [range, setRange] = useState("today");
  const [etapas, setEtapas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/embudo?range=${range}`);
        const data = await response.json();
        if (cancelado) return;

        if (!data.ok) {
          setError(data.error || "Error al cargar el embudo");
          setEtapas([]);
        } else {
          setEtapas(data.etapas);
        }
      } catch (err) {
        if (!cancelado) {
          setError(err.message);
          setEtapas([]);
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

  const etapasVisibles = etapas.filter((e) => e.total > 0 && e.codigo !== "C49:LOSE");
  const etapaPerdido = etapas.find((e) => e.codigo === "C49:LOSE");
  const maxDeals = etapasVisibles.length > 0 ? Math.max(...etapasVisibles.map((e) => e.total)) : 0;
  const anchoDe = (total) => (maxDeals > 0 ? (total / maxDeals) * 85 + 15 : 15);

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

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {loading ? (
          <SkeletonFunnel />
        ) : error ? (
          <div className="py-10 text-center text-sm text-red-600">{error}</div>
        ) : (
          <div className="flex flex-col gap-3">
            {etapasVisibles.map((etapa) => (
              <FunnelRow key={etapa.codigo} etapa={etapa} ancho={anchoDe(etapa.total)} />
            ))}
          </div>
        )}
      </div>

      {!loading && !error && etapaPerdido && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <FunnelRow etapa={etapaPerdido} ancho={anchoDe(etapaPerdido.total)} />
        </div>
      )}
    </div>
  );
}
