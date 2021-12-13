const play_button = document.querySelector('.play.control')
const video = document.querySelector('.video')
const fullscreen_button = document.querySelector('.fullscreen.control')
const timeline = document.querySelector('.timeline')
const video_container = document.querySelector('.video_container')
let is_full_screen = false
const time_elapsed = document.querySelector('.time_elapsed')
const duration = document.querySelector('.duration')
const play_icons = play_button.querySelectorAll('span')
const volume_button = document.querySelector('.sound.control')
const volume_icons = volume_button.querySelectorAll('span')
const volume_icon = volume_button.querySelector('.volume_icon')
const volume_off_icon = volume_button.querySelector('.volume_off_icon')
const volume = document.querySelector('.sound_bar')
const video_controls = document.querySelector('.video_controls')
const settings_button = document.querySelector('.settings.control')
const settings_dropdown = document.querySelector('.settings_dropdown')
const quality_dropdown_item = document.querySelector('.quality.dropdown_item')
const autoplay_dropdown_item = document.querySelector('.autoplay.dropdown_item')
const quality_dropdown = document.querySelector('.quality_dropdown')
var quality_dropdown_buttons
const autoplay_dropdown = document.querySelector('.autoplay_dropdown')
const enable_autoplay = document.querySelector('.enable_autoplay.dropdown_item')
const disable_autoplay = document.querySelector('.disable_autoplay.dropdown_item')
const dropdowns = document.querySelectorAll('.dropdown')
var hide_controls_timeout
var block_timeupdate = false
var hide_dropdowns_timeout
let autoplay = false
const source = video.querySelector('source')
const loader = video_container.querySelector('.loader')
const big_play_button = document.querySelector('.big_play_button')
const big_play_icons = big_play_button.querySelectorAll('span')
var hide_big_play_timeout
const next_episode_progress = document.querySelector('.next_episode_progress')
var autochanged_episode = false
var autochange_interval
var is_autochange_active = false
const subtitles_dropdown_item = document.querySelector('.subtitles.dropdown_item')
const subtitles_dropdown = document.querySelector('.subtitles_dropdown')

function toggle_play() {
    if (video.paused || video.ended) {
        video.play()
    } else {
        video.pause()
    }
    store_current()
}

play_button.addEventListener('click', toggle_play)

video.onended = function() {
    show_controls()
    var next_episode = get_episode(current['translator_id'], current['season'], (parseInt(current['episode']) + 1).toString())
    if (settings['autoplay'] && next_episode) {
        is_autochange_active = true
        next_episode_progress.classList.remove('hide')
        next_episode_progress.value = 0
        autochange_interval = setInterval(function() {
            next_episode_progress.value += next_episode_progress.max / 10
            if (next_episode_progress.value >= next_episode_progress.max) {
                cancel_autochange()
                change_episode(next_episode)
            }
        }, 1000)
    }
}

function update_timeline() {
    if (block_timeupdate) {
        return
    }
    const percentage_position = Math.round((100 * video.currentTime) / video.duration)
    timeline.style.backgroundSize = `${percentage_position}% 100%`
    timeline.value = percentage_position
    current['elapsed'] = video.currentTime
}

video.ontimeupdate = function() {
    update_timeline()
    toggle_play_button() /* обновить кнопку */
    if (is_autochange_active) {
        cancel_autochange()
    }
}

/*

timeline.addEventListener('change', function() {
    const time = (timeline.value * video.duration) / 100
    video.currentTime = time
})

*/

function toggle_play_button() {
    /* play_icons.forEach(icon => icon.classList.toggle('hidden')) */
    
    if (video.paused || video.ended) {
        play_icons[1].classList.add('hidden')
        play_icons[0].classList.remove('hidden')
        big_play_icons[1].classList.add('hidden')
        big_play_icons[0].classList.remove('hidden')
        big_play_icons[2].classList.add('hidden')
    } else {
        play_icons[0].classList.add('hidden')
        play_icons[1].classList.remove('hidden')
        big_play_icons[0].classList.add('hidden')
        big_play_icons[1].classList.remove('hidden')
        big_play_icons[2].classList.add('hidden')
    }

    if (video.ended) {
        big_play_icons[1].classList.add('hidden')
        big_play_icons[0].classList.add('hidden')
        big_play_icons[2].classList.remove('hidden')
    }

}

