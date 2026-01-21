# api/app/v1/endpoints/warehouses.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Warehouse, Basket, User
from app.schemas import WarehouseCreate, WarehouseUpdate, WarehouseResponse, BasketResponse
from app.core.security import require_permission
from app.core.permissions import Perms
from typing import List, Optional

router = APIRouter()

# 1. 取得倉庫列表 (App 與 Panel 共用)
# App 端呼叫: GET /api/v1/warehouses/?is_active=true
@router.get("/", response_model=List[WarehouseResponse])
def read_warehouses(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.USER_READ)) # 基本讀取權限
):
    query = db.query(Warehouse)
    if is_active is not None:
        query = query.filter(Warehouse.isActive == is_active)
    
    return query.all()

# 2. 新增倉庫 (Admin Only)
@router.post("/", response_model=WarehouseResponse)
def create_warehouse(
    wh_in: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.SUPER_ADMIN))
):
    if db.query(Warehouse).filter(Warehouse.warehouseId == wh_in.warehouseId).first():
        raise HTTPException(status_code=400, detail="Warehouse ID already exists")
    
    warehouse = Warehouse(
        warehouseId=wh_in.warehouseId,
        name=wh_in.name,
        address=wh_in.address,
        isActive=wh_in.isActive
    )
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return warehouse

# 3. 修改倉庫
@router.put("/{wid}", response_model=WarehouseResponse)
def update_warehouse(
    wid: int,
    wh_update: WarehouseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.SUPER_ADMIN))
):
    warehouse = db.query(Warehouse).filter(Warehouse.wid == wid).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    if wh_update.name is not None: warehouse.name = wh_update.name
    if wh_update.address is not None: warehouse.address = wh_update.address
    if wh_update.isActive is not None: warehouse.isActive = wh_update.isActive
    
    db.commit()
    db.refresh(warehouse)
    return warehouse

# 4. 查詢某倉庫內的籃子 (庫存查詢)
@router.get("/{warehouseId}/baskets", response_model=List[BasketResponse])
def get_warehouse_inventory(
    warehouseId: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.BASKET_READ))
):
    # 這裡假設我們要找的是「目前位置」在該倉庫，且狀態為「在庫 (WAREHOUSE)」的籃子
    # 如果您希望顯示所有在此位置的籃子(不論狀態)，可移除 status 過濾
    baskets = db.query(Basket).filter(
        Basket.warehouseId == warehouseId,
        Basket.status == "WAREHOUSE" 
    ).all()
    
    return baskets
