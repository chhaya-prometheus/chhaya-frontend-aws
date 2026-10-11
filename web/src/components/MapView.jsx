import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cellTitle } from "../lib/format";
import { colourExpression } from "../lib/palette";
import { wardBounds, wardOf } from "../lib/wards";

const BASEMAP = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const PANEL_SPACE = 460;
const NONE = "__none__";
const WARD_KEY = ["to-string", ["coalesce", ["get", "ward_id"], ["get", "ward"], ""]];

function cityView(city) {
    const b = city?.bbox;
    if (Array.isArray(b) && b.length === 4 && b.every(Number.isFinite)) {
        return { bounds: [[b[0], b[1]], [b[2], b[3]]] };
    }
    return { center: city?.center ?? [78, 22], zoom: city?.zoom ?? 4 };
}

function showCity(map, city, duration) {
    const view = cityView(city);
    if (view.bounds) map.fitBounds(view.bounds, { padding: 40, duration });
    else map.easeTo({ center: view.center, zoom: view.zoom, duration });
}

function padding() {
    if (window.innerWidth > 640) return { top: 80, bottom: 80, left: 80, right: PANEL_SPACE };
    return { top: 140, bottom: Math.round(window.innerHeight * 0.55) + 20, left: 30, right: 30 };
}

export default function MapView({ data, city, selected, ward, layer, planCells, onSelect }) {
    const container = useRef(null);
    const tooltip = useRef(null);
    const mapRef = useRef(null);
    const shown = useRef(null);
    const [ready, setReady] = useState(false);
    const latest = useRef({ data, onSelect, layer, city });
    latest.current = { data, onSelect, layer, city };

    useEffect(() => {
        const view = cityView(latest.current.city);
        const map = new maplibregl.Map({
            container: container.current,
            style: BASEMAP,
            attributionControl: false,
            ...(view.bounds
                ? { bounds: view.bounds, fitBoundsOptions: { padding: 40 } }
                : { center: view.center, zoom: view.zoom }),
        });
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        map.on("error", (e) => console.error("Map error:", e.error));

        map.on("load", () => {
            const { data: d, layer: l } = latest.current;
            const firstLabel = map.getStyle().layers.find((x) => x.type === "symbol")?.id;
            map.addSource("cells", { type: "geojson", data: d });
            shown.current = d;
            map.addLayer(
                { id: "cells-fill", type: "fill", source: "cells", paint: { "fill-opacity": 0.7, "fill-color": colourExpression(d, l) } },
                firstLabel,
            );
            map.addLayer(
                { id: "cells-line", type: "line", source: "cells", paint: { "line-color": "#ffffff", "line-width": 0.5, "line-opacity": 0.6 } },
                firstLabel,
            );
            map.addLayer(
                {
                    id: "plan-fill",
                    type: "fill",
                    source: "cells",
                    filter: ["in", ["get", "h3_index"], ["literal", []]],
                    paint: { "fill-color": "#2563eb", "fill-opacity": 0.45 },
                },
                firstLabel,
            );
            map.addLayer(
                {
                    id: "ward-outline",
                    type: "line",
                    source: "cells",
                    filter: ["==", WARD_KEY, NONE],
                    paint: { "line-color": "#12212b", "line-width": 2.5 },
                },
                firstLabel,
            );
            map.addLayer(
                {
                    id: "cells-selected",
                    type: "line",
                    source: "cells",
                    filter: ["==", ["get", "h3_index"], ""],
                    paint: { "line-color": "#12212b", "line-width": 3 },
                },
                firstLabel,
            );
            setReady(true);
        });

        map.on("click", (e) => {
            if (!map.getLayer("cells-fill")) return;
            const hit = map.queryRenderedFeatures(e.point, { layers: ["cells-fill"] })[0];
            latest.current.onSelect(hit ? hit.properties.h3_index : null);
        });

        const hideTip = () => {
            if (tooltip.current) tooltip.current.style.display = "none";
        };

        map.on("mousemove", (e) => {
            if (!map.getLayer("cells-fill")) return;
            const hit = map.queryRenderedFeatures(e.point, { layers: ["cells-fill"] })[0];
            map.getCanvas().style.cursor = hit ? "pointer" : "";
            const el = tooltip.current;
            if (!el) return;
            if (!hit) {
                hideTip();
                return;
            }
            const p = hit.properties;
            const rank = Number(p.priority_rank);
            el.textContent = Number.isFinite(rank) ? `${cellTitle(p)} · rank ${rank.toLocaleString("en-IN")}` : cellTitle(p);
            el.style.left = `${e.point.x + 14}px`;
            el.style.top = `${e.point.y + 14}px`;
            el.style.display = "block";
        });
        map.getCanvas().addEventListener("mouseleave", hideTip);

        return () => {
            setReady(false);
            map.remove();
        };
    }, []);

    useEffect(() => {
        if (!ready || shown.current === data) return;
        mapRef.current.getSource("cells").setData(data);
        shown.current = data;
    }, [ready, data]);

    useEffect(() => {
        if (!ready) return;
        mapRef.current.setPaintProperty("cells-fill", "fill-color", colourExpression(data, layer));
    }, [ready, layer, data]);

    useEffect(() => {
        if (!ready) return;
        mapRef.current.setFilter("ward-outline", ["==", WARD_KEY, ward ?? NONE]);
    }, [ready, ward]);

    useEffect(() => {
        if (!ready) return;
        mapRef.current.setFilter("plan-fill", ["in", ["get", "h3_index"], ["literal", planCells ?? []]]);
    }, [ready, planCells]);

    useEffect(() => {
        if (!ready) return;
        const map = mapRef.current;
        map.setFilter("cells-selected", ["==", ["get", "h3_index"], selected ?? ""]);
        const feature = data.features.find((f) => f.properties.h3_index === selected);
        if (feature) {
            map.fitBounds(wardBounds([feature]), { padding: padding(), maxZoom: 14.5, duration: 900 });
            return;
        }
        const inWard = ward ? data.features.filter((f) => wardOf(f.properties) === ward) : [];
        if (inWard.length) {
            map.fitBounds(wardBounds(inWard), { padding: padding(), maxZoom: 14, duration: 900 });
        } else {
            showCity(map, city, 900);
        }
    }, [ready, selected, ward, data, city]);

    return (
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
            <div ref={container} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
            <div
                ref={tooltip}
                style={{ display: "none" }}
                className="pointer-events-none absolute z-10 max-w-[16rem] rounded-md bg-ink px-2 py-1 text-xs text-white shadow-lg"
            />
        </div>
    );
}
