from sqlalchemy import JSON, Column, ForeignKey, Integer, String, DateTime, func
from sqlalchemy.orm import relationship

from models.base import Base

class Diagram(Base):
    
    __tablename__ = 'diagram'

    id_diagram = Column(Integer, primary_key=True, autoincrement=True)
    diagram_name = Column(String(100), nullable=False)
    content = Column(JSON, nullable=False)
    created_in = Column(DateTime, server_default=func.now())
    updated_on = Column(DateTime, server_default=func.now(), onupdate=func.now())
    id_client = Column(Integer, ForeignKey('client.id_client', name='fk_diagrama_cliente', ondelete='cascade'))

    


