import { useState } from "react";
import { GRADIENT, LAYERS } from "../lib/palette";
import { searchWards, wardLabel } from "../lib/wards";
import TopList from "./TopList";
import PlannerPanel from "./PlannerPanel";

const TABS = [
    ["layers", "Layers"],
    ["top", "Top 10"],
    ["plan", "Plan"],
];

function StatusBadge({ status }) {
    if (!status?.updatedAt && !status?.failing?.length) return null;
    const date = status.updatedAt ? new Date(status.updatedAt) : null;
    const label = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;
    return (
        <div className="px-4 pb-2 text-xs text-muted">
            {label && <p>Data updated {label}</p>}
            {status.failing.length > 0 && (
                <p className="mt-1 rounded bg-amber-100 px-2 py-1 text-amber-900">
                    Some data may be out of date: {status.failing.join(", ")}.
                </p>
            )}
        </div>
    );
}

function WardSearch({ wardIndex, onPickWard }) {
    const [query, setQuery] = useState("");
    const results = searchWards(wardIndex, query);
    const disabled = wardIndex.wards.length === 0;

    return (
        <div className="relative px-4 pb-3">
            <input
                type="search"
                value={query}
                disabled={disabled}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={disabled ? "Ward search not available yet" : "Search a ward or area"}
                aria-label="Search a ward or area"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 disabled:bg-wash disabled:text-muted"
            />
            {query.trim() && (
                <ul className="absolute left-4 right-4 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-lg bg-white shadow-xl ring-1 ring-black/5">
                    {results.length === 0 && <li className="px-3 py-2 text-sm text-muted">No ward or area matches.</li>}
                    {results.map((w) => (
                        <li key={w.id}>
                            <button
                                type="button"
                                onClick={() => {
                                    onPickWard(w.id);
                                    setQuery("");
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-wash"
                            >
                                {wardLabel(w)}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function ControlPanel({
    data, wardIndex, status, layer, onLayer, tab, onTab, plan, onPlan, onPickCell, onPickWard,
}) {
    const [open, setOpen] = useState(() => window.innerWidth > 640);

    return (
        <div className="absolute left-4 top-4 z-10 w-[min(22rem,calc(100vw-5rem))] rounded-xl bg-white/90 shadow-lg backdrop-blur">
            <div className="overflow-hidden rounded-t-xl">
                <div className="flex items-start justify-between gap-2 px-4 py-3">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Chhaya</h1>
                        <p className="text-sm text-muted">Where in Delhi should trees go first?</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setOpen((o) => !o)}
                        aria-expanded={open}
                        className="rounded-lg border border-line px-2 py-1 text-sm font-medium hover:bg-wash"
                    >
                        {open ? "Hide" : "Explore"}
                    </button>
                </div>
                <div className="h-1" style={{ background: GRADIENT }} />
            </div>

            {open && (
                <>
                    <StatusBadge status={status} />
                    <div className="pt-1" />
                    <WardSearch wardIndex={wardIndex} onPickWard={onPickWard} />

                    <div className="mx-4 mb-3 flex gap-1 rounded-xl border border-line p-1">
                        {TABS.map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => onTab(key)}
                                className={
                                    "flex-1 rounded-lg px-2 py-1 text-sm font-medium " +
                                    (tab === key ? "bg-ink text-white" : "hover:bg-wash")
                                }
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="max-h-[45vh] overflow-y-auto px-4 pb-4">
                        {tab === "layers" && (
                            <div>
                                <p className="mb-2 font-medium">Colour the map by</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {LAYERS.map((l) => (
                                        <button
                                            key={l.key}
                                            type="button"
                                            onClick={() => onLayer(l.key)}
                                            aria-pressed={layer.key === l.key}
                                            className={
                                                "rounded-full border px-3 py-1 text-sm font-medium " +
                                                (layer.key === l.key ? "border-ink bg-ink text-white" : "border-line hover:bg-wash")
                                            }
                                        >
                                            {l.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {tab === "top" && (
                            <TopList data={data} wardIndex={wardIndex} onPickCell={onPickCell} onPickWard={onPickWard} />
                        )}
                        {tab === "plan" && <PlannerPanel data={data} plan={plan} onPlan={onPlan} />}
                    </div>
                </>
            )}
        </div>
    );
}
