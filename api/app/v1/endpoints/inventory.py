# app/v1/endpoints/inventory.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from ... import models, schemas
from ...database import get_db
from ...core.security import get_current_user # 假設您有實作取得當前使用者的依賴

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

    # 5. (可選) 自動更新籃子狀態
    # 例如：將 missing 的籃子狀態標記為 'MISSING'，將 extra 的籃子 warehouseId 更新為當前倉庫
    # db.query(models.Basket).filter(models.Basket.rfid.in_(missing_rfids)).update({"status": "MISSING"}, synchronize_session=False)
    # db.query(models.Basket).filter(models.Basket.rfid.in_(extra_rfids)).update({"warehouseId": payload.warehouse_id, "status": "WAREHOUSE"}, synchronize_session=False)
    # db.commit()

    # 6. 整理並回傳詳細報告
    def format_basket(b):
        return schemas.InventoryBasketDetail(
            rfid=b.rfid,
            tag_code=b.tag_code,
            product=b.product,
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

@router.get("/sessions", response_model=List[schemas.InventorySessionSchema])
def get_inventory_sessions(db: Session = Depends(get_db)):
    """回傳 InventorySessions 表的歷史列表 """
    return db.query(models.InventorySession).order_by(models.InventorySession.start_time.desc()).all()

# 2. 獲取特定盤點的詳細對比報告
@router.get("/sessions/{session_id}/report", response_model=schemas.InventoryReportSchema)
def get_session_report(session_id: int, db: Session = Depends(get_db)):
    """
    回傳該 session 的詳細比對結果。
    邏輯：透過 BasketsHistory 查找該 session 結束時間點的快照進行比對。 
    """
    session_record = db.query(models.InventorySession).filter(models.InventorySession.session_id == session_id).first()
    if not session_record:
        raise HTTPException(status_code=404, detail="Session not found")

    # 這裡應實作比對邏輯：
    # A. 取得該倉庫在 session.end_time 時系統紀錄的所有籃子 (從 BasketsHistory) 
    # B. 這裡暫以模擬數據演示結構，實際需配合您的掃描紀錄表或當次上傳快照
    
    return {
        "session_id": session_id,
        "matched": [], # 具體籃子 Detail 物件清單
        "missing": [], # 盤虧清單
        "extra": []    # 盤盈清單
    }
