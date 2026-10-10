import { useRef } from "react";

export default function SidePanel({ open, accent, onClose, children }) {
    const last = useRef(children);
    if (open) last.current = children;

    return (
        <aside
            aria-hidden={!open}
            className={
                "fixed inset-x-0 bottom-0 z-20 h-[55vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ease-out " +
                "sm:inset-x-auto sm:right-0 sm:top-0 sm:h-full sm:w-[380px] sm:rounded-none " +
                (open
                    ? "translate-y-0 sm:translate-x-0"
                    : "pointer-events-none translate-y-full sm:translate-y-0 sm:translate-x-full")
            }
        >
            <div className="h-1.5" style={{ background: accent }} />
            <div className="relative p-6">
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute right-4 top-3 rounded-full px-3 py-1 text-2xl leading-none text-muted hover:bg-wash"
                >
                    ×
                </button>
                {last.current}
            </div>
        </aside>
    );
}