video.addEventListener('play', toggle_play_button)
video.addEventListener('pause', toggle_play_button)

video.addEventListener('loadeddata', function() {
    hide_loader()
    toggle_play_button()
    volume.value = settings['volume']
    update_volume()
    update_timeline()
    if (autochanged_episode) {
        video.play()
        autochanged_episode = false
    }
    wake_controls_up()
})

function format_time(seconds) {
    const result = new Date(seconds * 1000).toISOString().substr(11, 8)

    return {
        hours: parseInt(result.substr(0, 2)),
        minutes: parseInt(result.substr(3, 2)),
        seconds: parseInt(result.substr(6, 2)),
    }
}

function init_video() {
    const video_duration = Math.round(video.duration)
    const time = format_time(video_duration)
    time.minutes = time.hours * 60 + time.minutes
    duration.innerText = `${time.minutes.toString().padStart(2, '0')}:${time.seconds.toString().padStart(2, '0')}`
}

video.addEventListener('loadedmetadata', init_video)

function update_time_elapsed() {
    const time = format_time(Math.round(video.currentTime));
    time.minutes = time.hours * 60 + time.minutes
    time_elapsed.innerText = `${time.minutes.toString().padStart(2, '0')}:${time.seconds.toString().padStart(2, '0')}`
}

video.addEventListener('timeupdate', update_time_elapsed)

function update_volume_icon() {
    volume_icons.forEach(icon => {
        icon.classList.add('hidden')
    })

    if (video.muted || video.volume === 0) {
        volume_off_icon.classList.remove('hidden')
    } else {
        volume_icon.classList.remove('hidden')
    }
}

video.addEventListener('volumechange', update_volume_icon)

function update_volume() {
    if (video.muted) {
        video.muted = false;
    }
    volume.style.backgroundSize = `${volume.value * 100}% 100%`

    video.volume = volume.value;
}

volume.addEventListener('input', update_volume)

volume.addEventListener('click', function() {
    settings['volume'] = volume.value
    store_settings()
})

function toggle_mute() {
    video.muted = !video.muted

    if (video.muted) {
        volume.setAttribute('data-volume', volume.value)
        volume.value = 0
    } else {
        volume.value = volume.dataset.volume
    }
    volume.style.backgroundSize = `${volume.value * 100}% 100%`
}

volume_button.addEventListener('click', toggle_mute)

function toggle_fullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else if (document.webkitFullscreenElement) {
        document.webkitExitFullscreen();
    } else if (video_container.webkitRequestFullscreen) {
        video_container.webkitRequestFullscreen({ navigationUI: 'hide' });
    } else if (video_container.requestFullscreen) {
        video_container.requestFullscreen({ navigationUI: 'hide' });
    }
}

fullscreen_button.onclick = toggle_fullscreen

function hide_controls() {
    if (video.paused) {
        return
    }

    video_controls.classList.add('hide')
    video_container.classList.add('no_cursor')
}

function show_controls() {
    video_controls.classList.remove('hide')
    video_container.classList.remove('no_cursor')
    big_play_button.classList.remove('hide')
}

/*

video_controls.addEventListener('mouseenter', show_controls)
video_controls.addEventListener('mouseleave', hide_controls)

*/

function keyboard_shortcuts(event) {
    if (video_container.classList.contains('loading')) {
        return
    }
    if (event.target.getAttribute('id') === 'search') {
        return
    }
    const { code } = event;
    switch (code) {
        case 'Space':
            event.preventDefault()
            toggle_play()
            break
        case 'KeyM':
            toggle_mute()
            break
        case 'KeyF':
            toggle_fullscreen()
            break
        case 'ArrowLeft':
            event.preventDefault()
            video.currentTime -= 10
            break
        case 'ArrowRight':
            event.preventDefault()
            video.currentTime += 10
            break
    }
    wake_controls_up()
}

