/*
    PYE! v2
    rev.1

    Created by Ivan <ivan@sq10.net>
    MIT license
*/

class PYE
    # Google API client ID.

    #TODO: remove when done testing
    gapi-client-id: '719647262562-a2tcd0qim9u39jk1slq0ji4h7gr3u4ah.apps.googleusercontent.com'
    #gapi-client-id: '889751255111-qjkp9cvcrn7m3rkv2kuhoia0flguvhbr.apps.googleusercontent.com'
    # Google API key.

    #TODO: remove when done testing
    gapi-api-key: 'AIzaSyB316fvTuhhQtE-Tqz6gD-WxEzINiCt5sk'

    #gapi-api-key: 'AIzaSyA8d5uzO4wx3h1ZXcyVw-N2F9a-yhx8TtI'

    # Google API scopes, in this case the managing of a Youtube account.
    gapi-scopes: 'https://www.googleapis.com/auth/youtube'

    # Soundcloud client ID.
    scapi-client-id: '279f0a297f0852bd0701b6437dd79317'
    # Soundcloud callback URI.
    scapi-callback: 'http://pye.sq10.net/callback.html'

    init: ->
        $.event.props.push 'dataTransfer'
        @step 2

    step: (num, fail) ->
        if fail
            $ '#tasks .task.wait'
                .remove-class 'wait'
                .add-class 'fail'
            return

        tasks = $ '#tasks .task'
            .get!

        $ tasks[num - 2]
            .remove-class 'wait'
            .add-class 'done'

        $ tasks[num - 1]
            .add-class 'wait'

        $ '.step'
            .hide!

        $ '#step-' + num
            .show!

        @['step' + (num)]!

    show-loader: ->
        $ '#loader' .show!

    hide-loader: ->
        $ '#loader' .hide!

    step2: ->
        drop-box = $ '#uploader .drop'

        loading = no
        set-loading = (load) ~>
            loading := load
            if loading
                @show-loader!
            else
                @hide-loader!

        validate-data = (data) ~>
            var json
            try
                json := JSON.parse data
            catch e
                return false

            if not json.is_plugdj_playlist
            or not json.userid?
            or not json.playlists?
            or typeof! json.playlists is not "Object"
                return false

            for name, playlist of json.playlists
                if typeof! playlist is not "Array"
                    return false
                for item in playlist
                    if not item.type?
                    or not item.id?
                        return false

            @raw-playlists = json

            return true

        throw-error = (text) ~>
            $ '#step-2 .error'
                .text text
                .show!

        handle-file-read = (e) ~>
            data = e.target.result
            if not validate-data data
                throw-error "Could not validate file. Is it a PLUG_PLAYLISTS.json file?"
                set-loading no
            else
                set-loading no
                @step 3

        # Clicking support
        drop-box.click (e) ~>
            $ '#file-input' .on 'change', handle-file-change
            $ '#file-input' .trigger 'click'

        handle-file-change = (e) ~>
            if loading then return
            set-loading yes
            input = $ '#file-input' .get!
            input = input[0]
            reader = new FileReader!
            reader.onloadend = handle-file-read
            reader.read-as-text input.files[0]

        # Dragging support
        stop = (e) ~>
            e.stop-propagation?!
            e.prevent-default?!
            return false

        drop-box.on 'dragover', stop
        drop-box.on 'dragenter', stop
        drop-box.on 'drop', (e) ~>
            stop e
            if loading then return
            set-loading yes
            if e.data-transfer.files.length > 0
                file = e.data-transfer.files[0]
                reader = new FileReader!
                reader.onloadend = handle-file-read
                reader.read-as-text file

    step3: ->
        @show-loader!


        load-soundcloud = ~>
            $ '#step-3 .step-head'
                .text 'loading the Soundcloud API...'
            SC.initialize do
                client_id: @scapi-client-id
                redirect_uri: @scapi-callback
            @hide-loader!
            @step 4


        setup-client = ~>
            $ '#step-3 .step-head'
                .text 'loading the Youtube API...'
            gapi.client.set-api-key @gapi-api-key
            gapi.client.load 'youtube', 'v3', ~>
                load-soundcloud!


        window.GAPI_load_client = -> setup-client!
        url = "https://apis.google.com/js/client.js?onload=GAPI_load_client"
        $.getScript url
        .fail (err) ~>
            @hide-loader!
            $ '#step-3 .error'
                .text 'Could not set up the client! Try refreshing this page and try again.'
                .show!

            throw err

    step4: ->
        @show-loader!
        @parsed-playlists = {}

        q = async.queue do
            (item, done) ~>
                if item.item.type is 1
                    process-youtube-item item, ~>
                        item-done-handler!
                        done!
                else
                    process-soundcloud-item item, ~>
                        item-done-handler!
                        done!
            50 # Concurrency
        q.pause!
        q.drain = ~>
            render-playlists!

        /*
            ===========================
            ☆ BRING ON THE SPAGHETTI ☆
            ===========================
            "LOL U SHOULDVE USED REACT"
                            - YOU

            tl;dr this is the part where the code
            gets messy.

            if you want to help clean it up, feel free to
                open up a pull request!
        */

        render-playlists = ~>
            $ '#step-4 .step-head' .text 'rendering playlists...'
            $ '#load-playlists-progress .info' .hide!
            $ '#load-playlists-progress .progress-bar' .css do
                width: '0%'


            len = 0
            do ~>
                for _, i of @parsed-playlists
                    for z in i
                        len++
            len-left = len

            update-progress = ~>
                --len-left
                percent = Math.floor(100 - ((len-left / len) * 100))
                $ '#load-playlists-progress .progress-bar' .css do
                    width: percent + '%'

            counts = {}

            q = async.queue (item, done) ~>
                set-timeout do
                    ~>
                        q-make-playlist item, done

            playlists = []
            video-playlists = []
            q-make-playlist = (item, done) ~>

                create-playlist = (name) ~>
                    if name in playlists
                        return
                    playlists.push name
                    counts[name] = 0

                    P = document.get-element-by-id 'playlist-list'

                    playlist = document.create-element "div"
                    playlist.class-list.add "playlist","input-group"
                    playlist.dataset.playlist = name

                    id = document.create-element "span"
                    id.class-list.add "id"
                    id.text-content = name

                    btn = document.create-element "span"
                    btn.class-list.add "input-group-btn"
                    btn-b = document.create-element "button"
                    btn-b.type = "button"
                    btn-b.class-list.add "select","btn","btn-default"
                    btn-plus = document.create-element "span"
                    btn-plus.class-list.add "glyphicon","glyphicon-plus"
                    btn-b.append-child btn-plus
                    btn-b.class-list.add "select","btn","btn-default"
                    btn-minus = document.create-element "span"
                    btn-minus.class-list.add "glyphicon","glyphicon-minus"
                    btn-b.append-child btn-minus
                    btn.append-child btn-b

                    inp = document.create-element "input"
                    inp.class-list.add "form-control"
                    inp.type = "text"
                    inp.disabled = yes
                    inp.value = name

                    gb = document.create-element "span"
                    gb.class-list.add "input-group-btn"
                    gbb = document.create-element "button"
                    gbb.class-list.add "btn", "btn-default", "song-selector"
                    gbb.type = "button"

                    gbbc = document.create-element "span"
                    gbbc.class-list.add "count"
                    gbbc.text-content = '0'
                    gbbcs = document.create-element "span"
                    gbbcs.text-content = '/'
                    gbbct = document.create-element "span"
                    gbbct.class-list.add "total-count"


                    gbb.append-child gbbc
                    gbb.append-child gbbcs
                    gbb.append-child gbbct
                    gb.append-child gbb

                    playlist.append-child id
                    playlist.append-child btn
                    playlist.append-child inp
                    playlist.append-child gb

                    P.append-child playlist

                create-video-playlist = (name) ~>
                    if name in video-playlists
                        return
                    video-playlists.push name
                    VP = document.get-element-by-id 'video-list'

                    vp = document.create-element 'div'
                    vp.class-list.add 'video-playlist'
                    vp.dataset.playlist = name

                    VP.append-child vp

                create-video-item = (name, item) ~>
                    counts[name]++

                    vps = $ '#video-list .video-playlist'
                        .get!

                    var vp
                    for v in vps
                        if v.dataset.playlist is name
                            vp := v

                    vid = document.create-element 'div'
                    vid.class-list.add 'video'
                    if item.error
                        vid.class-list.add 'errored'

                    vpo = document.create-element 'span'
                    vpo.class-list.add 'partof'
                    vpo.text-content = name
                    v-id = document.create-element 'span'
                    v-id.class-list.add 'vid'
                    v-id.text-content = item.id
                    v-id-type = document.create-element 'span'
                    v-id-type.class-list.add 'vidtype'
                    v-id-type.text-content = item.type

                    vid.append-child vpo
                    vid.append-child v-id
                    vid.append-child v-id-type

                    id = document.create-element 'span'
                    id.class-list.add 'id'
                    id.text-content = item.id

                    vid.append-child id

                    if item.error
                        err = document.create-element 'div'
                        err.class-list.add 'err'
                        err.text-content = 'could not fetch'

                        vid.append-child err
                    else
                        img = document.create-element 'div'
                        img.class-list.add 'img'
                        img.style.background-image = "url(#{item.thumb})"
                        bg = document.create-element 'div'
                        bg.class-list.add 'bg'
                        name = document.create-element 'div'
                        name.class-list.add 'name'
                        name.text-content = item.name
                        channel = document.create-element 'div'
                        channel.class-list.add 'channel'
                        channel.text-content = item.author

                        vid.append-child img
                        vid.append-child bg
                        vid.append-child name
                        vid.append-child channel

                    vp.append-child vid

                create-playlist item.name
                create-video-playlist item.name
                create-video-item item.name, item.item

                done!

            q.drain = ~>
                for name, count of counts
                    $ '#playlist-list .playlist[data-playlist=\"'+name+'\"] .total-count'
                        .text count

                @step5-pre!


                $ '#playlist-select-all' .trigger 'click'
                playlists = $ '#playlist-list .playlist'
                    .get!

                $ playlists[0]
                    .find '.song-selector'
                    .trigger 'click'

                $ '#video-list .video' .trigger 'click'

                @step 5

            pp = []
            for name, p of @parsed-playlists
                for i in p
                    pp.push do
                        name: name
                        item: i
            q.push pp, update-progress

        for name, items of @raw-playlists.playlists
            for item in items
                q.push do
                    {
                        name: name
                        item: item
                    }

        len = q.length!
        len-left = len

        item-done-handler = ->
            --len-left

            percent = Math.floor(100 - ((len-left / len) * 100))

            $ '#step-4 .progress-bar'
                .css do
                    width: "#{percent}%"

            $ '#step-4 .info span'
                .text len-left

        q.resume!

        prepare-playlist-item = (name) ~>
            if not @parsed-playlists[name]?
                @parsed-playlists[name] = []
            pp = @parsed-playlists[name]
            pp.push do
                name: ''
                author: ''
                thumb: ''
                error: no
                id: ''
                type: ''
            return pp[pp.length - 1]

        process-youtube-item = (item, callback) ~>
            pitem = prepare-playlist-item item.name

            req = gapi.client.youtube.videos.list do
                part: 'id,snippet'
                id: item.item.id

            resp <~ req.execute
            if not resp.error
                ritems = resp.items
                if not ritems?
                or ritems.length is not 1
                    pitem.error = yes
                    pitem.id = item.item.id
                    pitem.type = item.item.type
                    return callback!
                ritem = ritems[0]
                pitem.name = ritem.snippet.title
                pitem.author = ritem.snippet.channel-title
                pitem.thumb = ritem.snippet.thumbnails.medium.url
                pitem.id = item.item.id
                pitem.type = item.item.type
                return callback!
            else
                $ '#step-4 .error'
                    .text '
                        A fatal error occured while fetching a playlist item! \
                        See the developer console for more details. (code: YTRESPERR)
                    '
                    .show!
                console.log "Youtube API error code: #{resp.error.code}"
                console.log "Youtube API error message: #{resp.error.message}"
                q.kill!
                @hide-loader!
                return

        process-soundcloud-item = (item, callback) ~>
            pitem = prepare-playlist-item item.name

            track <~ SC.get "/tracks/#{item.item.id}"

            if track.errors
                pitem.error = yes
                pitem.id = item.item.id
                pitem.type = item.item.type
                return callback!

            if not track.title?
            or not track.{}user.avatar_url?
            or not track.{}user.username?
                $ '#step-4 .error'
                    .text '
                        An unexpected error occured while fetching a playlist item! \
                        See the developer console for more details. (code: SCUNEXP)
                    '
                    .show!
                console.log "Unexpected Soundcloud playlist item response: #{JSON.stringify track}"
                q.kill!
                @hide-loader!
                return

            pitem.name = track.title
            pitem.author = track.user.username
            pitem.thumb = track.user.avatar_url
            pitem.id = item.item.id
            pitem.type = item.item.type
            return callback!

    step5: ->
        @hide-loader!

        get-selected-items = ~>
            allowed-playlists = []
            playlists = $ '#playlist-list .playlist.selected' .get!
            for playlist in playlists
                allowed-playlists.push playlist.dataset.playlist

            items = []
            vids = $ '#video-list .video.selected' .get!
            for vid in vids
                vid = $ vid
                obj = {}
                obj.id = vid.find '.vid' .text!
                obj.type = vid.find '.vidtype' .text!
                obj.playlist = vid.find '.partof' .text!
                obj.name = vid.find '.name' .text!

                if obj.playlist in allowed-playlists
                    items.push obj

            return items

        $ '#done-selecting' .on 'click', ~>
            items = get-selected-items!
            if items.length is 0
                $ '#step-5 .error'
                    .text 'You must select at least one item from any playlist.'
                    .show!
                return
            @selected-items = items
            @step 6

    step5-pre: ->
        $ '#playlist-select-all' .on 'click', (e) ~>
            $ '#playlist-list .playlist'
                .add-class 'selected'

        $ '#playlist-select-none' .on 'click', (e) ~>
            $ '#playlist-list .playlist'
                .remove-class 'selected'

        $ '#playlist-list .playlist button.select' .on 'click', (e) ~>
            parent = $ e.current-target
                .parent!.parent!
            selected = parent.has-class 'selected'
            parent.toggle-class 'selected'

        $ '#playlist-list .playlist .song-selector' .on 'click', (e) ~>
            parent = $ e.current-target
                .parent!.parent!

            id = parent
                .children '.id'
                .text!

            $ '#playlist-list .playlist.active' .remove-class 'active'

            $ '#video-list .video-playlist.active' .remove-class 'active'
            console.log id
            $ '#video-list .video-playlist[data-playlist="'+id+'"]' .add-class 'active'

            parent.add-class 'active'

        change-vid-state = (select, vids) ->
            for vid in vids
                error = $ vid
                    .has-class 'errored'

                if error then continue

                id = $ vid .find '.partof' .text!

                count = $ '#playlist-list .playlist[data-playlist="'+id+'"] .count'

                selected = $ vid
                    .has-class 'selected'

                if select and not selected
                    $ vid .add-class 'selected'
                    count.text (parse-int count.text!) + 1
                if not select and selected
                    $ vid .remove-class 'selected'
                    count.text (parse-int count.text!) - 1

        $ '#video-select-all' .on 'click', (e) ~>
            change-vid-state yes, $ '#video-list .video-playlist.active .video' .get!

        $ '#video-select-none' .on 'click', (e) ~>
            change-vid-state no, $ '#video-list .video-playlist.active .video' .get!

        $ '#video-list .video' .on 'click', (e) ~>
            selected = $ e.current-target
                .has-class 'selected'

            if not selected
                change-vid-state yes, [e.current-target]
            else
                change-vid-state no, [e.current-target]

    step6: ->
        handle-youtube-auth = (auth) ~>
            if not auth
                $ '#step-6 .error'
                    .text 'Youtube auth failed. Try again.'
                    .show!
            else
                if auth.error
                    $ '#step-6 .error'
                        .text 'Youtube auth failed. Try again.'
                        .show!
                else
                    $ '#youtube-auth' .hide!
                    $ '#no-youtube' .hide!
                    $ '#start-export' .remove-class 'disabled'

        $ '#youtube-auth' .on 'click' ~>
            gapi.auth.authorize do
                * client_id: @gapi-client-id
                  scope: @gapi-scopes
                  immediate: no
                handle-youtube-auth

        console.log @selected-items
window.onload = ->
    window.pye = new PYE!
    pye.init!