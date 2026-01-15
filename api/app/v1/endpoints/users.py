# app/v1/endpoints/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserResponse, UserListResponse, UserUpdateAdmin, UserPasswordUpdate
from app.core.security import require_permission
from app.core.permissions import Perms
from app.utils import get_password_hash, verify_password
from app.v1.endpoints.auth import get_current_user
import json

router = APIRouter()

@router.get("/", response_model=UserListResponse)
def read_users(
    page: int = 1,
    page_size: int = 10,
    search: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.USER_READ))
):
    query = db.query(User)
    
    if search:
        term = f"%{search}%"
        query = query.filter(or_(User.username.like(term), User.name.like(term)))
    
    # 非超級管理員只能看自己部門 (可選邏輯)
    # if Perms.SUPER_ADMIN not in current_user.get_all_permissions():
    #     query = query.filter(User.department == current_user.department)

    total = query.count()
    users = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return {"total": total, "items": users}

@router.post("/", response_model=UserResponse)
def create_user(
    new_user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.USER_READ))
):
    all_perms = current_user.get_all_permissions()
    
    if Perms.SUPER_ADMIN not in all_perms:
        # 1. 檢查是否有「建立部門用戶」的權限
        if Perms.USER_CREATE_DEPT not in all_perms:
             raise HTTPException(status_code=403, detail="No permission to create users")
        
        # 2. 強制限制只能建立同部門的人
        if new_user_data.department != current_user.department:
            raise HTTPException(status_code=403, detail="You can only create users in your own department")
            
        # 3. 禁止普通管理員賦予別人「額外權限」 (防止權限提昇攻擊)
        if new_user_data.extra_permissions:
             raise HTTPException(status_code=403, detail="Only IT Admin can grant extra permissions")

    new_user = User(
        username=new_user_data.username,
        password_hash=get_password_hash(new_user_data.password),
        name=new_user_data.name,
        role=new_user_data.role,
        department=new_user_data.department,
        permissions=json.dumps(new_user_data.extra_permissions) if new_user_data.extra_permissions else None,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/{uid}", response_model=UserResponse)
def update_user(
    uid: int,
    user_in: UserUpdateAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.USER_UPDATE))
):
    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 權限檢查：不能修改比自己權限高的人 (或是超級管理員才能改 Admin)
    # 這裡簡化為：只有 SUPER_ADMIN 可以修改其他 Admin
    if user.role == "Admin" and Perms.SUPER_ADMIN not in current_user.get_all_permissions():
        if user.uid != current_user.uid: # 自己改自己除外
             raise HTTPException(status_code=403, detail="Cannot update other admins")

    if user_in.name is not None:
        user.name = user_in.name
    if user_in.role is not None:
        user.role = user_in.role
    if user_in.department is not None:
        user.department = user_in.department
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
    
    # 重設密碼
    if user_in.password:
        user.password_hash = get_password_hash(user_in.password)
    
    # 修改權限
    if user_in.extra_permissions is not None:
        # 只有 Super Admin 可以改權限
        if Perms.SUPER_ADMIN in current_user.get_all_permissions():
            user.permissions = json.dumps(user_in.extra_permissions)

    db.commit()
    db.refresh(user)
    return user

@router.delete("/{uid}")
def delete_user(
    uid: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.SUPER_ADMIN))
):
    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}

@router.put("/me/password")
def update_my_password(
    password_in: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 驗證舊密碼
    if not verify_password(password_in.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    current_user.password_hash = get_password_hash(password_in.new_password)
    db.commit()
    return {"message": "Password updated successfully"}
