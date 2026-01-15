from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func 
from app.database import Base

class User(Base):
    __tablename__ = "Users"

    uid = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True) # 對應 SQL 的 username
    name = Column(String)
    role = Column(String)
    department = Column(String)
    password_hash = Column(String)
    last_login = Column(DateTime, nullable=True)
    permissions = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    def get_all_permissions(self):
        import json
        from app.core.permissions import DEFAULT_ROLE_PERMISSIONS
        
        role_perms = []
        if self.role in DEFAULT_ROLE_PERMISSIONS:
            dept_config = DEFAULT_ROLE_PERMISSIONS[self.role]
            role_perms = dept_config.get(self.department, [])
            
        extra_perms = []
        if self.permissions:
            try:
                extra_perms = json.loads(self.permissions)
            except:
                extra_perms = []
        
        return set(role_perms + extra_perms)

class Device(Base):
    __tablename__ = "Devices"

    did = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    model = Column(String, nullable=True)
    os_version = Column(String, nullable=True)
    app_version = Column(String, nullable=True)
    status = Column(String, default="OFFLINE")
    ip_address = Column(String, nullable=True)
    last_active = Column(DateTime, default=func.now())
    registered_at = Column(DateTime, default=func.now())

class Basket(Base):
    __tablename__ = "Baskets"

    bid = Column(Integer, primary_key=True, index=True)
    rfid = Column(String, unique=True, index=True, nullable=False)
    type = Column(Integer, nullable=True)
    
    # 這裡我們將 JSON 資料當作純文字存儲，App 端再自己解析
    product = Column(String, nullable=True) # JSON String
    batch = Column(String, nullable=True)   # JSON String
    
    warehouseId = Column(String, nullable=True)
    quantity = Column(Integer, default=0)
    status = Column(String, default="UNASSIGNED") # 對應 App 的 BasketStatus
    
    productionDate = Column(DateTime, nullable=True)
    lastUpdated = Column(DateTime, default=func.now(), onupdate=func.now())
    updateBy = Column(String, nullable=True)
    description = Column(String, nullable=True)
    