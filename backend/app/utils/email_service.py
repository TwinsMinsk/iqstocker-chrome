"""
Email service для отправки писем через SendGrid
"""
import secrets
from typing import Optional
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Сервис для отправки email через SendGrid"""
    
    def __init__(self):
        self.api_key = settings.SENDGRID_API_KEY
        self.from_email = settings.SENDGRID_FROM_EMAIL
        self.client = None
        
        if self.api_key:
            try:
                self.client = SendGridAPIClient(self.api_key)
            except Exception as e:
                logger.warning(f"Failed to initialize SendGrid client: {e}")
                self.client = None
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        Отправить email
        
        Args:
            to_email: Email получателя
            subject: Тема письма
            html_content: HTML содержимое
            text_content: Текстовое содержимое (опционально)
        
        Returns:
            True если отправлено успешно, False иначе
        """
        if not self.client:
            logger.warning("SendGrid not configured, skipping email send")
            return False
        
        try:
            message = Mail(
                from_email=Email(self.from_email),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", html_content)
            )
            
            if text_content:
                message.add_content(Content("text/plain", text_content))
            
            response = self.client.send(message)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"Email sent successfully to {to_email}")
                return True
            else:
                logger.error(f"Failed to send email: {response.status_code} - {response.body}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending email to {to_email}: {e}")
            return False
    
    def send_verification_email(self, to_email: str, verification_token: str, base_url: str) -> bool:
        """
        Отправить письмо для верификации email
        
        Args:
            to_email: Email пользователя
            verification_token: Токен для верификации
            base_url: Базовый URL приложения (для ссылки)
        """
        verification_url = f"{base_url}/auth/verify-email?token={verification_token}"
        
        html_content = f"""
        <html>
        <body>
            <h2>Подтвердите ваш email</h2>
            <p>Спасибо за регистрацию! Пожалуйста, подтвердите ваш email адрес, перейдя по ссылке ниже:</p>
            <p><a href="{verification_url}">Подтвердить email</a></p>
            <p>Или скопируйте эту ссылку в браузер:</p>
            <p>{verification_url}</p>
            <p>Если вы не регистрировались, просто проигнорируйте это письмо.</p>
        </body>
        </html>
        """
        
        text_content = f"""
        Подтвердите ваш email
        
        Спасибо за регистрацию! Пожалуйста, подтвердите ваш email адрес, перейдя по ссылке:
        {verification_url}
        
        Если вы не регистрировались, просто проигнорируйте это письмо.
        """
        
        return self.send_email(
            to_email=to_email,
            subject="Подтвердите ваш email - Midjourney Auto",
            html_content=html_content,
            text_content=text_content
        )
    
    def send_welcome_email(self, to_email: str) -> bool:
        """Отправить приветственное письмо"""
        html_content = """
        <html>
        <body>
            <h2>Добро пожаловать в Midjourney Auto!</h2>
            <p>Спасибо за регистрацию. Вы получили 50 бесплатных кредитов для начала работы.</p>
            <p>Начните использовать наш сервис прямо сейчас!</p>
        </body>
        </html>
        """
        
        return self.send_email(
            to_email=to_email,
            subject="Добро пожаловать в Midjourney Auto!",
            html_content=html_content
        )


def generate_verification_token() -> str:
    """Генерировать токен для верификации email"""
    return secrets.token_urlsafe(32)


# Глобальный экземпляр сервиса
email_service = EmailService()