document.addEventListener('keydown', keyboard_shortcuts)

video_container.onmousemove = function() {
    if (video_container.classList.contains('loading')) {
        return
    }
    wake_controls_up()
}

function wake_controls_up() {
    show_controls()
    clearTimeout(hide_controls_timeout)
    clearTimeout(hide_dropdowns_timeout)
    clearTimeout(hide_big_play_timeout)
    hide_controls_timeout = setTimeout(hide_controls, 3000)
    hide_dropdowns_timeout = setTimeout(hide_dropdowns, 3000)
    hide_big_play_timeout = setTimeout(hide_big_play, 2000)
}

function hide_big_play() {
    if (video.paused) {
        return
    }
    big_play_button.classList.add('hide')
}

timeline.addEventListener('input', function() {
    block_timeupdate = true
    timeline.style.backgroundSize = `${timeline.value}% 100%`
})

timeline.addEventListener('click', function() {
    const time = (timeline.value * video.duration) / 100
    video.currentTime = time
    block_timeupdate = false
})

timeline.addEventListener('touchend', function() {
    const time = (timeline.value * video.duration) / 100
    video.currentTime = time
    block_timeupdate = false
})

function hide_dropdowns() {
    dropdowns.forEach(item => {
        item.classList.add('hide')
    })
}

settings_button.addEventListener('click', function() {
    if (settings_dropdown.classList.contains('hide')) {
        hide_dropdowns()
        settings_dropdown.classList.remove('hide')
    } else {
        hide_dropdowns()
    }
})

quality_dropdown_item.addEventListener('click', function() {
    hide_dropdowns()
    quality_dropdown.classList.remove('hide')
})

autoplay_dropdown_item.addEventListener('click', function() {
    hide_dropdowns()
    autoplay_dropdown.classList.remove('hide')
})

enable_autoplay.addEventListener('click', function() {
    hide_dropdowns()
    settings['autoplay'] = true
    store_settings()
    update_settings_autoplay()
})

disable_autoplay.addEventListener('click', function() {
    hide_dropdowns()
    settings['autoplay'] = false
    store_settings()
    update_settings_autoplay()
})

function set_video_quality(quality) {
    const elapsed = video.currentTime
    const is_paused = video.paused || video.ended
    show_loader()
    set_video_stream(quality)
    current['quality'] = quality
    settings['quality'] = quality
    store_current()
    store_settings()
    video.currentTime = elapsed
    if (!is_paused) {
        video.play()
    }
}

function show_loader() {
    video.pause()
    loader.classList.remove('hidden')
    video.classList.add('hide')
    video_controls.classList.add('hide')
    video_container.classList.add('loading')
    big_play_button.classList.add('hide')
    if (is_autochange_active) {
        cancel_autochange() /* костыль, определяем, что серию сменили по лоадеру */
    }
    clear_error()
}

function hide_loader() {
    loader.classList.add('hidden')
    video.classList.remove('hide')
    video_controls.classList.remove('hide')
    video_container.classList.remove('loading')
    big_play_button.classList.remove('hide')
}

video.addEventListener('dblclick', function() {
    toggle_fullscreen()
})

big_play_button.addEventListener('click', function() {
    if (video.ended) {
        var next_episode = get_episode(current['translator_id'], current['season'], (parseInt(current['episode']) + 1).toString())
        if (next_episode) {
            change_episode(next_episode)
        }
    } else {
        toggle_play()
    }
})

function change_episode(episode) {
    autochanged_episode = true
    clear_active(['episode'])
    episode.classList.add('active')
    current['episode'] = episode.dataset.id
    delete current['elapsed']
    store_current()
    set_stream()
}

function cancel_autochange() {
    clearInterval(autochange_interval)
    next_episode_progress.classList.add('hide')
    is_autochange_active = false
}

next_episode_progress.onclick = cancel_autochange

subtitles_dropdown_item.addEventListener('click', function() {
    hide_dropdowns()
    subtitles_dropdown.classList.remove('hide')
})