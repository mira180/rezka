import os

UPDATE_INTERVAL = int(os.environ.get('UPDATE_INTERVAL', '86400'))
TIME_PATTERN = r'%Y-%m-%d %H:%M:%S'
DB_URI = os.environ.get('DB_URI', 'mongodb://localhost:27017')