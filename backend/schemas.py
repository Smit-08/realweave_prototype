from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ShipmentBase(BaseModel):
    id: str
    product: str
    source: str
    destination: str
    eta: str
    status: str
    risk: str
    lat: float
    lng: float

class ShipmentCreate(ShipmentBase):
    pass

class Shipment(ShipmentBase):
    last_updated: Optional[datetime]
    class Config:
        orm_mode = True

class InventoryBase(BaseModel):
    id: str
    sku: str
    name: str
    stock: int
    threshold: int
    supplier: str
    status: str

class InventoryCreate(InventoryBase):
    pass

class Inventory(InventoryBase):
    class Config:
        orm_mode = True

class AlertBase(BaseModel):
    type: str
    severity: str
    message: str
    time: str
    resolved: bool = False

class AlertCreate(AlertBase):
    pass

class Alert(AlertBase):
    id: int
    timestamp: Optional[datetime]
    class Config:
        orm_mode = True

class SettingBase(BaseModel):
    key: str
    value: str

class Setting(SettingBase):
    class Config:
        orm_mode = True

class UserBase(BaseModel):
    email: str
    full_name: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    role: str
    class Config:
        orm_mode = True
