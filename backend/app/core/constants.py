from enum import Enum


class RoleEnum(str, Enum):
    CUSTOMER = "CUSTOMER"
    SELLER = "SELLER"
    DELIVERY_PARTNER = "DELIVERY_PARTNER"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"


ROLE_ID_MAP = {
    RoleEnum.CUSTOMER: 1,
    RoleEnum.SELLER: 2,
    RoleEnum.DELIVERY_PARTNER: 3,
    RoleEnum.ADMIN: 4,
    RoleEnum.SUPER_ADMIN: 5,
}

ROLE_NAME_MAP = {v: k.value for k, v in ROLE_ID_MAP.items()}


class OrderStatus(str, Enum):
    NEW = "NEW"
    ACCEPTED = "ACCEPTED"
    PACKING = "PACKING"
    READY = "READY"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"


class PaymentMethod(str, Enum):
    COD = "COD"
    UPI = "UPI"
    CARD = "CARD"
    NETBANKING = "NETBANKING"
    WALLET = "WALLET"


class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class DeliveryTaskStatus(str, Enum):
    ASSIGNED = "ASSIGNED"
    STARTED = "STARTED"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class DeliveryBatchStatus(str, Enum):
    CREATED = "CREATED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class InventoryTransactionType(str, Enum):
    STOCK_IN = "STOCK_IN"
    STOCK_OUT = "STOCK_OUT"
    RESERVED = "RESERVED"
    RELEASED = "RELEASED"
    ADJUSTMENT = "ADJUSTMENT"


class ComplaintStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class DiscountType(str, Enum):
    PERCENTAGE = "PERCENTAGE"
    FLAT = "FLAT"


class NotificationChannel(str, Enum):
    IN_APP = "IN_APP"
    SMS = "SMS"
    WHATSAPP = "WHATSAPP"
    PUSH = "PUSH"
    EMAIL = "EMAIL"
