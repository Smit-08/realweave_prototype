import os
import random
from typing import List, Optional
from datetime import datetime, timedelta

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, FileResponse
from sqlalchemy.orm import Session

from . import models, schemas, database, services
from .database import engine, get_db
import asyncio
from fastapi import BackgroundTasks

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="RealWeave MVP")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return FileResponse(os.path.join(frontend_path, "index.html"))

@app.get("/login")
def login_page():
    return FileResponse(os.path.join(frontend_path, "login.html"))

@app.get("/signup")
def signup_page():
    return FileResponse(os.path.join(frontend_path, "signup.html"))

# Seed Data Function
def seed_db(db: Session):
    if db.query(models.Shipment).count() == 0:
        initial_shipments = [
            models.Shipment(id="SH-4592", product="Lithium-Ion Pack", source="Shanghai, CN", destination="Mumbai, IN", eta="2d 14h", status="In Transit", risk="Low", lat=31.2304, lng=121.4737),
            models.Shipment(id="SH-1024", product="Nvidia H100 GPU", source="Hsinchu, TW", destination="Bangalore, IN", eta="Delayed", status="Delayed", risk="High", lat=24.7821, lng=120.9928),
            models.Shipment(id="SH-8821", product="Aluminium Sheets", source="Dubai, AE", destination="Chennai, IN", eta="12h 45m", status="In Transit", risk="Medium", lat=25.2048, lng=55.2708)
        ]
        db.add_all(initial_shipments)
    
    if db.query(models.Inventory).count() == 0:
        initial_inventory = [
            models.Inventory(id="1", sku="BAT-LIT-01", name="Lithium Batteries", stock=450, threshold=500, supplier="EnergyX Corp", status="Healthy"),
            models.Inventory(id="2", sku="SEM-H100-05", name="Nvidia H100 GPUs", stock=12, threshold=20, supplier="TSMC Logistics", status="Low Stock"),
            models.Inventory(id="3", sku="ALU-SHT-99", name="Aluminium Sheets", stock=1200, threshold=1000, supplier="Global Metals", status="Healthy")
        ]
        db.add_all(initial_inventory)
    
    if db.query(models.Alert).count() == 0:
        initial_alerts = [
            models.Alert(type="Weather Update", severity="Medium", message="Heavy rain in Mumbai area may cause 4h delay for SH-4592", time="10m ago"),
            models.Alert(type="Inventory Alert", severity="High", message="GPU Stock levels below critical threshold (12/20)", time="1h ago")
        ]
        db.add_all(initial_alerts)
    db.commit()

@app.on_event("startup")
async def on_startup():
    db = database.SessionLocal()
    seed_db(db)
    
    # Cleanup: purge stale alerts on startup, keep only top 5 unresolved
    all_unresolved = db.query(models.Alert).filter(
        models.Alert.resolved == False
    ).order_by(models.Alert.timestamp.desc()).all()
    
    if len(all_unresolved) > 5:
        stale_ids = [a.id for a in all_unresolved[5:]]
        db.query(models.Alert).filter(models.Alert.id.in_(stale_ids)).delete(synchronize_session=False)
    
    # Also remove all resolved alerts (they're no longer useful)
    db.query(models.Alert).filter(models.Alert.resolved == True).delete(synchronize_session=False)
    db.commit()
    
    db.close()
    # Start the background simulator
    asyncio.create_task(realtime_simulator())

async def realtime_simulator():
    """Background task to simulate shipment movement and realtime alerts"""
    while True:
        await asyncio.sleep(30) # Run every 30 seconds for real API balance
        db = database.SessionLocal()
        try:
            # 1. Move Shipments
            shipments = db.query(models.Shipment).filter(models.Shipment.status == "In Transit").all()
            for s in shipments:
                # Move slightly towards destination (mock logic)
                s.lat += random.uniform(-0.002, 0.002)
                s.lng += random.uniform(-0.002, 0.002)
                s.last_updated = datetime.utcnow()
                
                # 2. Real-Time Scans
                new_alerts = []
                
                # Weather Scan
                weather = services.WeatherService.get_weather_alerts(s.lat, s.lng)
                if weather: new_alerts.extend(weather)
                
                # Traffic Scan
                traffic = services.TrafficService.get_congestion_alert(s.lat, s.lng)
                if traffic: new_alerts.append(traffic)
                
                # 3. Persist new unique alerts (by type and general vicinity)
                for na in new_alerts:
                    # Check if a similar alert (same type) already exists recently
                    # 6-hour dedup window prevents alert flooding
                    exists = db.query(models.Alert).filter(
                        models.Alert.type == na["type"],
                        models.Alert.resolved == False,
                        models.Alert.timestamp > datetime.utcnow() - timedelta(hours=6)
                    ).first()
                    
                    # Also cap total unresolved alerts at 10 to keep the UI clean
                    unresolved_count = db.query(models.Alert).filter(
                        models.Alert.resolved == False
                    ).count()
                    
                    if not exists and unresolved_count < 10:
                        db.add(models.Alert(**na))
            
            db.commit()
        except Exception as e:
            print(f"Simulation Error: {e}")
        finally:
            db.close()

