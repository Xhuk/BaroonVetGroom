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
import { MapContainer, Marker, Popup, useMap } from "react-leaflet";
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
import "@maptiler/leaflet-maptilersdk";

// Type augment (optional)
declare global {
  interface Window {
    L: typeof L & { maptiler?: { maptilerLayer: any; MapStyle?: any } };
  }
}

/* ── segmented console logger ───────────────────────────────────────────── */
const STYLE = {
  base: "padding:2px 6px;border-radius:6px;font-weight:600;",
  tag: "background:#111827;color:#fff;",
  ok: "background:#10b981;color:#052e22;",
  info: "background:#3b82f6;color:#0b254e;",
  warn: "background:#f59e0b;color:#4a2a00;",
  err: "background:#ef4444;color:#3b0606;",
};
function makeLog(ns: string) {
  const tag = `%c${ns}`;
  const tagStyle = `${STYLE.base}${STYLE.tag}`;
  const fx = (
    lvl: "log" | "info" | "warn" | "error",
    label: string,
    ...rest: any[]
  ) =>
    console[lvl](
      `${tag} %c${label}`,
      tagStyle,
      `${STYLE.base}${STYLE[lvl === "log" ? "ok" : lvl === "error" ? "err" : lvl]}`,
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
const dbg = makeLog("DeliveryPlanWorking");

/* ── leaflet default markers fix ────────────────────────────────────────── */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

/* ── helpers for sizing inside Tabs/Cards ───────────────────────────────── */
function InvalidateOnMount({ delay = 100 }: { delay?: number }) {
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
      if (now - lastTs.current < 120) {
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

/* ── on-map badges ─────────────────────────────────────────────────────── */
function OriginBadge() {
  if (typeof window === "undefined") return null;
  const origin = window.location.origin;
  const refMeta = document.querySelector(
    'meta[name="referrer"]',
  ) as HTMLMetaElement | null;
  const refPolicy = refMeta?.content || "(default)";
  return (
    <div
      style={{
        position: "absolute",
        bottom: 12,
        left: 12,
        zIndex: 1000,
        background: "#111827",
        color: "white",
        padding: "6px 10px",
        borderRadius: 8,
        fontSize: 12,
        boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
        maxWidth: "80%",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      title={`Origin: ${origin} • Referrer-Policy: ${refPolicy}`}
    >
      <span style={{ opacity: 0.8 }}>Origin:</span> <strong>{origin}</strong>
      <span style={{ opacity: 0.6, marginLeft: 8 }}>
        Referrer-Policy: {refPolicy}
      </span>
    </div>
  );
}
function WarningBadge({ text }: { text: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 1000,
        background: "#b91c1c",
        color: "white",
        padding: "6px 10px",
        borderRadius: 8,
        fontSize: 12,
        boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
        maxWidth: "90%",
      }}
    >
      {text}
    </div>
  );
}

/* ── EXACT working raster approach with diagnostics & auto-fallback ────── */
function MapTilerLayer({
  host,
  apiKey,
  style = "streets",
  onReady,
  onBadTiles,
}: {
  host: string;
  apiKey: string;
  style?: "streets" | "basic" | "topo";
  onReady?: () => void;
  onBadTiles?: (reason: string) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!apiKey) {
      dbg.warn("No MapTiler API key; skipping");
      return;
    }
    dbg.seg("MAPTILER LAYER MOUNT");

    // remove MapTiler/OSM tile layers only
    map.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        const u = (layer as any)._url as string | undefined;
        if (
          u?.includes("maptiler") ||
          u?.includes("openstreetmap") ||
          u?.includes("test-map")
        ) {
          map.removeLayer(layer);
        }
      }
    });

    const tileUrl = `${host.replace(/\/+$/, "")}/maps/${style}/{z}/{x}/{y}.png?key=${apiKey}`;
    dbg.info("Using raster URL:", tileUrl);

    let firstTileChecked = false;
    let badCount = 0;

    const layer = L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
      crossOrigin: true,
    });

    const onLoad = (e: any) => {
      dbg.log("Tiles loaded");
      // inspect the first tile that loads
      const img: HTMLImageElement | undefined = e?.tile;
      if (img && !firstTileChecked) {
        firstTileChecked = true;
        dbg.info("First tile dims:", {
          w: img.naturalWidth,
          h: img.naturalHeight,
          src: img.currentSrc || img.src,
        });
        if (
          !img.naturalWidth ||
          !img.naturalHeight ||
          (img.naturalWidth === 1 && img.naturalHeight === 1)
        ) {
          badCount++;
          onBadTiles?.(
            "Tile decoded as 1×1 or 0×0 (proxy or CSP/referrer issue).",
          );
        }
      }
    };

    const onErr = (e: any) => {
      const src = e?.tile?.src || e;
      dbg.error("tileerror", src);
      badCount++;
      if (badCount >= 3) onBadTiles?.("Multiple tile errors from host.");
    };

    layer.on("load", onLoad);
    layer.on("tileerror", onErr);
    layer.addTo(map);
    onReady?.();

    // HEAD preflight one sample tile for headers
    const sample = tileUrl
      .replace("{z}", "11")
      .replace("{x}", "453")
      .replace("{y}", "872");
    dbg.seg("HEAD PREFLIGHT");
    dbg.info("Sample tile", sample);
    fetch(sample, { method: "HEAD" })
      .then((res) => {
        const ct = res.headers.get("content-type");
        const cl = res.headers.get("content-length");
        dbg.info(`HEAD ${res.status} • content-type=${ct} • length=${cl}`);
        // If HEAD returns text/html or tiny length, warn
        if (ct && !/image\//i.test(ct)) {
          onBadTiles?.(`HEAD content-type is ${ct} (expected image/*).`);
        }
      })
      .catch((e) => dbg.error("HEAD preflight failed", e));

    return () => {
      dbg.seg("MAPTILER LAYER UNMOUNT");
      layer.off("load", onLoad);
      layer.off("tileerror", onErr);
      map.removeLayer(layer);
    };
  }, [map, host, apiKey, style, onReady, onBadTiles]);

  return null;
}

