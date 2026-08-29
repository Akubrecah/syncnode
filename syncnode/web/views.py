from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from jinja2 import Template
from syncnode.web.templates import MAIN_PAGE_TEMPLATE

web_router = APIRouter(tags=["Web"])


@web_router.get("/", response_class=HTMLResponse)
@web_router.get("/home", response_class=HTMLResponse)
@web_router.get("/dashboard", response_class=HTMLResponse)
@web_router.get("/spot", response_class=HTMLResponse)
@web_router.get("/p2p", response_class=HTMLResponse)
@web_router.get("/wallet", response_class=HTMLResponse)
@web_router.get("/news", response_class=HTMLResponse)
@web_router.get("/security", response_class=HTMLResponse)
async def serve_web_app():
    template = Template(MAIN_PAGE_TEMPLATE)
    return HTMLResponse(content=template.render(), status_code=200)
