import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "backend"))

import uvicorn
from fastapi import FastAPI

from api import api_router
from core.statics import mount_statics

app = FastAPI(title="Database Modeler")
app.include_router(api_router)
mount_statics(app)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
