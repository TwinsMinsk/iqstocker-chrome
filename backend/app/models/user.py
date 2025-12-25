"""
User Model
"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from uuid import uuid4
from datetime import datetime
from app.core.config import settings

from app.db.base import Base, TimestampMixin, SoftDeleteMixin

# Используем UUID для PostgreSQL, String для SQLite
if settings.USE_SQLITE:
    ID_TYPE = String(36)
    ID_DEFAULT = lambda: str(uuid4())
else:
    ID_TYPE = UUID(as_uuid=True)
    ID_DEFAULT = uuid4


class User(Base, TimestampMixin, SoftDeleteMixin):
    """User model"""
    __tablename__ = "users"
    
    id = Column(ID_TYPE, primary_key=True, default=ID_DEFAULT)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    oauth_google_id = Column(String(255), unique=True, nullable=True)
    telegram_user_id = Column(String(255), unique=True, nullable=True, index=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    email_verification_token = Column(String(255), nullable=True)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    license_keys = relationship("LicenseKey", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    extension_logs = relationship("ExtensionLog", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(email={self.email}, id={self.id})>"

