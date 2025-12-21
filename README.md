## 🗺️ RDR2-Inspired Interactive Map (Real-World)

A Red Dead Redemption 2–style interactive map built using Next.js + React Leaflet, combining cinematic UI design with real-world navigation logic.

This project recreates the look, feel, and interaction philosophy of AAA game maps (like RDR2) while working entirely on real geographic data.

## ✨ Features
🎮 RDR2-Inspired Visual Design

Parchment-style map overlay

Cinematic vignette & muted color grading

Custom RDR-style icons (towns, camps, shops, stables, doctors)

Smooth fade-in marker animations

Pulsing red waypoint marker

## 🧭 Real Navigation Logic

Uses real road networks (OSRM routing)

Automatically calculates shortest drivable path

Waypoints follow actual map roads, not straight lines

Distance calculation shown in HUD (km)

## 🚶 Player & Exploration System

Live player location via GPS

Fog-of-war effect that reveals explored areas

Persistent exploration trail during session

Auto camera fly-to on player movement

## 🗺️ Interactive Map Behavior

Click anywhere to set a waypoint

Click POIs to auto-route to them

Animated route drawing (progressively reveals path)

Custom UI HUD (no default map controls)

## ⚙️ Technical Polish

Client-only rendering (SSR-safe for Leaflet)

Fully type-safe with TypeScript

Production-ready build (Vercel compatible)

No third-party map UI plugins — logic written manually

## 🛠️ Tech Stack

Next.js 16 (App Router)

React 19

TypeScript

React-Leaflet & Leaflet

OSRM (Open Source Routing Machine)

Tailwind CSS (styling base)

Vercel (deployment)

## 🚀 Live Demo

🔗 Live URL: https://rdr2-map-two.vercel.app/

## 📸 Screenshots

<img width="1919" height="876" alt="image" src="https://github.com/user-attachments/assets/bcd44730-4973-47d3-900f-bcce722b3259" />


<img width="1918" height="876" alt="image" src="https://github.com/user-attachments/assets/8b746fee-acce-4278-b0d4-6673a42a312d" />


<img width="1919" height="878" alt="image" src="https://github.com/user-attachments/assets/4d115a8c-46a8-4c46-8fda-bc7e1867b1bd" />



## 🧠 What This Project Demonstrates

Strong understanding of map rendering & spatial logic

Ability to recreate AAA-game UI/UX patterns on the web

Real-world routing & animation handling

Advanced React state management

Production debugging (TypeScript + Vercel build issues)

This project was built from scratch, without cloning existing map templates.

## ⚠️ Disclaimer

This project is a fan-inspired UI/UX recreation.
It is not affiliated with Rockstar Games and does not use any proprietary RDR2 assets or data.

All map data comes from open geographic sources.

## 📦 Local Setup
git clone https://github.com/shlokburmi/rdr2-map.git
cd rdr2-map
npm install
npm run dev

## 🧩 Future Improvements (Planned)

Quest chains & markers

Random encounters

Persistent fog-of-war (localStorage)

Day/night visual transitions

Sound cues for waypoint placement

Controller / gamepad navigation

Performance optimizations for large routes

## 👤 Author

Shlok Burmi

🔗 GitHub: https://github.com/shlokburmi

## ⭐ If you like the project, consider starring the repo!

