from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Cambiamos el nombre para reflejar que ahora es una BD genérica/local
    database_url: str
    
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_debug: bool = True

    model_config = {
        # Asegúrate de que esta ruta apunte correctamente a donde crearás tu archivo .env
        "env_file": ".env", 
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

settings = Settings()
