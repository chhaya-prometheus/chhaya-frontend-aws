import { useEffect, useState } from "react";
import { getTop } from "../lib/api";

export default function TopList({ citySlug, data, wardIndex, hasWards, onPickCell, onPickWard }) {
    const [level, setLevel] = useState("cell");
    const [items, setItems] = useState(null);

    const wardsReady = hasWards && wardIndex.wards.length > 0;
    const active = level === "ward" && wardsReady ? "ward" : "cell";

    useEffect(() => {
        let outdated = false;
        getTop(citySlug, data, wardIndex, active, 10).then((r) => {
            if (!outdated) setItems(r);
        });
        return () => {
            outdated = true;
        };
    }, [citySlug, data, wardIndex, active]);

    const tab = (key, label, disabled) => (
        <button
            type="button"
            disabled={disabled}
            onClick={() => {
                setItems(null);
                setLevel(key);
            }}
            className={
                "flex-1 rounded-lg px-2 py-1 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 " +
                (active === key ? "bg-ink text-white" : "hover:bg-wash")
            }
        >
            {label}
        </button>
    );

    return (
        <div>
            <p className="mb-2 font-medium">Start here: the 10 most urgent</p>
            {hasWards && (
                <div className="mb-2 flex gap-1 rounded-xl border border-line p-1">
                    {tab("cell", "Hexes", false)}
                    {tab("ward", "Wards", !wardsReady)}
                </div>
            )}
            {hasWards && !wardsReady && <p className="mb-2 text-sm text-muted">Ward data is not available yet.</p>}
            {items === null && <p className="text-sm text-muted">Loading…</p>}
            <ol className="max-h-64 space-y-0.5 overflow-y-auto">
                {items?.map((it, i) => (
                    <li key={it.id}>
                        <button
                            type="button"
                            onClick={() => (active === "ward" ? onPickWard(it.id) : onPickCell(it.id))}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-wash"
                        >
                            <span className="w-5 text-muted">{i + 1}</span>
                            <span className="flex-1 truncate">{it.name}</span>
                            {Number.isFinite(it.rank) && <span className="text-sm text-muted">#{it.rank}</span>}
                        </button>
                    </li>
                ))}
            </ol>
        </div>
    );
}
