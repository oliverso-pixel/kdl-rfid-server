# app/schemas.py
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date, datetime

"""
# --- Basket ---
"""
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
    product: Optional[str] = None 
    batch: Optional[str] = None
    productionDate: Optional[datetime] = None
    updateBy: Optional[str] = None

class BasketBatchUpdateItem(BaseModel):
    rfid: str
    status: Optional[str] = None
    quantity: Optional[int] = None
    warehouseId: Optional[str] = None
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

# 共通資料 (Common Data)
class BasketCommonData(BaseModel):
    # status: Optional[str] = None
    warehouseId: Optional[str] = None
    product: Optional[str] = None
    batch: Optional[str] = None
    productionDate: Optional[datetime] = None
    updateBy: Optional[str] = None
    quantity: Optional[int] = None 

# 個別籃子資料 (Specific Item)
class BasketItemData(BaseModel):
    rfid: str
    quantity: Optional[int] = None
    status: Optional[str] = None

    warehouseId: Optional[str] = None
    product: Optional[str] = None
    batch: Optional[str] = None
    productionDate: Optional[datetime] = None
    updateBy: Optional[str] = None

# 批量更新請求主體 (Request Body)
class BasketBulkUpdateRequest(BaseModel):
    updateType: Optional[str] = None
    # updateType: str # 必填: Production, Receiving, Clear
    commonData: Optional[BasketCommonData] = None
    baskets: List[BasketItemData]

class BasketBulkItem(BaseModel):
    rfid: str
    type: Optional[int] = None
    description: Optional[str] = None

class BasketBulkCreateRequest(BaseModel):
    items: List[BasketBulkItem]

class BasketBulkCreateResult(BaseModel):
    rfid: str
    success: bool
    message: str

class BasketBulkCreateResponse(BaseModel):
    results: List[BasketBulkCreateResult]

"""
# --- Device ---
"""
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
    currentUser: Optional[str] = None

    class Config:
        from_attributes = True

"""
## User 回應模型
"""
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

"""
# --- Product ---
"""
class ProductBase(BaseModel):
    itemcode: str
    name: str
    barcodeId: Optional[str] = None
    qrcodeId: Optional[str] = None
    div: Optional[int] = None
    shelflife: Optional[int] = None
    btype: Optional[int] = None
    maxBasketCapacity: Optional[int] = 0
    maxTrolleyCapacity: Optional[int] = 0
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
    btype: Optional[int] = None
    maxBasketCapacity: Optional[int] = None
    maxTrolleyCapacity: Optional[int] = None
    description: Optional[str] = None
    imageUrl: Optional[str] = None
    is_active: Optional[bool] = None

class ProductResponse(ProductBase):
    pid: int

    class Config:
        from_attributes = True

class ProductAppResponse(BaseModel):
    itemcode: str
    barcodeId: Optional[str] = None
    qrcodeId: Optional[str] = None
    name: str
    btype: Optional[int] = None
    maxBasketCapacity: int
    imageUrl: Optional[str] = None

    class Config:
        from_attributes = True

class ProductListResponse(BaseModel):
    total: int
    items: List[ProductResponse]

"""
# --- Batch ---
"""
class BatchBase(BaseModel):
    itemcode: str
    totalQuantity: Optional[int] = 0
    targetQuantity: int
    producedQuantity: Optional[int] = 0
    productionDate: date

class BatchCreate(BatchBase):
    # maxRepairs: Optional[int] = 1 # 建立時通常使用預設值，若需手動指定可在此加入 
    pass
    
class BatchUpdate(BaseModel):
    targetQuantity: Optional[int] = None
    status: Optional[str] = None
    # totalQuantity 通常不讓改，producedQuantity 由系統計算
    
class BatchResponse(BatchBase):
    bid: int
    batch_code: str
    remainingQuantity: int
    expireDate: datetime
    status: str
    maxRepairs: int

    class Config:
        from_attributes = True

class BatchAppResponse(BaseModel):
    # bid: int    # 如果 App 需要對批次進行操作 (如回報進度)，建議加上這個
    batch_code: str
    itemcode: str
    totalQuantity: int
    targetQuantity: int
    producedQuantity: int
    remainingQuantity: int
    productionDate: datetime
    expireDate: datetime
    status: str
    maxRepairs: int

    class Config:
        from_attributes = True

"""
# --- Warehouse ---
"""
class WarehouseBase(BaseModel):
    warehouseId: str
    name: str
    address: Optional[str] = None
    isActive: bool = True

class WarehouseCreate(WarehouseBase):
    pass

class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    isActive: Optional[bool] = None

class WarehouseResponse(WarehouseBase):
    wid: int

    class Config:
        from_attributes = True
