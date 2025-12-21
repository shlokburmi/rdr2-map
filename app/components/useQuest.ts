import { useEffect, useState } from "react";

interface POI {
  pos: [number, number];
  type: string;
}

export function useQuest(
  pois: POI[],
  waypoint: [number, number] | null
) {
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!waypoint || completed) return;

    const found = pois.find(
      (p) =>
        Math.abs(p.pos[0] - waypoint[0]) < 0.0005 &&
        Math.abs(p.pos[1] - waypoint[1]) < 0.0005
    );

    if (found) {
      alert(`Quest Complete: Visit ${found.type}`);
      setCompleted(true);
    }
  }, [pois, waypoint, completed]);
}
