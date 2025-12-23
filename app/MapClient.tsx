"use client";

import dynamic from "next/dynamic";

// This forces the map to ONLY load in the browser, bypassing the server crash
const RDR2Map = dynamic(() => import("./components/RDR2Map"), {
  ssr: false,
  loading: () => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      backgroundColor: '#f5f5f5',
      color: '#333'
    }}>
      <p>Loading Map Environment...</p>
    </div>
  ),
});

export default function MapClient() {
  return <RDR2Map />;
}