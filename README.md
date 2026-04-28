<p align="center">
  <img src="https://img.shields.io/badge/RealWeave-Supply%20Chain%20Intelligence-00D1FF?style=for-the-badge&labelColor=0B0F19" alt="RealWeave Banner"/>
</p>

<h1 align="center">🧊 RealWeave</h1>

<p align="center">
  <strong>Real-Time Supply Chain Intelligence Platform</strong><br/>
  AI-powered logistics dashboard with live weather, traffic & route optimization
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite"/>
  <img src="https://img.shields.io/badge/Chart.js-FF6384?style=flat-square&logo=chartdotjs&logoColor=white" alt="Chart.js"/>
  <img src="https://img.shields.io/badge/Leaflet-199900?style=flat-square&logo=leaflet&logoColor=white" alt="Leaflet"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="License"/>
</p>

---

## 📖 Overview

**RealWeave** is a full-stack logistics intelligence dashboard that provides real-time shipment tracking, inventory management, risk alerting, and analytics — all through a premium dark-themed glassmorphism UI.

The platform integrates with live APIs (weather, traffic, routing) and runs a background simulation engine that continuously monitors shipment corridors for disruptions, automatically generating operational alerts.

---

## ✨ Features

| Module | Description |
|---|---|
| **📊 Operations Dashboard** | Live KPIs, AI demand forecasting chart, disruption risk doughnut, and interactive global fleet map |
| **🚚 Shipment Tracking** | Full CRUD for shipments with real-time status, search, filtering, and map markers |
| **📦 Inventory Hub** | SKU-level stock management with low-stock detection and threshold alerts |
| **🔔 Alerts Center** | Severity-filtered risk alerts auto-generated from weather & traffic APIs with deduplication |
| **📈 Deep Analytics** | Weekly / Monthly / Yearly views with volume, risk breakdown, delay rate & route efficiency charts |
| **⚙️ Settings** | User profile management, dark mode, notification preferences |
| **🤖 AI Assistant** | Chat widget interface (extensible) |
| **🔐 Auth System** | Full signup/login flow with session persistence |
| **📄 Report Export** | One-click export of analytics + shipment + inventory data as `.txt` report |

---

## 🏗️ Architecture

```
Supply_Chain/
├── backend/                    # FastAPI Server
│   ├── main.py                 # App entry, routes, background simulator
│   ├── models.py               # SQLAlchemy ORM models
│   ├── schemas.py              # Pydantic request/response schemas
│   ├── services.py             # External API integrations (Weather, Traffic, Routing)
│   ├── database.py             # DB engine & session config
│   ├── .env                    # API keys (not committed — see .env.example)
│   ├── .env.example            # Template for required environment variables
│   └── requirements.txt        # Python dependencies
│
├── frontend/                   # Static SPA (served by FastAPI)
│   ├── index.html              # Main dashboard UI
│   ├── login.html              # Authentication — sign in
│   ├── signup.html             # Authentication — create account
│   ├── css/
│   │   └── styles.css          # Full design system (glassmorphism dark theme)
│   └── js/
│       └── app.js              # Client-side logic, API layer, charts, map
│
├── .gitignore
└── README.md
```

---

## 🔌 API Integrations

