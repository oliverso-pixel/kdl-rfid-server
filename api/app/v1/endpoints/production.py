# api/app/v1/endpoints/production.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Batch, Product, User
from app.schemas import BatchCreate, BatchUpdate, BatchResponse, ProductResponse
from app.core.security import require_permission
from app.core.permissions import Perms
from app.v1.endpoints.auth import get_current_user
from datetime import datetime, timedelta, date

router = APIRouter()

# 1. 查詢某天的生產工序
@router.get("/", response_model=list[BatchResponse])
def read_batches(
    target_date: date = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.PRODUCTION_READ))
):
    if not target_date:
        target_date = date.today()
    
    # 查詢該日期的所有批次
    # 注意：MS SQL DateTime2 包含時間，需用範圍查詢或 Cast
    start = datetime.combine(target_date, datetime.min.time())
    end = datetime.combine(target_date, datetime.max.time())
    
    batches = db.query(Batch).filter(
        Batch.productionDate >= start,
        Batch.productionDate <= end
    ).all()
    
    return batches

# 2. 新增生產批次
@router.post("/", response_model=BatchResponse)
def create_batch(
    batch_in: BatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.PRODUCTION_CREATE))
):
    # A. 檢查產品是否存在並取得 shelflife
    product = db.query(Product).filter(Product.itemcode == batch_in.itemcode).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # B. 計算過期日 (生產日 + shelflife)
    prod_dt = datetime.combine(batch_in.productionDate, datetime.min.time())
    expire_dt = prod_dt + timedelta(days=product.shelflife or 0)
    
    # C. 生成 Batch Code (BC-YYYYMMDD-ITEMCODE)
    # 為了避免同一天同一產品重複，可以加上隨機碼或序列，這裡簡單用 ITEMCODE
    # 若需同一天產多次同一產品，建議加上時間戳或計數器
    count = db.query(Batch).filter(
        Batch.productionDate >= prod_dt,
        Batch.productionDate < prod_dt + timedelta(days=1),
        Batch.itemcode == batch_in.itemcode
    ).count()
    suffix = f"{count + 1:02d}"
    batch_code = f"BC-{batch_in.productionDate.strftime('%Y%m%d')}-{batch_in.itemcode}-{suffix}"

    new_batch = Batch(
        batch_code=batch_code,
        itemcode=batch_in.itemcode,
        totalQuantity=batch_in.totalQuantity,
        remainingQuantity=batch_in.totalQuantity, # 初始剩餘 = 總量
        productionDate=prod_dt,
        expireDate=expire_dt,
        status="PENDING"
    )
    
    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)
    return new_batch

# 3. 修改批次 (需檢查日期權限)
@router.put("/{bid}", response_model=BatchResponse)
def update_batch(
    bid: int,
    batch_update: BatchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.PRODUCTION_CREATE))
):
    batch = db.query(Batch).filter(Batch.bid == bid).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    # 1. 權限與歷史資料檢查
    today = date.today()
    batch_date = batch.productionDate.date()
    perms = current_user.get_all_permissions()

    if batch_date < today:
        if Perms.SUPER_ADMIN not in perms and Perms.PRODUCTION_EDIT_HISTORY not in perms:
            raise HTTPException(status_code=403, detail="Permission denied: Cannot edit past production records")

    if batch_update.status == "STOPPED":
        if Perms.SUPER_ADMIN not in perms and Perms.PRODUCTION_STOP not in perms:
            raise HTTPException(status_code=403, detail="Permission denied: Cannot stop production")

    # 2. 更新數量邏輯
    if batch_update.totalQuantity is not None:
        # 計算總量變化差額
        diff = batch_update.totalQuantity - batch.totalQuantity
        batch.totalQuantity = batch_update.totalQuantity
        
        # 如果這次請求「沒有」指定新的剩餘量，則自動依差額調整
        # 例如：原總量100/剩餘50 (已產50)。新總量200 (+100) -> 剩餘應變為 150
        if batch_update.remainingQuantity is None:
            batch.remainingQuantity += diff

    # 如果有明確指定剩餘量，則直接覆蓋 (優先權高於自動計算)
    if batch_update.remainingQuantity is not None:
        batch.remainingQuantity = batch_update.remainingQuantity

    # 3. 更新狀態
    if batch_update.status is not None:
        batch.status = batch_update.status

    db.commit()
    db.refresh(batch)
    return batch

# 4. 刪除批次 (需檢查日期權限)
@router.delete("/{bid}")
def delete_batch(
    bid: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.PRODUCTION_CREATE))
):
    batch = db.query(Batch).filter(Batch.bid == bid).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    # --- 權限檢查 ---
    today = date.today()
    batch_date = batch.productionDate.date()
    
    if batch_date < today:
        perms = current_user.get_all_permissions()
        if Perms.SUPER_ADMIN not in perms and Perms.PRODUCTION_DELETE_HISTORY not in perms:
            raise HTTPException(status_code=403, detail="Permission denied: Cannot delete past production records")

    db.delete(batch)
    db.commit()
    return {"message": "Batch deleted"}

# APP
@router.get("/daily-products", response_model=list[ProductResponse])
def get_daily_production_products(
    target_date: date = None,
    db: Session = Depends(get_db),
    # 視 App 需求，這裡可以放寬權限，例如只要是登入用戶 (User) 即可，不一定要 Production Admin
    current_user: User = Depends(get_current_user) 
):
    """
    取得特定日期 (target_date) 生產工序中包含的所有產品詳細資料列表。
    供 App 端快速載入當日需生產的產品資訊 (圖片、名稱等)，無需下載完整產品庫。
    """
    if not target_date:
        target_date = date.today()
    
    # 1. 設定日期範圍 (全天)
    start = datetime.combine(target_date, datetime.min.time())
    end = datetime.combine(target_date, datetime.max.time())
    
    # 2. 查詢當日批次中所有不重複的 itemcode
    # 使用 distinct() 優化查詢
    target_itemcodes = db.query(Batch.itemcode).filter(
        Batch.productionDate >= start,
        Batch.productionDate <= end
    ).distinct().all()
    
    # target_itemcodes 會是 [('A001',), ('B002',)] 的 tuple 列表，需轉為純 list
    itemcode_list = [row[0] for row in target_itemcodes]
    
    if not itemcode_list:
        return []

    # 3. 根據 itemcode 列表查詢產品詳細資料
    products = db.query(Product).filter(Product.itemcode.in_(itemcode_list)).all()
    
    return products
