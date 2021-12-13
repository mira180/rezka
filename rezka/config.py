import logging

LOG_FILE = 'log.txt'
LOGGER_LEVEL = 'DEBUG'

logging.getLogger('urllib3').setLevel('CRITICAL')
logging.basicConfig(
        level=LOGGER_LEVEL,
        format="%(asctime)s [%(levelname)s]: %(message)s",
        datefmt="%H:%M:%S")

HEADERS = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36'
}

TYPE_MOVIE = 1
TYPE_SERIES = 2

PROXY_FILE = 'proxy.txt'

