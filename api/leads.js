import { ASESORES, TRM } from "../src/constants.js";
import { ASESOR_IDS, ETAPAS, getRango, compensarFecha, fechaFin, fechaColombia, fetchDeals } from "./_lib/bitrix.js";

const FIELDS = [
  "ID", "TITLE", "ASSIGNED_BY_ID", "STAGE_ID", "SOURCE_ID",
  "DATE_CREATE", "OPPORTUNITY", "CATEGORY_ID", "NAME", "LAST_NAME",
  "UF_CRM_1769101707140", "CONTACT_ID", "CLOSEDATE", "CURRENCY_ID",
  "COMMENTS",
  "UF_CRM_1769399437",    // Tipificacion Akira
  "UF_CRM_1784039355677", // Calificación del lead
  "UF_CRM_1770751137374", // Causales de pérdida comercial
  "UF_CRM_1778256241048", // Causales de pérdida prospección
  "UF_CRM_1771437628136", // Observaciones causales de pérdida
];

let enumsCache = null;
let enumsCacheTs = 0;
const ENUMS_TTL = 6 * 60 * 60 * 1000; // 6 horas

async function getEnums() {
  if (enumsCache && Date.now() - enumsCacheTs < ENUMS_TTL) return enumsCache;

  const response = await fetch(`${process.env.BITRIX_REST_URL}/crm.deal.fields.json`);
  const json = await response.json();
  const fields = json.result || {};

  const mapaDe = (campo) =>
    Object.fromEntries((fields[campo]?.items || []).map((i) => [i.ID, i.VALUE]));

  enumsCache = {
    tipificacionAkira: mapaDe("UF_CRM_1769399437"),
    calificacion: mapaDe("UF_CRM_1784039355677"),
    causalPerdida: mapaDe("UF_CRM_1770751137374"),
    causalProspeccion: mapaDe("UF_CRM_1778256241048"),
  };
  enumsCacheTs = Date.now();

  return enumsCache;
}

function resolverEnum(deal, campo, mapa) {
  const val = deal[campo];
  if (!val) return "";
  const id = Array.isArray(val) ? String(val[0]) : String(val);
  return mapa[id] || "";
}

async function fetchContactos(contactIds) {
  const mapa = {};
  const base = process.env.BITRIX_REST_URL;

  for (let i = 0; i < contactIds.length; i += 50) {
    const lote = contactIds.slice(i, i + 50);
    const body = new URLSearchParams();
    lote.forEach((id, idx) => body.append(`filter[ID][${idx}]`, id));
    body.append("select[0]", "ID");
    body.append("select[1]", "PHONE");
    body.append("select[2]", "EMAIL");

    const response = await fetch(`${base}/crm.contact.list.json`, {
      method: "POST",
      body,
    });
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    (data.result || []).forEach((c) => {
      mapa[c.ID] = {
        telefono: c.PHONE?.[0]?.VALUE || "",
        email: c.EMAIL?.[0]?.VALUE || "",
      };
    });
  }

  return mapa;
}

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
    const { range, asesor, fuente, etapa, desde, hasta } = req.query;
    const { from, to } = getRango(range, desde, hasta);

    const filter = {
      CATEGORY_ID: "49",
      ASSIGNED_BY_ID: ASESOR_IDS,
      ">=DATE_CREATE": compensarFecha(from),
      "<=DATE_CREATE": fechaFin(to),
    };

    if (etapa === "ganado") {
      filter.STAGE_ID = "C49:WON";
    }

    const deals = await fetchDeals(filter, FIELDS);

    const contactIds = Array.from(new Set(deals.map((d) => d.CONTACT_ID).filter(Boolean)));
    const [contactMap, enums] = await Promise.all([fetchContactos(contactIds), getEnums()]);

    let leads = deals.map((deal) => {
      const fechaCreacion = normalizarFecha(deal.DATE_CREATE);
      const contacto = contactMap[deal.CONTACT_ID];
      return {
        id: deal.ID,
        titulo: deal.TITLE,
        nombre: deal.NAME,
        apellido: deal.LAST_NAME,
        cliente: [deal.NAME, deal.LAST_NAME].filter(Boolean).join(' ').trim() || deal.TITLE?.split(' - ')[1] || 'Sin nombre',
        asesorId: deal.ASSIGNED_BY_ID,
        asesor: nombreAsesor(deal.ASSIGNED_BY_ID),
        telefono: contacto?.telefono || "",
        email: contacto?.email || "",
        etapa: ETAPAS[deal.STAGE_ID] || deal.STAGE_ID,
        etapaRaw: deal.STAGE_ID,
        oportunidad: deal.OPPORTUNITY,
        valor: parseFloat(deal.OPPORTUNITY || 0),
        moneda: deal.CURRENCY_ID || "USD",
        valorUSD:
          deal.CURRENCY_ID === "COP"
            ? parseFloat(deal.OPPORTUNITY || 0) / TRM
            : parseFloat(deal.OPPORTUNITY || 0),
        fechaCierre: deal.CLOSEDATE ? normalizarFecha(deal.CLOSEDATE) : null,
        comentarios: deal.COMMENTS || "",
        tipificacionAkira: resolverEnum(deal, "UF_CRM_1769399437", enums.tipificacionAkira),
        calificacion: resolverEnum(deal, "UF_CRM_1784039355677", enums.calificacion),
        causalPerdida: resolverEnum(deal, "UF_CRM_1770751137374", enums.causalPerdida),
        causalProspeccion: resolverEnum(deal, "UF_CRM_1778256241048", enums.causalProspeccion),
        observaciones: deal.UF_CRM_1771437628136 || "",
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
