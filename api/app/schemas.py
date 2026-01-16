# app/schemas.py
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date, datetime

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

##
## Product 回應模型
##
class ProductBase(BaseModel):
    itemcode: str
    name: str
    barcodeId: Optional[str] = None
    qrcodeId: Optional[str] = None
    div: Optional[int] = None
    shelflife: Optional[int] = None
    maxBasketCapacity: Optional[int] = 0
    description: Optional[str] = None
    imageUrl: Optional[str] = None
    is_active: bool = True

    @field_validator('div')
    @classmethod
    def check_div(cls, v: int) -> int:
        if v is not None and v not in [10, 20]:
            raise ValueError('Div must be 10 or 20')
        return v

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    itemcode: Optional[str] = None
    barcodeId: Optional[str] = None
    qrcodeId: Optional[str] = None
    div: Optional[int] = None
    shelflife: Optional[int] = None
    maxBasketCapacity: Optional[int] = None
    description: Optional[str] = None
    imageUrl: Optional[str] = None
    is_active: Optional[bool] = None

class ProductResponse(ProductBase):
    pid: int

    class Config:
        from_attributes = True

class ProductListResponse(BaseModel):
    total: int
    items: List[ProductResponse]

##
## Batch
##
class BatchBase(BaseModel):
    itemcode: str
    totalQuantity: int
    productionDate: date # 只需要日期

class BatchCreate(BatchBase):
    pass # 建立時只需這三個欄位

class BatchUpdate(BaseModel):
    totalQuantity: Optional[int] = None
    remainingQuantity: Optional[int] = None
    status: Optional[str] = None
    
class BatchResponse(BatchBase):
    bid: int
    batch_code: str
    remainingQuantity: int
    expireDate: datetime
    status: str

    class Config:
        from_attributes = True
