# Import all models here so Alembic autodiscovers them
from app.models.conversation import Conversation, Message
from app.models.flight import FlightBooking
from app.models.user import User
from app.models.user_credentials import UserCredentials

__all__ = ["User", "UserCredentials", "Conversation", "Message", "FlightBooking"]
