# app/schemas.py
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

##
## Basket
##
class BasketBase(BaseModel):
    rfid: str
    type: Optional[int] = None
    description: Optional[str] = None

class BasketCreate(BasketBase):
    pass

class BasketUpdate(BaseModel):
    status: str
    quantity: Optional[int] = None
    warehouseId: Optional[str] = None
    
    # 接收 JSON 字串或 Dict，這裡簡化為 Optional[str]
    # Android 端可以傳送 JSON.stringify 後的字串，或者我們在 API 層轉
    product: Optional[str] = None 
    batch: Optional[str] = None
    
    productionDate: Optional[datetime] = None
    updateBy: Optional[str] = None

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
        from_attributes = True

class BasketListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[BasketResponse]

##
## Device
##
class DeviceRegister(BaseModel):
    device_id: str
    name: Optional[str] = None
    model: Optional[str] = None
    os_version: Optional[str] = None
    app_version: Optional[str] = None
    ip_address: Optional[str] = None

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

##
## User 回應模型
##
class UserResponse(BaseModel):
    uid: int
    username: str
    name: str | None
    role: str
    department: str | None
    permissions: List[str] = []
    is_active: bool = True
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True
        
class UserListResponse(BaseModel):
    total: int
    items: List[UserResponse]

# 管理員更新用戶請求
class UserUpdateAdmin(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None # 管理員重設密碼用
    extra_permissions: Optional[List[str]] = None

# 用戶修改自己密碼請求
class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str

class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    role: str       # e.g., "Admin", "Operator"
    department: str # e.g., "IT", "Production", "Warehouse"
    extra_permissions: Optional[List[str]] = []

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    department: str | None = None
    permissions: List[str] = []
