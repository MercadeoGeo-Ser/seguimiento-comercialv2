import { useEffect, useState } from "react";

const RANGOS = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
];

function AsesorCard({ asesor }) {
  const conversion = parseFloat(asesor.conversion) || 0;
  const metricas = [
    { label: "Meta Ads", value: asesor.metaAds, color: "#6366f1" },
    { label: "Sin gestionar", value: asesor.sinGestionar, color: "#f59e0b" },
    { label: "En gestión", value: asesor.enGestion, color: "#0ea5e9" },
    { label: "Ganados", value: asesor.ganados, color: "#16a34a" },
    { label: "Perdidos", value: asesor.perdidos, color: "#ef4444" },
  ];

  return (
    <div className="card" style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <div className="avatar" style={{ background: asesor.color, width: 44, height: 44, fontSize: 18 }}>
          {asesor.nombre[0]}
        </div>
        <div>
          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>{asesor.nombre}</div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Asesor interno Geotours</div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div className="metric-label">Total Leads</div>
        <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
          {asesor.totalLeads}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {metricas.map((m) => (
          <div key={m.label} style={{ textAlign: "center", background: "#f8fafc", borderRadius: 8, padding: "10px 8px" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, fontWeight: 500 }}>{m.label}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>CONVERSIÓN</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: conversion > 0 ? "#16a34a" : "#94a3b8" }}>
            {asesor.conversion}%
          </div>
        </div>
        <div style={{ background: "#f1f5f9", borderRadius: 4, height: 8 }}>
          <div
            style={{
              width: `${Math.min(conversion, 100)}%`,
              background: `linear-gradient(90deg, ${asesor.color}, #16a34a)`,
              borderRadius: 4,
              height: 8,
              transition: "width 0.6s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
        <div className="skeleton" style={{ width: 44, height: 44, borderRadius: "50%" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="skeleton" style={{ width: 120, height: 16 }} />
          <div className="skeleton" style={{ width: 90, height: 12 }} />
        </div>
      </div>
      <div className="skeleton" style={{ width: 80, height: 32, marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 56, marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 24 }} />
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
      </div>

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : asesores.map((asesor) => <AsesorCard key={asesor.id} asesor={asesor} />)}
      </div>
    </div>
  );
}