# --- ENDPOINTS ---

@app.get("/api/shipments", response_model=List[schemas.Shipment])
def read_shipments(db: Session = Depends(get_db)):
    return db.query(models.Shipment).all()

@app.post("/api/shipments", response_model=schemas.Shipment)
def create_shipment(shipment: schemas.ShipmentCreate, db: Session = Depends(get_db)):
    db_shipment = models.Shipment(**shipment.dict())
    db.add(db_shipment)
    db.commit()
    db.refresh(db_shipment)
    return db_shipment

@app.delete("/api/shipments/{shipment_id}")
def delete_shipment(shipment_id: str, db: Session = Depends(get_db)):
    db.query(models.Shipment).filter(models.Shipment.id == shipment_id).delete()
    db.commit()
    return {"status": "success"}

@app.get("/api/inventory", response_model=List[schemas.Inventory])
def read_inventory(db: Session = Depends(get_db)):
    return db.query(models.Inventory).all()

@app.post("/api/inventory", response_model=schemas.Inventory)
def create_inventory(item: schemas.InventoryCreate, db: Session = Depends(get_db)):
    db_item = models.Inventory(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.get("/api/alerts", response_model=List[schemas.Alert])
def read_alerts(db: Session = Depends(get_db)):
    # Only return existing unresolved alerts — the background simulator handles generation.
    # No live scanning here to avoid flooding alerts on every frontend poll.
    return db.query(models.Alert).filter(
        models.Alert.resolved == False
    ).order_by(models.Alert.timestamp.desc()).limit(10).all()

@app.get("/api/predict-delay")
def predict_delay(lat: float, lng: float):
    weather = services.WeatherService.get_weather_alerts(lat, lng)
    traffic = services.TrafficService.get_congestion_alert(lat, lng)
    
    base_prob = 5
    risk_factors = []
    
    if weather:
        sev = weather[0]["severity"]
        base_prob += 40 if sev == "High" else 20
        risk_factors.append(f"Weather ({sev})")
    
    if traffic:
        base_prob += 30 if traffic["severity"] == "High" else 15
        risk_factors.append("Traffic Congestion")
    
    return {
        "delay_probability": f"{min(base_prob + random.randint(0, 10), 99)}%",
        "risk_level": "High" if base_prob > 35 else "Medium" if base_prob > 15 else "Low",
        "factors": risk_factors,
        "action": "Divert immediately" if base_prob > 50 else "Monitor closely" if base_prob > 20 else "Continue"
    }

@app.get("/api/optimize-route")
def optimize_route(start_lng: float, start_lat: float, end_lng: float, end_lat: float):
    route_info = services.RoutingService.get_route_info([start_lng, start_lat], [end_lng, end_lat])
    if not route_info:
        return {"error": "Routing service unavailable"}
    
    return {
        "distance_km": round(route_info["distance"], 2),
        "eta_minutes": round(route_info["duration"]),
        "geometry": route_info["geometry"]
    }

@app.get("/api/analytics")
def get_analytics(time_range: str = "monthly", db: Session = Depends(get_db)):
    total_shipments = db.query(models.Shipment).count()
    delayed = db.query(models.Shipment).filter(models.Shipment.status == "Delayed").count()
    success_rate = round(((total_shipments - delayed) / total_shipments) * 100) if total_shipments > 0 else 100
    
    # Calculate Risk Breakdown from Alerts
    alerts = db.query(models.Alert).all()
    risk_counts = {"Weather": 0, "Traffic": 0, "Port Delay": 0, "Customs": 0}
    for a in alerts:
        for r_key in risk_counts.keys():
            if r_key.lower() in a.type.lower() or r_key.lower() in a.message.lower():
                risk_counts[r_key] += 1
    
    if sum(risk_counts.values()) == 0:
        risk_counts = {"Weather": 35, "Traffic": 25, "Port Delay": 20, "Customs": 20}

    # Dynamic Chart Data based on time_range
    if time_range == "weekly":
        labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        volume_data = [65, 78, 82, 45, 91, 34, 28]
        delay_data = [3.2, 4.1, 2.8, 5.5, 3.9, 1.2, 0.8]
    elif time_range == "yearly":
        labels = ["2019", "2020", "2021", "2022", "2023", "2024"]
        volume_data = [4200, 3800, 5100, 6400, 7200, 8500]
        delay_data = [8.5, 12.4, 9.2, 7.1, 5.4, 4.2]
    else: # monthly
        labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
        volume_data = [450, 520, 480, 610, 590, 750]
        delay_data = [5.2, 4.8, 6.1, 3.9, 4.2, 2.8]

    return {
        "metrics": {
            "total_shipments": total_shipments,
            "active_deliveries": db.query(models.Shipment).filter(models.Shipment.status == "In Transit").count(),
            "risk_alerts": db.query(models.Alert).filter(models.Alert.resolved == False).count(),
            "success_rate": f"{success_rate}%"
        },
        "charts": {
            "volume": {
                "labels": labels,
                "data": volume_data
            },
            "risk": {
                "labels": list(risk_counts.keys()),
                "data": list(risk_counts.values())
            },
            "delay": {
                "labels": [f"P{i+1}" for i in range(len(labels))],
                "data": delay_data
            },
            "efficiency": {
                "labels": ["SHA-MUM", "SIN-CHN", "DXB-CHN", "TPE-BLR", "HKG-DEL"],
                "data": [98, 95, 92, 88, 85]
            }
        }
    }

@app.post("/api/chat")
def ai_chat(data: dict):
    message = data.get("message", "").lower()
    
    # Simple rule-based AI response for MVP
    if "shipment" in message:
        return {"response": "I can help you track your shipments. Currently, you have several shipments in transit between Shanghai and Mumbai. Would you like to see the risk analysis for any specific one?"}
    elif "alert" in message:
        return {"response": "The system is currently monitoring 12 critical alerts. Most are related to heavy rain in the Mumbai corridor. I recommend diverting SH-4592."}
    elif "inventory" in message:
        return {"response": "Inventory levels for Lithium Batteries are below the threshold. I've flagged this in the Inventory Hub for you."}
    else:
        return {"response": "Hello! I am the RealWeave AI assistant. I can help you with shipment tracking, risk analysis, and inventory optimization. How can I assist you today?"}

@app.post("/api/settings")
def update_settings(data: dict, db: Session = Depends(get_db)):
    for key, value in data.items():
        db_setting = db.query(models.Setting).filter(models.Setting.key == key).first()
        if db_setting:
            db_setting.value = str(value)
        else:
            db.add(models.Setting(key=key, value=str(value)))
    db.commit()
    return {"status": "success"}

@app.get("/api/settings")
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(models.Setting).all()
    return {s.key: s.value for s in settings}

@app.post("/api/signup")
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = models.User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=user.password # In a real app, hash this!
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"status": "success", "user": {"name": new_user.full_name, "email": new_user.email, "role": new_user.role}}

@app.post("/api/login")
def login(data: dict, db: Session = Depends(get_db)):
    email = data.get("email")
    password = data.get("password")
    
    user = db.query(models.User).filter(models.User.email == email).first()
    
    if user and user.hashed_password == password:
        return {
            "status": "success",
            "token": "mock-jwt-token",
            "user": {
                "name": user.full_name,
                "email": user.email,
                "role": user.role
            }
        }
    
    # Fallback for the demo account if not in DB
    if email == "john.doe@example.com" and password:
        return {
            "status": "success",
            "token": "mock-jwt-token",
            "user": {
                "name": "John Doe",
                "email": email,
                "role": "Global Fleet Manager"
            }
        }
        
    raise HTTPException(status_code=401, detail="Invalid credentials")

# --- STATIC CONTENT & FRONTEND ---

frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))

# Mount CSS and JS subdirectories specifically to avoid serving HTML at /static/
app.mount("/css", StaticFiles(directory=os.path.join(frontend_path, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(frontend_path, "js")), name="js")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
