// src/pages/DemoMapDebug.tsx
import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ────────────────────────── segmented logger (no key ever logged) ───────────────────────── */
const STYLE = {
  base: "padding:2px 6px;border-radius:6px;font-weight:600;",
  tag: "background:#111827;color:#fff;",
  ok: "background:#10b981;color:#052e22;",
  info: "background:#3b82f6;color:#0b254e;",
  warn: "background:#f59e0b;color:#4a2a00;",
  err: "background:#ef4444;color:#3b0606;",
};
function mk(ns: string) {
  const tag = `%c${ns}`,
    tagStyle = `${STYLE.base}${STYLE.tag}`;
  const tone = (lvl: "log" | "info" | "warn" | "error") =>
    lvl === "log" ? "ok" : lvl === "error" ? "err" : lvl;
  const fx = (
    lvl: "log" | "info" | "warn" | "error",
    label: string,
    ...rest: any[]
  ) =>
    console[lvl](
      `${tag} %c${label}`,
      tagStyle,
      `${STYLE.base}${STYLE[tone(lvl)]}`,
      ...rest,
    );
  return {
    seg: (s: string) =>
      console.log(`\n────────── ${ns} • ${s.toUpperCase()} ──────────`),
    log: (...r: any[]) => fx("log", "LOG", ...r),
    info: (...r: any[]) => fx("info", "INFO", ...r),
    warn: (...r: any[]) => fx("warn", "WARN", ...r),
    error: (...r: any[]) => fx("error", "ERROR", ...r),
  };
}
const dbg = mk("DemoMapDebug");

/* ───────────────────────── leaflet marker fix ──────────────────────────── */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

/* ─────────────────────────── key retrieval (never displayed/logged) ─────────────────────── */
async function getMaptilerKey(): Promise<string> {
  try {
    const res = await fetch("/api/config/maptiler");
    if (res.ok) {
      const j = await res.json();
      if (j?.apiKey) {
        dbg.info("Key loaded from /api/config/maptiler"); // key value NOT logged
        return j.apiKey as string;
      }
    } else {
      dbg.warn("Key endpoint non-200:", res.status);
    }
  } catch (e) {
    dbg.error("Key fetch failed:", e);
  }
  // Optional Vite env fallback (still never shown)
  // @ts-ignore
  const viteKey = import.meta?.env?.VITE_MAPTILER_KEY || "";
  if (viteKey) dbg.info("Using VITE_MAPTILER_KEY env");
  return viteKey;
}

/* ───────────────────────── size invalidation helper ────────────────────── */
function InvalidateOnce({ delay = 80 }: { delay?: number }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), delay);
    return () => clearTimeout(t);
  }, [map, delay]);
  return null;
}

/* ─────────────────────────── react-leaflet map (left) ──────────────────── */
function ReactLeafletMap({
  apiKey,
  styleId,
  mode,
  center,
  zoom,
  onHead,
  onCounts,
  onCsp,
}: {
  apiKey: string;
  styleId: "streets-v2" | "basic-v2" | "topo-v2";
  mode: "path256" | "mode512";
  center: [number, number];
  zoom: number;
  onHead: (r: {
    status?: number;
    type?: string | null;
    len?: string | null;
  }) => void;
  onCounts: (r: { loads: number; errors: number }) => void;
  onCsp: (msg?: string) => void;
}) {
  const url = useMemo(() => {
    return mode === "path256"
      ? `https://api.maptiler.com/maps/${styleId}/256/{z}/{x}/{y}.png?key=${apiKey}`
      : `https://api.maptiler.com/maps/${styleId}/{z}/{x}/{y}.png?key=${apiKey}`;
  }, [apiKey, styleId, mode]);

  // HEAD probe (do NOT log the full URL / key)
  useEffect(() => {
    dbg.seg("REACT HEAD PROBE");
    const sample = url
      .replace("{z}", "11")
      .replace("{x}", "453")
      .replace("{y}", "872");
    fetch(sample, { method: "HEAD" })
      .then((r) =>
        onHead({
          status: r.status,
          type: r.headers.get("content-type"),
          len: r.headers.get("content-length"),
        }),
      )
      .catch(() => onHead({}));
  }, [url, onHead]);

  // CSP listener
  useEffect(() => {
    const handler = (e: any) => {
      if (e?.blockedURI?.includes("api.maptiler.com")) {
        dbg.error("CSP violation", {
          directive: e.violatedDirective,
          uri: e.blockedURI,
        });
        onCsp(`${e.violatedDirective} • ${e.blockedURI}`);
      }
    };
    window.addEventListener("securitypolicyviolation", handler);
    return () => window.removeEventListener("securitypolicyviolation", handler);
  }, [onCsp]);

  const layerOpts: L.TileLayerOptions =
    mode === "path256"
      ? { maxZoom: 19, crossOrigin: true }
      : { tileSize: 512, zoomOffset: -1, maxZoom: 19, crossOrigin: true };

  const [loads, setLoads] = useState(0);
  const [errors, setErrors] = useState(0);
  useEffect(() => onCounts({ loads, errors }), [loads, errors, onCounts]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
      whenReady={() => {
        dbg.seg("REACT MAP READY");
        setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
      }}
      className="rounded-lg"
    >
      <InvalidateOnce />
      <TileLayer
        url={url}
        {...layerOpts}
        attribution='&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        eventHandlers={{
          load: () => {
            setLoads((v) => v + 1);
            dbg.log("React tiles loaded");
          },
          tileerror: () => {
            setErrors((v) => v + 1);
            dbg.error("React tileerror", "(src hidden)");
          },
        }}
      />
      <Marker position={center}>
        <Popup>
          React + Leaflet
          <br />
          <small>
            style: <b>{styleId}</b> •{" "}
            {mode === "path256" ? "256 path" : "512 mode"}
          </small>
        </Popup>
      </Marker>
    </MapContainer>
  );
}

