import { useState } from "react";

const WEIGHTS = [
    ["Heat", 40],
    ["Population", 25],
    ["Greenery", 20],
    ["Dust", 15],
];

export default function ScoreInfo() {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="text-sm font-medium text-accent hover:underline"
            >
                How is this scored?
            </button>
            {open && (
                <div role="dialog" aria-label="How the score works" className="absolute bottom-full left-0 mb-2 w-72 rounded-xl bg-white p-4 text-sm shadow-xl ring-1 ring-black/5">
                    <p className="font-medium">Priority score weights</p>
                    <ul className="mt-2 space-y-1">
                        {WEIGHTS.map(([label, w]) => (
                            <li key={label} className="flex justify-between">
                                <span>{label}</span>
                                <span className="font-medium">{w}%</span>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-3 text-muted">
                        This is a proxy score, not a measurement. Trees cool the surface; they do not clean the air,
                        so dust is a weighting factor, not a promised outcome.
                    </p>
                    <button type="button" onClick={() => setOpen(false)} className="mt-3 font-medium text-accent hover:underline">
                        Close
                    </button>
                </div>
            )}
        </div>
    );
}
