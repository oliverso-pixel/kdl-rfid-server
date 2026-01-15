# app/core/permissions.py
from enum import Enum

class Perms(str, Enum):
    # 系統級
    SUPER_ADMIN = "*"           # 萬能權限 (IT Admin)
    
    # 籃子管理
    BASKET_READ = "basket:read"
    BASKET_CREATE = "basket:create"
    BASKET_UPDATE = "basket:update"
    BASKET_DELETE = "basket:delete"
    
    # 用戶管理
    USER_READ = "user:read"
    USER_CREATE = "user:create"          # 可以建立任何部門用戶
    USER_CREATE_DEPT = "user:create:dept" # 只能建立自己部門用戶
    USER_UPDATE = "user:update"
    
    # 生產/出貨/收貨
    PRODUCTION_OP = "op:production"
    SHIPPING_OP = "op:shipping"
    RECEIVING_OP = "op:receiving"

DEFAULT_ROLE_PERMISSIONS = {
    "Admin": {
        "IT": [Perms.SUPER_ADMIN],
        "Production": [
            Perms.USER_READ, 
            Perms.USER_CREATE_DEPT,
            Perms.PRODUCTION_OP,
            Perms.BASKET_READ
        ],
        "Warehouse": [
            Perms.USER_READ,
            Perms.USER_CREATE_DEPT,
            Perms.RECEIVING_OP,
            Perms.BASKET_READ
        ]
    },
    "Operator": {
        "Production": [Perms.PRODUCTION_OP],
        "Warehouse": [Perms.RECEIVING_OP]
    }
}
