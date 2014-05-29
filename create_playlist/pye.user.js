// ==UserScript==
// @name           plugdj-playlist-exporter
// @description    Creates plug.dj playlist JSON files, and saves them to harddrive.
// @author         Ivan (sq10.net)
// @include        http://plug.dj/*
// @version        1.0
// ==/UserScript==

function check_for_api(){
	//We're going to keep trying to attach the API handler
	//until window.API shows up
	try{
		ready_up();
	}
	catch(e){
		setTimeout(check_for_api, 50);
	}
}

function ready_up(){
	//Attach the API.CHAT_COMMAND handler
	API.on(API.CHAT_COMMAND, function(val){
		if(val == "/pexport")
		    start_export();
	});
}

function start_export(){
	API.chatLog("Beginning export of playlists. Please wait..");
	//Fetch the dependency, FileSaver.js
	$.getScript("http://pye.sq10.net/create_playlist/FileSaver.js").done(function(){
    	get_playlists();
  	}).fail(function(jqxhr, settings, exception){
    	API.chatLog("Could not fetch FileSaver.js!", true);
    	API.chatLog("Exception: "+String(exception), true);
	});
}

function get_playlists(){
	API.chatLog("Fetching playlists.");
	//Create the initial JSON object.
	var jsonObj = {
		is_plugdj_playlist: true,
		userid: API.getUser().id,
		playlists: {}
	};

	//Define the handler functions.
	function ajax_success(data){
		API.chatLog("Fetched data. Parsing...");
		//First, check if we even HAVE playlists to work with. 
		var body = data.body;
		if (body.length == 0){
			API.chatLog("Server did not respond with any playlists! Aborting.", true);
		}

		var playlists = {};
		//Iterate through all the items, creating an array for each item.
		var item;
		for (var i=0;i<body.length;i++){
			item = body[i];
			var realName = item.name;
			var usedName = item.name;
			var count = 1;
			while (playlists[usedName]){
				usedName = realName+" ("+count+")";
				count++;
			}
			playlists[usedName] = [];
			//Go through all the items in the playlist item.
			for (var x=0;x<item.items.length;x++){
				//Split the name to type and id.
				var splitStr = item.items[x].split(":");
				//Let's say splitStr is "2:feih_fe:4ge".
				//Type: "2"
				//ID: "feih_fe:4ge"
				var type = splitStr.shift();
				var id = splitStr.join(":");
				//Push item into the playlist item.
				playlists[usedName].push({
					type: type,
					id: id
				});
			}
		}
		//Merge playlists into the jsonObj.
		jsonObj.playlists = playlists;
		save_json(jsonObj);
	}

	function ajax_error(jqXHR, textStatus, errorThrown){
		API.chatLog("Could not fetch the playlists object!", true);
		API.chatLog("Error: "+String(errorThrown), true);
	}

	//Make the AJAX call.
	var gatewayRequest = {
		service: "playlist.select_1",
		body: [
			"1969-12-31 18:00:00.000000",
			null,
			100,
			null
		]
	}

	$.ajax({
		url: "http://plug.dj/_/gateway/playlist.select_1",
		data: JSON.stringify(gatewayRequest),
		contentType: "application/json",
    	dataType: "json",
    	type: "POST",
    	fail: ajax_error,
		success: ajax_success
	});	
}

function save_json(obj){
	//Make the JSON blob.
	var blob = new Blob(
		[JSON.stringify(obj)],
		{
			type: "application/json;charset=utf-8"
		}
	);
	//Use FileSaver.js's saveAs() function.
	saveAs(blob, "PLUG_PLAYLISTS.json");
	API.chatLog("Done! You should have downloaded PLUG_PLAYLISTS.json by now.", true);
}

setTimeout(check_for_api, 50);