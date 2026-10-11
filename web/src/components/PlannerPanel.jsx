import { useState } from "react";
import { PLAN_HA_PER_CELL, getPlan } from "../lib/api";
import { inr } from "../lib/format";

export default function PlannerPanel({ citySlug, data, plan, onPlan }) {
    const [hectares, setHectares] = useState(50);
    const [busy, setBusy] = useState(false);

    const max = data.features.length * PLAN_HA_PER_CELL;
    const valid = Number.isFinite(hectares) && hectares >= PLAN_HA_PER_CELL && hectares <= max;

    async function run(e) {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        onPlan(await getPlan(citySlug, data, hectares));
        setBusy(false);
    }

    return (
        <form onSubmit={run}>
            <p className="font-medium">Planting planner</p>
            <p className="mb-2 text-sm text-muted">
                Enter how much land you can plant. We pick the most urgent hexes first, one hectare each.
            </p>
            <label className="flex items-center gap-2">
                <input
                    type="number"
                    min={PLAN_HA_PER_CELL}
                    max={max}
                    value={Number.isFinite(hectares) ? hectares : ""}
                    onChange={(e) => setHectares(e.target.value === "" ? NaN : Number(e.target.value))}
                    className="w-24 rounded-lg border border-line px-2 py-1.5"
                    aria-label="Hectares to plant"
                />
                <span className="text-muted">hectares</span>
            </label>
            {!valid && <p className="mt-1 text-sm text-red-700">Enter a number from {PLAN_HA_PER_CELL} to {max.toLocaleString("en-IN")}.</p>}
            <div className="mt-3 flex gap-2">
                <button
                    type="submit"
                    disabled={!valid || busy}
                    className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                    {busy ? "Planning…" : "Show where to plant"}
                </button>
                {plan && (
                    <button type="button" onClick={() => onPlan(null)} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-wash">
                        Clear
                    </button>
                )}
            </div>
            {plan && (
                <p className="mt-3 rounded-r-lg border-l-4 border-accent bg-wash p-3 text-sm">
                    <strong>{plan.cells.length.toLocaleString("en-IN")}</strong> hexes highlighted in blue. About{" "}
                    <strong>{plan.avg_cooling_c.toFixed(2)} °C cooler</strong> on average in each, reaching{" "}
                    <strong>{inr(plan.people_reached)}</strong> people.
                    <span className="block text-muted">Model estimate, not a measurement.</span>
                </p>
            )}
        </form>
    );
}
