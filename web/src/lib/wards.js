export function wardOf(props) {
  const v = props.ward_id ?? props.ward;
  return v == null || v === "" ? null : String(v);
}

function wardNameOf(props) {
  if (props.ward == null || props.ward === "") return null;
  return props.ward_id != null || Number.isNaN(Number(props.ward)) ? String(props.ward) : null;
}

const finiteValues = (features, prop) => features.map((f) => f.properties[prop]).filter((v) => Number.isFinite(v));
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const sum = (a) => a.reduce((s, x) => s + x, 0);

export function buildWardIndex(data) {
  const groups = new Map();
  for (const f of data.features) {
    const id = wardOf(f.properties);
    if (id == null) continue;
    if (!groups.has(id)) groups.set(id, { id, name: null, features: [] });
    const g = groups.get(id);
    g.features.push(f);
    g.name ??= wardNameOf(f.properties);
  }

  const all = data.features;
  const city = {
    ndvi: mean(finiteValues(all, "ndvi")),
    lst: mean(finiteValues(all, "lst_c")),
    pop: mean(finiteValues(all, "population")),
  };

  const wards = [...groups.values()].map((g) => {
    const ndvi = mean(finiteValues(g.features, "ndvi"));
    const lst = mean(finiteValues(g.features, "lst_c"));
    const pop = mean(finiteValues(g.features, "population"));
    return {
      id: g.id,
      name: g.name,
      features: g.features,
      cells: g.features.length,
      people: sum(finiteValues(g.features, "population")),
      ndvi,
      lst,
      schools: sum(finiteValues(g.features, "school_count")),
      meanRank: mean(finiteValues(g.features, "priority_rank")),
      reason: reasonFor({ ndvi, lst, pop }, city),
      worst: [...g.features]
        .filter((f) => Number.isFinite(f.properties.priority_rank))
        .sort((a, b) => a.properties.priority_rank - b.properties.priority_rank)
        .slice(0, 5),
    };
  });

  wards.sort((a, b) => (a.meanRank ?? Infinity) - (b.meanRank ?? Infinity));
  wards.forEach((w, i) => {
    w.rank = i + 1;
  });

  return { wards, byId: new Map(wards.map((w) => [w.id, w])) };
}

function reasonFor(w, city) {
  const candidates = [];
  if (w.lst != null && city.lst) candidates.push(["high surface heat", (w.lst - city.lst) / city.lst]);
  if (w.ndvi != null && city.ndvi) candidates.push(["low greenery", (city.ndvi - w.ndvi) / Math.max(city.ndvi, 0.05)]);
  if (w.pop != null && city.pop) candidates.push(["a dense population", (w.pop - city.pop) / city.pop]);
  candidates.sort((a, b) => b[1] - a[1]);
  return candidates.length && candidates[0][1] > 0.05 ? candidates[0][0] : null;
}

export function searchWards(index, query, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return index.wards
    .filter((w) => (w.name ?? "").toLowerCase().includes(q) || w.id.toLowerCase().includes(q))
    .slice(0, limit);
}

export function wardLabel(w) {
  if (w.name) return w.name;
  return /^\d+$/.test(w.id) ? `Ward ${w.id}` : w.id;
}

export function wardBounds(features) {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const f of features) {
    for (const [lng, lat] of f.geometry.coordinates[0]) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return [[minLng, minLat], [maxLng, maxLat]];
}
