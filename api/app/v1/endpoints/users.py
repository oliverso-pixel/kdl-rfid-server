# app/v1/endpoints/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserResponse
from app.core.security import require_permission
from app.core.permissions import Perms
from app.utils import get_password_hash
import json

router = APIRouter()

@router.post("/", response_model=UserResponse)
def create_user(
    new_user_data: UserCreate, # 包含 username, password, role, department, extra_permissions
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.USER_READ)) # 基礎檢查
):
    all_perms = current_user.get_all_permissions()
    
    # --- 邏輯檢查: 部門限制 ---
    if Perms.SUPER_ADMIN not in all_perms:
        # 如果不是超級管理員
        
        # 1. 檢查是否有「建立部門用戶」的權限
        if Perms.USER_CREATE_DEPT not in all_perms:
             raise HTTPException(status_code=403, detail="No permission to create users")
        
        # 2. 強制限制只能建立同部門的人
        if new_user_data.department != current_user.department:
            raise HTTPException(status_code=403, detail="You can only create users in your own department")
            
        # 3. 禁止普通管理員賦予別人「額外權限」 (防止權限提昇攻擊)
        if new_user_data.extra_permissions:
             raise HTTPException(status_code=403, detail="Only IT Admin can grant extra permissions")

    # --- 建立用戶 ---
    new_user = User(
        username=new_user_data.username,
        password_hash=get_password_hash(new_user_data.password),
        name=new_user_data.name,
        role=new_user_data.role,
        department=new_user_data.department,
        # 將額外權限存入 JSON
        permissions=json.dumps(new_user_data.extra_permissions) if new_user_data.extra_permissions else None
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/{uid}/permissions")
def update_user_permissions(
    uid: int,
    perms: list[str], # e.g. ["basket:create"]
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.SUPER_ADMIN))
):
    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.permissions = json.dumps(perms)
    db.commit()
    return {"message": "Permissions updated", "current_permissions": perms}
