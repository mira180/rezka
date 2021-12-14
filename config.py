import os

class Config(object):
    WTF_CSRF_ENABLED = False
    SECRET_KEY = os.environ.get('SECRET_KEY', '>BW\x0b2\x1dUp\xc0\x94\x0b_7\x1e\xa9\xa7')