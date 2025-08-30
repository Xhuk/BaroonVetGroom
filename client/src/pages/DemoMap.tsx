import { useEffect, useRef, useState } from "react";

/**
 * DemoMap.tsx — self-contained Leaflet map
 * - Leaflet CSS inlined (no CSS CDN)
 * - Auto-load Leaflet JS (CDN)
 * - Basemap toggle: OSM Light, Carto Light, Carto Dark, MapTiler Basic (if key present)
 * - Error tiles silenced (transparent), tuned loading options
 * - Extra logging for MapTiler key detection + on-screen hint if missing
 */

// ✅ Put your key here (or leave empty to rely on env/window)
const HARDCODED_MAPTILER_KEY = "VnIIfVkMlKSgr3pNklzl";

declare global {
  interface Window {
    L: any;
    MAPTILER_KEY?: string;
  }
}

type ProviderKey = "osm" | "cartoLight" | "cartoDark" | "maptiler";

const INLINE_LEAFLET_CSS = `
/* --- Minimal Leaflet CSS (inline) --- */
.leaflet-container{overflow:hidden;outline:0;position:relative}
.leaflet-pane,.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-tile-container,.leaflet-pane>svg,.leaflet-pane>canvas,.leaflet-zoom-box{position:absolute;left:0;top:0}
.leaflet-tile{filter:inherit;visibility:hidden}
.leaflet-tile-loaded{visibility:inherit}
.leaflet-zoom-box{width:0;height:0;-moz-box-sizing:border-box;box-sizing:border-box;z-index:800}
.leaflet-control{position:relative;z-index:800;pointer-events:auto}
.leaflet-top,.leaflet-bottom{position:absolute;z-index:1000;pointer-events:none}
.leaflet-top{top:0}
.leaflet-right{right:0}
.leaflet-bottom{bottom:0}
.leaflet-left{left:0}
.leaflet-control{float:left;clear:both}
.leaflet-bar{box-shadow:0 1px 5px rgba(0,0,0,0.65);border-radius:4px}
.leaflet-bar a{background-color:#fff;border-bottom:1px solid #ccc;width:26px;height:26px;line-height:26px;display:block;text-align:center;text-decoration:none;color:black}
.leaflet-bar a:last-child{border-bottom:none}
.leaflet-bar a:hover{background:#f4f4f4}
.leaflet-control-zoom a{font:700 18px/26px "Helvetica Neue",Arial,Helvetica,sans-serif}
.leaflet-control-attribution{background:rgba(255,255,255,.8);margin:0;color:#333;padding:0 5px;border-radius:4px;line-height:1.2}
.leaflet-container .leaflet-control-attribution{font:12px/1.2 "Helvetica Neue",Arial,Helvetica,sans-serif}
.leaflet-marker-icon,.leaflet-marker-shadow{display:block}
.leaflet-container img{max-width:none!important}
`;

// 1x1 transparent PNG for failed tiles
const ERROR_TILE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/oe2a8QAAAAASUVORK5CYII=";

// Resolve MapTiler key from (priority): env → window → hardcoded
const maptilerKey =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env &&
    ((import.meta as any).env.VITE_MAPTILER_KEY ||
      (import.meta as any).env.MAPTILER_KEY)) ||
  (typeof window !== "undefined" && (window.MAPTILER_KEY || "")) ||
  HARDCODED_MAPTILER_KEY || "";

// Providers
const PROVIDERS: Record<
  ProviderKey,
  { name: string; url: string; options: any; available?: boolean }
> = {
  osm: {
    name: "OpenStreetMap (Light)",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: { maxZoom: 19, tileSize: 256, attribution: "&copy; OpenStreetMap contributors" },
    available: true,
  },
  cartoLight: {
    name: "Carto Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    options: { subdomains: ["a","b","c","d"], maxZoom: 20, tileSize: 256, attribution: "&copy; OpenStreetMap & CARTO" },
    available: true,
  },
  cartoDark: {
    name: "Carto Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    options: { subdomains: ["a","b","c","d"], maxZoom: 20, tileSize: 256, attribution: "&copy; OpenStreetMap & CARTO" },
    available: true,
  },
  maptiler: {
    name: "MapTiler Basic",
    url: `https://api.maptiler.com/maps/basic-v2/256/{z}/{x}/{y}.png?key=${maptilerKey}`,
    options: {
      maxZoom: 20,
      tileSize: 256,
      attribution:
        '&copy; OpenStreetMap, &copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>',
    },
    available: !!maptilerKey,
  },
};

