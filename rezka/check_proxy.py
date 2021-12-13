import requests

proxy_txt = ''
output_txt = 'good_proxies.txt'

def check_proxy_txt(proxy_txt, output_txt):
    total_proxies = 0
    total_good = 0
    total_errors = 0
    with open(proxy_txt, 'r', encoding='utf-8') as proxy_file, open(output_txt, 'w', encoding='utf-8') as output_file:
        for proxy in proxy_file:
            try:
                parts = proxy.strip().split(':')
                proxy = f'http://{parts[2]}:{parts[3]}@{parts[0]}:{parts[1]}'
                proxies = { 'http': proxy, 'https': proxy }
                r = requests.post('https://rezka.ag/ajax/get_cdn_series/', data={ 'id': 1680, 'translator_id': 1, 'action': 'get_episodes' }, headers={ 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36' }, proxies=proxies)
                r = r.json()
                print(f'{proxy} - {"OK" if r["url"] else "FAILED"}')
                if r['url']:
                    output_file.write(f'{proxy}\n')
                    total_good += 1
                total_proxies += 1
            except Exception as e:
                print('Ошибка {e} у прокси {proxy}')
                total_errors += 1     
    print(f'Всего прочекано: {total_proxies}\nИз них хороших: {total_good}\nОшибок: {total_errors}')       

check_proxy_txt(proxy_txt, output_txt)