| Service | Purpose | Fallback |
|---|---|---|
| [WeatherAPI.com](https://www.weatherapi.com/) | Live weather conditions along shipment routes | Simulated alerts (1% trigger rate) |
| [OpenRouteService](https://openrouteservice.org/) | Driving route optimization & distance/ETA | Random plausible simulation |
| [TomTom Traffic](https://developer.tomtom.com/) | Real-time traffic congestion monitoring | Simulated congestion alerts |

> **Note:** All integrations have graceful fallbacks — the app runs fully in simulation mode without any API keys configured.

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **pip** (Python package manager)

### 1. Clone the Repository

```bash
git clone https://github.com/Smit-08/RealWeave.git
cd RealWeave
```

### 2. Set Up Environment Variables

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in your API keys:

```env
WEATHER_API_KEY=your_key_here
OPENROUTE_SERVICE_KEY=your_key_here
TOMTOM_API_KEY=your_key_here
DATABASE_URL=sqlite:///./supplychain.db
```

> Leaving keys blank is fine — the app will use simulation mode.

### 3. Install Dependencies

```bash
pip install -r backend/requirements.txt
```

### 4. Run the Server

```bash
uvicorn backend.main:app --reload --port 8000
```

### 5. Open the App

Navigate to **[http://localhost:8000](http://localhost:8000)** in your browser.

---

## 🔗 Available Routes

| Route | Description |
|---|---|
| `/` | Redirects to dashboard |
| `/static/index.html` | Main dashboard |
| `/static/login.html` | Sign in page |
| `/static/signup.html` | Create account page |
| `/docs` | Interactive Swagger API docs |
| `/redoc` | ReDoc API documentation |

---

## 📡 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/shipments` | List all shipments |
| `POST` | `/api/shipments` | Create a new shipment |
| `DELETE` | `/api/shipments/{id}` | Delete a shipment |
| `GET` | `/api/inventory` | List all inventory items |
| `POST` | `/api/inventory` | Add a new inventory item |
| `GET` | `/api/alerts` | Get unresolved alerts (max 10) |
| `GET` | `/api/analytics?time_range=monthly` | Get analytics data (`weekly` / `monthly` / `yearly`) |
| `GET` | `/api/predict-delay?lat=&lng=` | AI delay prediction for coordinates |
| `GET` | `/api/optimize-route?start_lng=&start_lat=&end_lng=&end_lat=` | Route optimization |
| `POST` | `/api/signup` | Create a new user account |
| `POST` | `/api/login` | Authenticate user |

---

## 🎨 Design System

The UI is built with a custom **Cyber-Premium** design language:

- **Typography:** [Outfit](https://fonts.google.com/specimen/Outfit) + [Inter](https://fonts.google.com/specimen/Inter)
- **Theme:** Deep dark (`#0B0F19`) with glassmorphism cards
- **Accent:** Cyan glow (`#00D1FF`) + Purple (`#8B5CF6`)
- **Effects:** Backdrop blur, glow shadows, smooth cubic-bezier transitions
- **Icons:** [Font Awesome 6](https://fontawesome.com/)
- **Charts:** [Chart.js](https://www.chartjs.org/)
- **Maps:** [Leaflet](https://leafletjs.com/) with CartoDB dark tiles
- **Responsive:** Adapts from full sidebar → icon-only sidebar on smaller screens

---

## ⚡ Background Engine

RealWeave runs a **real-time simulation loop** (`realtime_simulator`) that executes every 30 seconds:

1. **Shipment Movement** — Slightly shifts lat/lng of in-transit shipments
2. **Weather Scan** — Checks WeatherAPI for severe conditions along routes
3. **Traffic Scan** — Queries TomTom for congestion near shipment positions
4. **Alert Generation** — Persists new alerts with:
   - 6-hour deduplication window (prevents repeat alerts)
   - Hard cap of 10 unresolved alerts (keeps the UI clean)
   - Startup cleanup of stale/resolved alerts

---

## 🗃️ Database Schema

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Shipments  │   │  Inventory  │   │   Alerts    │
├─────────────┤   ├─────────────┤   ├─────────────┤
│ id (PK)     │   │ id (PK)     │   │ id (PK)     │
│ product     │   │ sku (UQ)    │   │ type        │
│ source      │   │ name        │   │ severity    │
│ destination │   │ stock       │   │ message     │
│ eta         │   │ threshold   │   │ time        │
│ status      │   │ supplier    │   │ resolved    │
│ risk        │   │ status      │   │ timestamp   │
│ lat / lng   │   └─────────────┘   └─────────────┘
│ last_updated│
└─────────────┘
        ┌─────────────┐   ┌─────────────┐
        │   Users     │   │  Settings   │
        ├─────────────┤   ├─────────────┤
        │ id (PK)     │   │ key (PK)    │
        │ email (UQ)  │   │ value       │
        │ password    │   └─────────────┘
        │ full_name   │
        │ role        │
        └─────────────┘
```

---

## 🛡️ Security Notes

- API keys are loaded from `.env` via `python-dotenv` — **never committed to Git**
- `.gitignore` excludes `.env`, `*.db`, and `__pycache__/`
- A `.env.example` template is provided for collaborators
- Passwords are stored as plaintext in this MVP — **hash them** (e.g., with `bcrypt`) before production use
- CORS is currently set to allow all origins (`*`) — restrict this in production

---

## 🗺️ Roadmap

- [ ] Password hashing with `bcrypt`
- [ ] JWT-based authentication with token refresh
- [ ] WebSocket real-time push for alerts
- [ ] Supabase / PostgreSQL migration for production data
- [ ] Docker containerization
- [ ] CI/CD pipeline
- [ ] Mobile-responsive PWA
- [ ] AI chat assistant with LLM integration

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ⚡ by the RealWeave Team
</p>
