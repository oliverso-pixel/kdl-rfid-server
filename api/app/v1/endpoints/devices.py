# app/v1/endpoints/devices.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Device
from app.schemas import DeviceRegister, DeviceResponse, DeviceHeartbeat
from datetime import datetime

router = APIRouter()

# 1. 裝置註冊/開機回報 (App 啟動時呼叫)
@router.post("/register", response_model=DeviceResponse)
def register_device(device_in: DeviceRegister, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.device_id == device_in.device_id).first()
    
    if device:
        # 裝置已存在，更新資訊
        device.name = device_in.name or device.name
        device.model = device_in.model or device.model
        device.os_version = device_in.os_version or device.os_version
        device.app_version = device_in.app_version or device.app_version
        device.ip_address = device_in.ip_address or device.ip_address
        device.status = "ONLINE"
        device.last_active = datetime.now()
    else:
        # 新裝置，建立記錄
        device = Device(
            device_id=device_in.device_id,
            name=device_in.name,
            model=device_in.model,
            os_version=device_in.os_version,
            app_version=device_in.app_version,
            ip_address=device_in.ip_address,
            status="ONLINE",
            last_active=datetime.now()
        )
        db.add(device)
    
    db.commit()
    db.refresh(device)
    return device

# 2. 裝置心跳 (App 定期呼叫，例如每 5 分鐘)
@router.post("/heartbeat")
def device_heartbeat(heartbeat: DeviceHeartbeat, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.device_id == heartbeat.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    device.last_active = datetime.now()
    device.status = heartbeat.status
    db.commit()
    return {"status": "ok", "last_active": device.last_active}

# 3. 取得所有裝置列表 (Admin 監控用)
@router.get("/", response_model=list[DeviceResponse])
def get_devices(db: Session = Depends(get_db)):
    return db.query(Device).all()
