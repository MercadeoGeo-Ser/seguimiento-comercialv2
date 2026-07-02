import { ASESORES } from "../src/constants.js";

const ASESOR_IDS = ["19", "1185", "6417"];

const FIELDS = [
  "ID", "TITLE", "ASSIGNED_BY_ID", "STAGE_ID", "SOURCE_ID",
  "DATE_CREATE", "OPPORTUNITY", "CATEGORY_ID", "NAME", "LAST_NAME",
  "UF_CRM_1769101707140"
];

function normalizarFecha(raw) {
  if (!raw) return new Date().toISOString();
  return `${raw.slice(0, 10)}T12:00:00.000Z`;
}

function fechaColombia(iso) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

function clasificarFuente(deal) {
  const form = deal.UF_CRM_1769101707140 || "";
  const src = (deal.SOURCE_ID || "").toUpperCase();
  if (form !== "") return "Meta Ads";
  if (src.includes("FACEBOOK") || src.includes("INSTAGRAM")) return "Orgánico Social";
  if (src === "UC_A7JB2B") return "WhatsApp";
  return "Otro";
}

function getRango(range) {
  const hoy = fechaColombia(new Date().toISOString());
  const shift = (str, n) => {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
  };
  if (range === "today") return { from: hoy, to: hoy };
  if (range === "yesterday") return { from: shift(hoy, -1), to: shift(hoy, -1) };
  if (range === "7d") return { from: shift(hoy, -7), to: hoy };
  if (range === "30d") return { from: shift(hoy, -30), to: hoy };
  return { from: shift(hoy, -7), to: hoy };
}

function compensarFecha(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 8, 0, 0)).toISOString();
}

function fechaFin(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1, 8, 0, 0)).toISOString();
}

function nombreAsesor(assignedById) {
  const asesor = ASESORES.find((a) => a.id === String(assignedById));
  return asesor ? asesor.nombre : null;
}

function buildBody(filter, start) {
  const body = new URLSearchParams();

  Object.entries(filter).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v, i) => body.append(`filter[${key}][${i}]`, v));
    } else {
      body.append(`filter[${key}]`, value);
    }
  });

  FIELDS.forEach((field, i) => body.append(`select[${i}]`, field));
  body.append("start", String(start));

  return body;
}

async function fetchDeals(filter) {
  const url = `${process.env.BITRIX_REST_URL}/crm.deal.list.json`;
  const deals = [];
  let start = 0;

  while (start !== null) {
    const response = await fetch(url, {
      method: "POST",
      body: buildBody(filter, start),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    deals.push(...(data.result || []));
    start = typeof data.next === "number" ? data.next : null;
  }

  return deals;
}

export default async function handler(req, res) {
  if (req.query.debug === "1") {
    try {
      const body = new URLSearchParams();
      body.append("filter[CATEGORY_ID]", "49");
      body.append("select[0]", "ID");
      body.append("select[1]", "DATE_CREATE");
      body.append("select[2]", "ASSIGNED_BY_ID");
      body.append("select[3]", "SOURCE_ID");
      body.append("select[4]", "UF_CRM_1769101707140");
      body.append("start", "0");

      const response = await fetch(`${process.env.BITRIX_REST_URL}/crm.deal.list.json`, {
        method: "POST",
        body,
      });
      const json = await response.json();
      res.status(200).json({ raw: json.result?.slice(0, 5), total: json.total });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
    return;
  }

  try {
    const { range, asesor, fuente } = req.query;
    const { from, to } = getRango(range);

    const filter = {
      CATEGORY_ID: "49",
      ASSIGNED_BY_ID: ASESOR_IDS,
      ">=DATE_CREATE": compensarFecha(from),
      "<=DATE_CREATE": fechaFin(to),
    };

    const deals = await fetchDeals(filter);

    let leads = deals.map((deal) => {
      const fechaCreacion = normalizarFecha(deal.DATE_CREATE);
      return {
        id: deal.ID,
        titulo: deal.TITLE,
        nombre: deal.NAME,
        apellido: deal.LAST_NAME,
        asesorId: deal.ASSIGNED_BY_ID,
        asesor: nombreAsesor(deal.ASSIGNED_BY_ID),
        etapa: deal.STAGE_ID,
        oportunidad: deal.OPPORTUNITY,
        fuente: clasificarFuente(deal),
        fechaCreacion,
        fechaColombia: fechaColombia(fechaCreacion),
      };
    });

    if (asesor) {
      leads = leads.filter((lead) => lead.asesorId === asesor);
    }
    if (fuente) {
      leads = leads.filter((lead) => lead.fuente === fuente);
    }

    res.status(200).json({ ok: true, leads, total: leads.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}
