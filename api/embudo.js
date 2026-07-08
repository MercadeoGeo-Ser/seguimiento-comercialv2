import { ASESOR_IDS, ETAPAS, getRango, compensarFecha, fechaFin, fetchDeals } from "./_lib/bitrix.js";

const FIELDS = ["ID", "STAGE_ID"];

export default async function handler(req, res) {
  try {
    const { range, desde, hasta } = req.query;
    const { from, to } = getRango(range, desde, hasta);

    const filter = {
      CATEGORY_ID: "49",
      ASSIGNED_BY_ID: ASESOR_IDS,
      ">=DATE_CREATE": compensarFecha(from),
      "<=DATE_CREATE": fechaFin(to),
    };

    const deals = await fetchDeals(filter, FIELDS);

    const conteos = {};
    for (const deal of deals) {
      conteos[deal.STAGE_ID] = (conteos[deal.STAGE_ID] || 0) + 1;
    }

    // "Entradas" = deals aun activos en el embudo, sin contar los ya cerrados (WON/LOSE)
    const totalEntradas = deals.filter(
      (d) => d.STAGE_ID !== "C49:WON" && d.STAGE_ID !== "C49:LOSE"
    ).length;

    const etapas = Object.entries(ETAPAS).map(([codigo, nombre]) => {
      const total = conteos[codigo] || 0;
      const porcentaje = totalEntradas > 0 ? ((total / totalEntradas) * 100).toFixed(1) : "0.0";
      return { codigo, nombre, total, porcentaje: `${porcentaje}%` };
    });

    res.status(200).json({ ok: true, etapas, totalEntradas });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}