export default function DemoMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const layerRef = useRef<any>(null);

  const [tileStatus, setTileStatus] = useState<"idle"|"loading"|"ok"|"error">("idle");
  const [lastErrors, setLastErrors] = useState<string[]>([]);
  const [styleKey, setStyleKey] = useState<ProviderKey>(maptilerKey ? "maptiler" : "osm");

  useEffect(() => {
    console.log("🛠️ [DemoMap] effect start");
    console.log(
      maptilerKey
        ? `🔑 MapTiler key detected (length ${maptilerKey.length})`
        : "⚠️ No MapTiler key detected"
    );

    // Inline Leaflet CSS
    if (!document.getElementById("leaflet-inline-css")) {
      const style = document.createElement("style");
      style.id = "leaflet-inline-css";
      style.textContent = INLINE_LEAFLET_CSS;
      document.head.appendChild(style);
    }

    const start = () => initMap();

    // Inject Leaflet JS (CDN)
    if (!document.getElementById("leaflet-js")) {
      const s = document.createElement("script");
      s.id = "leaflet-js";
      s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      s.onload = () => { console.log("✅ Leaflet JS loaded"); start(); };
      s.onerror = (e) => console.error("❌ Failed to load Leaflet JS", e);
      document.body.appendChild(s);
    } else {
      start();
    }

    function logError(msg: string) {
      console.error(msg);
      setLastErrors(prev => [msg, ...prev].slice(0, 6));
    }

    function addOrSwapBaseLayer(key: ProviderKey) {
      const L = window.L;
      const p = PROVIDERS[key];
      if (!p || p.available === false) {
        console.warn(`⏭️ Provider unavailable: ${key}`);
        return;
      }

      setTileStatus("loading");

      if (layerRef.current) {
        mapInstance.current.removeLayer(layerRef.current);
        layerRef.current.off();
        layerRef.current = null;
      }

      const layer = L.tileLayer(p.url, {
        ...p.options,
        errorTileUrl: ERROR_TILE,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 2,
        detectRetina: true,
      });

      layer
        .on("loading", () => { console.log(`🔄 [${p.name}] loading…`); setTileStatus("loading"); })
        .on("load", () => { console.log(`🟢 [${p.name}] loaded`); setTileStatus("ok"); })
        .on("tileerror", () => { logError(`❌ tileerror @ ${p.name}`); setTileStatus("error"); });

      layer.addTo(mapInstance.current);
      layerRef.current = layer;
      console.log(`🧱 Base layer set: ${p.name}`);
    }

    function initMap() {
      if (!window.L || !mapRef.current) {
        setTimeout(initMap, 50);
        return;
      }

      if (mapInstance.current) {
        mapInstance.current.remove();
      }

      const L = window.L;
      console.log("✅ Leaflet available:", L?.version);

      const map = L.map(mapRef.current, { zoomControl: true, minZoom: 2 }).setView([24.8066, -107.3938], 12);
      mapInstance.current = map;
      console.log("🗺️ Map created:", { center: map.getCenter(), zoom: map.getZoom() });

      // initial basemap
      addOrSwapBaseLayer(styleKey);

      // demo markers
      [
        { position: [24.8066, -107.3938] as [number, number], name: "Clínica Veterinaria" },
        { position: [24.8166, -107.4038] as [number, number], name: "Las Flores" },
        { position: [24.7966, -107.3838] as [number, number], name: "El Bosque" },
        { position: [24.8266, -107.3738] as [number, number], name: "Villa Real" },
      ].forEach((m) => {
        L.marker(m.position).addTo(map).bindPopup(`<b>${m.name}</b>`);
      });

      setTimeout(() => { map.invalidateSize(); }, 140);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap base layer when style changes
  useEffect(() => {
    if (mapInstance.current && window.L) {
      const p = PROVIDERS[styleKey];
      if (p && p.available !== false) {
        if (layerRef.current) {
          mapInstance.current.removeLayer(layerRef.current);
          layerRef.current.off();
          layerRef.current = null;
        }
        const layer = window.L.tileLayer(p.url, {
          ...p.options,
          errorTileUrl: ERROR_TILE,
          updateWhenIdle: true,
          updateWhenZooming: false,
          keepBuffer: 2,
          detectRetina: true,
        });
        layer
          .on("loading", () => setTileStatus("loading"))
          .on("load", () => setTileStatus("ok"))
          .on("tileerror", () => setTileStatus("error"));
        layer.addTo(mapInstance.current);
        layerRef.current = layer;
      }
    }
  }, [styleKey]);

  const badge =
    tileStatus === "ok" ? "🟢 tiles ok" :
    tileStatus === "loading" ? "🟡 loading tiles…" :
    tileStatus === "error" ? "🔴 tile error" :
    "⚪ idle";

  const providerOptions: ProviderKey[] = (["osm", "cartoLight", "cartoDark", "maptiler"] as ProviderKey[])
    .filter((k) => PROVIDERS[k].available !== false);

  return (
    <div style={{ minHeight: "100vh", background: "#0b1220", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h1 style={{ color: "#e5e7eb", fontSize: 20, fontWeight: 700, margin: 0 }}>
          Culiacán Map — Leaflet (inline CSS + basemap toggle)
        </h1>

        {/* Basemap selector */}
        <div style={{ marginLeft: "auto" }}>
          <label style={{ color: "#e5e7eb", fontSize: 12, marginRight: 8 }}>Basemap</label>
          <select
            value={styleKey}
            onChange={(e) => setStyleKey(e.target.value as ProviderKey)}
            style={{
              background: "#111827", color: "#e5e7eb", border: "1px solid #374151",
              borderRadius: 8, padding: "6px 10px", fontSize: 12
            }}
          >
            {providerOptions.map((k) => (
              <option key={k} value={k}>
                {PROVIDERS[k].name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!maptilerKey && (
        <div style={{
          background: "#7f1d1d", color: "#fecaca", padding: "8px 12px",
          borderRadius: 8, marginBottom: 12, fontSize: 12
        }}>
          ⚠️ No MapTiler key detected. To enable it, set <code>VITE_MAPTILER_KEY</code> or <code>window.MAPTILER_KEY</code>,
          or fill <code>HARDCODED_MAPTILER_KEY</code> at the top of this file.
        </div>
      )}

      <div style={{ position: "relative", height: 700, width: "100%", borderRadius: 12, overflow: "hidden", background: "#111827" }}>
        <div ref={mapRef} style={{ height: "100%", width: "100%" }} />

        {/* Status badge */}
        <div style={{
          position: "absolute", top: 10, right: 10,
          background: "rgba(17,24,39,0.85)", color: "#e5e7eb",
          padding: "6px 10px", borderRadius: 8, fontSize: 12
        }}>
          {badge}
        </div>

        {/* Floating debug panel */}
        {lastErrors.length > 0 && (
          <div style={{
            position: "absolute", bottom: 10, left: 10, maxWidth: "60%",
            background: "rgba(17,24,39,0.85)", color: "#e5e7eb",
