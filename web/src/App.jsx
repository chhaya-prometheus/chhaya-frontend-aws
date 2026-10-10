import { useCallback, useEffect, useMemo, useState } from "react";
import MapView from "./components/MapView";
import DetailPanel from "./components/DetailPanel";
import WardPanel from "./components/WardPanel";
import ControlPanel from "./components/ControlPanel";
import Legend from "./components/Legend";
import { getCells, getStatus } from "./lib/api";
import { layerByKey } from "./lib/palette";
import { buildWardIndex, wardOf } from "./lib/wards";

const EMPTY_INDEX = { wards: [], byId: new Map() };
const notice = "absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white px-5 py-4 shadow-lg";

function Spinner() {
  return (
    <div className={notice + " flex items-center gap-3"} role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent" />
      Loading Delhi…
    </div>
  );
}

export default function App() {
  const initial = useMemo(() => new URLSearchParams(window.location.search), []);

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState(null);

  const [selected, setSelected] = useState(initial.get("cell"));
  const [wardId, setWardId] = useState(initial.get("ward"));
  const [layerKey, setLayerKey] = useState("priority");
  const [tab, setTab] = useState("layers");
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    let outdated = false;
    setError(null);
    getCells()
      .then((d) => {
        if (!outdated) setData(d);
      })
      .catch((e) => {
        if (!outdated) setError(e.message);
      });
    return () => {
      outdated = true;
    };
  }, [attempt]);

  useEffect(() => {
    getStatus().then(setStatus);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (selected) setSelected(null);
      else setWardId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selected) params.set("cell", selected);
    if (wardId) params.set("ward", wardId);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, [selected, wardId]);

  const wardIndex = useMemo(() => (data ? buildWardIndex(data) : EMPTY_INDEX), [data]);

  const cell = data?.features.find((f) => f.properties.h3_index === selected)?.properties ?? null;
  const ward = wardId ? wardIndex.byId.get(wardId) ?? null : null;
  const total = data?.features.length ?? 0;
  const layer = layerByKey(layerKey);

  const selectCell = useCallback(
    (id) => {
      setSelected(id);
      if (!id || !data) return;
      const props = data.features.find((f) => f.properties.h3_index === id)?.properties;
      setWardId((current) => (current && props ? wardOf(props) : current));
    },
    [data],
  );

  const selectWard = useCallback((id) => {
    setWardId(id);
    setSelected(null);
  }, []);

  const panelOpen = !!cell || !!ward;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {data && (
        <MapView
          data={data}
          selected={selected}
          ward={ward ? ward.id : null}
          layer={layer}
          planCells={tab === "plan" ? plan?.cells ?? null : null}
          onSelect={selectCell}
        />
      )}

      {data && (
        <ControlPanel
          data={data}
          wardIndex={wardIndex}
          status={status}
          layer={layer}
          onLayer={setLayerKey}
          tab={tab}
          onTab={setTab}
          plan={plan}
          onPlan={setPlan}
          onPickCell={selectCell}
          onPickWard={selectWard}
        />
      )}

      {data && <Legend data={data} layer={layer} hiddenOnPhone={panelOpen} />}

      {!data && !error && <Spinner />}
      {error && (
        <div className={notice + " max-w-sm text-center"} role="alert">
          <p className="text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="mt-3 rounded-lg bg-accent px-4 py-1.5 font-medium text-white"
          >
            Retry
          </button>
        </div>
      )}

      <WardPanel
        ward={cell ? null : ward}
        wardCount={wardIndex.wards.length}
        total={total}
        onClose={() => setWardId(null)}
        onPickCell={selectCell}
      />
      <DetailPanel cell={cell} total={total} onClose={() => setSelected(null)} />
    </div>
  );
}
