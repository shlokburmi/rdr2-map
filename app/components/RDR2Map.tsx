"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Circle,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";

function MiniMap({ center }: { center: [number, number] | null }) {
  if (!center) return null;

  return (
    <div className="rdr-minimap">
      <MapContainer
        center={center}
        zoom={15}
        dragging={false}
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        attributionControl={false}
        keyboard={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        />
        <Marker position={center} />
      </MapContainer>
    </div>
  );
}

/* ---------------- Leaflet icon fix ---------------- */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ---------------- Types ---------------- */
type LatLng = [number, number];
type POIType = "shop" | "camp" | "doctor" | "stable" | "town";

interface POI {
  type: POIType;
  position: LatLng;
}

/* ---------------- Icons ---------------- */
const playerIcon = new L.Icon({
  iconUrl: "/icons/player.png",
  iconSize: [36, 36],
});

const waypointIcon = new L.Icon({
  iconUrl: "/icons/waypoint.png",
  iconSize: [28, 28],
  className: "rdr-waypoint",
});

const poiIcons: Record<POIType, L.Icon> = {
  shop: new L.Icon({ iconUrl: "/icons/shop.png", iconSize: [28, 28] }),
  camp: new L.Icon({ iconUrl: "/icons/camp.png", iconSize: [28, 28] }),
  doctor: new L.Icon({ iconUrl: "/icons/doctor.png", iconSize: [28, 28] }),
  stable: new L.Icon({ iconUrl: "/icons/stable.png", iconSize: [28, 28] }),
  town: new L.Icon({ iconUrl: "/icons/town.png", iconSize: [32, 32] }),
};

/* ---------------- Camera ---------------- */
function FlyTo({ target }: { target: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, 14, { duration: 2, easeLinearity: 0.25 });
    }
  }, [target, map]);
  return null;
}

/* ---------------- Click ---------------- */
function WaypointClick({ onSet }: { onSet: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onSet([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

/* ================= MAIN ================= */
export default function RDR2Map() {
  const [playerPos, setPlayerPos] = useState<LatLng | null>(null);
  const [waypoint, setWaypoint] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<LatLng[]>([]);
  const [animatedRoute, setAnimatedRoute] = useState<LatLng[]>([]);
  const [distance, setDistance] = useState<number | null>(null);

  const animRef = useRef<number | null>(null);
  const explored = useRef<LatLng[]>([]);

  /* -------- GPS -------- */
  useEffect(() => {
    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const p: LatLng = [pos.coords.latitude, pos.coords.longitude];
        setPlayerPos(p);
        explored.current.push(p);
      },
      () => {},
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  /* -------- OSRM ROUTE -------- */
  useEffect(() => {
    if (!playerPos || !waypoint) return;

    fetch(
      `https://router.project-osrm.org/route/v1/driving/${playerPos[1]},${playerPos[0]};${waypoint[1]},${waypoint[0]}?overview=full&geometries=geojson`
    )
      .then((r) => r.json())
      .then((d) => {
        if (!d?.routes?.[0]?.geometry?.coordinates) return;

        const coords: LatLng[] = d.routes[0].geometry.coordinates
          .map(([lng, lat]: number[]) => [lat, lng] as LatLng)
          .filter(
            (p) =>
              Array.isArray(p) &&
              typeof p[0] === "number" &&
              typeof p[1] === "number"
          );

        if (coords.length < 2) return;

        setRoute(coords);
        setAnimatedRoute([coords[0]]);
        setDistance(d.routes[0].distance / 1000);
      });
  }, [playerPos, waypoint]);

  /* -------- SAFE ROUTE ANIMATION -------- */
  useEffect(() => {
    if (route.length < 2) return;

    let index = 1;

    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }

    const animate = () => {
      if (index >= route.length) return;

      const point = route[index];
      if (!point) return;

      setAnimatedRoute((prev) => [...prev, point]);
      index++;

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [route]);

  /* -------- POIs -------- */
  const pois: POI[] = useMemo(() => {
    const center: LatLng = [23.458, 75.417];
    const types: POIType[] = ["shop", "camp", "doctor", "stable"];
    const list: POI[] = [{ type: "town", position: center }];

    for (let i = 0; i < 35; i++) {
      list.push({
        type: types[Math.floor(Math.random() * types.length)],
        position: [
          center[0] + (Math.random() - 0.5) * 0.12,
          center[1] + (Math.random() - 0.5) * 0.12,
        ],
      });
    }
    return list;
  }, []);

  /* -------- FINAL SAFETY FILTER -------- */
  const safeAnimatedRoute = animatedRoute.filter(
    (p): p is LatLng =>
      Array.isArray(p) &&
      typeof p[0] === "number" &&
      typeof p[1] === "number"
  );

  return (
    <>
      {distance && (
        <div className="rdr-distance rdr-ui">
          {distance.toFixed(1)} km
        </div>
      )}

      <MapContainer
        center={[23.458, 75.417]}
        zoom={12}
        zoomControl={false}
        attributionControl={false}
        preferCanvas
        style={{ height: "100vh", width: "100vw" }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png" />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
          opacity={0.6}
        />

        <WaypointClick onSet={setWaypoint} />

        {playerPos && (
          <>
            <Marker position={playerPos} icon={playerIcon} />
            <FlyTo target={playerPos} />
          </>
        )}

        {pois.map((p, i) => (
          <Marker
            key={i}
            position={p.position}
            icon={poiIcons[p.type]}
            eventHandlers={{ click: () => setWaypoint(p.position) }}
          >
            <Popup>{p.type.toUpperCase()}</Popup>
          </Marker>
        ))}

        {waypoint && <Marker position={waypoint} icon={waypointIcon} />}

        {safeAnimatedRoute.length > 1 && (
          <Polyline
            positions={safeAnimatedRoute}
            pathOptions={{
              color: "#8b0000",
              weight: 3,
              dashArray: "8 8",
            }}
          />
        )}

        {explored.current.map((p, i) => (
          <Circle
            key={i}
            center={p}
            radius={450}
            pathOptions={{ color: "transparent", fillOpacity: 0 }}
          />
        ))}

        <div className="rdr-parchment" />
      </MapContainer>
    </>
  );
}
