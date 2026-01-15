from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db, settings
from app.models import User
from app.schemas import Token, UserResponse
from app.utils import verify_password, create_access_token
from datetime import datetime
from pydantic import BaseModel
from jose import JWTError, jwt
import redis

router = APIRouter()

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# 1. 登入 API
@router.post("/login", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user.last_login = datetime.now()
    db.commit()

    # 計算該使用者的最終權限 (Role 預設 + 額外權限)
    final_permissions = list(user.get_all_permissions())
    
    # 產生 Token
    access_token = create_access_token(data={
        "sub": user.username, 
        "role": user.role,
        "dept": user.department 
    })
    
    return {
        "username": user.username,
        "role": user.role,
        "department": user.department,
        "token_type": "bearer",
        "access_token": access_token,
        "permissions": final_permissions
    }

# 2. 驗證目前使用者的 Dependency (供其他 API 使用)
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # --- 檢查黑名單 ---
    # 如果 Redis 中存在此 Token，表示已登出
    if r.exists(f"blacklist:{token}"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked (logged out)",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # ----------------

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    """
    App 可以呼叫此接口來刷新使用者資訊與權限
    """
    # 手動 mapping，因為 Model 的 permissions 欄位是 JSON 字串，但 Response 需要 List
    return {
        "uid": current_user.uid,
        "username": current_user.username,
        "name": current_user.name,
        "role": current_user.role,
        "department": current_user.department,
        "permissions": list(current_user.get_all_permissions())
    }

# 3. 登出 API
@router.post("/logout")
def logout(token: str = Depends(oauth2_scheme)):
    try:
        # 解析 Token 取得過期時間 (exp)
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        exp_timestamp = payload.get("exp")
        
        if exp_timestamp:
            current_timestamp = datetime.utcnow().timestamp()
            ttl = int(exp_timestamp - current_timestamp)
            
            # 如果 Token 還沒過期，就加入 Redis 黑名單
            # Key 格式: "blacklist:token_string"
            # TTL: 設定為 Token 剩餘時間，時間到自動從 Redis 消失 (節省空間)
            if ttl > 0:
                r.setex(f"blacklist:{token}", ttl, "logged_out")
                
        return {"message": "Successfully logged out"}
        
    except JWTError:
        # 即使 Token 格式錯誤，也視為登出成功
        return {"message": "Successfully logged out"}