/* ── clinic marker ─────────────────────────────────────────────────────── */
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

/* ── key/host fetch ─────────────────────────────────────────────────────── */
async function fetchMaptilerKey(): Promise<string> {
  try {
    const res = await fetch("/api/config/maptiler");
    if (res.ok) {
      const j = await res.json();
      if (j?.apiKey) return j.apiKey as string;
    }
  } catch {}
  // env fallbacks (Vite / Next)
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
function getHost(): string {
  // Prefer env; default to MapTiler official host
  // @ts-ignore
  const envVite = import.meta?.env?.VITE_MAPTILER_HOST as string | undefined;
  // @ts-ignore
  const envNext =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_MAPTILER_HOST || process.env.VITE_MAPTILER_HOST
      : undefined;
  return (envVite || envNext || "https://api.maptiler.com").replace(/\/+$/, "");
}

/* ── page ──────────────────────────────────────────────────────────────── */
export default function DeliveryPlanWorking() {
  const { currentTenant } = useTenant();
  const [activeTab, setActiveTab] = useState("inbound");
  const [selectedRoute, setSelectedRoute] = useState<string>("");

  const [mapApiKey, setMapApiKey] = useState<string>("");
  const [host, setHost] = useState<string>(getHost());
  const [fallbackOSM, setFallbackOSM] = useState<string | null>(null);

  // Load key & log origin info
  useEffect(() => {
    const origin = window.location.origin;
    const metaRef = document.querySelector(
      'meta[name="referrer"]',
    ) as HTMLMetaElement | null;
    dbg.seg("ENV / ORIGIN");
    dbg.info(
      "origin:",
      origin,
      "referrer-policy:",
      metaRef?.content || "(default)",
    );
    fetchMaptilerKey().then((k) => setMapApiKey(k || ""));
  }, []);

  // Stats & routes
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
  const mapBoxId = "delivery-map-box-working";

  const isOfficialHost = /^https:\/\/api\.maptiler\.com$/i.test(host);

  return (
    <div className="space-y-6 p-6">
      {/* Tabs header */}
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

        {/* Inbound */}
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

          {/* Route planning */}
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
                <div id={mapBoxId} className="h-[500px] w-full relative">
                  {!isOfficialHost && (
                    <WarningBadge
                      text={`Using non-official host: ${host}. If this is a proxy, ensure it returns real image/png tiles.`}
                    />
                  )}

                  {fallbackOSM && (
                    <WarningBadge text={`Fallback active: ${fallbackOSM}`} />
                  )}

                  {activeTab === "inbound" && mapApiKey ? (
                    <>
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
                        {!fallbackOSM ? (
                          <MapTilerLayer
                            host={host}
                            apiKey={mapApiKey}
                            style="streets"
                            onReady={() => dbg.log("MapTiler layer ready")}
                            onBadTiles={(reason) => {
                              dbg.warn(
                                "Bad tiles detected → fallback:",
                                reason,
                              );
                              setFallbackOSM(reason);
                              // mount OSM fallback
                              const osm = L.tileLayer(
                                "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                                {
                                  attribution:
                                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                                  maxZoom: 19,
                                },
                              );
                              osm.addTo(
                                (window as any)._leaflet_map_instance ??
                                  ({} as any),
                              );
                            }}
                          />
                        ) : null}

                        {/* If falling back, add OSM via React too (double guard) */}
                        {fallbackOSM && (
                          <React.Fragment>
                            {/*@ts-ignore*/}
                            <L.TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          </React.Fragment>
                        )}

                        {/* size helpers */}
                        <InvalidateOnMount delay={120} />
                        <MapResizeObserver targetId={mapBoxId} />

                        {/* marker */}
                        <Marker
                          position={[25.6866, -100.3161]}
                          icon={clinicIcon}
                        >
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

                      <OriginBadge />
                    </>
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

        {/* Outbound */}
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

        {/* Tracking */}
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

        {/* Analytics */}
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
    </div>
  );
}
