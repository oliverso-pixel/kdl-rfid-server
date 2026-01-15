# app/schemas.py
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# 基礎籃子資料
class BasketBase(BaseModel):
    rfid: str
    type: Optional[int] = None
    description: Optional[str] = None

# 新增籃子請求 (Admin 用)
class BasketCreate(BasketBase):
    pass # 剛註冊時通常只有 RFID

# 更新籃子請求 (生產、收貨、出貨用)
class BasketUpdate(BaseModel):
    status: str
    quantity: Optional[int] = None
    warehouseId: Optional[str] = None
    
    # 接收 JSON 字串或 Dict，這裡簡化為 Optional[str]
    # Android 端可以傳送 JSON.stringify 後的字串，或者我們在 API 層轉
    product: Optional[str] = None 
    batch: Optional[str] = None
    
    productionDate: Optional[datetime] = None
    updateBy: Optional[str] = None # 雖然會從 Token 抓，但保留彈性

# 籃子歷史記錄 Response (結構與 BasketResponse 類似，但可能包含舊資料)
class BasketHistoryResponse(BasketBase):
    bid: int
    status: str
    quantity: int
    warehouseId: Optional[str]
    product: Optional[str]
    batch: Optional[str]
    lastUpdated: datetime
    updateBy: Optional[str]
    
    # 用來標記這筆記錄的有效區間 (Temporal Table 的特性)
    validFrom: Optional[datetime] = None
    validTo: Optional[datetime] = None

    class Config:
        from_attributes = True

# 回傳給 App 的回應格式
class BasketResponse(BasketBase):
    bid: int
    status: str
    quantity: int
    warehouseId: Optional[str]
    product: Optional[str]
    batch: Optional[str]
    lastUpdated: Optional[datetime]
    updateBy: Optional[str]

    class Config:
        from_attributes = True # 讓 Pydantic 能讀取 SQLAlchemy 物件

class BasketListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[BasketResponse]

# 裝置註冊/更新 Request
class DeviceRegister(BaseModel):
    device_id: str
    name: Optional[str] = None
    model: Optional[str] = None
    os_version: Optional[str] = None
    app_version: Optional[str] = None
    ip_address: Optional[str] = None

# 裝置心跳/狀態更新 Request
class DeviceHeartbeat(BaseModel):
    device_id: str
    status: str = "ONLINE"

class DeviceResponse(DeviceRegister):
    did: int
    status: str
    last_active: Optional[datetime]
    registered_at: Optional[datetime]

    class Config:
        from_attributes = True

# User 回應模型 (新增 permissions)
class UserResponse(BaseModel):
    uid: int
    username: str
    name: str | None
    role: str
    department: str | None
    permissions: List[str] = []

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    role: str       # e.g., "Admin", "Operator"
    department: str # e.g., "IT", "Production", "Warehouse"
    extra_permissions: Optional[List[str]] = [] # 額外權限列表

# 登入 Token 回傳模型 (新增 permissions)
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    department: str | None = None
    permissions: List[str] = []
