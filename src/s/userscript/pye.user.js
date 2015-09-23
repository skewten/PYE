// ==UserScript==
// @name           plugdj-playlist-exporter
// @description    Creates plug.dj playlist JSON files, and saves them to harddrive.
// @author         Ivan (sq10.net)
// @include        https://plug.dj/*
// @version        2.0.9
// @require        https://media.sq10.net/pye/FileSaver.js
// @grant          none
// ==/UserScript==

var playlists = {};
var accepted = false;
var cooloff = false;
var autocooloff = false;

function check_for_api(){
    //We're going to keep trying to attach the API handler
    //until window.API shows up
    try{ready_up();}
    catch(e){setTimeout(check_for_api, 50);}
}

function ready_up(){
    //Attach the API.CHAT_COMMAND handler
    API.on(API.CHAT_COMMAND, function(val){
        if(val == "/pexport")
            start_export();
    });
}

function start_export(){
    if (!accepted){
        API.chatLog("[PYE] WARNING", true);
        API.chatLog(
            "BE CAREFUL USING THIS EXTENSION. "+
            "WHEN YOU GET AN ALERT IN WHICH PYE IS SENDING TOO MANY REQUESTS, "+
            "PRESS THE PAUSE BUTTON IN THE TOP LEFT CORNER IMMEDIATELY."
            , true);
        API.chatLog(
            "If you have read this warning, and want to run the exporter, "+
            "run the /pexport command again."
        );
        accepted = true;
        return;
    }
    API.chatLog("[PYE] Step 1: Check for and load FileSaver.js");
    if (typeof saveAs === 'undefined'){
        $.getScript("https://media.sq10.net/pye/FileSaver.js").done(function(){
            get_playlist_listing();
        }).fail(function(jqxhr, settings, exception){
            API.chatLog("[PYE] Could not fetch FileSaver.js!", true);
            API.chatLog("[PYE] Exception: "+String(exception), true);
        });
    } else {
        get_playlist_listing();
    }
}

function parse_playlists(){
    API.chatLog("[PYE] Step 4: Parsing playlists into PYE JSON file.")
    var jo = {
        is_plugdj_playlist: true,
        userid: API.getUser().username,
        playlists: {}
    };

    for (var i in playlists){
        var item = playlists[i];

        var ct = 1,
            oldName = item.name,
            newName = item.name;

        while (jo.playlists[newName]){
            newName = oldName+" ("+ct+")";
            ct++;
        }

        jo.playlists[newName] = [];
        for (var x=0;x<item.items.length;x++){
            var media = item.items[x];
            jo.playlists[newName].push({
                type:media.format,
                id:media.cid
            });
        }
    }

    save_json(jo);
}

function get_playlists(){
    API.chatLog("[PYE] Step 3: Fetch individual playlists");

    $("body").append("<div id='pye-pexport'>PAUSE PYE</div>");
    $("#pye-pexport").css({
        position: "fixed",
        top: "55px",
        left: "0px",
        width: "200px",
        height: "100px",
        "font-size": "45px",
        "line-height": "50px",
        "color":"white",
        "background-color":"red",
        "cursor":"pointer",
        "text-align":"center",
        "z-index":10000
    });
    $("#pye-pexport").on("click", function(){
        cooloff = true;
    });

    function finish(){
        $("#pye-pexport").remove();
        parse_playlists();
    }

    var queue = [];
    var totalQueue;
    function fetch_next(){
        if (!queue.length){
            finish();
            return;
        }

        if (cooloff){
            API.chatLog("[PYE] Pause button pressed. Cooling off for 1 minute.");
            cooloff = false;
            setTimeout(fetch_next, 60000);
            return;
        }

        if (!autocooloff && (queue.length%15) == 0){
            API.chatLog("[PYE] Autocooloff. Will resume playlist fetching in 2 minutes to avoid plug.dj tempban.");
            autocooloff = true;
            setTimeout(fetch_next, 60000*2);
            return;
        }

        autocooloff = false;

        var cur = queue.pop();
        API.chatLog("[PYE] Fetching playlist "+(totalQueue-queue.length)+" of "+totalQueue);

        function fail(){
            API.chatLog("[PYE] Could not fetch playlist id:"+cur+"! Aborting.");
            return;
        }
        function success(data){
            if (!data.status == "ok"){
                API.chatLog("[PYE] Could not fetch playlist id:"+cur+"! Status: "+data.status+". Aborting.");
                return;
            }
            playlists[cur].items = data.data;
            setTimeout(fetch_next);
        }

        $.ajax({
            url: "https://plug.dj/_/playlists/"+cur+"/media",
            contentType: "application/json",
            dataType: "json",
            type: "GET",
            fail: fail,
            success: success
        });
    }
    for (var i in playlists){
        queue.push(i);
    }
    totalQueue = queue.length;
    fetch_next();
}

function get_playlist_listing(){
    API.chatLog("[PYE] Step 2: Fetch playlist listing");

    //Define the handler functions.
    function ajax_success(data){
        if (data.status != "ok"){
            API.chatLog("[PYE] Could not get playlist listing! Status: "+data.status, true);
            return;
        }
        var body = data.data;
        API.chatLog("[PYE] Parsing listing.");

        for (var i=0;i<body.length;i++){
            playlists[body[i].id] = {
                name: body[i].name
            };
        }

        setTimeout(get_playlists);
    }

    function ajax_error(jqXHR, textStatus, errorThrown){
        API.chatLog("[PYE] Could not fetch the playlists object!", true);
        API.chatLog("[PYE] Error: "+String(errorThrown), true);
    }

    //Make the AJAX call.
    $.ajax({
        url: "https://plug.dj/_/playlists",
        contentType: "application/json",
        dataType: "json",
        type: "GET",
        fail: ajax_error,
        success: ajax_success
    });
}

function save_json(obj){
    API.chatLog("[PYE] Step 5: Saving playlist file.");
    var blob = new Blob(
        [JSON.stringify(obj)],
        {
            type: "application/json;charset=utf-8"
        }
    );
    saveAs(blob, "PLUG_PLAYLISTS.json");
    API.chatLog("[PYE] Done! You should have downloaded PLUG_PLAYLISTS.json by now.", true);
}
setTimeout(check_for_api, 50);