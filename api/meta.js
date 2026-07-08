import { getRango } from "./_lib/bitrix.js";

const GRAPH_URL = "https://graph.facebook.com/v25.0";
const PAGE_ID = "378061358891359";
const AD_ACCOUNT_ID = "act_2136722620087946";

function rangoTimestamps(range, desde, hasta) {
  const { from, to } = getRango(range, desde, hasta);
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

function datosLeadFormulario(lead, formName) {
  const campos = {};
  (lead.field_data || []).forEach((f) => {
    campos[f.name] = f.values?.[0] || "";
  });

  return {
    id: lead.id,
    nombre: `${campos.first_name || campos.nombre || ""} ${campos.last_name || campos.apellido || ""}`.trim(),
    telefono: campos.phone_number || campos.celular || campos.telefono || "",
    email: campos.email || campos.correo || "",
    createdTime: lead.created_time,
    formulario: formName,
    fuente: "Meta Ads",
  };
}

async function obtenerLeadsFormulario(form, sinceTs, untilTs, pageToken) {
  const filtering = JSON.stringify([
    { field: "time_created", operator: "GREATER_THAN", value: sinceTs },
    { field: "time_created", operator: "LESS_THAN", value: untilTs },
  ]);

  const datos = await fetchAllMeta(
    `${GRAPH_URL}/${form.id}/leads?fields=field_data,created_time&filtering=${encodeURIComponent(filtering)}&limit=100&access_token=${pageToken}`
  );

  return datos.map((lead) => datosLeadFormulario(lead, form.name));
}

async function obtenerLeadsMeta(pageToken, range, desde, hasta) {
  const { sinceTs, untilTs } = rangoTimestamps(range, desde, hasta);
  const forms = await getAllForms(pageToken, PAGE_ID);
  const formsActivos = forms.filter((f) => (f.leads_count || 0) > 0);

  const leads = [];
  for (let i = 0; i < formsActivos.length; i += BATCH) {
    const lote = formsActivos.slice(i, i + BATCH);
    const grupos = await Promise.all(
      lote.map((f) => obtenerLeadsFormulario(f, sinceTs, untilTs, pageToken))
    );
    grupos.forEach((grupo) => leads.push(...grupo));
  }

  return { ok: true, leads, total: leads.length };
}

async function obtenerCampanasWhatsapp(pageToken, range, desde, hasta) {
  const { from, to } = getRango(range, desde, hasta);
  const timeRange = encodeURIComponent(JSON.stringify({ since: from, until: to }));

  const filtering = JSON.stringify([
    { field: "objective", operator: "IN", value: ["MESSAGES", "OUTCOME_ENGAGEMENT"] },
  ]);

  const url = `${GRAPH_URL}/${AD_ACCOUNT_ID}/campaigns?fields=name,objective,insights.time_range(${timeRange}){spend,impressions,actions}&filtering=${encodeURIComponent(filtering)}&access_token=${pageToken}`;

  const response = await fetch(url);
  const json = await response.json();

  if (json.error) {
    throw new Error(json.error.message || "Error de Meta Graph API");
  }

  const campanas = (json.data || [])
    .map((c) => ({
      nombre: c.name,
      gasto: parseFloat(c.insights?.data?.[0]?.spend || 0),
      impresiones: parseInt(c.insights?.data?.[0]?.impressions || 0, 10),
      mensajes: parseInt(
        c.insights?.data?.[0]?.actions?.find(
          (a) => a.action_type === "onsite_conversion.messaging_conversation_started_7d"
        )?.value || 0,
        10
      ),
    }))
    .filter((c) => c.gasto > 0);

  const totalGasto = campanas.reduce((s, c) => s + c.gasto, 0);
  const totalMensajes = campanas.reduce((s, c) => s + c.mensajes, 0);

  return {
    ok: true,
    campanas,
    totalGasto: totalGasto.toFixed(2),
    totalMensajes,
    costoPorMensaje: totalMensajes > 0 ? (totalGasto / totalMensajes).toFixed(2) : 0,
  };
}

const BATCH = 5;
const TTL = 30 * 60 * 1000; // 30 minutos
const TTL_LEADS = 15 * 60 * 1000; // 15 minutos

// Variable de modulo: persiste entre invocaciones mientras la instancia
// serverless siga viva (cache en memoria, no compartida entre regiones).
const cache = {};

export default async function handler(req, res) {
  try {
    const range = req.query.range || "today";
    const { desde, hasta } = req.query;
    const tipo = req.query.tipo;
    const wantsLeads = req.query.leads === "1";
    const rangeKey = range === "custom" ? `custom_${desde}_${hasta}` : range;
    const cacheKey = wantsLeads ? `leads_${rangeKey}` : tipo === "whatsapp" ? `whatsapp_${rangeKey}` : `meta_${rangeKey}`;
    const ttl = wantsLeads ? TTL_LEADS : TTL;
    const ahora = Date.now();

    if (cache[cacheKey] && ahora - cache[cacheKey].ts < ttl) {
      return res.status(200).json({ ...cache[cacheKey].data, cached: true });
    }

    const USER_TOKEN = process.env.META_ACCESS_TOKEN;
    const PAGE_TOKEN = await obtenerPageToken(USER_TOKEN);
    if (!PAGE_TOKEN) {
      return res.status(400).json({ ok: false, error: "Página no encontrada" });
    }

    if (tipo === "whatsapp") {
      const resultado = await obtenerCampanasWhatsapp(PAGE_TOKEN, range, desde, hasta);
      cache[cacheKey] = { data: resultado, ts: ahora };
      return res.status(200).json(resultado);
    }

    if (wantsLeads) {
      const resultado = await obtenerLeadsMeta(PAGE_TOKEN, range, desde, hasta);
      cache[cacheKey] = { data: resultado, ts: ahora };
      return res.status(200).json(resultado);
    }

    const { sinceTs, untilTs } = rangoTimestamps(range, desde, hasta);

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
