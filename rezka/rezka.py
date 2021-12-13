import requests
from bs4 import BeautifulSoup
import logging
import re

from .config import HEADERS, TYPE_MOVIE, TYPE_SERIES
from .proxy import get_proxy


logger = logging.getLogger(__name__)


class Rezka:

    def __init__(self, host: str = 'https://rezka.ag', use_proxy: bool = False):
        self.host = host
        self.protocol = host.split('://')[0]
        self.use_proxy = use_proxy

    def _request(self, url: str, method: str ='get', data: dict = None):
        try:
            logger.debug(f'Выполняю запрос к {url}')
            params_ = {
                'url': url,
                'headers': HEADERS
            }
            if self.use_proxy:
                proxy = get_proxy()
                if proxy is not None:
                    params_['proxies'] = { self.protocol: proxy }
            if data:
                params_['data'] = data
            if method == 'get':
                r = requests.get(**params_)
            elif method == 'post':
                r = requests.post(**params_)
            if r.status_code != 200:
                logger.error(f'Неверный код статуса во время запроса к {url}: {r.status_code}')
                raise Exception('Неверный код статуса')
            return r
        except Exception as e:
            logger.error(f'Ошибка во время запроса к {url}: {e}')
            raise

    def search(self, query: str) -> dict:
        """
        Выполняет поиск по сайту, отправляя запрос к /search
        """
        try:
            logger.info(f'Выполняю поиск: {query}')
            query = query.replace(' ', '+')
            r = self._request(
                f'{self.host}/search/?do=search&subaction=search&q={query}'
            )
            soup = BeautifulSoup(r.text, 'html.parser')
            search_results = []
            for inline_item in soup.find('div', class_='b-content__inline_items').find_all('div', class_='b-content__inline_item', recursive=False):
                item = {
                    'title': inline_item.find('div', class_='b-content__inline_item-link').find('a').text,
                    'summary': inline_item.find('div', class_='b-content__inline_item-link').find('div').text,
                    'src': inline_item.find('div', class_='b-content__inline_item-link').find('a')['href'],
                    'cover': inline_item.find('div', class_='b-content__inline_item-cover').find('img')['src'],
                }
                search_results.append(item)
            return {'error': 0, 'results': search_results}
        except Exception as e:
            logger.error(f'Ошибка во время поиска: {e}')
            return {'error': 1 }

    def get(self, src) -> list:
        """
        Возвращает полную информацию в формате json
        """
        src_id = int(src.split('/')[-1].split('-')[0]) # достаем id
        r = self._request(
            src
        )
        soup = BeautifulSoup(r.text, 'html.parser')
        result = {}
        try:
            result['title'] = soup.find('div', class_='b-post__title').find('h1').text
            #result['original_title'] = soup.find('div', class_='b-post__origtitle').text
            result['cover'] = soup.find('div', class_='b-sidecover').find('img')['src']
            result['about'] = soup.find('div', class_='b-post__description_text').text.strip()
            result['payload'] = []
            result['info'] = {}

            post_info = soup.find('table', class_='b-post__info')
            if post_info:
                logger.debug('Нашли post_info')
                for tr in post_info.find_all('tr'):
                    tr_name = tr.find('h2')
                    if tr_name.text == 'Дата выхода':
                        result['info']['release_date'] = tr.find_all('td')[-1].text
                    elif tr_name.text == 'Страна':
                        result['info']['country'] = tr.find_all('td')[-1].text
                    elif tr_name.text == 'Слоган':
                        result['info']['slogan'] = tr.find_all('td')[-1].text
                    elif tr_name.text == 'Режиссер':
                        result['info']['director'] = ' '.join(item.text for item in tr.find_all('span', class_='item'))
                    elif tr_name.text == 'Жанр':
                        result['info']['genre'] = tr.find_all('td')[-1].text
                    elif tr_name.text == 'В ролях актеры':
                        result['info']['cast'] = ' '.join(item.text for item in tr.find_all('span', class_='item'))
                logger.debug(f'Собрали информацию: {result["info"]}')

            init_cdn = re.search('sof.tv.initCDNMoviesEvents\([0-9]+, [0-9]+', r.text)
            if init_cdn:
                type_ = TYPE_MOVIE
            else:
                init_cdn = re.search('sof.tv.initCDNSeriesEvents\([0-9]+, [0-9]+', r.text)
                if init_cdn:
                    type_ = TYPE_SERIES
                else:
                    raise Exception("Ошибка получения типа")
            default_translator_id = init_cdn.group(0).split(',')[1].strip()
            result['type'] = type_

            translators_list = soup.find('ul', class_='b-translators__list')
            if translators_list:
                translators_list = translators_list.find_all('li', class_='b-translator__item')
            else:
                logger.warning('Не нашли список переводчиков, создаем ложный')
                # нет выбора переводчика, создаем ложный
                translators_list = [{
                    'title': 'Дубляж',
                    'data-translator_id': default_translator_id,
                }]
            if type_ == TYPE_MOVIE:
                for translator in translators_list:
                    translator_ = {
                        'title': translator['title'].strip(),
                        'id': int(translator['data-translator_id']),
                    }
                    try:
                        translator_['camrip'] = int(translator['data-camrip'])
                    except:
                        pass
                    try:
                        translator_['ads'] = int(translator['data-ads'])
                    except:
                        pass
                    try:
                        translator_['director'] = int(translator['data-director'])
                    except:
                        pass
                    result['payload'].append(translator_)

            elif type_ == TYPE_SERIES:
                for translator in translators_list:
                    translator_ = {
                        'title': translator['title'].strip(),
                        'id': int(translator['data-translator_id']),
                        'seasons': []
                    }
                    r = self._request(
                        f'{self.host}/ajax/get_cdn_series/',
                        data={
                            'id': src_id,
                            'translator_id': translator_['id'],
                            'action': 'get_episodes'
                        },
                        method='post'
                    )
                    r = r.json()
                    episodes_lists = BeautifulSoup(r['episodes'], 'html.parser').find_all('ul', class_='b-simple_episodes__list')
                    for i, season in enumerate(BeautifulSoup(r['seasons'], 'html.parser').find_all('li', class_='b-simple_season__item')):
                        season_ = {
                            'title': season.text,
                            'id': int(season['data-tab_id']),
                            'episodes': []
                        }
                        for episode in BeautifulSoup(str(episodes_lists[i]), 'html.parser').find_all('li', class_='b-simple_episode__item'):
                            episode_ = {
                                'title': episode.text,
                                'id': int(episode['data-episode_id'])
                            }
                            season_['episodes'].append(episode_)
                        translator_['seasons'].append(season_)
                    result['payload'].append(translator_)

        except Exception as e:
            logger.error(f'Ошибка во время получения данных: {e}')
            return { 'error': 1 }
        return { 'error': 0, 'result': result }

    def get_stream(self, payload: dict):
        logger.debug(f'Получаю стрим: {payload}')
        try:
            logger.info(f'Получаю стримы для {payload["id"]}')
            r = self._request('https://rezka.ag/ajax/get_cdn_series/', method='post', data=payload)
            r = r.json()
            if r['success'] != True:
                logger.warning(f'Ошибка во время получения стрима')
                return { 'error': 2 }
            streams = {}
            for quality in r['url'].split(','):
                urls = quality.split(' or ')
                quality = re.findall('\[[0-9a-zA-Z ]+\]', quality)[0][1:-1]
                streams[quality] = {
                    'm3u8': urls[0][(len(quality) + 2):].strip(),
                    'mp4': urls[1].strip()
                }
            subtitles = {}
            if r['subtitle']:
                for subtitle in r['subtitle'].split(','):
                    label = re.findall('\[[^\]]+\]', subtitle)[0][1:-1]
                    subtitles[r['subtitle_lns'][label]] = {
                        'label': label,
                        'src': subtitle[len(label) + 2:].strip()
                    }
            return { 'error': 0, 'streams': streams, 'subtitles': subtitles }
        except Exception as e:
            logger.error(f'Ошибка во время получения стрима: {e}')
            return { 'error': 1 }