export const fmt = (v, f = (x) => x) => (Number.isFinite(v) ? f(v) : "n/a");

export const inr = (v) => fmt(v, (x) => Math.round(x).toLocaleString("en-IN"));
