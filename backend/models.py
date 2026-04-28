from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(String, primary_key=True, index=True)
    product = Column(String)
    source = Column(String)
    destination = Column(String)
    eta = Column(String)
    status = Column(String)
    risk = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    last_updated = Column(DateTime, default=datetime.utcnow)

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(String, primary_key=True, index=True)
    sku = Column(String, unique=True)
    name = Column(String)
    stock = Column(Integer)
    threshold = Column(Integer)
    supplier = Column(String)
    status = Column(String)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String)
    severity = Column(String)
    message = Column(String)
    time = Column(String)
    resolved = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Setting(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    role = Column(String, default="Fleet Manager")
