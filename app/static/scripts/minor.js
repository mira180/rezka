const item_lists = document.querySelectorAll('.item_list')

item_lists.forEach(item_list => {
    item_list.addEventListener('wheel', event => {
        event.preventDefault()
        item_list.scrollBy({
            left: event.deltaY < 0 ? -50 : 50,
        })
    })
})