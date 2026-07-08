export const ASESOR_IDS = ["19", "1185", "6417"];

// Etapas reales del pipeline Transaccional (categoryId 49), en orden de SORT
// (via crm.dealcategory.stage.list.json?id=49)
export const ETAPAS = {
  "C49:NEW":                "Contacto inicial",
  "C49:UC_P9SE7Z":          "No contesta",
  "C49:UC_5M8VT8":          "En cotización",
  "C49:UC_4Y8FTH":          "Revisión cotización",
  "C49:PREPARATION":        "Cotización enviada",
  "C49:PREPAYMENT_INVOIC":  "Seguimiento cotización",
  "C49:UC_IG8XXA":          "Ajuste cotización",
  "C49:FINAL_INVOICE":      "Reserva confirmada",
  "C49:UC_WMZ03O":          "Contrato",
  "C49:UC_YO6ROS":          "Revisión contrato",
  "C49:UC_6A17DV":          "Ajuste contrato",
  "C49:UC_3J1LL7":          "Pago",
  "C49:UC_H36U8W":          "Confirmación pago",
  "C49:UC_FNYTZ5":          "Emisión aérea + PT",
  "C49:WON":                "CERRADO — Ganado",
  "C49:LOSE":               "CERRADO — Perdido"
};

// Clave YYYY-MM-DD (día Colombia) usada solo para calcular rangos de fecha
export function claveFechaColombia(iso) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

export function fechaColombia(iso) {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

export function getRango(range, desde, hasta) {
  const hoy = claveFechaColombia(new Date().toISOString());
  const shift = (str, n) => {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
  };

  if (range === "today") return { from: hoy, to: hoy };
  if (range === "yesterday") return { from: shift(hoy, -1), to: shift(hoy, -1) };
  if (range === "7d") return { from: shift(hoy, -7), to: hoy };
  if (range === "30d") return { from: shift(hoy, -30), to: hoy };

  if (range === "thismonth") {
    const [y, m] = hoy.split("-");
    return { from: `${y}-${m}-01`, to: hoy };
  }

  if (range === "lastmonth") {
    const [y, m] = hoy.split("-").map(Number);
    const primerDiaMesAnterior = new Date(Date.UTC(y, m - 2, 1));
    const ly = primerDiaMesAnterior.getUTCFullYear();
    const lm = primerDiaMesAnterior.getUTCMonth();
    const ultimoDia = new Date(Date.UTC(ly, lm + 1, 0)).getUTCDate();
    const mm = String(lm + 1).padStart(2, "0");
    return { from: `${ly}-${mm}-01`, to: `${ly}-${mm}-${String(ultimoDia).padStart(2, "0")}` };
  }

  if (range === "custom" && desde && hasta) return { from: desde, to: hasta };

  return { from: shift(hoy, -7), to: hoy };
}

// Inicio del dia (Colombia) compensado +8h para el filtro Bitrix (UTC+3)
export function compensarFecha(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 8, 0, 0)).toISOString();
}

// Fin del dia (Colombia) = inicio del dia siguiente, mismo criterio de compensacion
export function fechaFin(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1, 8, 0, 0)).toISOString();
}

function buildBody(filter, select, start) {
  const body = new URLSearchParams();

  Object.entries(filter).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v, i) => body.append(`filter[${key}][${i}]`, v));
    } else {
      body.append(`filter[${key}]`, value);
    }
  });

  select.forEach((field, i) => body.append(`select[${i}]`, field));
  body.append("start", String(start));

  return body;
}

export async function fetchDeals(filter, select) {
  const url = `${process.env.BITRIX_REST_URL}/crm.deal.list.json`;
  const deals = [];
  let start = 0;

  while (start !== null) {
    const response = await fetch(url, {
      method: "POST",
      body: buildBody(filter, select, start),
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
