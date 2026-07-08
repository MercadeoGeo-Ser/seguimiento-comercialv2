import { ASESORES } from "../src/constants.js";
import { ASESOR_IDS, ETAPAS, getRango, compensarFecha, fechaFin, fechaColombia, fetchDeals } from "./_lib/bitrix.js";

const FIELDS = [
  "ID", "TITLE", "ASSIGNED_BY_ID", "STAGE_ID", "SOURCE_ID",
  "DATE_CREATE", "OPPORTUNITY", "CATEGORY_ID", "NAME", "LAST_NAME",
  "UF_CRM_1769101707140", "CONTACT_ID", "PHONE", "UF_CRM_PHONE"
];

function normalizarFecha(raw) {
  if (!raw) return new Date().toISOString();
  // Convertir directamente — new Date() parsea el offset +03:00 correctamente
  return new Date(raw).toISOString();
}

function clasificarFuente(deal) {
  const form = deal.UF_CRM_1769101707140 || "";
  const src = (deal.SOURCE_ID || "").toUpperCase();
  if (form !== "") return "Meta Ads";
  if (src.includes("FACEBOOK") || src.includes("INSTAGRAM")) return "Orgánico Social";
  if (src === "UC_A7JB2B") return "WhatsApp";
  return "Otro";
}

function nombreAsesor(assignedById) {
  const asesor = ASESORES.find((a) => a.id === String(assignedById));
  return asesor ? asesor.nombre : null;
}

export default async function handler(req, res) {
  try {
    const { range, asesor, fuente } = req.query;
    const { from, to } = getRango(range);

    const filter = {
      CATEGORY_ID: "49",
      ASSIGNED_BY_ID: ASESOR_IDS,
      ">=DATE_CREATE": compensarFecha(from),
      "<=DATE_CREATE": fechaFin(to),
    };

    const deals = await fetchDeals(filter, FIELDS);

    let leads = deals.map((deal) => {
      const fechaCreacion = normalizarFecha(deal.DATE_CREATE);
      return {
        id: deal.ID,
        titulo: deal.TITLE,
        nombre: deal.NAME,
        apellido: deal.LAST_NAME,
        cliente: [deal.NAME, deal.LAST_NAME].filter(Boolean).join(' ').trim() || deal.TITLE?.split(' - ')[1] || 'Sin nombre',
        asesorId: deal.ASSIGNED_BY_ID,
        asesor: nombreAsesor(deal.ASSIGNED_BY_ID),
        telefono: deal.PHONE?.[0]?.VALUE || deal.UF_CRM_PHONE || "",
        etapa: ETAPAS[deal.STAGE_ID] || deal.STAGE_ID,
        etapaRaw: deal.STAGE_ID,
        oportunidad: deal.OPPORTUNITY,
        formulario: deal.UF_CRM_1769101707140 || null,
        fuente: clasificarFuente(deal),
        fechaCreacion,
        fechaDisplay: fechaColombia(fechaCreacion),
      };
    });

    if (asesor) {
      leads = leads.filter((lead) => lead.asesorId === asesor);
    }
    if (fuente) {
      leads = leads.filter((lead) => lead.fuente === fuente);
    }

    const telefonosBitrix = Array.from(new Set(leads.map((l) => l.telefono).filter(Boolean)));

    res.status(200).json({ ok: true, leads, total: leads.length, telefonosBitrix });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}
