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
  } catch {
    /* ignore */
  }
  return null;
};

const saveLastLocation = (pos: LatLng) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(pos));
  } catch {
    /* ignore */
  }
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

  const fetchingPois = useRef(false);
  const animRef = useRef<number | null>(null);

  /* ---------- Icons (small) ---------- */

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
    // 1) Try last location from previous sessions
    const last = loadLastLocation();
    if (last) {
      setInitialCenter(last);
      setRecenterTarget(last);
    } else {
      // neutral center near Gulf of Guinea if absolutely nothing
      setInitialCenter([0, 0]);
    }

    // 2) Try geolocation (will override if succeeds)
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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  /* ---------- Fetch POIs around player (if known) ---------- */

  useEffect(() => {
    if (!playerPos || fetchingPois.current) return;
    const [lat, lon] = playerPos;
    if (
      typeof lat !== "number" ||
      typeof lon !== "number" ||
      isNaN(lat) ||
      isNaN(lon)
    ) {
      return;
    }

    fetchingPois.current = true;
    const radius = 20000;

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
          .slice(0, 500);

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
        if (!d?.routes?.[0]?.geometry?.coordinates) return;

        const rawCoords: [number, number][] = d.routes[0].geometry.coordinates;
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

  return (
    <>
      <button
        onClick={() => {
          const target =
            playerPos ?? loadLastLocation() ?? safeCenter;
          setRecenterTarget(target);
          setRecenterKey((k) => k + 1);
        }}
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          zIndex: 1100,
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

      {geoState === "denied" && (
        <div
          style={{
            position: "absolute",
            top: 70,
            left: 20,
            zIndex: 1100,
            padding: "6px 10px",
            background: "rgba(255,255,255,0.9)",
            borderRadius: 4,
            border: "1px solid #333",
            maxWidth: 260,
            fontSize: 12,
          }}
        >
          Location blocked. Enable location for this site in browser settings
          to see nearby POIs.
        </div>
      )}

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
                  {p.name && <Popup>{p.name}</Popup>}
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
