export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
const BASE = import.meta.env.VITE_API_URL ?? "/api";

async function request(path, { method = "GET", body, timeout = 15000 } = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Request failed (status ${res.status})`);
    return await res.json();
  } catch (e) {
    if (timedOut) throw new Error("The request timed out. Check your connection and try again.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function withId(data) {
  if (data.features.every((f) => f.properties.h3_index != null)) return data;
  return {
    ...data,
    features: data.features.map((f) => ({
      ...f,
      properties: { ...f.properties, h3_index: f.properties.h3_index ?? f.properties.h3 },
    })),
  };
}

function withRank(input) {
  const data = withId(input);
  if (data.features.every((f) => Number.isFinite(f.properties.priority_rank))) return data;
  const order = [...data.features].sort((a, b) => (b.properties.priority ?? 0) - (a.properties.priority ?? 0));
  const rank = new Map(order.map((f, i) => [f.properties.h3_index, i + 1]));
  return {
    ...data,
    features: data.features.map((f) => ({
      ...f,
      properties: { ...f.properties, priority_rank: rank.get(f.properties.h3_index) },
    })),
  };
}

export async function getCells() {
  let data;
  if (USE_MOCK) {
    const res = await fetch("/mock/cells.geojson");
    if (!res.ok) throw new Error(`Could not load the map data (status ${res.status})`);
    data = await res.json();
  } else {
    try {
      data = await request("/cells", { timeout: 30000 });
    } catch (e) {
      throw new Error(`Could not load the map data. ${e.message}`);
    }
  }
  return withRank(data);
}


export async function getStatus() {
  if (USE_MOCK) return null;
  try {
    const s = await request("/status", { timeout: 8000 });
    const raw = s?.sources ?? {};
    const list = Array.isArray(raw) ? raw : Object.entries(raw).map(([name, v]) => ({ name, ...v }));
    return {
      updatedAt: s?.updated_at ?? s?.updated ?? null,
      failing: list.filter((x) => x && x.ok === false).map((x) => x.name ?? "a data source"),
    };
  } catch {
    return null;
  }
}


export function localEstimate(cell, hectares) {
  const ndvi = Number.isFinite(cell.ndvi) ? cell.ndvi : 0.2;
  const population = Number.isFinite(cell.population) ? cell.population : 0;
  const cooling = (0.5 * hectares * (0.4 + (1 - ndvi))) / (1 + 0.2 * hectares);
  return {
    delta_c: -Number(cooling.toFixed(2)),
    people_benefited: Math.round(population * Math.min(1, hectares / 4) * 0.6),
  };
}

export async function whatIf(cell, hectares) {
  if (USE_MOCK) return localEstimate(cell, hectares);
  const r = await request("/whatif", {
    method: "POST",
    body: { h3_index: cell.h3_index, canopy_ha: hectares },
    timeout: 6000,
  });
  if (!Number.isFinite(r?.delta_c) || !Number.isFinite(r?.people_benefited)) {
    throw new Error("Unexpected /whatif response");
  }
  return r;
}


function clientTop(data, wardIndex, level, n) {
  if (level === "ward") {
    return wardIndex.wards.slice(0, n).map((w) => ({
      id: w.id,
      name: w.names[0] ? `${w.names[0]} (ward ${w.id})` : `Ward ${w.id}`,
      rank: w.rank,
    }));
  }
  return data.features
    .filter((f) => Number.isFinite(f.properties.priority_rank))
    .sort((a, b) => a.properties.priority_rank - b.properties.priority_rank)
    .slice(0, n)
    .map((f) => ({
      id: f.properties.h3_index,
      name: f.properties.area_name ?? (f.properties.ward != null ? `Ward ${f.properties.ward}` : "Unnamed area"),
      rank: f.properties.priority_rank,
    }));
}

export async function getTop(data, wardIndex, level = "cell", n = 10) {
  if (!USE_MOCK) {
    try {
      const r = await request(`/top?level=${level}&n=${n}`, { timeout: 6000 });
      const known =
        level === "ward"
          ? new Set(wardIndex.wards.map((w) => w.id))
          : new Set(data.features.map((f) => f.properties.h3_index));
      const items = (Array.isArray(r) ? r : r?.items ?? []).map((x) => ({
        id: String(x.id ?? x.h3_index ?? x.ward),
        name: x.name ?? x.area_name ?? `Ward ${x.id ?? x.ward}`,
        rank: x.priority_rank ?? x.rank,
      }));
      if (items.length && items.every((x) => known.has(x.id))) return items;
    } catch {
      /* fall through to the browser-side list */
    }
  }
  return clientTop(data, wardIndex, level, n);
}

export const PLAN_HA_PER_CELL = 1;

function clientPlan(data, hectares) {
  const n = Math.max(1, Math.min(data.features.length, Math.floor(hectares / PLAN_HA_PER_CELL)));
  const chosen = data.features
    .filter((f) => Number.isFinite(f.properties.priority_rank))
    .sort((a, b) => a.properties.priority_rank - b.properties.priority_rank)
    .slice(0, n);
  let cooling = 0;
  let people = 0;
  for (const f of chosen) {
    const e = localEstimate(f.properties, PLAN_HA_PER_CELL);
    cooling += Math.abs(e.delta_c);
    people += e.people_benefited;
  }
  return {
    cells: chosen.map((f) => f.properties.h3_index),
    avg_cooling_c: chosen.length ? Number((cooling / chosen.length).toFixed(2)) : 0,
    people_reached: people,
    source: "browser",
  };
}

export async function getPlan(data, hectares) {
  if (!USE_MOCK) {
    try {
      const r = await request("/plan", { method: "POST", body: { hectares }, timeout: 8000 });
      const known = new Set(data.features.map((f) => f.properties.h3_index));
      if (
        Array.isArray(r?.cells) &&
        r.cells.length &&
        r.cells.every((id) => known.has(id)) &&
        Number.isFinite(r.people_reached)
      ) {
        return { ...r, source: "server" };
      }
    } catch {
      /* fall through to the greedy browser plan */
    }
  }
  return clientPlan(data, hectares);
}

export async function getBrief(wardId) {
  const r = await request(`/wards/${encodeURIComponent(wardId)}/brief`, { timeout: 20000 });
  if (typeof r?.text !== "string" || !r.text.trim()) throw new Error("No brief available");
  return r.text;
}