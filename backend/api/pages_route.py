from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse

from auth.page_guard import require_session

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


@router.get("/generador", dependencies=[Depends(require_session)])
async def index():
    return FileResponse("frontend/views/diagram-generator", media_type="text/html")


@router.get("/demo")
async def demo():
    return FileResponse("frontend/views/demo-generator", media_type="text/html")
