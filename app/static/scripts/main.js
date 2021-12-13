const id = document.querySelector('.watch').dataset.id
const type = document.querySelector('.watch').dataset.type
const translators = document.querySelector('.translate').querySelectorAll('.tab')
const seasons_lists = document.querySelectorAll('.seasons')
const episodes_lists = document.querySelectorAll('.series')
var streams
var prev_t, prev_s, prev_e
var preferred
var current = {}
const local_storage = window.localStorage

translators.forEach(translator => {
    translator.addEventListener('click', () => {
        if (prev_t) {
            prev_t.classList.remove('active')
        }
        translator.classList.add('active')
        prev_t = translator

        if (prev_s) {
            prev_s.classList.remove('active')
        }

        if (prev_e) {
            prev_e.classList.remove('active')
        }

        seasons_lists.forEach(seasons_list => {
            if (seasons_list.dataset.translator_id != translator.dataset.id) {
                seasons_list.classList.add('hidden')
            } else {
                seasons_list.classList.remove('hidden')
            }
        })

        episodes_lists.forEach(episodes_list => {
            episodes_list.classList.add('hidden')
        })
    })
})

seasons_lists.forEach(seasons_list => {
    seasons_list.querySelectorAll('.tab').forEach(season => {
        season.addEventListener('click', () => {
            if (prev_s) {
                prev_s.classList.remove('active')
            }
            season.classList.add('active')
            prev_s = season

            if (prev_e) {
                prev_e.classList.remove('active')
            }

            episodes_lists.forEach(episodes_list => {
                if (episodes_list.dataset.translator_id != seasons_list.dataset.translator_id ||
                    episodes_list.dataset.season_id != season.dataset.id) {
                    episodes_list.classList.add('hidden')
                } else {
                    episodes_list.classList.remove('hidden')
                }
            })
        })
    })
})

episodes_lists.forEach(episodes_list => {
    episodes_list.querySelectorAll('.tab').forEach(episode => {
        episode.addEventListener('click', () => {
            if (prev_e) {
                prev_e.classList.remove('active')
            }
            episode.classList.add('active')
            prev_e = episode
            set_stream(episodes_list.dataset.translator_id, episodes_list.dataset.season_id, episode.dataset.id)
        })
    })
})

function set_stream(translator_id, season, episode) {

    show_loader()

    payload = "id=" + id + 
                "&translator_id=" + translator_id +
                "&season=" + season +
                "&episode=" + episode +
                "&action=get_stream"
    var xhr = new XMLHttpRequest()
    xhr.open("POST", "/get_stream")
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    xhr.responseType = 'json'
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            var response = xhr.response
            if (response['error']) {
                console.log('Ошибка во время получения стримов: ' + response['error'])
            } else {
                streams = response['streams']
                load_player()
                /* если сменил перевод, сохранить время */
                if (current && current['season'] == season && current['episode'] == episode) {
                    video.currentTime = current['elapsed']
                }
                current = {
                    'id': id,
                    'translator_id': translator_id,
                    'season': season,
                    'episode': episode,
                    'elapsed': 0,
                }
            }
        }
    }
    xhr.send(payload)
}

function load_player() {
    quality = preferred['quality']
    var available_quality_list = []
    for (var k in streams) {
        available_quality_list.push(k)
    }
    /* пытаюсь правильно отсортировать */
    available_quality_list.sort(function(a, b) {
        return parseInt(b) - parseInt(a) || b.length - a.length
    })
    var stream
    if (streams.hasOwnProperty(quality)) {
        stream = streams[quality]['mp4']
    } else {
        /* первый ключ */
        quality = available_quality_list.at(-1)
        stream = streams[quality]['mp4']
        update_preferred('quality', quality)
    }
    quality_dropdown_item.querySelector('span').innerText = quality
    source.setAttribute('src', stream)
    quality_dropdown.innerHTML = ""
    available_quality_list.forEach(item => {
        quality_dropdown.innerHTML += `<div class="dropdown_item">${item}</div>`
    })
    quality_dropdown_buttons = quality_dropdown.querySelectorAll('.dropdown_item')
    quality_dropdown_buttons.forEach(button => {
        button.addEventListener('click', function() {
            hide_dropdowns()
            set_quality(button.innerText)
        })
    })
    video.load()
}

window.onload = function() {
    const default_ = {
        'quality': '720p',
        'volume': 1,
        'autoplay': true,
    }
    preferred = local_storage.getItem('preferred')
    if (preferred) {
        preferred = JSON.parse(preferred)
    } else {
        preferred = default_
    }
    autoplay = preferred['autoplay']
    if (autoplay) {
        autoplay_dropdown_item.querySelector('span').innerText = "Авто"
    } else {
        autoplay_dropdown_item.querySelector('span').innerText = "Выкл."
    }
    var story = local_storage.getItem(id)
    if (story) {
        /* расставляю acitve на кнопки */
        story = JSON.parse(story)
        current = story
        for (var i = 0, translator; translator = translators[i]; i++) {
            if (translator.dataset.id == story['translator_id']) {
                prev_t = translator
                translator.classList.add('active')
                for (var j = 0, seasons_list; seasons_list = seasons_lists[j]; j++) {
                    if (seasons_list.dataset.translator_id == story['translator_id']) {
                        seasons_list.classList.remove('hidden')
                        var seasons = seasons_list.querySelectorAll('.tab')
                        for (var k = 0, season; season = seasons[k]; k++) {
                            if (season.dataset.id == story['season']) {
                                prev_s = season
                                season.classList.add('active')
                                for (var l = 0, episodes_list; episodes_list = episodes_lists[l]; l++) {
                                    if (episodes_list.dataset.translator_id == story['translator_id'] &&
                                        episodes_list.dataset.season_id == story['season']) {
                                        episodes_list.classList.remove('hidden')
                                        var episodes = episodes_list.querySelectorAll('.tab')
                                        for (var m = 0, episodes; episode = episodes[m]; m++) {
                                            if (episode.dataset.id == story['episode']) {
                                                prev_e = episode
                                                episode.classList.add('active')
                                                set_stream(story['translator_id'], story['season'], story['episode'])
                                                video.currentTime = story['elapsed']
                                            }
                                        }
                                        break
                                    }
                                }
                                break
                            }
                        }
                        break
                    }
                }
                break
            }
        }
    }
}

function update_preferred(key, value) {
    preferred[key] = value
    console.log(preferred)
    local_storage.setItem('preferred', JSON.stringify(preferred))
}

window.onbeforeunload = function() {
    if (current) {
        local_storage.setItem(id, JSON.stringify(current))
    }
}