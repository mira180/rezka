from bs4 import BeautifulSoup
import logging
import queue
import threading

from rezka import Rezka
from db import Database
from app.config import DB_URI

db = Database(DB_URI)
rezka = Rezka(use_proxy=True)

host = 'https://rezka.ag'

q = queue.Queue()

THREADS = 50

total_inserts = 0
total_updates = 0
total_success = 0
total_errors = 0
retrieval_errors = 0

logger = logging.getLogger(__name__)
logging.getLogger('db').setLevel('CRITICAL')


def fetch(inline_item, collection):
    try:
        new_values = {}
        id_ = int(inline_item['data-id'])
        new_values['src'] = inline_item['data-url']
        item_link = inline_item.find('div', class_='b-content__inline_item-link')
        new_values['title'] = item_link.find('a').text
        new_values['summary'] = item_link.find('div').text
        new_values['cover'] = inline_item.find('div', class_='b-content__inline_item-cover').find('img')['src']
        new_values['last_update'] = '2000-01-01 00:00:00'
        if db.find(collection, {'_id': id_}):
            db.update(collection, {'_id': id_}, new_values)
            logger.debug(f'Обновлена запись {id_}')
            return 2
        else:
            new_values['_id'] = id_
            db.insert(collection, new_values)
            logger.debug(f'Создана запись {id_}')
            return 1
    except Exception as e:
        logger.error(f'Ошибка создания записи: {e}')
        raise

def fetch_search(search, start_from=0):
    r = rezka._request(f'{host}/{search}')
    pages = BeautifulSoup(r.text, 'html.parser').find('div', class_='b-navigation').find_all('a')[-2].text
    logger.debug(f'Всего страниц: {pages}')
    for i in range(start_from, int(pages)):
        q.put((f'{host}/{search}/page/{i + 1}/', 'items'))

def fetch_newest():
    db.delete('newest', {}, multiply=True)
    q.put((host, 'newest'))

def fetcher():
    global total_inserts, total_updates, total_errors, total_success, retrieval_errors
    while True:
        url, collection = q.get()
        try:
            r = rezka._request(url)
            if collection == 'newest':
                inline_items = BeautifulSoup(r.text, 'html.parser').find('div', id='newest-slider-content').find_all('div', class_='b-content__inline_item')
            elif collection == 'items':
                inline_items = BeautifulSoup(r.text, 'html.parser').find_all('div', class_='b-content__inline_item')
            else:
                logger.warning(f'Неизвестная коллекция {collection}')
                continue
        except Exception as e:
            logger.error(f'Ошибка во время получения данных с URL: {url}')
            retrieval_errors += 1
        else:
            for inline_item in inline_items:
                try:
                    type_ = fetch(inline_item, collection)
                    if (type_ == 1):
                        total_inserts += 1
                    elif (type_ == 2):
                        total_updates += 1
                except:
                    total_errors += 1
                else:
                    total_success += 1
        finally:
            q.task_done()

if __name__ == '__main__':
    searches = ['series', 'films', 'cartoons', 'animation']
    fetch_newest()
    for search in searches:
        fetch_search(search, start_from=0)
    
    for _ in range(THREADS):
        t = threading.Thread(target=fetcher)
        t.daemon = True
        t.start()
    
    q.join()

    logger.info(f'\nСоздано записей: {total_inserts}\nОбновлено записей: {total_updates}\nУспешно: {total_success}\nОшибки: {total_errors}\nОшибки получения данных: {retrieval_errors}')