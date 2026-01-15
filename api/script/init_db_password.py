from app.database import SessionLocal
from app.models import User
from app.utils import get_password_hash

def init_password():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "admin").first()
        if user:
            # 將密碼 'admin123' 轉為 Hash
            hashed_pw = get_password_hash("admin123")
            user.password_hash = hashed_pw
            db.commit()
            print(f"Updated user 'admin' with hashed password.")
        else:
            print("User 'admin' not found.")
    finally:
        db.close()

if __name__ == "__main__":
    init_password()