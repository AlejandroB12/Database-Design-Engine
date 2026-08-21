from sqlalchemy import Column, Numeric, String, DateTime, func, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class StatusPago(str, enum.Enum):
    PENDIENTE = "pendiente"
    EN_PROCESO = "en_proceso"
    COMPLETADO = "completado"
    CANCELADO = "cancelado"

class Payment_History(Base):
    
    __tablename__ = 'payment_history'

    id_payment_history = Column(Integer, primary_key=True, autoincrement=True)
    amount = Column(Numeric(10,2), nullable=False)
    coins = Column(String(10), default='USDT')
    binance_txid = Column(String(100), unique=True, nullable=False)
    status = Column(
        Enum(StatusPago, name='status_pago'), 
        server_default=StatusPago.PENDIENTE.value,
        nullable=False
    )
    payment_date = Column(DateTime, server_default=func.now())
    id_client = Column(Integer, ForeignKey('client.id_client', name='fk_pago_cliente', ondelete='cascade'), nullable=False)

