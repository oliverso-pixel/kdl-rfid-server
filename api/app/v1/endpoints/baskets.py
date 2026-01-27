# app/v1/endpoints/baskets.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List
from sqlalchemy import or_, and_, text
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Basket, User, Batch
from app.schemas import (
    BasketCreate, BasketUpdate, BasketResponse, BasketListResponse,
    BasketBatchUpdateItem, BasketBulkUpdateRequest, BasketCommonData,
    BasketBulkCreateRequest, BasketBulkCreateResponse
)
from app.v1.endpoints.auth import get_current_user
import redis
import json
from datetime import datetime
from app.core.permissions import Perms
from app.core.security import require_permission
import logging

router = APIRouter()
logger = logging.getLogger("uvicorn")
r = redis.Redis(host='localhost', port=6379, db=0)

# 新增籃子 (僅限 Admin)
@router.post("/", response_model=dict)
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
    # db.refresh(new_basket)
    # return new_basket
    return {
        "rfid": basket.rfid,
        "detail": "success"
    }

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

# 批量新增籃子 (App) 
@router.post("/bulk", response_model=BasketBulkCreateResponse)
def create_baskets_bulk(
    body: BasketBulkCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.BASKET_CREATE))
):
    if current_user.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admins can register new baskets"
        )

    results = []
    
    for item in body.items:
        existing = db.query(Basket).filter(Basket.rfid == item.rfid).first()
        if existing:
            results.append({"rfid": item.rfid, "success": False, "message": "Already exists"})
            continue
        
        try:
            new_basket = Basket(
                rfid=item.rfid,
                type=item.type,
                description=item.description,
                status="UNASSIGNED",
                quantity=0,
                updateBy=current_user.username,
                lastUpdated=datetime.now()
            )
            db.add(new_basket)
            db.commit()
            results.append({"rfid": item.rfid, "success": True, "message": "Success"})
        except Exception as e:
            db.rollback()
            results.append({"rfid": item.rfid, "success": False, "message": str(e)})
            
    return {"results": results}

# 查詢籃子詳情列表
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
                Basket.product.like(search_term) 
            )
        )

    if start_date:
        query = query.filter(Basket.lastUpdated >= start_date)
    if end_date:
        query = query.filter(Basket.lastUpdated <= end_date)

    if status and status != "ALL":
        query = query.filter(Basket.status == status)

    # --- Debug: 輸出 SQL 語句到 Console ---
    # try:
    #     # compile_kwargs={"literal_binds": True} 會嘗試將參數填入 SQL 字串，方便閱讀
    #     # 但在某些 DB 驅動下可能會失敗，所以包在 try-except 中
    #     sql_statement = query.statement.compile(
    #         db.bind, 
    #         compile_kwargs={"literal_binds": True}
    #     )
    #     print(f"\n[DEBUG SQL]: {sql_statement}\n") # 印在終端機
    #     logger.info(f"Generated SQL: {sql_statement}") # 印在 Log
    # except Exception as e:
    #     print(f"[DEBUG SQL Error]: Could not compile SQL: {e}")
    # --------------------------------------

    total = query.count()

    skip = (page - 1) * page_size
    baskets = query.order_by(Basket.lastUpdated.desc()).offset(skip).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": baskets
    }

