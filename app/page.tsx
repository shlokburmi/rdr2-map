import Image from "next/image";
import MapClient from "./MapClient";


export default function Home() {
  return (
    <main style={{ position: "relative" }}>
      <MapClient />

      {/* Parchment overlay */}
      <Image
        src="/parchment.png"
        alt="parchment"
        fill
        style={{
          opacity: 0.35,
          mixBlendMode: "multiply",
          pointerEvents: "none",
        }}
      />


      {/* Compass */}
      <Image
        src="/compass.png"
        alt="compass"
        width={90}
        height={90}
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          pointerEvents: "none",
        }}
      />
    </main>
  );
}
