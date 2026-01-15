# app/core/security.py
from fastapi import Depends, HTTPException, status
from app.models import User
from app.v1.endpoints.auth import get_current_user
from app.core.permissions import Perms

# Dependency Factory
def require_permission(required_perm: str):
    def permission_checker(current_user: User = Depends(get_current_user)):

        user_perms = current_user.get_all_permissions()
        
        if Perms.SUPER_ADMIN in user_perms:
            return current_user
            
        if required_perm not in user_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required: {required_perm}"
            )
        
        return current_user
    return permission_checker
