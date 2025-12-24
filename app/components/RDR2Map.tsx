"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type LatLng = [number, number];

type POIType =
  | "hospital"
  | "gas-station"
  | "sheriff"
  | "bank"
  | "restaurant"
  | "shop"
  | "camp"
  | "hotel"
  | "saloon";

interface POI {
  id: number;
  type: POIType;
  position: LatLng;
  name?: string;
}

type GeoState = "idle" | "prompt" | "granted" | "denied" | "unavailable";

const LAST_LOCATION_KEY = "rdr2map:lastLocation";
const HELP_SEEN_KEY = "rdr2map:helpSeen";

/* ---------- Helpers ---------- */

const isLatLng = (p: unknown): p is LatLng =>
  Array.isArray(p) &&
  p.length === 2 &&
  typeof p[0] === "number" &&
  typeof p[1] === "number" &&
  !isNaN(p[0]) &&
  !isNaN(p[1]);

const sanitizeLatLngArray = (arr: unknown): LatLng[] => {
  if (!Array.isArray(arr)) return [];
  return arr.filter(isLatLng);
};

const loadLastLocation = (): LatLng | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (isLatLng(parsed)) return parsed;
  } catch {}
  return null;
};

const saveLastLocation = (pos: LatLng) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(pos));
  } catch {}
};

const loadHelpSeen = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(HELP_SEEN_KEY) === "1";
  } catch {
    return false;
  }
};

const saveHelpSeen = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HELP_SEEN_KEY, "1");
  } catch {}
};

/* ---------- Small components ---------- */

function MapRecenter({ target }: { target: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target || !isLatLng(target)) return;
    map.setView(target, 15);
  }, [target, map]);
  return null;
}

function WaypointClick({ onSet }: { onSet: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      const lat = e?.latlng?.lat;
      const lng = e?.latlng?.lng;
      if (
        typeof lat === "number" &&
        typeof lng === "number" &&
        !isNaN(lat) &&
        !isNaN(lng)
      ) {
        const p: LatLng = [lat, lng];
        onSet(p);
        saveLastLocation(p);
      }
    },
  });
  return null;
}

/* ================= MAIN ================= */