/* ─────────────────────────── iframe HTML builder (right) ─────────────────
             Full-map view inside iframe; tiny floating chip shows status.
             Key is never rendered or logged in text (only used by the browser). */
function buildIframeHTML(params: {
  apiKey: string;
  styleId: "streets-v2" | "basic-v2" | "topo-v2";
  mode: "path256" | "mode512";
  center: [number, number];
  zoom: number;
}) {
  const { apiKey, styleId, mode, center, zoom } = params;
  const tileUrl =
    mode === "path256"
      ? `https://api.maptiler.com/maps/${styleId}/256/{z}/{x}/{y}.png?key=${apiKey}`
      : `https://api.maptiler.com/maps/${styleId}/{z}/{x}/{y}.png?key=${apiKey}`;
  const sample = tileUrl
    .replace("{z}", "11")
    .replace("{x}", "453")
    .replace("{y}", "872");

  return `<!DOCTYPE html>
          <html>
          <head>
          <meta charset="utf-8" />
          <meta name="referrer" content="strict-origin-when-cross-origin" />
          <title>HTML MapTiler Debug (Key Hidden)</title>
          <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
          <style>
            html, body, #map { height:100%; width:100%; margin:0; }
            #chip {
              position:absolute; z-index:9999; top:12px; left:12px;
              background:#111827; color:#e5e7eb; font: 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Inter, sans-serif;
              padding:8px 10px; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,.3);
            }
            #chip code { background:#1f2937; padding:2px 6px; border-radius:6px; }
          </style>
          </head>
          <body>
            <div id="map"></div>
            <div id="chip">
              HTML Leaflet • <b>${styleId}</b> • <b>${mode === "path256" ? "256 path" : "512 mode"}</b><br/>
              Head: <span id="head">…</span> • Tile errors: <b id="errs">0</b>
            </div>

            <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
            <script>
              const headSpan = document.getElementById('head');
              const errsSpan = document.getElementById('errs');
              let errs = 0;

              // HEAD probe — result only, URL/key never printed
              fetch(${JSON.stringify(sample)}, { method: 'HEAD' })
                .then(r => headSpan.textContent = r.status + ' • ' + (r.headers.get('content-type')||'?') + ' • ' + (r.headers.get('content-length')||'?'))
                .catch(() => headSpan.textContent = 'HEAD failed');

              const map = L.map('map').setView([${center[0]}, ${center[1]}], ${zoom});
              const opts = ${JSON.stringify(
                mode === "path256"
                  ? { maxZoom: 19 }
                  : { tileSize: 512, zoomOffset: -1, maxZoom: 19 },
              )};
              const tl = L.tileLayer(${JSON.stringify(tileUrl)}, opts);
              tl.on('tileerror', () => { errs++; errsSpan.textContent = String(errs); });
              tl.addTo(map);

              L.marker([${center[0]}, ${center[1]}]).addTo(map)
                .bindPopup("HTML + Leaflet<br/><small>${styleId} • ${mode === "path256" ? "256 path" : "512 mode"}</small>")
                .openPopup();

              // CSP visibility inside iframe
              window.addEventListener('securitypolicyviolation', function(e){
                headSpan.textContent = 'CSP ' + e.violatedDirective;
              });
            </script>
          </body>
          </html>`;
}

