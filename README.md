# JomiMap — জমিম্যাপ

**Land Measurement Tool for Bangladesh** · বাংলাদেশের জন্য জমি পরিমাপ যন্ত্র

[![Live Demo](https://img.shields.io/badge/Live-jomimap.vercel.app-4a7c59?style=flat-square)](https://jomimap.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript)](https://typescriptlang.org)

---

## What is JomiMap?

JomiMap is a free, open-source web tool that lets you measure land area and distances directly from any map PDF or image — without needing expensive GIS software.

Built specifically for Bangladesh, it supports all local land units including Bigha, Katha, Decimal (Shotok), Acre, and Hectare using **Tangail district standards**.

### Key Features

- **Load any map PDF or image** (up to 20MB) — including multi-page PDFs
- **Draw to calibrate** — set scale by drawing a line over a known distance on the map
- **Measure distance** between two points
- **Measure area** by tracing a polygon boundary
- **All Bangladesh units** — results shown in all units simultaneously
- **Export PDF report** — highlighted area with verified stamp and full measurement data
- **Bilingual** — full English and Bengali (বাংলা) interface
- **3 themes** — Light, Dark, Sepia
- Works on **all devices** — mobile, tablet, desktop

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript (TSX) |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| PDF Rendering | PDF.js (Mozilla) |
| Canvas Drawing | Fabric.js |
| PDF Export | jsPDF + html2canvas |
| Routing | React Router v6 |
| Hosting | Vercel |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/mehedyk/JomiMap.git
cd JomiMap

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

---

## Map Scale

The default scale is **16 inches = 1 mile**, which is the standard for many Bangladesh survey maps (including Tangail district maps).

You can change this in two ways:
1. **Manual input** — enter a custom scale ratio
2. **Draw to calibrate** — draw a line on the map over a known distance and enter the real value

---

## Land Units (Tangail Standard)

| Unit | Bengali | Sq Feet |
|------|---------|---------|
| 1 Katha | কাঠা | 720 sq ft |
| 1 Bigha | বিঘা | 14,400 sq ft (20 Katha) |
| 1 Decimal | শতক | 435.6 sq ft |
| 1 Acre | একর | 43,560 sq ft |
| 1 Hectare | হেক্টর | 107,639 sq ft |

> **Note:** Katha and Bigha values vary by district. This app uses Tangail district standard. See the [Units Guide](/units-guide) in the app for the full reference.

---

## Project Structure

```
src/
├── components/       # Navbar, Footer
├── context/          # AppContext (theme, language)
├── i18n/             # EN and BN translation strings
├── pages/            # HomePage, MeasurePage, UnitsGuidePage, CreditsPage
├── utils/            # units.ts, scale.ts, export.ts
└── styles/           # global.css (theme variables)
```

---

## Roadmap

### v1 (current) ✅ Complete
- [x] Project foundation, routing, theming (Light/Dark/Sepia)
- [x] Full bilingual i18n (EN/BN)
- [x] All Bangladesh units (Bigha, Katha, Decimal, Acre, Hectare, sq ft, sq m, sq km)
- [x] Units guide page with full conversion table
- [x] Credits page with Surah Al-An'am 6:59
- [x] PDF/image loading with PDF.js (up to 20MB, multi-page)
- [x] Canvas measurement tools — distance & area polygon
- [x] Zoom/pan — mouse wheel + pinch-to-zoom on mobile
- [x] Draw-to-calibrate scale
- [x] Export PDF report with highlighted area + verified stamp

### v2 (planned)
- [ ] Supabase authentication
- [ ] Freemium model — free measurements, paid exports
- [ ] bKash / Nagad payment integration
- [ ] Usage history
- [ ] Multiple regions / district standards

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

---

## Credits

Built by [Mehedy](https://github.com/mehedyk) · বানিয়েছেন [মেহেদী](https://github.com/mehedyk)

> وَيَعْلَمُ مَا فِى ٱلْبَرِّ وَٱلْبَحْرِ ۚ وَمَا تَسْقُطُ مِن وَرَقَةٍ إِلَّا يَعْلَمُهَا
>
> *"He knows what is on the land and in the sea. Not a leaf falls but that He knows it."*
> — Surah Al-An'am, 6:59

---

## License

MIT © [Mehedy](https://github.com/mehedyk)