export default function RDR2Map() {
  const [playerPos, setPlayerPos] = useState<LatLng | null>(null);
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [pois, setPois] = useState<POI[]>([]);
  const [waypoint, setWaypoint] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<LatLng[]>([]);
  const [drawnRoute, setDrawnRoute] = useState<LatLng[]>([]);
  const [recenterTarget, setRecenterTarget] = useState<LatLng | null>(null);
  const [recenterKey, setRecenterKey] = useState(0);
  const [initialCenter, setInitialCenter] = useState<LatLng | null>(null);

  const [activeTypes, setActiveTypes] = useState<Set<POIType>>(
    () =>
      new Set<POIType>([
        "hospital",
        "gas-station",
        "sheriff",
        "bank",
        "restaurant",
        "shop",
        "camp",
        "hotel",
        "saloon",
      ])
  );

  const [showHelp, setShowHelp] = useState<boolean>(() => !loadHelpSeen());

  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);

  const fetchingPois = useRef(false);
  const lastPoiCenter = useRef<LatLng | null>(null);
  const animRef = useRef<number | null>(null);

  /* ---------- Icons ---------- */

  const icons = useMemo(() => {
    if (typeof window === "undefined") return null;

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    return {
      player: new L.Icon({
        iconUrl: "/icons/player.png",
        iconSize: [28, 28],
      }),
      waypoint: new L.Icon({
        iconUrl: "/icons/waypoint.png",
        iconSize: [22, 22],
        className: "rdr-waypoint",
      }),
      poi: {
        hospital: new L.Icon({
          iconUrl: "/icons/hospital.png",
          iconSize: [20, 20],
        }),
        "gas-station": new L.Icon({
          iconUrl: "/icons/gas-station.png",
          iconSize: [20, 20],
        }),
        sheriff: new L.Icon({
          iconUrl: "/icons/sheriff.png",
          iconSize: [20, 20],
        }),
        bank: new L.Icon({
          iconUrl: "/icons/bank.png",
          iconSize: [20, 20],
        }),
        restaurant: new L.Icon({
          iconUrl: "/icons/restaurant.png",
          iconSize: [20, 20],
        }),
        shop: new L.Icon({
          iconUrl: "/icons/shop.png",
          iconSize: [20, 20],
        }),
        camp: new L.Icon({
          iconUrl: "/icons/camp.png",
          iconSize: [20, 20],
        }),
        hotel: new L.Icon({
          iconUrl: "/icons/hotel.png",
          iconSize: [20, 20],
        }),
        saloon: new L.Icon({
          iconUrl: "/icons/saloon.png",
          iconSize: [20, 20],
        }),
      } as Record<POIType, L.Icon>,
    };
  }, []);

  /* ---------- Geolocation / initial center ---------- */

  useEffect(() => {
    const last = loadLastLocation();
    if (last) {
      setInitialCenter(last);
      setRecenterTarget(last);
    } else {
      setInitialCenter([0, 0]);
    }

    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoState("unavailable");
      return;
    }

    setGeoState("prompt");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos?.coords?.latitude;
        const lng = pos?.coords?.longitude;
        if (
          typeof lat === "number" &&
          typeof lng === "number" &&
          !isNaN(lat) &&
          !isNaN(lng)
        ) {
          const p: LatLng = [lat, lng];
          setPlayerPos(p);
          setInitialCenter(p);
          setRecenterTarget(p);
          setRecenterKey((k) => k + 1);
          saveLastLocation(p);
          setGeoState("granted");
        } else {
          setGeoState("unavailable");
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        setGeoState(err.code === 1 ? "denied" : "unavailable");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, []);

  /* ---------- Fetch POIs when playerPos changes (20 km radius) ---------- */

  useEffect(() => {
    if (!playerPos) return;

    const [lat, lon] = playerPos;
    if (
      typeof lat !== "number" ||
      typeof lon !== "number" ||
      isNaN(lat) ||
      isNaN(lon)
    ) {
      return;
    }

    const prev = lastPoiCenter.current;
    if (
      prev &&
      Math.abs(prev[0] - lat) < 0.01 && // ~1 km
      Math.abs(prev[1] - lon) < 0.01
    ) {
      return;
    }

    if (fetchingPois.current) return;
    fetchingPois.current = true;
    lastPoiCenter.current = [lat, lon];

    const radius = 20000; // 20 km, more POIs

    const query = `
      [out:json][timeout:25];
      (
        node(around:${radius},${lat},${lon})[amenity~"hospital|fuel|police|bank|restaurant"];
        way(around:${radius},${lat},${lon})[amenity~"hospital|fuel|police|bank|restaurant"];
        node(around:${radius},${lat},${lon})[shop];
        way(around:${radius},${lat},${lon})[shop];
      );
      out center tags;
    `;

    fetch("https://overpass.kumi.systems/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    })
      .then((r) => r.json())
      .then((data: any) => {
        if (!data || !data.elements) {
          fetchingPois.current = false;
          return;
        }

        const parsed: POI[] = data.elements
          .map((el: any): POI | null => {
            const plat = el.lat ?? el.center?.lat;
            const plon = el.lon ?? el.center?.lon;

            if (
              typeof plat !== "number" ||
              typeof plon !== "number" ||
              isNaN(plat) ||
              isNaN(plon)
            ) {
              return null;
            }

            let type: POIType = "shop";
            if (el.tags?.amenity === "hospital") type = "hospital";
            else if (el.tags?.amenity === "fuel") type = "gas-station";
            else if (el.tags?.amenity === "police") type = "sheriff";
            else if (el.tags?.amenity === "bank") type = "bank";
            else if (el.tags?.amenity === "restaurant") type = "restaurant";

            return {
              id: el.id,
              type,
              position: [plat, plon],
              name: el.tags?.name,
            };
          })
          .filter((item: POI | null): item is POI => item !== null)
          .slice(0, 500); // more markers

        setPois(parsed);
        fetchingPois.current = false;
      })
      .catch(() => {
        fetchingPois.current = false;
      });
  }, [playerPos]);

  /* ---------- Routing ---------- */

  useEffect(() => {
    if (!playerPos || !waypoint) return;

    const [pLat, pLon] = playerPos;
    const [wLat, wLon] = waypoint;

    if (
      [pLat, pLon, wLat, wLon].some(
        (v) => typeof v !== "number" || isNaN(v as number)
      )
    ) {
      return;
    }

    fetch(
      `https://router.project-osrm.org/route/v1/driving/${pLon},${pLat};${wLon},${wLat}?overview=full&geometries=geojson`
    )
      .then((r) => r.json())
      .then((d: any) => {
        const routeObj = d?.routes?.[0];
        if (!routeObj?.geometry?.coordinates) return;

        const rawCoords: [number, number][] = routeObj.geometry.coordinates;
        const safeRoute: LatLng[] = rawCoords
          .map((coord: [number, number]): LatLng | null => {
            if (
              !coord ||
              coord.length !== 2 ||
              typeof coord[0] !== "number" ||
              typeof coord[1] !== "number" ||
              isNaN(coord[0]) ||
              isNaN(coord[1])
            ) {
              return null;
            }
            return [coord[1], coord[0]];
          })
          .filter((c: LatLng | null): c is LatLng => c !== null);

        setRoute(safeRoute);
        setDrawnRoute([]);
        setRouteDistance(
          typeof routeObj.distance === "number" ? routeObj.distance : null
        );
        setRouteDuration(
          typeof routeObj.duration === "number" ? routeObj.duration : null
        );
      })
      .catch(console.error);
  }, [playerPos, waypoint]);

  /* ---------- Route animation ---------- */

  useEffect(() => {
    const cleanRoute = sanitizeLatLngArray(route);
    if (cleanRoute.length < 2) {
      setDrawnRoute([]);
      return;
    }

    let i = 0;
    setDrawnRoute([cleanRoute[0]]);

    if (animRef.current) cancelAnimationFrame(animRef.current);

    const animate = () => {
      i += 2;
      if (i >= cleanRoute.length) return;
      if (cleanRoute[i]) {
        setDrawnRoute((prev) => [...prev, cleanRoute[i]]);
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [route]);

  /* ---------- HUD helpers ---------- */

  const formatDistance = (m: number | null): string => {
    if (!m || m <= 0) return "";
    if (m < 1000) return `${m.toFixed(0)} m`;
    return `${(m / 1000).toFixed(1)} km`;
  };

  const formatDuration = (s: number | null): string => {
    if (!s || s <= 0) return "";
    const minutes = Math.round(s / 60);
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h} h`;
    return `${h} h ${m} min`;
  };

  const clearRoute = () => {
    setWaypoint(null);
    setRoute([]);
    setDrawnRoute([]);
    setRouteDistance(null);
    setRouteDuration(null);
  };

  /* ---------- Render ---------- */

  if (!icons || typeof window === "undefined" || !initialCenter) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        Initializing map…
      </div>
    );
  }

  const safeCenter: LatLng = initialCenter;
  const safeDrawnRoute = sanitizeLatLngArray(drawnRoute);

  const toggleType = (t: POIType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const hudDistance = formatDistance(routeDistance);
  const hudDuration = formatDuration(routeDuration);
  const showHUD = hudDistance || hudDuration;

  return (
    <>
      {/* Left controls */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          zIndex: 1100,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <button
          onClick={() => {
            const target =
              playerPos ?? loadLastLocation() ?? safeCenter;
            setRecenterTarget(target);
            setRecenterKey((k) => k + 1);
          }}
          style={{
            padding: "10px 20px",
            background: "white",
            border: "2px solid #333",
            borderRadius: "5px",
            cursor: "pointer",
            color: "black",
          }}
        >
          Recenter
        </button>

        <button
          onClick={clearRoute}
          style={{
            padding: "8px 16px",
            background: "white",
            border: "2px solid #333",
            borderRadius: "5px",
            cursor: "pointer",
            color: "black",
          }}
        >
          Clear Route
        </button>
      </div>

      {/* Help + filters bar */}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 1100,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 10,
        }}
      >
        <button
          onClick={() => {
            const next = !showHelp;
            setShowHelp(next);
            if (!next) saveHelpSeen();
          }}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "2px solid #333",
            background: "white",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          ?
        </button>

        {showHelp && (
          <div
            style={{
              marginTop: 4,
              padding: "8px 12px",
              maxWidth: 260,
              background: "rgba(255, 248, 220, 0.96)",
              borderRadius: 6,
              border: "1px solid #5b1a0a",
              fontSize: 12,
              fontFamily: "serif",
            }}
          >
            Tap the map or a location icon to set a waypoint. The line shows the
            fastest road route. Use Recenter to jump back to your position.
          </div>
        )}

        <div
          style={{
            marginTop: 8,
            padding: "6px 8px",
            background: "rgba(255, 255, 255, 0.95)",
            borderRadius: 6,
            border: "1px solid #333",
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            maxWidth: 320,
          }}
        >
          {(
            [
              ["hospital", "HOSP"],
              ["gas-station", "FUEL"],
              ["sheriff", "POLICE"],
              ["bank", "BANK"],
              ["restaurant", "FOOD"],
              ["shop", "SHOP"],
              ["hotel", "HOTEL"],
              ["camp", "CAMP"],
              ["saloon", "BAR"],
            ] as [POIType, string][]
          ).map(([type, label]) => {
            const active = activeTypes.has(type);
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                style={{
                  padding: "4px 8px",
                  fontSize: 11,
                  borderRadius: 4,
                  border: "1px solid #333",
                  cursor: "pointer",
                  background: active ? "#5b1a0a" : "white",
                  color: active ? "white" : "black",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* HUD */}
      {showHUD && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1100,
            padding: "8px 14px",
            background: "rgba(255, 248, 220, 0.96)",
            borderRadius: 8,
            border: "1px solid #5b1a0a",
            fontSize: 13,
            fontFamily: "serif",
          }}
        >
          {hudDistance && <span>{hudDistance}</span>}
          {hudDistance && hudDuration && <span> · </span>}
          {hudDuration && <span>{hudDuration}</span>}
        </div>
      )}

      {geoState === "denied" && (
        <div
          style={{
            position: "absolute",
            bottom: showHUD ? 60 : 20,
            left: 20,
            zIndex: 1100,
            padding: "6px 10px",
            background: "rgba(255,255,255,0.95)",
            borderRadius: 4,
            border: "1px solid #333",
            maxWidth: 260,
            fontSize: 12,
          }}
        >
          Location blocked. Enable location for this site in browser settings to
          see nearby POIs.
        </div>
      )}

      {/* Map */}
      <div style={{ position: "relative", height: "100vh", width: "100vw" }}>
        <MapContainer
          center={safeCenter}
          zoom={13}
          zoomControl={false}
          attributionControl={false}
          style={{ height: "100%", width: "100%" }}
        >
          <MapRecenter key={recenterKey} target={recenterTarget} />

          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png" />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
            opacity={0.55}
          />

          <WaypointClick onSet={setWaypoint} />

          {playerPos && isLatLng(playerPos) && (
            <Marker position={playerPos} icon={icons.player} />
          )}

          {pois
            .filter((p) => activeTypes.has(p.type))
            .filter((p) => isLatLng(p.position))
            .map((p) => {
              const icon = icons.poi[p.type] || icons.poi["shop"];
              return (
                <Marker
                  key={p.id}
                  position={p.position}
                  icon={icon}
                  eventHandlers={{
                    click: () => {
                      setWaypoint(p.position);
                      saveLastLocation(p.position);
                    },
                  }}
                >
                  {p.name && (
                    <Popup>
                      <div style={{ fontFamily: "serif", fontSize: 13 }}>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ marginTop: 4 }}>
                          Type: {p.type.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>
                          {p.position[0].toFixed(5)},{" "}
                          {p.position[1].toFixed(5)}
                        </div>
                      </div>
                    </Popup>
                  )}
                </Marker>
              );
            })}

          {waypoint && isLatLng(waypoint) && (
            <Marker position={waypoint} icon={icons.waypoint} />
          )}

          {safeDrawnRoute.length > 1 && (
            <Polyline
              positions={safeDrawnRoute}
              pathOptions={{
                color: "#5b1a0a",
                weight: 4,
                opacity: 0.9,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          )}
        </MapContainer>

        {/* Parchment overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 1000,
            backgroundImage:
              "url('/textures/parchment.jpg'), " +
              "radial-gradient(circle at 30% 20%, rgba(255,255,240,0.18), transparent 55%)," +
              "radial-gradient(circle at 80% 80%, rgba(222,184,135,0.2), transparent 55%)",
            backgroundBlendMode: "multiply, normal, normal",
            opacity: 0.7,
            boxShadow: "inset 0 0 120px rgba(60, 25, 0, 0.55)",
          }}
        />
      </div>
    </>
  );
}
