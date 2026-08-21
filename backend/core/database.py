from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import settings 

# 1. Creamos el motor de conexión apuntando a tu PostgreSQL local
engine = create_engine(settings.database_url, pool_pre_ping=True)

# 2. Configuramos la fábrica de sesiones
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Mantenemos el generador de dependencias para usarlo en tus rutas (endpoints)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
