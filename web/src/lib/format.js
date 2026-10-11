export const fmt = (v, f = (x) => x) => (Number.isFinite(v) ? f(v) : "n/a");

export const inr = (v) => fmt(v, (x) => Math.round(x).toLocaleString("en-IN"));

export function cellTitle(p) {
  const name = p?.area_name || p?.ward;
  if (name) return String(name);
  const id = String(p?.h3_index ?? "").replace(/f+$/i, "");
  return `Cell ${id.slice(-4)}`;
}