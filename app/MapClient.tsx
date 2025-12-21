"use client";

import dynamic from "next/dynamic";

const RDR2Map = dynamic(() => import("./components/RDR2Map"), {
  ssr: false,
});

export default function MapClient() {
  return <RDR2Map />;
}
