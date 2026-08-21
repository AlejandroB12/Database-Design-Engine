from sqlalchemy import Column, Integer, DateTime, Text, func,ForeignKey
from sqlalchemy.orm import relationship

from models.base import Base

class Token(Base):
    
    __tablename__ = 'token'

    id_token = Column(Integer, primary_key=True,autoincrement=True)
    refresh_token = Column(Text, unique=True, nullable=False)
    created_in = Column(DateTime, server_default=func.now())
    expires_in = Column(DateTime, nullable=False)
    id_client = Column(Integer,ForeignKey('client.id_client', name='fk_token_cliente', ondelete='cascade'), nullable=False)

