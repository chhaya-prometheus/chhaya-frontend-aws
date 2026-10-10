import { useEffect, useRef, useState } from "react";
import { localEstimate, whatIf } from "../lib/api";
import { fmt, inr } from "../lib/format";
import { bandFor } from "../lib/palette";
import SidePanel from "./SidePanel";
import CopyLink from "./CopyLink";

const DEBOUNCE_MS = 250;

export default function DetailPanel({ cell, total, onClose }) {
    const [hectares, setHectares] = useState(1);
    const [result, setResult] = useState(null);

    const last = useRef(cell);
    if (cell) last.current = cell;
    const c = last.current;

    useEffect(() => {
        if (!cell) return;
        let outdated = false;
        const timer = setTimeout(() => {
            whatIf(cell, hectares)
                .catch(() => localEstimate(cell, hectares))
                .then((r) => {
                    if (!outdated) setResult(r);
                });
        }, DEBOUNCE_MS);
        return () => {
            outdated = true;
            clearTimeout(timer);
        };
    }, [cell, hectares]);

    const band = bandFor(c?.priority_rank, total);

    const facts = c
        ? [
              ["Surface temperature", fmt(c.lst_c, (x) => `${x.toFixed(1)} °C`)],
              ["Greenery", fmt(c.ndvi, (x) => `${Math.round(x * 100)}%`)],
              ["Built up", fmt(c.built_frac, (x) => `${Math.round(x * 100)}%`)],
              ["Dust index", fmt(c.dust_idx, (x) => x.toFixed(2))],
              ["People", inr(c.population)],
              ["Schools", fmt(c.school_count)],
              ...(Number.isFinite(c.aqi) ? [["Air Quality Index", c.aqi]] : []),
          ]
        : [];

    return (
        <SidePanel open={!!cell} accent={band.colour} onClose={onClose}>
            {c && (
                <>
                    <p className="pr-10 text-sm text-muted">{c.area_name ?? c.ward ?? "Area name not available yet"}</p>
                    <p className="mt-3 text-sm font-medium text-muted">Priority rank</p>
                    <p className="text-5xl font-bold tracking-tight">
                        {inr(c.priority_rank)}
                        <span className="ml-2 text-lg font-medium text-muted">of {total.toLocaleString("en-IN")}</span>
                    </p>
                    <p className="mt-2 flex items-center gap-2 font-medium">
                        <span className="inline-block h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: band.colour }} />
                        {band.label}
                    </p>
                    <p className="text-sm text-muted">Rank 1 is the most urgent area in Delhi.</p>
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
                        <label className="block">
                            <span className="mb-1 flex justify-between font-medium">
                                <span>If we add tree canopy</span>
                                <output>
                                    {hectares} hectare{hectares === 1 ? "" : "s"}
                                </output>
                            </span>
                            <input
                                className="w-full accent-accent"
                                type="range" min={0.5} max={5} step={0.5}
                                value={hectares}
                                onChange={(e) => setHectares(Number(e.target.value))}
                            />
                        </label>
                        {result && (
                            <p className="mt-3 rounded-r-lg border-l-4 border-accent bg-wash p-3">
                                About <strong>{Math.abs(result.delta_c).toFixed(2)} °C cooler</strong>, helping{" "}
                                <strong>{inr(result.people_benefited)}</strong> people.
                                <span className="block text-sm text-muted">Model estimate, not a measurement.</span>
                            </p>
                        )}
                    </div>
                </>
            )}
        </SidePanel>
    );
}
