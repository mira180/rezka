const watch = document.querySelector('.watch')
const id = watch.dataset.id
const type = watch.dataset.type
const translators = document.querySelector('.translate').querySelectorAll('.tab')
const seasons_lists = document.querySelectorAll('.seasons')
const episodes_lists = document.querySelectorAll('.series')
var current = {}
var settings = {}
const local_storage = window.localStorage
var streams
var subtitles
var tracks = []
var subtitle_languages = []
const subtitles_off_button = document.querySelector('.subtitles_off')
var error_status = false
var error

function get_translator(translator_id) {
    for (var i = 0, translator; translator = translators[i]; i++) {
        if (translator.dataset.id == translator_id) {
            return translator
        }
    }
    return null
}

function get_seasons_list(translator_id) {
    for (var i = 0, seasons_list; seasons_list = seasons_lists[i]; i++) {
        if (seasons_list.dataset.translator_id == translator_id) {
            return seasons_list
        }
    }
    return null
}

function hide_seasons_lists() {
    if (seasons_lists) {
        for (var i = 0, seasons_list; seasons_list = seasons_lists[i]; i++) {
            seasons_list.classList.add('hidden')
        }
    }
}

function hide_episodes_lists() {
    if (episodes_lists) {
        for (var i = 0, episodes_list; episodes_list = episodes_lists[i]; i++) {
            episodes_list.classList.add('hidden')
        }
    }
}

function get_season(translator_id, season) {
    for (var i = 0, seasons_list; seasons_list = seasons_lists[i]; i++) {
        if (seasons_list.dataset.translator_id == translator_id) {
            const seasons = seasons_list.querySelectorAll('.tab')
            for (var j = 0, season_; season_ = seasons[j]; j++) {
                if (season_.dataset.id == season) {
                    return season_
                }
            }
        }
    }
    return null
}

function get_episodes_list(translator_id, season) {
    for (var i = 0, episodes_list; episodes_list = episodes_lists[i]; i++) {
        if (episodes_list.dataset.translator_id == translator_id && episodes_list.dataset.season_id == season) {
            return episodes_list
        }
    }
    return null
}

function get_episode(translator_id, season, episode) {
    for (var i = 0, episodes_list; episodes_list = episodes_lists[i]; i++) {
        if (episodes_list.dataset.translator_id == translator_id && episodes_list.dataset.season_id == season) {
            const episodes = episodes_list.querySelectorAll('.tab')
            for (var j = 0, episode_; episode_ = episodes[j]; j++) {
                if (episode_.dataset.id == episode) {
                    return episode_
                }
            }
        }
    }
    return null
}

function clear_active(properties) {
    try {
        for (var i = 0, property; property = properties[i]; i++) {
            if (current.hasOwnProperty(property)) {
                if (property == 'translator_id') {
                    if (current.hasOwnProperty('translator_id')) {
                        get_translator(current['translator_id']).classList.remove('active')
                        delete current['translator_id']
                    }
                } else if (property == 'season') {
                    if (current.hasOwnProperty('season')) {
                        get_season(current['translator_id'], current['season']).classList.remove('active')
                        delete current['season']
                    }
                } else if (property == 'episode') {
                    if (current.hasOwnProperty('episode')) {
                        get_episode(current['translator_id'], current['season'], current['episode']).classList.remove('active')
                        delete current['episode']
                    }
                }
            }
        }
    } catch {
        console.error('Критическая ошибка в clear_active (чистим current)')
        current = {}
    }
}

