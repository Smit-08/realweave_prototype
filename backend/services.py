import requests
import os
from dotenv import load_dotenv

load_dotenv()

WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")
OPENROUTE_SERVICE_KEY = os.getenv("OPENROUTE_SERVICE_KEY")
TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY")

class WeatherService:
    @staticmethod
    def get_weather_alerts(lat, lon):
        if not WEATHER_API_KEY or "your_" in WEATHER_API_KEY:
            # Simulated Realtime Fallback
            import random
            if random.random() > 0.99: # 1% chance — only critical events
                return [{
                    "type": "Weather Simulation",
                    "severity": "High",
                    "message": f"Simulated: Severe meteorological disruption near ({round(lat,2)}, {round(lon,2)}).",
                    "time": "Just now"
                }]
            return []
        
        # Using WeatherAPI.com as per user's provided key
        url = f"http://api.weatherapi.com/v1/current.json?key={WEATHER_API_KEY}&q={lat},{lon}"
        try:
            response = requests.get(url)
            data = response.json()
            alerts = []
            
            if "current" in data:
                condition = data["current"]["condition"]["text"].lower()
                # Only trigger alerts for severe weather conditions
                adverse_keywords = ["storm", "blizzard", "thunder", "hurricane", "tornado", "heavy rain", "heavy snow"]
                if any(k in condition for k in adverse_keywords):
                    alerts.append({
                        "type": "Weather Alert",
                        "severity": "High" if any(k in condition for k in ["storm", "thunder", "hurricane", "tornado", "blizzard"]) else "Medium",
                        "message": f"Severe Logistics Warning: {condition.title()} reported at ({lat}, {lon}).",
                        "time": "Just now"
                    })
            return alerts
        except Exception as e:
            print(f"Error fetching weather from WeatherAPI: {e}")
            return []

class RoutingService:
    @staticmethod
    def get_route_info(start_coords, end_coords):
        """
        start_coords: [lng, lat]
        end_coords: [lng, lat]
        """
        if not OPENROUTE_SERVICE_KEY or "your_" in OPENROUTE_SERVICE_KEY:
            # Fallback to plausible simulation if no key
            return {
                "distance": round(random.uniform(50, 500), 2),
                "duration": round(random.uniform(60, 480), 0),
                "geometry": None
            }
        
        # Real API Call
        url = "https://api.openrouteservice.org/v2/directions/driving-car"
        headers = {
            'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
            'Authorization': OPENROUTE_SERVICE_KEY,
            'Content-Type': 'application/json; charset=utf-8'
        }
        body = {"coordinates": [start_coords, end_coords]}
        
        try:
            response = requests.post(url, json=body, headers=headers)
            data = response.json()
            if "routes" in data:
                route = data["routes"][0]
                summary = route["summary"]
                return {
                    "distance": summary["distance"] / 1000, # km
                    "duration": summary["duration"] / 60, # minutes
                    "geometry": route.get("geometry")
                }
            return None
        except Exception as e:
            print(f"Error fetching real route: {e}")
            return None

class TrafficService:
    @staticmethod
    def get_congestion_alert(lat, lon):
        if not TOMTOM_API_KEY or "your_" in TOMTOM_API_KEY:
            # Simulated Traffic Fallback
            import random
            if random.random() > 0.99: # 1% chance — only severe congestion
                return {
                    "type": "Traffic Simulation",
                    "severity": "High",
                    "message": f"Simulated: Severe congestion detected at ({round(lat,2)}, {round(lon,2)}).",
                    "time": "Just now"
                }
            return None
            
        url = f"https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key={TOMTOM_API_KEY}&point={lat},{lon}"
        try:
            response = requests.get(url)
            data = response.json()
            flow = data.get("flowSegmentData", {})
            current_speed = flow.get("currentSpeed", 0)
            free_flow_speed = flow.get("freeFlowSpeed", 1)
            
            # Only alert on severe congestion (speed dropped below 40% of free flow)
            if current_speed < free_flow_speed * 0.4:
                return {
                    "type": "Traffic Alert",
                    "severity": "High" if current_speed < free_flow_speed * 0.2 else "Medium",
                    "message": f"Severe Traffic: Speed dropped to {current_speed} km/h (free flow: {free_flow_speed} km/h).",
                    "time": "Just now"
                }
            return None
        except Exception as e:
            print(f"Error fetching traffic: {e}")
            return None
