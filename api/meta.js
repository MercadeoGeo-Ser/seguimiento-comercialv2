import { getRango } from "./_lib/bitrix.js";

const GRAPH_URL = "https://graph.facebook.com/v25.0";
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

async function obtenerPageToken(userToken) {
  const response = await fetch(`${GRAPH_URL}/me/accounts?access_token=${userToken}`);
  const json = await response.json();

  if (json.error) {
    throw new Error(json.error.message || "Error de Meta Graph API");
  }

  const page = json.data?.find((p) => p.id === PAGE_ID);
  return page ? page.access_token : null;
}

async function getAllForms(pageToken, pageId) {
  return fetchAllMeta(
    `${GRAPH_URL}/${pageId}/leadgen_forms?fields=id,name,leads_count&access_token=${pageToken}`
  );
}

async function contarLeads(formId, sinceTs, untilTs, pageToken) {
  const filtering = JSON.stringify([
    { field: "time_created", operator: "GREATER_THAN", value: sinceTs },
    { field: "time_created", operator: "LESS_THAN", value: untilTs },
  ]);

  const leads = await fetchAllMeta(
    `${GRAPH_URL}/${formId}/leads?fields=created_time&filtering=${encodeURIComponent(filtering)}&limit=500&access_token=${pageToken}`
  );

  return leads.length;
}

const BATCH = 5;
const TTL = 30 * 60 * 1000; // 30 minutos

// Variable de modulo: persiste entre invocaciones mientras la instancia
// serverless siga viva (cache en memoria, no compartida entre regiones).
const cache = {};

export default async function handler(req, res) {
  try {
    const range = req.query.range || "today";
    const cacheKey = `meta_${range}`;
    const ahora = Date.now();

    if (cache[cacheKey] && ahora - cache[cacheKey].ts < TTL) {
      return res.status(200).json({ ...cache[cacheKey].data, cached: true });
    }

    const { sinceTs, untilTs } = rangoTimestamps(range);
    const USER_TOKEN = process.env.META_ACCESS_TOKEN;

    const PAGE_TOKEN = await obtenerPageToken(USER_TOKEN);
    if (!PAGE_TOKEN) {
      return res.status(400).json({ ok: false, error: "Página no encontrada" });
    }

    const forms = await getAllForms(PAGE_TOKEN, PAGE_ID);
    const formsActivos = forms.filter((f) => (f.leads_count || 0) > 0);

    const resultados = [];
    let totalMeta = 0;

    for (let i = 0; i < formsActivos.length; i += BATCH) {
      const lote = formsActivos.slice(i, i + BATCH);
      const counts = await Promise.all(
        lote.map((f) => contarLeads(f.id, sinceTs, untilTs, PAGE_TOKEN))
      );
      counts.forEach((count, j) => {
        totalMeta += count;
        if (count > 0) resultados.push({ nombre: lote[j].name, leads: count });
      });
    }

    const resultado = {
      ok: true,
      totalMeta,
      porFormulario: resultados.filter((f) => f.leads > 0),
      fechaConsulta: new Date().toISOString(),
    };

    cache[cacheKey] = { data: resultado, ts: ahora };

    res.status(200).json(resultado);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}
