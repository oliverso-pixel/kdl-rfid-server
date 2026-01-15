# app/v1/endpoints/baskets.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List
from sqlalchemy import or_, and_, text
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Basket, User
from app.schemas import BasketCreate, BasketUpdate, BasketResponse, BasketListResponse
from app.v1.endpoints.auth import get_current_user
import redis
import json
from datetime import datetime
from app.core.permissions import Perms
from app.core.security import require_permission

router = APIRouter()

r = redis.Redis(host='localhost', port=6379, db=0)

# 新增籃子 (僅限 Admin)
@router.post("/", response_model=BasketResponse)
def create_basket(
    basket: BasketCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.BASKET_CREATE))
):

    if current_user.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admins can register new baskets"
        )

    existing = db.query(Basket).filter(Basket.rfid == basket.rfid).first()
    if existing:
        raise HTTPException(status_code=400, detail="Basket with this RFID already exists")

    new_basket = Basket(
        rfid=basket.rfid,
        type=basket.type,
        description=basket.description,
        status="UNASSIGNED",
        quantity=0,
        updateBy=current_user.username,
        lastUpdated=datetime.now()
    )
    
    db.add(new_basket)
    db.commit()
    db.refresh(new_basket)
    return new_basket
pass

# 查詢籃子詳情
@router.get("/{rfid}", response_model=BasketResponse)
def get_basket(
    rfid: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    basket = db.query(Basket).filter(Basket.rfid == rfid).first()
    if not basket:
        raise HTTPException(status_code=404, detail="Basket not found")
    return basket

# 查詢籃子詳情(List)
@router.get("/", response_model=BasketListResponse)
def get_baskets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = 1,
    page_size: int = 10,
    search: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    status: Optional[str] = None
):
    query = db.query(Basket)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Basket.rfid.like(search_term),
                Basket.description.like(search_term),
                # 若 SQL Server 版本支援，也可以搜尋 JSON 字串
                # Basket.product.like(search_term) 
            )
        )

    if start_date:
        query = query.filter(Basket.lastUpdated >= start_date)
    if end_date:
        query = query.filter(Basket.lastUpdated <= end_date)

    if status and status != "ALL":
        query = query.filter(Basket.status == status)

    total = query.count()

    skip = (page - 1) * page_size
    baskets = query.order_by(Basket.lastUpdated.desc()).offset(skip).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": baskets
    }

@router.get("/{rfid}/history", response_model=List[BasketResponse])
def get_basket_history(
    rfid: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    取得特定籃子的所有歷史變更記錄 (利用 MS SQL Temporal Tables)
    """
    # 注意: SysStartTime 和 SysEndTime 是您在 SQL 建立表時定義的欄位名稱
    # 這裡使用 Raw SQL 查詢，因為 ORM 對 Temporal Syntax 支援有限
    try:
        sql = text("""
            SELECT *, SysStartTime as validFrom, SysEndTime as validTo 
            FROM Baskets FOR SYSTEM_TIME ALL 
            WHERE rfid = :rfid 
            ORDER BY lastUpdated DESC
        """)
        
        result = db.execute(sql, {"rfid": rfid})
        
        # 將 Raw Result 轉換為 Dict 列表
        history = []
        for row in result:
            # 根據您的 DB Driver，row 可能是 Tuple 或 Mapping
            # 這裡假設 SQLAlchemy 回傳的是類似 Mapping 的物件
            history.append(row._mapping) 
            
        return history
    except Exception as e:
        print(f"History Query Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")

# 更新籃子 (生產、入庫、出貨) -> 觸發 Redis 推播
@router.put("/{rfid}", response_model=BasketResponse)
def update_basket(
    rfid: str, 
    basket_update: BasketUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    basket = db.query(Basket).filter(Basket.rfid == rfid).first()
    if not basket:
        raise HTTPException(status_code=404, detail="Basket not found")

    # 更新欄位 (只更新有傳來的值)
    if basket_update.status is not None:
        basket.status = basket_update.status
    if basket_update.quantity is not None:
        basket.quantity = basket_update.quantity
    if basket_update.warehouseId is not None:
        basket.warehouseId = basket_update.warehouseId
    if basket_update.product is not None:
        basket.product = basket_update.product
    if basket_update.batch is not None:
        basket.batch = basket_update.batch
    if basket_update.productionDate is not None:
        basket.productionDate = basket_update.productionDate

    # 自動記錄更新者與時間
    basket.updateBy = current_user.username
    basket.lastUpdated = datetime.now()

    db.commit()
    db.refresh(basket)

    # --- Redis 推播邏輯 ---
    # 格式需與 Android App (WebSocketManager) 預期的一致
    message = {
        "event": "BASKET_UPDATED",
        "data": {
            "uid": basket.rfid,  # App 使用 uid
            "status": basket.status,
            "quantity": basket.quantity,
            "warehouseId": basket.warehouseId,
            "timestamp": int(basket.lastUpdated.timestamp() * 1000)
        }
    }
    # 發佈到 'rfid_updates' 頻道 (Node.js 會監聽此頻道)
    try:
        r.publish('rfid_updates', json.dumps(message))
    except Exception as e:
        print(f"Redis publish failed: {e}")

    return basket
