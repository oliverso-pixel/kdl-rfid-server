from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt
from app.database import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 1. 驗證密碼
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# 2. 產生密碼 Hash
def get_password_hash(password):
    return pwd_context.hash(password)

# 3. 產生 JWT Token
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt