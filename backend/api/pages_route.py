from fastapi import APIRouter
from fastapi.responses import FileResponse

router = APIRouter()


@router.get("/")
async def landing():
    return FileResponse("frontend/views/index.html", media_type="text/html")


@router.get("/login")
async def login():
    return FileResponse("frontend/views/login.html", media_type="text/html")


@router.get("/register")
async def register():
    return FileResponse("frontend/views/login.html", media_type="text/html")


@router.get("/generador")
async def index():
    return FileResponse("frontend/views/diagram-generator", media_type="text/html")


@router.get("/demo")
async def demo():
    return FileResponse("frontend/views/demo-generator", media_type="text/html")
