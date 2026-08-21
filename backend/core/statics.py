from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

STATIC_DIRS = [
    ("/lib", "frontend/lib"),
    ("/routes", "frontend/routes"),
    ("/controller", "frontend/controller"),
    ("/assets", "assets"),
    ("/images", "assets/images"),
]


def mount_statics(app: FastAPI) -> None:
    for path, directory in STATIC_DIRS:
        app.mount(path, StaticFiles(directory=directory), name=path.strip("/"))
