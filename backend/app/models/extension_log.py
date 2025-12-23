"""
Extension Log Model
ВАЖНО: НЕ сохраняем тексты промптов, только метаданные!
"""
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from uuid import uuid4

from app.db.base import Base
from app.core.config import settings

# Используем UUID для PostgreSQL, String для SQLite (совместимость с User model)
if settings.USE_SQLITE:
    ID_TYPE = String(36)
    ID_DEFAULT = lambda: str(uuid4())
else:
    ID_TYPE = UUID(as_uuid=True)
    ID_DEFAULT = uuid4


class ExtensionLog(Base):
    """Extension Log model - только метаданные, БЕЗ текстов промптов!"""
    __tablename__ = "extension_logs"
    
    id = Column(ID_TYPE, primary_key=True, default=ID_DEFAULT)
    user_id = Column(ID_TYPE, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    session_id = Column(String(255), nullable=False, index=True)
    status = Column(String(50), nullable=False, index=True)  # 'success', 'error', 'paused', 'completed'
    
    error_type = Column(String(100), nullable=True)  # 'rate_limit', 'invalid_prompt', 'network_error', 'discord_error'
    error_message = Column(Text, nullable=True)  # Error details only, NOT prompts!
    
    prompts_count = Column(Integer, default=0, nullable=False)
    successful_count = Column(Integer, default=0, nullable=False)
    failed_count = Column(Integer, default=0, nullable=False)
    duration_seconds = Column(Integer, nullable=True)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="extension_logs")
    
    def __repr__(self):
        return f"<ExtensionLog(user_id={self.user_id}, session={self.session_id}, status={self.status}, prompts={self.prompts_count})>"

