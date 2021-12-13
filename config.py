import os

class Config(object):
    WTF_CSRF_ENABLED = False
    SECRET_KEY = os.environ.get('SECRET_KEY', 'secret-secret-key')
    TEMPLATES_AUTO_RELOAD = True