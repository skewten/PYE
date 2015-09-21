/*
    PYE v2!

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

        @steps[num + 1]!

    steps:
        2: ->
            console.log 'Step 2 - File uploading.'
            drop-box = $ '#uploader .drop'
            # Clicking support
            drop-box.click (e) ->
                $ '#file-input' .on 'change', handle-file-change
                $ '#file-input' .trigger 'click'

            handle-file-read = (e) ->
                console.log e

            handle-file-change = (e) ->
                file = $ '#file-input' .val!
                reader = new FileReader!
                reader.onloadend = handle-file-read
                reader.read-as-data-URL file

            # Dragging support
            stop = (e) ->
                e.stop-propagation?!
                e.prevent-default?!
                return false

            drop-box.on 'dragover', stop
            drop-box.on 'dragenter', stop

            drop-box.on 'drop', (e) ->
                stop e
                if e.data-transfer.files.length > 0
                    file = e.data-transfer.files[0]
                    reader = new FileReader!
                    reader.onloadend = handle-file-read
                    reader.read-as-data-URL file

window.onload = ->
    window.pye = new PYE!
    pye.init!