/* ─────────────────────────────── main page ─────────────────────────────── */
export default function DemoMapDebug() {
  const [apiKey, setApiKey] = useState("");
  const [styleId, setStyleId] = useState<"streets-v2" | "basic-v2" | "topo-v2">(
    "streets-v2",
  );
  const [mode, setMode] = useState<"path256" | "mode512">("path256");

  const [reactHead, setReactHead] = useState<{
    status?: number;
    type?: string | null;
    len?: string | null;
  }>({});
  const [reactLoads, setReactLoads] = useState(0);
  const [reactErrs, setReactErrs] = useState(0);
  const [cspMsg, setCspMsg] = useState<string | undefined>(undefined);

  const center: [number, number] = [25.6866, -100.3161];
  const zoom = 11;

  useEffect(() => {
    // Ensure a referrer policy is present
    const meta = document.querySelector(
      'meta[name="referrer"]',
    ) as HTMLMetaElement | null;
    if (!meta) {
      const m = document.createElement("meta");
      m.setAttribute("name", "referrer");
      m.setAttribute("content", "strict-origin-when-cross-origin");
      document.head.appendChild(m);
      dbg.warn(
        "Injected <meta name='referrer' content='strict-origin-when-cross-origin'>",
      );
    }
    dbg.seg("ENV");
    dbg.info("origin:", window.location.origin);
  }, []);

  useEffect(() => {
    getMaptilerKey().then((k) => setApiKey(k || ""));
  }, []);

  return (
    <div
      className="p-4 space-y-4"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Controls (no key shown) */}
      <div className="flex flex-wrap items-end gap-3 bg-white/70 dark:bg-slate-800/40 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
        <div>
          <div className="text-xs text-gray-500">Style</div>
          <select
            value={styleId}
            onChange={(e) => setStyleId(e.target.value as any)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="streets-v2">streets-v2</option>
            <option value="basic-v2">basic-v2</option>
            <option value="topo-v2">topo-v2</option>
          </select>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mode === "path256"}
            onChange={(e) => setMode(e.target.checked ? "path256" : "mode512")}
          />
          Use 256 path (unchecked = 512 mode)
        </label>
        {!apiKey && (
          <div className="text-xs text-red-600">
            No MapTiler key found. Add <code>VITE_MAPTILER_KEY</code> or enable{" "}
            <code>/api/config/maptiler</code>.
          </div>
        )}
      </div>

      {/* Side-by-side maps */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        style={{ height: "70vh" }}
      >
        {/* Left: React + react-leaflet */}
        <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <div style={{ position: "absolute", inset: 0 }}>
            {apiKey ? (
              <ReactLeafletMap
                apiKey={apiKey}
                styleId={styleId}
                mode={mode}
                center={center}
                zoom={zoom}
                onHead={setReactHead}
                onCounts={({ loads, errors }) => {
                  setReactLoads(loads);
                  setReactErrs(errors);
                }}
                onCsp={(msg) => setCspMsg(msg)}
              />
            ) : (
              <div className="h-full w-full grid place-items-center text-sm text-gray-600 dark:text-gray-300">
                Waiting for API key…
              </div>
            )}
          </div>
          {/* Overlay (no key, no raw URL) */}
          <div
            style={{
              position: "absolute",
              zIndex: 1000,
              top: 12,
              left: 12,
              background: "#111827",
              color: "#e5e7eb",
              padding: "10px 12px",
              borderRadius: 10,
              fontSize: 12,
              lineHeight: 1.25,
              maxWidth: 460,
              boxShadow: "0 3px 10px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              React + react-leaflet • Debug
            </div>
            <div>
              Origin: <b>{window.location.origin}</b>
            </div>
            <div>
              Referrer-Policy:{" "}
              <b>
                {(
                  document.querySelector(
                    'meta[name="referrer"]',
                  ) as HTMLMetaElement | null
                )?.content || "(default)"}
              </b>
            </div>
            <div>
              Style/Mode:{" "}
              <b>
                {styleId} • {mode === "path256" ? "256 path" : "512 mode"}
              </b>
            </div>
            <div>
              Tile host: <b>api.maptiler.com</b>
            </div>
            <div>
              Path template:{" "}
              <code>
                /maps/{styleId}/{mode === "path256" ? "256/" : ""}
                {`{z}/{x}/{y}`}.png?key=HIDDEN
              </code>
            </div>
            <div>
              HEAD: <b>{reactHead.status ?? "…"}</b> •{" "}
              <span>{reactHead.type || "…"}</span> •{" "}
              <span>{reactHead.len || "…"}</span>
            </div>
            <div>
              Loads: <b>{reactLoads}</b> • Errors: <b>{reactErrs}</b>{" "}
              {cspMsg ? (
                <>
                  • CSP: <b>{cspMsg}</b>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right: Pure HTML (iframe) — full map, key never shown */}
        <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          {apiKey ? (
            <iframe
              title="html-maptiler-debug"
              style={{ width: "100%", height: "100%", border: 0 }}
              // Full map with a tiny debug chip (no sidebar)
              srcDoc={buildIframeHTML({ apiKey, styleId, mode, center, zoom })}
            />
          ) : (
            <div className="h-full w-full grid place-items-center text-sm text-gray-600 dark:text-gray-300">
              Waiting for API key…
            </div>
          )}
        </div>
      </div>

      {/* Safety: ensure no global CSS mutes tiles */}
      <style>{`
                  .leaflet-tile,
                  .leaflet-container img.leaflet-image-layer,
                  .leaflet-container .leaflet-marker-icon,
                  .leaflet-container .leaflet-marker-shadow {
                    filter: none !important;
                    opacity: 1 !important;
                    mix-blend-mode: normal !important;
                  }
                `}</style>
    </div>
  );
}
