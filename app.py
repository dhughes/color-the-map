#!/usr/bin/env python3
from backend.main import app
from backend.config import config

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host=config.HOST, port=config.PORT)
