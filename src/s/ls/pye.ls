/*
    PYE! v2
    rev.1

    Created by Ivan <ivan@sq10.net>
    MIT license
*/

class PYE
    # Google API client ID.
    gapi-client-id: '889751255111-qjkp9cvcrn7m3rkv2kuhoia0flguvhbr.apps.googleusercontent.com'
    # Google API key.
    gapi-api-key: 'AIzaSyA8d5uzO4wx3h1ZXcyVw-N2F9a-yhx8TtI'
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

        $ '#step-' + (num - 1)
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
                    process-youtube-item item, done
                else
                    process-soundcloud-item item, done
            50 # Concurrency
        q.pause!
        q.drain = ~>
            alert "all done"

        item-done-handler = ->
            $ '#step-4 .progress-bar'
                .css do
                    width: (len-left / len)+"%"
            $ '#step-4 .info span'
                .text len-left

        for name, items of @raw-playlists.playlists
            for item in items
                q.push do
                    {
                        name: name
                        item: item
                    }
                    item-done-handler

        len = q.length!
        len-left = len

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
                    parsed-video.error = yes
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

window.onload = ->
    window.pye = new PYE!
    pye.init!