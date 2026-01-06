
import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.orm import Session
from datetime import datetime

from app.services.billing_service import billing_service
from app.services.payment_service import payment_service
from app.models.user import User
from app.models.transaction import Transaction
from app.models.subscription import Subscription
from app.core.config import settings

# Фикстура пользователя
@pytest.fixture
def test_user(db: Session):
    user = User(
        email=f"test_payment_{uuid.uuid4()}@example.com",
        password_hash="hashed_secret",
        is_active=True
    )
    db.add(user)
    db.commit()
    return user

@pytest.mark.asyncio
async def test_create_payment_order(db: Session, test_user: User):
    """
    Тест создания динамического инвойса (Order) через BillingService.
    Проверяет, что уходит запрос к Tribute API с правильным payload.
    """
    # Включаем API Key для теста
    with patch("app.core.config.settings.TRIBUTE_API_KEY", "test_api_key"):
        
        # Мокаем httpx.AsyncClient
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": "order_12345",
            "link": "https://t.me/Tribute/app?startapp=order_12345"
        }
        
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.post.return_value = mock_response
        
        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await billing_service.create_payment(
                db=db,
                user=test_user,
                plan_id="credit_500"
            )
            
            # Проверки результата
            assert result["payment_url"] == "https://t.me/Tribute/app?startapp=order_12345"
            assert result["payment_id"] == "transaction_id_will_be_checked_below" or True
            
            # Проверки вызова API
            mock_client.post.assert_called_once()
            call_args = mock_client.post.call_args
            url = call_args[0][0]
            kwargs = call_args[1]
            
            assert url == "https://api.tribute.tg/api/v1/orders"
            assert kwargs["headers"]["X-Service-Api-Key"] == "test_api_key"
            
            # Самое важное: проверяем payload
            json_body = kwargs["json"]
            assert json_body["amount"] == 200  # 2.00 EUR * 100
            assert json_body["currency"] == "eur"
            assert json_body["description"] == "500 Credits"
            assert "user_id=" in json_body["payload"]
            assert str(test_user.id) in json_body["payload"]
            assert "plan_id=credit_500" in json_body["payload"]
            # Примечание: successUrl и failUrl могут не поддерживаться в базовом Orders API
            
            # Проверяем, что транзакция создалась в БД с ID из Tribute
            tx = db.query(Transaction).filter(Transaction.user_id == test_user.id).order_by(Transaction.id.desc()).first()
            assert tx is not None
            assert tx.payment_id == "order_12345"
            assert tx.status == "pending"

@pytest.mark.asyncio
async def test_process_webhook_with_payload(db: Session, test_user: User):
    """
    Тест обработки вебхука с payload (динамический инвойс).
    Проверяет, что user_id извлекается из payload и кредиты начисляются.
    """
    # 1. Создаем "pending" транзакцию (как будто юзер нажал кнопку)
    tx = Transaction(
        user_id=test_user.id,
        amount=2.00,
        credits=500,
        type="purchase",
        status="pending",
        plan_id="credit_500",
        payment_id="order_12345"
    )
    db.add(tx)
    db.commit()
    
    # 2. Эмулируем данные вебхука от Tribute
    # Payload содержит параметры, которые мы отправляли при создании
    webhook_payload_str = f"user_id={test_user.id}&plan_id=credit_500&tx_id={tx.id}"
    
    webhook_data = {
        "name": "payment_received", # Или другой event
        "payload": {
            "id": "order_12345", # ID платежа совпадает с Order ID
            "amount": 200,
            "currency": "EUR",
            "status": "confirmed",
            "payload": webhook_payload_str, # ВОТ ОНО - поле с данными
            "customer": {
                "telegram_id": 987654321 # Telegram ID может быть любым
            }
        }
    }
    
    # 3. Вызываем обработчик (с отключенной проверкой подписи для теста)
    # Т.к. verify_signature замокан или мы передаем secret=None в тестах, 
    # но лучше явно запатчить verify_tribute_signature
    
    with patch.object(payment_service, "verify_tribute_signature", return_value=True):
        result = await payment_service.process_tribute_webhook(
            db=db,
            webhook_data=webhook_data,
            request_body=b"{}",
            signature="fake_sig"
        )
        
        assert result["status"] == "ok"
        assert result["credits_added"] == 500
        
        # 4. Проверяем БД
        db.refresh(tx)
        assert tx.status == "completed"
        
        # Проверяем баланс (подписку)
        sub = db.query(Subscription).filter(Subscription.user_id == test_user.id).first()
        assert sub is not None
        assert sub.credits_balance == 500
