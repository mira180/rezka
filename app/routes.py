from flask import render_template, redirect, url_for, g, request
from app import app
from app.forms import SearchForm

from datetime import datetime
import logging

from db import Database
from rezka import Rezka

from .config import DB_URI, TIME_PATTERN, UPDATE_INTERVAL, TYPE_MOVIE

logger = logging.getLogger(__name__)

db = Database(DB_URI)
rezka = Rezka(use_proxy=True)

@app.before_request
def before_request():
    g.search_form = SearchForm()

@app.route('/', methods=['GET', 'POST'])
@app.route('/index', methods=['GET', 'POST'])
def index():
    welcome_message = 'Немного изменен дизайн, увеличено быстродействие, теперь доступно автовоспроизведение и наконец-то (наконец-то) сайт работает на выделенном сервере (надеюсь)'
    must_watch_list = db.find('must_watch', {}, multiple=True)
    def obtain_info_by_id(id_):
        item = db.find('items', { '_id': id_ })
        info = {
            'title': item['title'],
            'src': '/watch/' + str(id_),
            'cover': item['cover'],
            'summary': item['summary']
        }
        db.update('must_watch', { '_id': id_ }, info)
        info.update({ '_id' : id_ })
        return info
    must_watch_list = [obtain_info_by_id(item['_id']) if 'title' not in item else item for item in must_watch_list]
    newest_list = db.find('newest', {}, multiple=True)
    for item in newest_list:
        item['src'] = '/watch/' + item['src'].split('/')[-1][:-5].split('-')[0] # достаем id из ссылки
    return render_template('index.html', welcome_message=welcome_message, must_watch_list=must_watch_list, newest_list=newest_list)

@app.route('/search', methods=['POST'])
def search():
    if not g.search_form.validate_on_submit():
        return redirect(url_for('index'))
    return redirect(url_for('results', query=g.search_form.data['search']))

@app.route('/results/<query>')
def results(query):
    results = rezka.search(query)
    error_id = results['error']
    if error_id != 0:
        return render_template('error.html', error_id=error_id, error_description='Ошибка во время поиска', title='Ошибка')
    results = results['results']
    for result in results:
        result['src'] = '/watch/' + result['src'].split('/')[-1][:-5].split('-')[0] # достаем id из ссылки
    return render_template('results.html', results=results, title=f'Поиск: {query}')

@app.route('/watch/<int:id_>')
def watch(id_):
    item = db.find('items', {'_id': id_})
    if item is None:
        return render_template('error.html', error_id=2, error_description='Ошибка получения данных', title='Ошибка')
    last_update_timestamp = int(datetime.timestamp(datetime.strptime(item['last_update'], TIME_PATTERN)))
    timestamp = int(datetime.timestamp(datetime.now()))
    if timestamp - last_update_timestamp > UPDATE_INTERVAL:
        # если с последнего обновления прошло больше UPDATE_INTERVAL, то обновляем
        logger.info(f'Обновляем {item["title"]} (с последнего обновления прошло {int((timestamp - last_update_timestamp) / 60 / 60)} часов)')
        result = rezka.get(item['src'])
        if result['error'] != 0:
            return render_template('error.html', error_id=3, error_description='Ошибка получения данных', title='Ошибка')
        result = result['result']
        new_values = {
            #'cover': result['cover'], # обновить постер
            'about': result['about'], # обновить описание
            'payload': result['payload'], # обновить список серий
            'last_update': datetime.now().strftime(TIME_PATTERN),
            'info': result['info'], # обновить информацию
        }
        if not 'type' in item: # если типа не было
            logger.info(f'Добавили отсутствующий тип')
            new_values['type'] = result['type'] # добавляем тип
        db.update('items', {'_id': id_}, new_values)
        item = db.find('items', {'_id': id_})
    og = {
        "title": f"{item['title']} – смотреть {'фильм' if item['type'] == TYPE_MOVIE else 'сериал'}",
        "description": item["about"],
        "image": item["cover"],
        "url": request.base_url
    }
    return render_template('watch.html', item=item, title=item['title'], og=og)

@app.route('/get_stream', methods=['POST'])
def get_stream():
    return rezka.get_stream(request.form)
