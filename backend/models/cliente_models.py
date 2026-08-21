from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Client(Base):
    
    __tablename__ = 'client'

    id_cliente = Column(Integer, primary_key=True, autoincrement=True)
    first_name = Column(String(16), nullable=False)
    last_name = Column(String(16), nullable=False)
    user_name = Column(String(20), nullable=False, unique=True)
    email = Column(String(60), unique=True, nullable=False)
    password = Column(String(72), nullable=False)
    created_in = Column(DateTime, server_default=func.now())




