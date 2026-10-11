import { layerGradient, legendEnds } from "../lib/palette";
import ScoreInfo from "./ScoreInfo";
import DemoBadge from "./DemoBadge";

export default function Legend({ data, layer, demo, hiddenOnPhone }) {
    const [left, right] = legendEnds(data, layer);
    return (
        <div
            className={
                "absolute bottom-12 left-4 z-10 w-64 rounded-xl bg-white/90 p-3 text-sm shadow-lg backdrop-blur " +
                (hiddenOnPhone ? "hidden sm:block" : "")
            }
        >
            <p className="mb-1.5 font-medium">{layer.label}</p>
            <div className="h-2.5 rounded-full" style={{ background: layerGradient(layer) }} />
            <div className="mt-1.5 flex justify-between text-muted">
                <span>{left}</span>
                <span>{right}</span>
            </div>
            {demo && <DemoBadge compact className="mt-2" />}
            <div className="mt-2">
                <ScoreInfo />
            </div>
        </div>
    );
}