# 取得特定籃子的所有歷史變更記錄 (利用 MS SQL Temporal Tables)
@router.get("/{rfid}/history", response_model=List[BasketResponse])
def get_basket_history(
    rfid: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 注意: SysStartTime 和 SysEndTime 是在 SQL 建立表時定義的欄位名稱
    # 這裡使用 Raw SQL 查詢，因為 ORM 對 Temporal Syntax 支援有限
    try:
        sql = text("""
            SELECT *, SysStartTime as validFrom, SysEndTime as validTo 
            FROM Baskets FOR SYSTEM_TIME ALL 
            WHERE rfid = :rfid 
            ORDER BY lastUpdated DESC
        """)
        
        result = db.execute(sql, {"rfid": rfid})
        
        history = []
        for row in result:
            history.append(row._mapping) 
            
        return history
    except Exception as e:
        print(f"History Query Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")

# 更新批量籃子 (App) (生產、入庫、出貨) -> 觸發 Redis 推播
@router.put("/bulk-update", response_model=dict)
def bulk_update_baskets(
    request: BasketBulkUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    logger.info(f"🚀 [Bulk Update] Type: {request.updateType}")
    logger.info(f"📦 [Payload]: {request.model_dump_json()}")

    common = request.commonData or BasketCommonData()
    updated_count = 0
    default_update_by = common.updateBy or current_user.username

    default_status = None
    is_production = False
    # is_clear_mode = False

    if request.updateType == "Production":
        default_status = "IN_PRODUCTION"
        is_production = True
    elif request.updateType == "Receiving":
        default_status = "IN_STOCK"
    elif request.updateType == "Transfer":
        default_status = "IN_STOCK"
    elif request.updateType == "Clear":
        default_status = "UNASSIGNED"
        # is_clear_mode = True

    production_increments = {}

    for item in request.baskets:
        basket = db.query(Basket).filter(Basket.rfid == item.rfid).first()
        if not basket: continue

        basket.updateBy = item.updateBy or default_update_by
        basket.lastUpdated = datetime.now()

        # if is_production:
        #     new_status = item.status or default_status
        #     basket.status = new_status
            
        #     target_batch = item.batch or common.batch
        #     if target_batch:
        #         basket.batch = target_batch
            
        #     qty = item.quantity if item.quantity is not None else common.quantity
        #     if qty is not None:
        #         basket.quantity = qty
        #         if target_batch:
        #             production_increments[target_batch] = production_increments.get(target_batch, 0) + qty

        # if is_clear_mode:
        #     basket.status = "UNASSIGNED"
        #     basket.quantity = 0
        #     basket.product = None
        #     basket.batch = None
        #     basket.productionDate = None
        #     basket.warehouseId = None 
        #     # if item.warehouseId or common.warehouseId:
        #     #     basket.warehouseId = item.warehouseId or common.warehouseId
        
        # else:
        #     # 4. 正常更新模式 (Receiving / Other)
            
        #     # Status: 個別指定 > 預設 (由 Type 決定)
        #     # 如果個別沒指定且 Type 也沒定義，則保持原狀
        #     new_status = item.status or default_status
        #     if new_status:
        #         basket.status = new_status

        #     # Quantity
        #     new_qty = item.quantity if item.quantity is not None else common.quantity
        #     if new_qty is not None:
        #         basket.quantity = new_qty

        #     # Warehouse
        #     new_wh = item.warehouseId or common.warehouseId
        #     if new_wh:
        #         basket.warehouseId = new_wh

        #     # Product Info
        #     new_prod = item.product or common.product
        #     if new_prod: basket.product = new_prod
            
        #     new_batch = item.batch or common.batch
        #     if new_batch: basket.batch = new_batch
            
        #     new_pdate = item.productionDate or common.productionDate
        #     if new_pdate: basket.productionDate = new_pdate

        # 1. 狀態 (Status)
        # 優先級：個別指定 > 預設狀態 (由 Type 決定) > 共通資料 (若有)
        final_status = item.status or default_status or common.status
        if final_status:
            basket.status = final_status

        # 2. 倉庫 (Warehouse)
        final_wh = item.warehouseId or common.warehouseId
        if final_wh:
            basket.warehouseId = final_wh

        # 3. 產品與批次 (Product & Batch)
        final_prod = item.product or common.product
        if final_prod: 
            basket.product = final_prod
        
        final_batch = item.batch or common.batch
        if final_batch: 
            basket.batch = final_batch

        # 4. 數量 (Quantity)
        # 使用 is not None 確保 0 也能被更新
        final_qty = item.quantity if item.quantity is not None else common.quantity
        if final_qty is not None:
            basket.quantity = final_qty

        # 5. Production 模式下的額外邏輯
        if is_production:
            # 在生產模式下，如果這裡有更新數量且有 Batch，需要累加到 Batches 表
            if final_batch and final_qty is not None:
                production_increments[final_batch] = production_increments.get(final_batch, 0) + final_qty
            
            # 記錄 Log 確認這一筆更新了什麼
            # logger.info(f"   🔧 Processing {basket.rfid}: Status->{basket.status}, Qty->{basket.quantity}, Batch->{basket.batch}")
            # logger.info(production_increments)
        
        # 6. Clear 模式
        elif request.updateType == "Clear":
            basket.status = "UNASSIGNED"
            basket.quantity = 0
            basket.product = None
            basket.batch = None
            basket.productionDate = None
            basket.warehouseId = None  

        publish_redis_update(basket)
        updated_count += 1

    if is_production and production_increments:
        logger.info(f"📈 Updating Batches (Raw Keys): {production_increments}")
        
        for raw_batch_info, added_qty in production_increments.items():
            final_batch_code = raw_batch_info
            
            try:
                if isinstance(raw_batch_info, str) and "batch_code" in raw_batch_info:
                    batch_data = json.loads(raw_batch_info)
                    if isinstance(batch_data, dict):
                        final_batch_code = batch_data.get("batch_code", raw_batch_info)
            except Exception as e:
                logger.warning(f"⚠️ Failed to parse batch JSON: {e}. Using raw string: {raw_batch_info}")

            logger.info(f"   🔍 Querying Batch Code: {final_batch_code}")
            
            batch_record = db.query(Batch).filter(Batch.batch_code == final_batch_code).first()
            
            if batch_record:
                batch_record.producedQuantity += added_qty
                batch_record.remainingQuantity += added_qty
                
                if batch_record.producedQuantity > 0 and batch_record.status == "PENDING":
                    batch_record.status = "IN_PRODUCTION"
                
                if batch_record.producedQuantity >= batch_record.targetQuantity:
                    batch_record.status = "COMPLETED"
                
                logger.info(f"   ✅ Updated Batch {final_batch_code}: Produced {batch_record.producedQuantity}/{batch_record.targetQuantity}")
            else:
                logger.error(f"❌ Batch code not found in DB: {final_batch_code}")

    db.commit()
    
    return {
        "message": "success", 
        "updated_count": updated_count,
        "update_type": request.updateType
    }

# 更新單個籃子 -> 觸發 Redis 推播
@router.put("/{rfid}", response_model=dict)
def update_basket(
    rfid: str, 
    basket_update: BasketUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    basket = db.query(Basket).filter(Basket.rfid == rfid).first()
    if not basket:
        raise HTTPException(status_code=404, detail="Basket not found")

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

    basket.updateBy = basket_update.updateBy or current_user.username
    basket.lastUpdated = datetime.now()

    db.commit()

    publish_redis_update(basket)

    # return basket
    return {
        "rfid": basket.rfid,
        "detail": "success"
    }

# 輔助函式：Redis 推播
def publish_redis_update(basket):
    message = {
        "event": "BASKET_UPDATED",
        "data": {
            "uid": basket.rfid,
            "status": basket.status,
            "quantity": basket.quantity,
            "warehouseId": basket.warehouseId,
            "timestamp": int(basket.lastUpdated.timestamp() * 1000)
        }
    }
    try:
        r.publish('rfid_updates', json.dumps(message))
    except Exception as e:
        print(f"Redis publish failed: {e}")
