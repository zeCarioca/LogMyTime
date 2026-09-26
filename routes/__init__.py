from routes.main_routes import main_bp
from routes.auth_routes import auth_bp
from routes.repo_routes import repo_bp
from routes.time_routes import time_bp
from routes.data_routes import data_bp

__all__ = ['main_bp', 'auth_bp', 'repo_bp', 'time_bp', 'data_bp']
