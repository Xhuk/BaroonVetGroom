// src/pages/DeliveryPlanWorking.tsx
import React, { useEffect, useRef, useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import {
  Navigation,
  BarChart3,
  Truck,
  Users,
  MapPin,
  Route,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ── segmented console logger ───────────────────────────────────────────── */
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
const dbg = mk("DeliveryPlanWorking");

/* ── fix default markers ───────────────────────────────────────────────── */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

/* ── sizing helpers ────────────────────────────────────────────────────── */
function InvalidateOnMount({ delay = 120 }: { delay?: number }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => {
      dbg.log("Calling map.invalidateSize()");
      map.invalidateSize();
    }, delay);
    return () => clearTimeout(t);
  }, [map, delay]);
  return null;
}
function MapResizeObserver({ targetId }: { targetId: string }) {
  const map = useMap();
  const rafRef = useRef<number | null>(null);
  const lastTs = useRef(0);
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const now = performance.now();
      if (now - lastTs.current < 100) {
        if (rafRef.current == null) {
          rafRef.current = requestAnimationFrame(() => {
            map.invalidateSize();
            rafRef.current = null;
            lastTs.current = performance.now();
          });
        }
      } else {
        map.invalidateSize();
        lastTs.current = now;
      }
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [map, targetId]);
  return null;
}

/* ── debug overlay ─────────────────────────────────────────────────────── */
function DebugOverlay(props: {
  activeTab: string;
  mapApiKey: string;
  tenantName?: string;
  containerId: string;
  sampleUrl?: string;
}) {
  const [dims, setDims] = useState<{ w: number; h: number; visible: boolean }>({
    w: 0,
    h: 0,
    visible: false,
  });
  useEffect(() => {
    const el = document.getElementById(props.containerId);
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const hidden = getComputedStyle(el).display === "none";
      setDims({
        w: Math.round(r.width),
        h: Math.round(r.height),
        visible: !hidden,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const id = setInterval(measure, 600);
    return () => {
      ro.disconnect();
      clearInterval(id);
    };
  }, [props.containerId]);
  return (
    <div
      style={{
        position: "absolute",
        right: 12,
        top: 12,
        zIndex: 1000,
        background: "#111827",
        color: "#e5e7eb",
        padding: "8px 10px",
        borderRadius: 8,
        fontSize: 12,
        lineHeight: 1.25,
        maxWidth: 360,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Map Debug</div>
      <div>
        activeTab: <b>{props.activeTab}</b>
      </div>
      <div>
        apiKey:{" "}
        <b>{props.mapApiKey ? `****${props.mapApiKey.slice(-4)}` : "(none)"}</b>
      </div>
      <div>
        tenant: <b>{props.tenantName || "(unset)"}</b>
      </div>
      <div>
        container:{" "}
        <b>
          {dims.w}×{dims.h}
        </b>{" "}
        • visible: <b>{String(dims.visible)}</b>
      </div>
      {props.sampleUrl && (
        <div
          style={{ marginTop: 6, overflow: "hidden", textOverflow: "ellipsis" }}
        >
          sample: <code>{props.sampleUrl}</code>
        </div>
      )}
    </div>
  );
}

/* ── CSP listener ──────────────────────────────────────────────────────── */
function useCspBadge(setBadge: (s: string) => void) {
  useEffect(() => {
    const handler = (e: any) => {
      if (e?.blockedURI?.includes("api.maptiler.com")) {
        setBadge(`CSP blocked ${e.violatedDirective} • ${e.blockedURI}`);
        dbg.error("CSP violation", e);
      }
    };
    window.addEventListener("securitypolicyviolation", handler);
    return () => window.removeEventListener("securitypolicyviolation", handler);
  }, [setBadge]);
}

/* ── MapTiler raster (streets-v2) + diagnostics + OSM fallback ─────────── */
function MapTilerRaster({
  apiKey,
  onBadTiles,
  style = "streets",
}: {
  apiKey: string;
  onBadTiles: (reason: string) => void;
  style?: "streets" | "basic" | "topo";
}) {
  const map = useMap();
  useEffect(() => {
    dbg.seg("MAPTILER LAYER MOUNT");
    map.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) map.removeLayer(layer);
    });

    // Use basic streets style with standard 256px tiles
    const url = `https://api.maptiler.com/maps/${style}/{z}/{x}/{y}.png?key=${apiKey}`;
    dbg.info("Tile URL:", url);

    let inspected = false,
      errCount = 0;
    const layer = L.tileLayer(url, {
      attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a>',
      maxZoom: 18,
      // Standard 256px tiles, no zoom offset
    });

    // Simplified error handling - fallback after first error
    const tileError = (e: any) => {
      errCount++;
      const src = e?.tile?.src || e;
      dbg.error("tileerror", src);
      
      // Immediate fallback on any error
      if (errCount >= 1) {
        onBadTiles("MapTiler tiles failed, switching to OpenStreetMap");
        map.removeLayer(layer);
        
        // Add OpenStreetMap fallback directly
        const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        });
        osmLayer.addTo(map);
        dbg.log("Added OSM fallback layer");
      }
    };

    layer.on("tileerror", tileError);
    layer.addTo(map);
    dbg.log("MapTiler layer added");

    // Sanity HEAD on one sample tile
    const sample = url
      .replace("{z}", "11")
      .replace("{x}", "453")
      .replace("{y}", "872");
    dbg.seg("HEAD PREFLIGHT");
    dbg.info("Sample tile", sample);
    fetch(sample, { method: "HEAD" })
      .then((res) => {
        dbg.info(
          `HEAD ${res.status} • content-type=${res.headers.get("content-type")} • length=${res.headers.get("content-length")}`,
        );
      })
      .catch((err) => dbg.error("HEAD failed", err));

    return () => {
      dbg.seg("MAPTILER LAYER UNMOUNT");
      layer.off("tileload", tileLoad);
      layer.off("tileerror", tileError);
      map.removeLayer(layer);
    };
  }, [apiKey, style, map, onBadTiles]);

  return null;
}

