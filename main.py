from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

app = FastAPI(title="Database Modeler")

app.mount("/lib", StaticFiles(directory="frontend/lib"), name="lib")
app.mount("/routes", StaticFiles(directory="frontend/routes"), name="routes")
app.mount("/assets", StaticFiles(directory="assets"), name="assets")
app.mount("/images", StaticFiles(directory="assets/images"), name="images")

@app.get("/generador")
async def index():
    return FileResponse("frontend/views/diagram-generator", media_type="text/html")

@app.get("/creador")
async def creador():
    return FileResponse("frontend/views/diagram-creator", media_type="text/html")

@app.get("/demo")
async def demo():
    return FileResponse("frontend/views/demo-generator", media_type="text/html")

@app.get("/")
async def landing():
    return FileResponse("index.html", media_type="text/html")

@app.get("/login")
async def login():
    return FileResponse("frontend/views/login.html", media_type="text/html")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
