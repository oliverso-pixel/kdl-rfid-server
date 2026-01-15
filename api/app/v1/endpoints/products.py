# api/app/v1/endpoints/products.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models import Product, User
from app.schemas import ProductCreate, ProductUpdate, ProductResponse, ProductListResponse
from app.core.security import require_permission
from app.core.permissions import Perms
import shutil
import os
import uuid

router = APIRouter()

# 1. 取得產品列表
@router.get("/", response_model=ProductListResponse)
def read_products(
    page: int = 1,
    page_size: int = 10,
    search: str = None,
    is_active: bool = None, # 可選：只看啟用中
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    
    if search:
        term = f"%{search}%"
        query = query.filter(or_(
            Product.name.like(term), 
            Product.itemcode.like(term),
            Product.barcodeId.like(term)
        ))
    
    if is_active is not None:
        query = query.filter(Product.is_active == is_active)

    total = query.count()
    products = query.order_by(Product.pid.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    return {"total": total, "items": products}

# 2. 新增產品 (需權限)
@router.post("/", response_model=ProductResponse)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.SUPER_ADMIN)) # 假設只有 Admin 能建產品
):
    # 檢查 ItemCode 是否重複
    if db.query(Product).filter(Product.itemcode == product_in.itemcode).first():
        raise HTTPException(status_code=400, detail="Item Code already exists")

    product = Product(**product_in.dict())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

# 3. 修改產品
@router.put("/{pid}", response_model=ProductResponse)
def update_product(
    pid: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.SUPER_ADMIN))
):
    product = db.query(Product).filter(Product.pid == pid).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # 更新欄位
    update_data = product_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product

# 4. 圖片上傳接口
@router.post("/upload")
def upload_product_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission(Perms.SUPER_ADMIN))
):
    try:
        # 1. 產生唯一檔名，防止覆蓋
        file_ext = file.filename.split(".")[-1]
        new_filename = f"{uuid.uuid4()}.{file_ext}"
        file_path = f"static/images/{new_filename}"
        
        # 2. 存檔
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 3. 回傳 URL (相對路徑或完整路徑皆可，這裡回傳相對路徑)
        # 前端顯示時需要補上 Base URL
        return {"filename": new_filename, "url": f"/static/images/{new_filename}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

# 5. 刪除/停用產品
@router.delete("/{pid}")
def delete_product(
    pid: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.SUPER_ADMIN))
):
    product = db.query(Product).filter(Product.pid == pid).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # 軟刪除 (Soft Delete)
    product.is_active = False
    db.commit()
    return {"message": "Product deactivated"}