window.onload = function() {

    translators.forEach(translator => {
        translator.addEventListener('click', function() {
            clear_active(['episode', 'season', 'translator_id'])
            translator.classList.add('active')
            current['translator_id'] = translator.dataset.id
            delete current['elapsed']
            store_current()
            if (type == '2') {
                hide_seasons_lists()
                hide_episodes_lists()
                get_seasons_list(translator.dataset.id).classList.remove('hidden')
            } else {
                set_stream()
            }
        })
    })

    if (seasons_lists) {
        seasons_lists.forEach(seasons_list => {
            seasons_list.querySelectorAll('.tab').forEach(season => {
                season.addEventListener('click', function() {
                    clear_active(['episode', 'season'])
                    season.classList.add('active')
                    current['season'] = season.dataset.id
                    store_current()
                    hide_episodes_lists()
                    get_episodes_list(seasons_list.dataset.translator_id, season.dataset.id).classList.remove('hidden')
                })
            })
        })
    }

    if (episodes_lists) {
        episodes_lists.forEach(episodes_list => {
            episodes_list.querySelectorAll('.tab').forEach(episode => {
                episode.addEventListener('click', function() {
                    clear_active(['episode'])
                    episode.classList.add('active')
                    current['episode'] = episode.dataset.id
                    delete current['elapsed']
                    store_current()
                    set_stream()
                })
            })
        })
    }

    var settings_ = local_storage.getItem('settings')
    if (settings_) {
        settings = JSON.parse(settings_)
    } else {
        settings = {
            'quality': '720p',
            'autoplay': true,
            'volume': 1
        }
        local_storage.setItem('settings', JSON.stringify(settings))
    }

    var stored = local_storage.getItem(id)
    if (stored) {
        current = JSON.parse(stored)
        if (current.hasOwnProperty('translator_id')) {
            get_translator(current['translator_id']).classList.add('active')
            if (seasons_lists) {
                get_seasons_list(current['translator_id']).classList.remove('hidden')
            }
            if (type == '1') {
                set_stream()
                if (current.hasOwnProperty('elapsed')) {
                    video.currentTime = current['elapsed']
                }
            }
        }

        if (current.hasOwnProperty('season')) {
            get_season(current['translator_id'], current['season']).classList.add('active')
            if (episodes_lists) {
                get_episodes_list(current['translator_id'], current['season']).classList.remove('hidden')
            }
        }

        if (current.hasOwnProperty('episode')) {
            get_episode(current['translator_id'], current['season'], current['episode']).classList.add('active')
            set_stream()
            if (current.hasOwnProperty('elapsed')) {
                video.currentTime = current['elapsed']
            }
        }
    }

}

function set_stream() {
    show_loader()
    payload = "id=" + id + "&translator_id=" + current['translator_id']
    if (type == 1) {
        translator = get_translator(current['translator_id'])
        if (translator.hasAttribute('data-camrip')) {
            payload = payload + "&is_camrip=" + translator.dataset.camrip
        }
        if (translator.hasAttribute('data-ads')) {
            payload = payload + "&is_ads=" + translator.dataset.ads
        }
        if (translator.hasAttribute('data-director')) {
            payload = payload + "&is_director=" + translator.dataset.director
        }
        payload = payload + "&action=get_movie"
    } else if (type == 2) {
        payload = payload + "&season=" + current['season'] + "&episode=" + current['episode']
        payload = payload + "&action=get_stream"
    }
    var xhr = new XMLHttpRequest()
    xhr.open("POST", "/get_stream")
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    xhr.responseType = 'json'
    xhr.onload = function() {
        if (xhr.response['error']) {
            set_load_error(`Ошибка во время получения видео, попробуйте обновить страницу\nКод ошибки: ${xhr.response['error']}`)
            console.error(`Ошибка во время получения стрима`)
        } else {
            streams = xhr.response['streams']
            subtitles = xhr.response['subtitles']
            console.log(streams)
            set_player(streams, subtitles)
        }
    }
    xhr.send(payload)
}

function get_qualities(streams) {
    var qualities = []
    for (var quality in streams) {
        qualities.push(quality)
    }
    qualities.sort(function(a, b) {
        return parseInt(b) - parseInt(a) || b.length - a.length
    })
    return qualities
}

function get_stream_specifying_quality(streams, preferred_quality) {
    var quality
    if (streams.hasOwnProperty(preferred_quality)) {
        stream = streams[preferred_quality]['mp4']
        quality = preferred_quality
    } else {
        for (var quality_ in streams) {
            stream = streams[quality_]['mp4']
            quality = quality_
            break
        }
    }
    return { stream, quality }
}

function update_settings_current_quality(quality) {
    quality_dropdown_item.querySelector('span').innerText = quality
}

function set_choose_quality_menu(qualities) {
    quality_dropdown.innerHTML = ""
    qualities.forEach(quality => {
        quality_dropdown.innerHTML += `<div class="dropdown_item">${quality}</div>`
    })
    quality_dropdown.querySelectorAll('.dropdown_item').forEach(item => {
        item.addEventListener('click', function() {
            hide_dropdowns()
            set_video_quality(item.innerText)
        })
    })
}

