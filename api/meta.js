import { getRango } from "./_lib/bitrix.js";

const GRAPH_URL = "https://graph.facebook.com/v21.0";
const PAGE_ID = "378061358891359";

function rangoTimestamps(range) {
  const { from, to } = getRango(range);
  const [yFrom, mFrom, dFrom] = from.split('-').map(Number);
  const [yTo, mTo, dTo] = to.split('-').map(Number);

  // 00:00 Colombia = 05:00 UTC
  const sinceTs = Math.floor(Date.UTC(yFrom, mFrom - 1, dFrom, 5, 0, 0) / 1000);
  // 23:59:59 Colombia = 04:59:59 UTC del dia siguiente
  const untilTs = Math.floor(Date.UTC(yTo, mTo - 1, dTo + 1, 4, 59, 59) / 1000);

  return { sinceTs, untilTs };
}

async function fetchAllMeta(url) {
  let results = [];
  let nextUrl = url;

  while (nextUrl) {
    const response = await fetch(nextUrl);
    const json = await response.json();

    if (json.error) {
      throw new Error(json.error.message || "Error de Meta Graph API");
    }

    results = results.concat(json.data || []);
    nextUrl = json.paging?.next || null;
  }

  return results;
}

export default async function handler(req, res) {
  try {
    const { range } = req.query;
    const { sinceTs, untilTs } = rangoTimestamps(range);
    const TOKEN = process.env.META_ACCESS_TOKEN;

    const forms = await fetchAllMeta(
      `${GRAPH_URL}/${PAGE_ID}/leadgen_forms?fields=id,name,leads_count&access_token=${TOKEN}`
    );

    const filtering = JSON.stringify([
      { field: "time_created", operator: "GREATER_THAN", value: sinceTs },
      { field: "time_created", operator: "LESS_THAN", value: untilTs },
    ]);

    let totalMeta = 0;
    const porFormulario = [];

    for (const form of forms) {
      const leads = await fetchAllMeta(
        `${GRAPH_URL}/${form.id}/leads?fields=created_time&filtering=${encodeURIComponent(filtering)}&limit=500&access_token=${TOKEN}`
      );
      porFormulario.push({ nombre: form.name, leads: leads.length });
      totalMeta += leads.length;
    }

    res.status(200).json({
      ok: true,
      totalMeta,
      porFormulario,
      fechaConsulta: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}
