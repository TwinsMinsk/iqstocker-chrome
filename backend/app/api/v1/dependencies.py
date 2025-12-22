"""
Shared dependencies для API endpoints
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import verify_token

security = HTTPBearer()


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> str:
    """
    Dependency для получения текущего пользователя из JWT token
    Возвращает user_id
    """
    token = credentials.credentials
    payload = verify_token(token, token_type="access")
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    return user_id


async def get_current_admin_user(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Dependency для проверки что пользователь - админ
    TODO: Реализовать проверку is_admin из базы данных
    """
    # TODO: Проверить is_admin в базе данных
    # from app.models.user import User
    # user = db.query(User).filter(User.id == user_id).first()
    # if not user or not user.is_admin:
    #     raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return user_id