function set_video_stream(quality) {
    source.setAttribute('src', streams[quality]['mp4'])
    update_settings_current_quality(quality)
    current['quality'] = quality
    video.load()
}

function set_player(streams, subtitles) {
    var qualities = get_qualities(streams)
    var { stream, quality } = get_stream_specifying_quality(streams, current['quality'] || settings['quality'])
    set_choose_quality_menu(qualities)
    
    set_subtitles(subtitles)

    update_settings_autoplay()
    
    set_video_stream(quality)
}

function store_current() {
    local_storage.setItem(id, JSON.stringify(current))
}

function store_settings() {
    local_storage.setItem('settings', JSON.stringify(settings))
}

/*
window.onbeforeunload = function() {
    store_current()
    store_settings()
}
*/

function update_settings_autoplay() {
    if (settings['autoplay']) {
        autoplay_dropdown_item.querySelector('span').innerText = "Авто"
    } else {
        autoplay_dropdown_item.querySelector('span').innerText = "Выкл."
    }
}

function clear_tracks() {
    for (const track of tracks) {
        video.removeChild(track)
    }
    tracks = []
}

function clear_subtitle_languages() {
    for (const subtitle_language of subtitle_languages) {
        subtitles_dropdown.removeChild(subtitle_language)
    }
    subtitle_languages = []
}

function set_subtitles(subtitles) {
    disable_subtitles()
    clear_tracks()
    clear_subtitle_languages()
    for (var srclang in subtitles) {
        /* video.innerHTML += `<track label="${subtitles[srclang]['label']}" kind="subtitles" srclang="${srclang}" src="${subtitles[srclang]['src']}">` */
        track = document.createElement('track')
        video.appendChild(track)
        track.setAttribute('label', subtitles[srclang]['label'])
        track.setAttribute('kind', 'subtitles')
        track.setAttribute('srclang', srclang)
        track.setAttribute('src', subtitles[srclang]['src'])
        tracks.push(track)

        track.onload = function() {
            for (const cue of this.track.cues) {
                cue.line = -3;
            }
        }

        subtitle_language = document.createElement('div')
        subtitles_dropdown.appendChild(subtitle_language)
        subtitle_language.innerText = subtitles[srclang]['label']
        subtitle_language.classList.add('dropdown_item')
        subtitle_language.dataset.lang = srclang
        subtitle_languages.push(subtitle_language)
        subtitle_language.addEventListener('click', function() {
            hide_dropdowns()
            set_video_subtitles(this.dataset.lang)
        })
    }

    for (var i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = 'hidden'
    }

    if (settings['subtitles']) {
        set_video_subtitles(settings['subtitles'])
    }
}

function set_video_subtitles(lang) {
    for (var i = 0; i < video.textTracks.length; i++) {
        if (video.textTracks[i].language == lang) {
           video.textTracks[i].mode = 'showing'
           subtitles_dropdown_item.querySelector('span').innerText = subtitles[lang]['label']
           settings['subtitles'] = lang
           store_settings()
        } else {
           video.textTracks[i].mode = 'hidden'
        }
    }
}

function disable_subtitles() {
    for (var i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = 'hidden'
    }
    subtitles_dropdown_item.querySelector('span').innerText = 'Выкл.'
}

subtitles_off_button.addEventListener('click', function() {
    hide_dropdowns()
    delete settings['subtites']
    store_settings()
    disable_subtitles()
})

function clear_error() {
    if (error_status) {
        video_container.removeChild(error)
        error_status = false
    }
}

function set_load_error(msg) {
    show_loader()
    loader.classList.add('hidden')
    error = document.createElement('div')
    error.classList.add('error')
    video_container.appendChild(error)
    const error_icon = document.createElement('div')
    error_icon.classList.add('error_icon')
    error.appendChild(error_icon)
    const error_span = document.createElement('span')
    error_span.classList.add('material-icons')
    error_span.innerText = 'warning'
    error_icon.appendChild(error_span)
    const error_message = document.createElement('div')
    error_message.classList.add('error_message')
    error_message.innerText = msg;
    error.appendChild(error_message)
    error_status = true
}