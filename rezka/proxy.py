import logging
import random

from .config import PROXY_FILE


logger = logging.getLogger(__name__)


def get_proxy() -> str or None:
    proxy_list = get_proxies_from_file(PROXY_FILE)
    if proxy_list is None:
        return None
    proxy = random.choice(proxy_list)
    logger.debug(f'Возвращаем случайный прокси: {"<credentials>@" + proxy.split("@")[1]}') # скрываем креды прокси
    return proxy

def get_proxies_from_file(proxy_file_name: str) -> list or None:
    try:
        with open(proxy_file_name) as proxy_file:
            return [proxy.strip() for proxy in proxy_file]
    except:
        logger.warning(f'Ошибка чтения прокси из файла: {PROXY_FILE}')
    return None