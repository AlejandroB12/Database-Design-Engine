import pkgutil
from importlib import import_module

from fastapi import APIRouter

api_router = APIRouter()

for _module in pkgutil.iter_modules(__path__):
    if _module.name.endswith("_route"):
        _route_module = import_module(f"{__name__}.{_module.name}")
        _router = getattr(_route_module, "router", None)
        if _router is not None:
            api_router.include_router(_router)
