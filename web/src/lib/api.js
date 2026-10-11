import { cellTitle } from "./format";
import { wardLabel } from "./wards";

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
const BASE = import.meta.env.VITE_API_URL ?? "/api";

const LEGACY_CITY = {
  slug: "delhi",
  name: "Delhi",
  bbox: [76.83, 28.4, 77.35, 28.88],
  center: [77.1, 28.64],
  zoom: 10,
  data_mode: "real",
  has_wards: false,
};

let legacy = false;

const route = (slug, path) => (legacy ? path : `/cities/${encodeURIComponent(slug)}${path}`);

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

async function readMock(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Could not load ${path} (status ${res.status})`);
  return res.json();
}

function validCities(list) {
  const cities = Array.isArray(list) ? list.filter((c) => c && typeof c.slug === "string" && c.slug) : [];
  if (!cities.length) throw new Error("No cities available");
  return cities.map((c) => ({ ...c, name: c.name || c.slug, has_wards: c.has_wards === true }));
}

export async function getCities() {
  if (USE_MOCK) return validCities(await readMock("/mock/cities.json"));
  try {
    const cities = validCities(await request("/cities", { timeout: 10000 }));
    legacy = false;
    return cities;
  } catch {
    legacy = true;
    return [LEGACY_CITY];
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

export async function getCells(slug) {
  let data;
  if (USE_MOCK) {
    data = await readMock(`/mock/${slug}_cells.geojson`);
  } else {
    try {
      data = await request(route(slug, "/cells"), { timeout: 30000 });
    } catch (e) {
      throw new Error(`Could not load the map data. ${e.message}`);
    }
  }
  if (!Array.isArray(data?.features)) throw new Error("Could not load the map data. Unexpected response.");
  return withRank(data);
}

export async function getStatus(slug) {
  if (USE_MOCK) return null;
  try {
    const s = await request(route(slug, "/status"), { timeout: 8000 });
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

export async function whatIf(slug, cell, hectares) {
  if (USE_MOCK) return localEstimate(cell, hectares);
  const r = await request(route(slug, "/whatif"), {
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
    return wardIndex.wards.slice(0, n).map((w) => ({ id: w.id, name: wardLabel(w), rank: w.rank }));
  }
  return data.features
    .filter((f) => Number.isFinite(f.properties.priority_rank))
    .sort((a, b) => a.properties.priority_rank - b.properties.priority_rank)
    .slice(0, n)
    .map((f) => ({ id: f.properties.h3_index, name: cellTitle(f.properties), rank: f.properties.priority_rank }));
}

export async function getTop(slug, data, wardIndex, level = "cell", n = 10) {
  if (!USE_MOCK) {
    try {
      const r = await request(route(slug, `/top?level=${level}&n=${n}`), { timeout: 6000 });
      const cells = new Map(data.features.map((f) => [f.properties.h3_index, f.properties]));
      const known = level === "ward" ? wardIndex.byId : cells;
      const items = (Array.isArray(r) ? r : r?.items ?? []).map((x) => {
        const id = String(x.id ?? x.h3_index ?? x.ward_id ?? x.ward);
        const ward = wardIndex.byId.get(id);
        const name = level === "ward" ? (ward ? wardLabel(ward) : x.name ?? id) : cellTitle(cells.get(id) ?? { h3_index: id });
        return { id, name, rank: x.priority_rank ?? x.ward_rank ?? x.rank };
      });
      if (items.length && items.every((x) => known.has(x.id))) return items;
    } catch (e) {
      console.warn("Using the browser-side top list:", e.message);
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

export async function getPlan(slug, data, hectares) {
  if (!USE_MOCK) {
    try {
      const r = await request(route(slug, "/plan"), { method: "POST", body: { hectares }, timeout: 8000 });
      const known = new Set(data.features.map((f) => f.properties.h3_index));
      if (
        Array.isArray(r?.cells) &&
        r.cells.length &&
        r.cells.every((id) => known.has(id)) &&
        Number.isFinite(r.people_reached) &&
        Number.isFinite(r.avg_cooling_c)
      ) {
        return { ...r, source: "server" };
      }
    } catch (e) {
      console.warn("Using the browser-side plan:", e.message);
    }
  }
  return clientPlan(data, hectares);
}

export async function getBrief(slug, wardId) {
  const r = await request(route(slug, `/wards/${encodeURIComponent(wardId)}/brief`), { timeout: 20000 });
  if (typeof r?.text !== "string" || !r.text.trim()) throw new Error("No brief available");
  return r.text;
}
