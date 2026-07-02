import { ASESORES } from "../src/constants.js";
import { ASESOR_IDS, getRango, compensarFecha, fechaFin, fetchDeals } from "./_lib/bitrix.js";

const FIELDS = ["ID", "ASSIGNED_BY_ID", "STAGE_ID", "UF_CRM_1769101707140"];

function calcularConversion(ganados, totalLeads) {
  return totalLeads > 0 ? (ganados / totalLeads * 100).toFixed(1) : "0.0";
}

export default async function handler(req, res) {
  try {
    const { range } = req.query;
    const { from, to } = getRango(range);

    const filter = {
      CATEGORY_ID: "49",
      ASSIGNED_BY_ID: ASESOR_IDS,
      ">=DATE_CREATE": compensarFecha(from),
      "<=DATE_CREATE": fechaFin(to),
    };

    const deals = await fetchDeals(filter, FIELDS);

    const asesores = ASESORES.map((a) => {
      const dealsAsesor = deals.filter((d) => d.ASSIGNED_BY_ID === a.id);
      const totalLeads = dealsAsesor.length;
      const metaAds = dealsAsesor.filter((d) => d.UF_CRM_1769101707140 !== null).length;
      const sinGestionar = dealsAsesor.filter((d) => d.STAGE_ID === "C49:NEW").length;
      const ganados = dealsAsesor.filter((d) => d.STAGE_ID === "C49:WON").length;
      const perdidos = dealsAsesor.filter((d) => d.STAGE_ID === "C49:LOSE").length;
      const enGestion = dealsAsesor.filter(
        (d) => d.STAGE_ID !== "C49:NEW" && d.STAGE_ID !== "C49:WON" && d.STAGE_ID !== "C49:LOSE"
      ).length;

      return {
        id: a.id,
        nombre: a.nombre,
        color: a.color,
        totalLeads,
        metaAds,
        sinGestionar,
        enGestion,
        ganados,
        perdidos,
        conversion: calcularConversion(ganados, totalLeads),
      };
    });

    const totales = asesores.reduce(
      (acc, a) => ({
        totalLeads: acc.totalLeads + a.totalLeads,
        metaAds: acc.metaAds + a.metaAds,
        ganados: acc.ganados + a.ganados,
      }),
      { totalLeads: 0, metaAds: 0, ganados: 0 }
    );
    totales.conversion = calcularConversion(totales.ganados, totales.totalLeads);

    res.status(200).json({ ok: true, asesores, totales });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}
