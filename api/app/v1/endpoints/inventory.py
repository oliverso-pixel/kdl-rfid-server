# app/v1/endpoints/inventory.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import cast, String, Date, func
from datetime import datetime, date as date_type
from typing import List, Optional

from ... import models, schemas
from ...database import get_db
from ...core.security import get_current_user

router = APIRouter()

@router.post("/record", response_model=schemas.InventoryReport)
def record_inventory(
    payload: schemas.InventoryRecordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. 取得該倉庫預期應該要在的所有籃子
    expected_baskets = db.query(models.Basket).filter(
        models.Basket.warehouseId == payload.warehouse_id,
        models.Basket.status == 'IN_STOCK'
    ).all()

    # 建立預期 RFID 的 Set 與字典以便快速查找
    expected_rfids = {b.rfid for b in expected_baskets}
    expected_dict = {b.rfid: b for b in expected_baskets}
    
    # 掃描到的 RFID Set
    scanned_rfids_set = set(payload.scanned_rfids)

    # 2. 計算交集與差集
    matched_rfids = expected_rfids.intersection(scanned_rfids_set)
    missing_rfids = expected_rfids.difference(scanned_rfids_set) # 盤虧 (Out)
    extra_rfids = scanned_rfids_set.difference(expected_rfids)   # 盤盈 (In)

    # 3. 取得 Extra Baskets 的詳細資訊 (可能來自其他倉庫或剛生產完)
    extra_baskets = []
    if extra_rfids:
        extra_baskets = db.query(models.Basket).filter(models.Basket.rfid.in_(extra_rfids)).all()

    # 4. 準備寫入 InventorySessions 的資料
    new_session = models.InventorySession(
        warehouse_id=payload.warehouse_id,
        user_id=str(current_user.uid), # 記錄是誰盤點的
        start_time=payload.start_time,
        end_time=payload.end_time,
        type='ROUTINE', # 或由前端傳入
        status='COMPLETED',
        total_scanned=len(scanned_rfids_set),
        total_expected=len(expected_rfids),
        match_count=len(matched_rfids),
        missing_count=len(missing_rfids),
        extra_count=len(extra_rfids),
        created_at=datetime.utcnow()
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    # ================= 新增：5. 將盤點的詳細清單寫入資料庫 =================
    items_to_insert = []

    # 5a. 寫入 MATCHED (準確)
    for rfid in matched_rfids:
        b = expected_dict[rfid]
        items_to_insert.append(models.InventorySessionItem(
            session_id=new_session.session_id, rfid=b.rfid, tag_code=b.tag_code, 
            product=b.product, batch=b.batch, quantity=b.quantity, category="MATCHED"
        ))

    # 5b. 寫入 MISSING (盤虧)
    for rfid in missing_rfids:
        b = expected_dict[rfid]
        items_to_insert.append(models.InventorySessionItem(
            session_id=new_session.session_id, rfid=b.rfid, tag_code=b.tag_code, 
            product=b.product, batch=b.batch, quantity=b.quantity, category="MISSING"
        ))

    # 5c. 寫入 EXTRA (盤盈)
    for b in extra_baskets:
        items_to_insert.append(models.InventorySessionItem(
            session_id=new_session.session_id, rfid=b.rfid, tag_code=b.tag_code, 
            product=b.product, batch=b.batch, quantity=b.quantity, category="EXTRA"
        ))

    if items_to_insert:
        db.add_all(items_to_insert)
        db.commit()
    # ====================================================================

    # 6. 整理並回傳詳細報告
    def format_basket(b):
        return schemas.InventoryBasketDetail(
            rfid=b.rfid,
            tag_code=b.tag_code,
            product=b.product,
            batch=b.batch,
            quantity=b.quantity
        )

    return schemas.InventoryReport(
        session_id=new_session.session_id,
        warehouse_id=new_session.warehouse_id,
        user_id=new_session.user_id,
        total_scanned=new_session.total_scanned,
        total_expected=new_session.total_expected,
        match_count=new_session.match_count,
        missing_count=new_session.missing_count,
        extra_count=new_session.extra_count,
        matched_baskets=[format_basket(expected_dict[rfid]) for rfid in matched_rfids],
        missing_baskets=[format_basket(expected_dict[rfid]) for rfid in missing_rfids],
        extra_baskets=[format_basket(b) for b in extra_baskets]
    )

# @router.get("/sessions", response_model=List[schemas.InventorySessionSchema])
# def get_inventory_sessions(db: Session = Depends(get_db)):
#     """回傳 InventorySessions 表的歷史列表 """
#     return db.query(models.InventorySession).order_by(models.InventorySession.start_time.desc()).all()

@router.get("/sessions", response_model=List[schemas.InventorySessionSchema])
def get_inventory_sessions(
    search_date: Optional[date_type] = Query(None, description="依日期搜尋盤點紀錄"),
    db: Session = Depends(get_db)
):
    """回傳 InventorySessions 表的歷史列表，並加入 User 關聯與日期搜尋"""
    
    # 進行 Left Outer Join，將 user_id (字串) 與 User.uid (整數) 關聯
    query = db.query(
        models.InventorySession,
        models.User.username
    ).outerjoin(
        models.User,
        models.InventorySession.user_id == cast(models.User.uid, String)
    )

    # 如果前端有傳入日期，則進行篩選
    if search_date:
        query = query.filter(func.cast(models.InventorySession.start_time, Date) == search_date)

    results = query.order_by(models.InventorySession.start_time.desc()).all()

    # 組合回傳結果
    sessions = []
    for session, username in results:
        session_dict = session.__dict__.copy()
        session_dict["username"] = username if username else "未知人員"
        sessions.append(session_dict)

    return sessions

# 獲取特定盤點的詳細對比報告
@router.get("/sessions/{session_id}/report", response_model=schemas.InventoryReportSchema)
def get_session_report(session_id: int, db: Session = Depends(get_db)):
    """
    回傳該 session 的詳細比對結果。
    從 InventorySessionItems 資料表中提取盤點當下的快照。
    """
    session_record = db.query(models.InventorySession).filter(models.InventorySession.session_id == session_id).first()
    if not session_record:
        raise HTTPException(status_code=404, detail="Session not found")

    # 撈取該次盤點所有的明細項目
    items = db.query(models.InventorySessionItem).filter(
        models.InventorySessionItem.session_id == session_id
    ).all()

    report = {
        "session_id": session_id,
        "matched": [],
        "missing": [],
        "extra": []
    }

    # 根據 category 進行分類打包
    for item in items:
        detail = {
            "rfid": item.rfid,
            "tag_code": item.tag_code,
            "product": item.product,
            "batch": item.batch,
            "quantity": item.quantity or 0
        }
        
        if item.category == "MATCHED":
            report["matched"].append(detail)
        elif item.category == "MISSING":
            report["missing"].append(detail)
        elif item.category == "EXTRA":
            report["extra"].append(detail)

    return report