/* ── clinic icon ───────────────────────────────────────────────────────── */
const clinicIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/* ── key fetch with explicit logs ──────────────────────────────────────── */
async function fetchMaptilerKey(): Promise<string> {
  try {
    const res = await fetch("/api/config/maptiler");
    if (res.ok) {
      const j = await res.json();
      if (j?.apiKey) return j.apiKey as string;
    }
    dbg.warn("Key endpoint non-200:", res.status);
  } catch (e) {
    dbg.error("Key fetch failed:", e);
  }
  // Env fallbacks if you expose it (optional)
  // @ts-ignore
  return (
    import.meta?.env?.VITE_MAPTILER_KEY ||
    // @ts-ignore
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_MAPTILER_KEY || process.env.VITE_MAPTILER_KEY
      : "") ||
    ""
  );
}

/* ── page ──────────────────────────────────────────────────────────────── */
export default function DeliveryPlanWorking() {
  const { currentTenant } = useTenant();
  const [activeTab, setActiveTab] = useState("inbound");
  const [selectedRoute, setSelectedRoute] = useState<string>("");
  const [mapApiKey, setMapApiKey] = useState<string>("");
  const [badge, setBadge] = useState<string | null>(null);
  const mapBoxId = "delivery-map-box-working";

  useCspBadge(setBadge);

  // Ensure we have a referrer (helpful if a privacy extension stripped it)
  useEffect(() => {
    const meta = document.querySelector(
      'meta[name="referrer"]',
    ) as HTMLMetaElement | null;
    if (!meta) {
      const m = document.createElement("meta");
      m.setAttribute("name", "referrer");
      m.setAttribute("content", "strict-origin-when-cross-origin");
      document.head.appendChild(m);
      dbg.warn(
        "Injected temporary <meta name='referrer' content='strict-origin-when-cross-origin'>",
      );
    }
  }, []);

  useEffect(() => {
    const origin = window.location.origin;
    const meta = document.querySelector(
      'meta[name="referrer"]',
    ) as HTMLMetaElement | null;
    dbg.seg("ENV / ORIGIN");
    dbg.info(
      "origin:",
      origin,
      "referrer-policy:",
      meta?.content || "(default)",
    );
    fetchMaptilerKey().then((k) => setMapApiKey(k || ""));
  }, []);

  useEffect(() => {
    dbg.info(
      "mapApiKey =",
      mapApiKey ? `****${mapApiKey.slice(-4)}` : "(none)",
    );
  }, [mapApiKey]);
  useEffect(() => {
    dbg.seg("GATES");
    dbg.info("activeTab =", activeTab);
  }, [activeTab]);

  const stats = {
    pickupsScheduled: 0,
    clientsRegistered: 0,
    inboundRoutes: 0,
    availableVans: 4,
  };
  const deliveryRoutes = [
    { id: "route-1", name: "Ruta Centro - Mañana", time: "08:00", stops: 5 },
    { id: "route-2", name: "Ruta Norte - Tarde", time: "14:00", stops: 3 },
    { id: "route-3", name: "Ruta Sur - Noche", time: "18:00", stops: 7 },
  ];

  // A visible sample image to confirm raw <img> rendering
  const sampleUrl = mapApiKey
    ? `https://api.maptiler.com/maps/streets-v2/11/453/872.png?key=${mapApiKey}`
    : undefined;

  return (
    <div className="space-y-6 p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inbound" className="flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            Inbound (Pickup)
          </TabsTrigger>
          <TabsTrigger value="outbound" className="flex items-center gap-2">
            <Route className="w-4 h-4" />
            Outbound (Delivery)
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Driver Tracking
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbound" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      Pickups Programados
                    </p>
                    <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                      {stats.pickupsScheduled}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-800 rounded-full">
                    <Navigation className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Clientes Registrados
                    </p>
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                      {stats.clientsRegistered}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      Rutas Inbound
                    </p>
                    <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                      {stats.inboundRoutes}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-full">
                    <Route className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                      Vans Disponibles
                    </p>
                    <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">
                      {stats.availableVans}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-100 dark:bg-orange-800 rounded-full">
                    <Truck className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Planner */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Planificación de Rutas
              </h2>
              <div className="flex items-center gap-4">
                <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                  <SelectTrigger className="w-80">
                    <SelectValue placeholder="Selecciona una ruta para ver en el mapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryRoutes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} - {r.time} ({r.stops} paradas)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => window.open("/test-map", "_blank")}
                >
                  Test MapTiler
                </Button>
              </div>
            </div>

            {/* Map */}
            <Card className="w-full">
              <CardContent className="p-0">
                <div
                  id="delivery-map-box-working"
                  className="h-[500px] w-full relative"
                >
                  {/* visible sample tile (to prove raw <img> works) */}
                  {sampleUrl && (
                    <img
                      src={sampleUrl}
                      alt="sample"
                      onLoad={() => dbg.info("Sample <img> loaded OK")}
                      onError={(e) =>
                        dbg.error(
                          "Sample <img> error",
                          (e as any)?.currentTarget?.src,
                        )
                      }
                      style={{
                        position: "absolute",
                        bottom: 12,
                        right: 12,
                        zIndex: 1000,
                        width: 96,
                        height: 96,
                        border: "2px solid #111827",
                        borderRadius: 8,
                        background: "#fff",
                      }}
                    />
                  )}

                  <DebugOverlay
                    activeTab={activeTab}
                    mapApiKey={mapApiKey}
                    tenantName={(currentTenant as any)?.name || "Vetgroom1"}
                    containerId="delivery-map-box-working"
                    sampleUrl={sampleUrl}
                  />

                  {activeTab === "inbound" && mapApiKey ? (
                    <MapContainer
                      center={[25.6866, -100.3161]}
                      zoom={11}
                      style={{ height: "100%", width: "100%" }}
                      className="rounded-lg"
                      zoomControl
                      scrollWheelZoom
                      whenReady={() => {
                        dbg.seg("MAP READY");
                        setTimeout(
                          () => window.dispatchEvent(new Event("resize")),
                          50,
                        );
                      }}
                    >
                      {/* Try MapTiler first; fall back to OSM if tiles misbehave */}
                      <MapTilerRaster
                        apiKey={mapApiKey}
                        onBadTiles={(reason) => {
                          dbg.warn("Falling back to OSM:", reason);
                          setBadge(`Fallback: ${reason}`);
                        }}
                      />

                      <InvalidateOnMount />
                      <MapResizeObserver targetId="delivery-map-box-working" />

                      <Marker position={[25.6866, -100.3161]} icon={clinicIcon}>
                        <Popup>
                          <div className="text-center">
                            <div className="font-semibold text-blue-600">
                              Clínica Veterinaria
                            </div>
                            <div className="text-sm">
                              {(currentTenant as any)?.name || "Vetgroom1"}
                            </div>
                            <div className="text-xs text-gray-500">
                              Monterrey, México
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {activeTab !== "inbound"
                            ? "Selecciona la pestaña Inbound para ver el mapa"
                            : "Cargando mapa..."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="outbound" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <Route className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Outbound Delivery
                </h3>
                <p className="text-gray-500">
                  Gestión de entregas y rutas de salida
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Driver Tracking
                </h3>
                <p className="text-gray-500">
                  Seguimiento en tiempo real de conductores
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Analytics
                </h3>
                <p className="text-gray-500">
                  Análisis y métricas de rendimiento
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* safety: ensure no global CSS mutes tiles */}
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
