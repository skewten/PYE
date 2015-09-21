/*
    PYE! v2
    rev.1

    Created by Ivan <ivan@sq10.net>
    MIT license
*/

class PYE
    init: ->
        $.event.props.push 'dataTransfer'
        @step 1

    step: (num) ->
        tasks = $ '#tasks .task'
            .get!

        $ tasks[num - 1]
            .remove-class 'wait'
            .add-class 'done'

        $ tasks[num]
            .add-class 'wait'

        $ '#step-' + num
            .hide!

        $ '#step-' + (num + 1)
            .show!

        @["step" + (num + 1)]!

    show-loader: ->
        $ '#loader' .show!

    hide-loader: ->
        $ '#loader' .hide!

    step2: ->
        console.log 'Step 2 - File uploading.'
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
                @step 2

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

window.onload = ->
    window.pye = new PYE!
    pye.init!