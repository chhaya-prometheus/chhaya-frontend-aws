import { useEffect, useRef, useState } from "react";
import { getBrief } from "../lib/api";
import { fmt, inr } from "../lib/format";
import { bandFor } from "../lib/palette";
import { wardLabel } from "../lib/wards";
import SidePanel from "./SidePanel";
import CopyLink from "./CopyLink";

export default function WardPanel({ ward, wardCount, total, onClose, onPickCell }) {
    const last = useRef(ward);
    if (ward) last.current = ward;
    const w = last.current;

    const [brief, setBrief] = useState({ state: "idle", text: "" });

    useEffect(() => {
        setBrief({ state: "idle", text: "" });
    }, [w?.id]);

    async function loadBrief() {
        setBrief({ state: "loading", text: "" });
        try {
            setBrief({ state: "done", text: await getBrief(w.id) });
        } catch {
            setBrief({ state: "error", text: "" });
        }
    }

    const band = bandFor(w?.meanRank ? Math.round(w.meanRank) : null, total);

    const facts = w
        ? [
            ["Hexes in this ward", w.cells.toLocaleString("en-IN")],
            ["People", inr(w.people)],
            ["Mean greenery", fmt(w.ndvi, (x) => `${Math.round(x * 100)}%`)],
            ["Mean surface temperature", fmt(w.lst, (x) => `${x.toFixed(1)} °C`)],
            ["Schools", inr(w.schools)],
        ]
        : [];

    return (
        <SidePanel open={!!ward} accent={band.colour} onClose={onClose}>
            {w && (
                <>
                    <p className="pr-10 text-sm text-muted">Ward</p>
                    <h2 className="text-2xl font-bold tracking-tight">{wardLabel(w)}</h2>

                    <p className="mt-4 text-sm font-medium text-muted">Ward ranking</p>
                    <p className="text-4xl font-bold tracking-tight">
                        {w.rank}
                        <span className="ml-2 text-lg font-medium text-muted">of {wardCount}</span>
                    </p>
                    <p className="text-sm text-muted">
                        {w.reason ? `Main reason: ${w.reason}.` : "No single factor stands out against the city average."}
                    </p>
                    <div className="mt-2">
                        <CopyLink />
                    </div>

                    <dl className="mt-6 grid grid-cols-[1fr_auto] gap-x-3 gap-y-2.5 border-t border-line pt-4">
                        {facts.map(([label, value]) => (
                            <div key={label} className="contents">
                                <dt className="text-muted">{label}</dt>
                                <dd className="text-right font-medium">{value}</dd>
                            </div>
                        ))}
                    </dl>

                    <div className="mt-6 border-t border-line pt-4">
                        <p className="mb-2 font-medium">Most urgent hexes here</p>
                        <ul className="space-y-1">
                            {w.worst.map((f) => (
                                <li key={f.properties.h3_index}>
                                    <button
                                        type="button"
                                        onClick={() => onPickCell(f.properties.h3_index)}
                                        className="flex w-full justify-between rounded-lg px-2 py-1.5 text-left hover:bg-wash"
                                    >
                                        <span>{f.properties.area_name ?? "Hex"}</span>
                                        <span className="text-muted">Rank {inr(f.properties.priority_rank)}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="mt-6 border-t border-line pt-4">
                        {brief.state === "idle" && (
                            <button
                                type="button"
                                onClick={loadBrief}
                                className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-wash"
                            >
                                Generate ward brief
                            </button>
                        )}
                        {brief.state === "loading" && <p className="text-sm text-muted">Writing the brief…</p>}
                        {brief.state === "error" && (
                            <p className="text-sm text-muted">
                                The brief is not available right now.{" "}
                                <button type="button" onClick={loadBrief} className="font-medium text-accent hover:underline">
                                    Try again
                                </button>
                            </p>
                        )}
                        {brief.state === "done" && (
                            <div className="rounded-r-lg border-l-4 border-accent bg-wash p-3">
                                <p className="whitespace-pre-line">{brief.text}</p>
                                <p className="mt-2 text-sm text-muted">AI-generated, check against data.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </SidePanel>
    );
}
