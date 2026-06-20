from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

app = FastAPI(title="Database Modeler")

app.mount("/lib", StaticFiles(directory="frontend/lib"), name="lib")
app.mount("/routes", StaticFiles(directory="frontend/routes"), name="routes")
app.mount("/images", StaticFiles(directory="assents/images"), name="images")

@app.get("/")
async def index():
    return FileResponse("frontend/views/diagram-generator")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
