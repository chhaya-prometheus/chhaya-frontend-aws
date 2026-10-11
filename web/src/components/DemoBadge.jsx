export default function DemoBadge({ compact = false, className = "" }) {
    return (
        <div className={className}>
            <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-300">
                Demo data (synthetic)
            </span>
            {!compact && <p className="mt-1 text-xs text-muted">Illustrative values for a demo city, not real findings.</p>}
        </div>
    );
}
