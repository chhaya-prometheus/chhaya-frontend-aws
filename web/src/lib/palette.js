import { fmt } from "./format";

export const RAMP = ["#8c1c2b", "#e0603f", "#f2d675", "#7cc4a1", "#0f6b57"];
export const NO_DATA = "#c9d1d6";

export const BANDS = [
    { upTo: 0.2, label: "Very high priority", colour: RAMP[0] },
    { upTo: 0.4, label: "High priority", colour: RAMP[1] },
    { upTo: 0.6, label: "Moderate priority", colour: RAMP[2] },
    { upTo: 0.8, label: "Low priority", colour: RAMP[3] },
    { upTo: 1.01, label: "Very low priority", colour: RAMP[4] },
];

export const NO_BAND = { label: "Priority not available", colour: NO_DATA };

export function bandFor(rank, total) {
    if (!Number.isFinite(rank)) return NO_BAND;
    return BANDS.find((b) => (rank - 1) / Math.max(total - 1, 1) < b.upTo) ?? NO_BAND;
}

export const GRADIENT = `linear-gradient(90deg, ${RAMP.map((c, i) => `${c} ${i * 25}%`).join(", ")})`;

export const LAYERS = [
    { key: "priority", label: "Priority", prop: "priority_rank", reverse: false, fmt: (v) => `Rank ${Math.round(v).toLocaleString("en-IN")}` },
    { key: "heat", label: "Heat", prop: "lst_c", reverse: true, fmt: (v) => `${v.toFixed(1)} °C` },
    { key: "greenery", label: "Greenery", prop: "ndvi", reverse: false, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: "population", label: "People", prop: "population", reverse: true, fmt: (v) => Math.round(v).toLocaleString("en-IN") },
    { key: "dust", label: "Dust", prop: "dust_idx", reverse: true, fmt: (v) => v.toFixed(2) },
];

export const layerByKey = (key) => LAYERS.find((l) => l.key === key) ?? LAYERS[0];

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))];

export function layerDomain(data, layer) {
    if (layer.key === "priority") return [1, Math.max(data.features.length, 2)];
    const values = data.features
        .map((f) => f.properties[layer.prop])
        .filter((v) => Number.isFinite(v))
        .sort((a, b) => a - b);
    if (!values.length) return [0, 1];
    const lo = percentile(values, 0.02);
    let hi = percentile(values, 0.98);
    if (hi <= lo) hi = lo + 1e-6;
    return [lo, hi];
}

export function layerColours(layer) {
    return layer.reverse ? [...RAMP].reverse() : RAMP;
}

export function layerGradient(layer) {
    const colours = layerColours(layer);
    return `linear-gradient(90deg, ${colours.map((c, i) => `${c} ${i * 25}%`).join(", ")})`;
}

export function colourExpression(data, layer) {
    const [lo, hi] = layerDomain(data, layer);
    const colours = layerColours(layer);
    const stops = colours.flatMap((colour, i) => [lo + (i / (colours.length - 1)) * (hi - lo), colour]);
    const value = ["get", layer.prop];
    return [
        "case",
        ["==", ["typeof", value], "number"],
        ["interpolate", ["linear"], value, ...stops],
        NO_DATA,
    ];
}

export const legendEnds = (data, layer) => {
    if (layer.key === "priority") return ["Rank 1, most urgent", `Rank ${data.features.length.toLocaleString("en-IN")}`];
    const [lo, hi] = layerDomain(data, layer);
    return [fmt(lo, layer.fmt), fmt(hi, layer.fmt)];
};
