from fastapi import APIRouter
from app.v1.endpoints import auth, baskets, devices, users

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(baskets.router, prefix="/baskets", tags=["Baskets"])
api_router.include_router(devices.router, prefix="/devices", tags=["Devices"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])