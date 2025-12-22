"""
License Key Model
"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from uuid import uuid4

from app.db.base import Base, TimestampMixin


class LicenseKey(Base, TimestampMixin):
    """License Key model"""
    __tablename__ = "license_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    key_hash = Column(String(255), unique=True, nullable=False, index=True)  # bcrypt hashed
    key_display = Column(String(50), nullable=False)  # 'sk_live_a1b2c3d4...' for UI
    
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="license_keys")
    
    def __repr__(self):
        return f"<LicenseKey(user_id={self.user_id}, display={self.key_display[:10]}..., active={self.is_active})>"

