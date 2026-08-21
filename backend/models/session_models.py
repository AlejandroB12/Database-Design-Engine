from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Session(Base):
    
    __tablename__='session'

    id_session = Column(Integer, primary_key=True,autoincrement=True)
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(text)
    start_date = Column(DateTime, server_default=func.now())
    end_date = Column(DateTime)
    id_client = Column(Integer, foreignKey('client.id_client', name = 'fk_auditoria_cliente', ondelete='cascade'), nullable=false)

    
