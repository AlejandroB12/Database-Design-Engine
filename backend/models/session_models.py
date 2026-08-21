from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from models.base import Base

class Session(Base):
    
    __tablename__='session'

    id_session = Column(Integer, primary_key=True,autoincrement=True)
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(Text)
    start_date = Column(DateTime, server_default=func.now())
    end_date = Column(DateTime)
    id_client = Column(Integer, ForeignKey('client.id_client', name = 'fk_auditoria_cliente', ondelete='cascade'), nullable=False)

    
