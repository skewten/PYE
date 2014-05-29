/*
	PYE!
	Created by Ivan (sq10.net)
	v0.1
*/
/*
	The MIT License (MIT)

	Copyright (c) 2014 sq10.net

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
*/
window.onload = init;
function init(){
	step(1);
}

var steps = [
	"upload_file",
	"prepare_gapi",
	"parsing_playlists",
	"select_playlists",
	"authorize_api",
	"export_ready",
	"export_status",
	"export_results"
];
function step(num){
	$("#container > div").hide();
	$("#"+steps[num-1]).show();
	PYE.step[steps[num-1]]();
}

var PYE = {};
PYE.data = {};
PYE.doneWith = {};
PYE.busy = {};
PYE.step = {};
////////
//Step 1
PYE.step.upload_file = function(){
	debug.log("PYE!");
	debug.log("Created by Ivan (sq10.net)");
	debug.log("==========================");
	$("#upload_read").on("click", PYE.read_file);
}
PYE.read_file = function(){
	if (PYE.busy.readingFile){
		debug.error("PYE is already busy reading file!");
		return;
	}
	if (PYE.doneWith.fileRead){
		debug.error("Fatal: File has already been read and parsed!");
		return;
	}
	PYE.busy.readingFile = true;
	//Check for files.
	var files = $("#upload_input").get()[0].files;
	if (files.length == 0){
		debug.warn("No file specified.");
		PYE.busy.readingFile = false;
		return;
	}
	//Read the file.
	var reader = new FileReader();
	reader.onload = function(result){
		//Get file info.
		var contents = result.target.result;
		debug.log("Name: "+file.name);
		debug.log("Size: "+file.size);
		//Try to parse the file as JSON.
		var parsedJSON;
		try{
			parsedJSON = JSON.parse(contents);
			debug.log("JSON: true");
		}catch(e){
			debug.log("JSON: false");
		}
		if (!parsedJSON){
			debug.error("File isn't valid JSON!");
			PYE.busy.readingFile = false;
			return;
		}
		PYE.validate_file(parsedJSON);
		PYE.busy.readingFile = false;
	}
	var file = files[0];
	reader.readAsText(file);
}
PYE.validate_file = function(obj){
	debug.log("Validating file.");
	if (!obj.is_plugdj_playlist){
		debug.error("Bad JSON, not a plug.dj playlists file!!");
		return;
	}
	if (!obj.userid){
		debug.error("Bad JSON, no userid!");
		return;
	}
	if (!obj.playlists){
		debug.error("Bad JSON, no playlists array!");
		return;
	}
	for (var i in obj.playlists){
		if (Object.prototype.toString.call(obj.playlists[i]) !== '[object Array]'){
			debug.error("Bad JSON, one of the playlists isn't an array!");
			return;
		}
		for (var z=0;z<obj.playlists[i].length;z++){
			if (!obj.playlists[i][z].type){
				debug.error("Bad JSON, one of the playlists' items doesn't have a type!");
				return;
			}
			if (!obj.playlists[i][z].id){
				debug.error("Bad JSON, one of the playlists' items doesn't have an id!");
				return;
			}
		}
	}
	PYE.doneWith.fileRead = true;
	debug.success("File looks fine.");
	PYE.data.userid = obj.userid;
	PYE.data.rawPlaylists = obj.playlists;
	setTimeout(function(){step(2)});
	return;
}

////////
//Step 2
PYE.step.prepare_gapi = function(){
	debug.log("Google API: Loading.");
	$.getScript("https://apis.google.com/js/client.js?onload=GAPI_load_client").fail(function(err){
		debug.error("Fatal: Could not load the Google API client JS! Check console for error.");
		console.warn("GOOGLE API INIT ERROR:");
		console.warn(err);
	});

}

var GAPI = {};
//Google API client ID.
GAPI.clientId = '889751255111-qjkp9cvcrn7m3rkv2kuhoia0flguvhbr.apps.googleusercontent.com';
//Google API key.
GAPI.apiKey = 'AIzaSyA8d5uzO4wx3h1ZXcyVw-N2F9a-yhx8TtI';
//Google API scopes, in this case the managing of a Youtube account.
GAPI.scopes = 'https://www.googleapis.com/auth/youtube';

function GAPI_load_client(){
	debug.log("Google API: Loaded, setting credentials.");
	//Set API key.
	gapi.client.setApiKey(GAPI.apiKey);
	PYE.load_youtube_api();
}

PYE.load_youtube_api = function(){
	debug.log("Google API: Loading Youtube v3 API.");
	gapi.client.load('youtube', 'v3', function(){
		//The Youtube API has loaded. Time to parse playlists.
		debug.success("Google API: Youtube API loaded.");
		step(3);
	});
}

////////
//Step 3
PYE.step.parsing_playlists = function(){
	PYE.data.parsedPlaylists = {};
	PYE.data.playlistsToParse = [];
	for (var i in PYE.data.rawPlaylists){
		PYE.data.playlistsToParse.push(i);
	}
	PYE.parse_next_playlist();
	PYE.data.playlistAmount = PYE.data.playlistsToParse.length;
}
PYE.parse_next_playlist = function(){
	if (PYE.data.playlistsToParse.length == 0){
		$("#rendering_html").removeClass("hidden");
		setTimeout(PYE.finish_parsing_playlists, 500);
		return;
	}
	var currentPlaylist = PYE.data.playlistsToParse.shift();
	$("#progress_playlist_name").text(currentPlaylist);
	var value = ((PYE.data.playlistAmount-PYE.data.playlistsToParse.length)/PYE.data.playlistAmount)*100;
	$("#progress_playlist").css('width', value+'%').attr('aria-valuenow', value);
	PYE.data.videosToParse = [];
	var currentPlaylistObj = PYE.data.rawPlaylists[currentPlaylist];
	for (var i=0;i<currentPlaylistObj.length;i++){
		PYE.data.videosToParse.push(currentPlaylistObj[i]);
	}
	PYE.data.currentPlaylist = currentPlaylist;
	PYE.data.currentPlaylistLength = PYE.data.videosToParse.length;
	PYE.data.currentPlaylistLeft = PYE.data.currentPlaylistLength;
	PYE.data.parsedPlaylists[currentPlaylist] = [];
	setTimeout(PYE.parse_videos);
}

PYE.count_down_videos = function(){
	PYE.data.currentPlaylistLeft--;
	var value = (((PYE.data.currentPlaylistLength-PYE.data.currentPlaylistLeft))/PYE.data.currentPlaylistLength)*100;
	$("#progress_video_name").text(PYE.data.currentPlaylistLeft+" videos left");
	$("#progress_video").css('width', value+'%').attr('aria-valuenow', value);
	if (PYE.data.currentPlaylistLeft == 0){
		setTimeout(PYE.parse_next_playlist);
	}
}

PYE.parse_videos = function(){
	$("#progress_video_name").text(PYE.data.currentPlaylistLeft+" videos left");
	while (PYE.data.videosToParse.length != 0){
		(function(currentVideo){
			var currentPlaylist = PYE.data.parsedPlaylists[PYE.data.currentPlaylist]
			var currentPlaylistLength = currentPlaylist.length;
			currentPlaylist[currentPlaylistLength] = {
				type: currentVideo.type,
				id: currentVideo.id
			};
			var parsedVideo = currentPlaylist[currentPlaylistLength];
			if (currentVideo.type != 1){
				setTimeout(PYE.count_down_videos);
				return;
			}
			var request = gapi.client.youtube.videos.list({
				part: 'id,snippet',
				id: currentVideo.id
			});
			request.execute(function(resp){
				if (!resp.error){
					var items = resp.items;
					if (!items || items.length != 1){
						parsedVideo.error = true;
						setTimeout(PYE.count_down_videos);
						return;
					}
					var item = items[0];
					parsedVideo.name = item.snippet.title;
					parsedVideo.author = item.snippet.channelTitle;
					parsedVideo.thumb = item.snippet.thumbnails.medium.url;
					setTimeout(PYE.count_down_videos);
				}
				else{
					debug.error("Fatal: An error occured while fetching video!");
					debug.error('Error code: ' + resp.error.code);
					debug.error('Error message: ' + resp.error.message);
				}
			});
		})(PYE.data.videosToParse.shift());
	}
}

PYE.finish_parsing_playlists = function(){
	var pp = PYE.data.parsedPlaylists;
	PYE.data.pidToPlaylist = {};
	var count = 0;
	var ptemplate = $("#playlist_template").html();
	var vtemplate = $("#video_template").html();
	for (var i in pp){
		//Add the playlist
		(function(c, i){
			PYE.data.pidToPlaylist[c] = i;
			$("#playlist_list").append(ptemplate);
			$("#playlist_list .playlist").last().addClass("id_"+c);
			if (c == 0){
				$("#playlist_list .playlist.id_"+c).addClass("p_active");
			}
			$("#playlist_list .playlist.id_"+c+" .id").text(c);
			$("#playlist_list .playlist.id_"+c+" .form-control").val(i);
			$("#playlist_list .playlist.id_"+c+" .song_selector").text(0+"/"+pp[i].length);
		})(count, i);
		//Add the videos
		(function(c, i){
			$("#video_list").append("<div class='hidden id_"+c+"'></div>");
			var pl = $("#video_list .id_"+c);
			if (c == 0){
				pl.removeClass("hidden");
			}
			for (var x=0;x<pp[i].length;x++){
				var vid = pp[i][x];
				$("#video_list .id_"+c).append(vtemplate);
				$("#video_list .id_"+c+" .video").last().addClass("vid_"+x);
				var jvid = "#video_list .id_"+c+" .vid_"+x+" ";
				$(jvid+".vid").text(x);
				$(jvid+".partof").text(c);
				$(jvid+".id").text(vid.id);
				$(jvid+".img img").attr("src", (vid.thumb || "https://i1.ytimg.com/"));
				if (vid.error){
					$(jvid+".error").text("Could not find video.");
					$(jvid).addClass("error");
					continue;
				}
				if (vid.type != 1){
					$(jvid+".error").text("Not a Youtube video.");
					$(jvid).addClass("error");
					continue;
				}
				$(jvid+".channel").text(vid.author);
				$(jvid+".name").text(vid.name);
			}
		})(count, i);
		count++
	}
	//Attach all handlers
	$("#video_list .video:not(.error)").on("click", PYE.toggle_video);
	$("#playlist_list .playlist .select").on("click", PYE.toggle_playlist);
	$("#playlist_list .playlist .song_selector").on("click", PYE.select_playlist);
	$("#playlist_select_all").on("click", PYE.select_all_playlists);
	$("#playlist_select_none").on("click", PYE.select_no_playlists);
	$("#video_select_all").on("click", PYE.select_all_videos);
	$("#video_select_none").on("click", PYE.select_no_videos);
	//Select all good videos.
	var vids = $("#video_list .video").get();
	for (var y=0;y<vids.length;y++){
		$(vids[y]).click();
	}
	debug.success("Successfully parsed playlists.");
	step(4);
}

////////
//Step 4
PYE.step.select_playlists = function(){
	$("#done_selecting").on("click", PYE.read_selected_playlists);
	debug.log("Ready to select playlists.");
}
PYE.toggle_video = function(evt){
	var target = $(evt.currentTarget);
	if (target.hasClass("selected")){
		target.removeClass("selected");
	}
	else{
		target.addClass("selected");
	}
	var id = target.children(".partof").text();
	PYE.set_playlist_num(id, $("#video_list .id_"+id+" .selected").get().length);
}
PYE.set_playlist_num = function(id, num){
	var text = $("#playlist_list .id_"+id+" .song_selector").text().split("/");
	var doClick = false;
	if (text[0] == 0 && num != 0){
		doClick = true;
	}
	text[0] = num;
	$("#playlist_list .id_"+id+" .song_selector").text(text.join("/"));
	if (num == 0 && $("#playlist_list .id_"+id).hasClass("p_selected")){
		doClick = true;
	}
	if (doClick){
		$("#playlist_list .id_"+id+" .select").click();
	}

}
PYE.toggle_playlist = function(evt){
	var parent = $(evt.currentTarget).parent().parent();
	var items = parent.find(".song_selector").text().split("/")[0];
	if (parent.hasClass("p_selected")){
		parent.removeClass("p_selected");
		parent.find(".glyphicon").removeClass("glyphicon-minus").addClass("glyphicon-plus");
	}
	else{
		if (items == 0){
			return;
		}
		parent.addClass("p_selected");
		parent.find(".glyphicon").removeClass("glyphicon-plus").addClass("glyphicon-minus");
	}
}
PYE.select_playlist = function(evt){
	var parent = $(evt.currentTarget).parent().parent();
	$("#playlist_list .playlist.p_active").removeClass("p_active");
	parent.addClass("p_active");
	$("#video_list > div:not(.hidden):not(.row)").addClass("hidden");
	var id = parent.children(".id").text();
	$("#video_list .id_"+id).removeClass("hidden");
}
PYE.select_no_videos = function(evt){
	var videos = $("#video_list > div:not(.hidden) .video.selected").get();
	for (var i=0;i<videos.length;i++){
		$(videos[i]).click();
	}
}
PYE.select_all_videos = function(evt){
	var videos = $("#video_list > div:not(.hidden) .video:not(.selected)").get();
	for (var i=0;i<videos.length;i++){
		$(videos[i]).click();
	}
}
PYE.select_no_playlists = function(evt){
	var playlists = $("#playlist_list .playlist.p_selected").get();
	for (var i=0;i<playlists.length;i++){
		$(playlists[i]).find(".select").click();
	}
}

PYE.select_all_playlists = function(evt){
	var playlists = $("#playlist_list .playlist:not(.p_selected)").get();
	for (var i=0;i<playlists.length;i++){
		$(playlists[i]).find(".select").click();
	}
}
PYE.read_selected_playlists = function(){
	if (PYE.busy.readingPlaylists){
		debug.warn("PYE is already reading playlists!");
		return;
	}
	PYE.busy.readingPlaylists = true;
	var playlists = $("#playlist_list .playlist.p_selected").get();
	if (playlists.length == 0){
		debug.warn("No playlists selected!");
		PYE.busy.readingPlaylists = false;
	}
	else{
		debug.log("Parsing selected playlists.");
		PYE.data.usedPlaylists = {};
		for (var i=0;i<playlists.length;i++){
			var id = $(playlists[i]).find(".id").text();
			var pname = PYE.data.pidToPlaylist[id];
			PYE.data.usedPlaylists[pname] = [];
			var videos = $("#video_list .id_"+id+" .selected").get();
			for (var x=0;x<videos.length;x++){
				PYE.data.usedPlaylists[pname].push(PYE.data.parsedPlaylists[pname][$(videos[x]).find(".vid").text()]);
			}
		}
		step(5);
	}
}

////////
//Step 5
PYE.step.authorize_api = function(){
	$("#authorize_button").on("click", PYE.do_authorization);
	debug.success("Ready to authorize.");
}

PYE.do_authorization = function(){
	debug.log("Google API: Authorizing client.");
	gapi.auth.authorize({client_id: GAPI.clientId, scope: GAPI.scopes, immediate: false}, PYE.handle_authorization_result);
}

PYE.handle_authorization_result = function(authResult){
	debug.log("Google API: Authorized client, checking status.");
	if (authResult){
		if (authResult.error){
			debug.error("Google API: Got an error.");
			debug.error(JSON.stringify(authResult.error));
		}
		else{
			PYE.api_ready();
		}
	}
	else{
		debug.warn("Google API: No auth result! User must re-auth.");
	}
}

PYE.api_ready = function(){
	step(6);
}

////////
//Step 6
PYE.step.export_ready = function(){
	$("#export_button").on("click", PYE.start_export);
	debug.success("Authorized, ready to export.");
}
PYE.start_export = function(){
	step(7);
}

////////
//Step 7
PYE.data.playlistsToExport = [];
PYE.es = { //es: export status
	pp: 0, //pp: passed playlists
	fp: 0, //fp: failed playlists
	pv: 0, //pv: passed videos
	fv: 0  //fv: failed videos
};
PYE.data.cumulativeAmt = 0;
PYE.data.cumulativeValue = 0;
PYE.data.exportedPlaylists = {};
PYE.data.failedPlaylists = [];
PYE.data.failedVideos = [];
PYE.step.export_status = function(){
	$("#export_info").text("Beginning export");
	for (var i in PYE.data.usedPlaylists){
		PYE.data.playlistsToExport.push(i);
		for (var x=0;x<PYE.data.usedPlaylists[i].length;x++){
			PYE.data.cumulativeAmt++;
		}
	}
	PYE.export_next_playlist();
}

PYE.export_next_playlist = function(){
	if (PYE.data.playlistsToExport.length == 0){
		PYE.finalize_export();
		return;
	}
	PYE.data.pname = PYE.data.playlistsToExport.shift();
	PYE.data.pname = PYE.data.pname.replace(/[^\x00-\x7F]/g, ".");
	var name = PYE.data.pname;
	$("#export_info").text(name+": Making playlist");
	var request = gapi.client.youtube.playlists.insert({
		part: 'snippet,status',
		resource: {
			snippet: {
				title: name+" by "+PYE.data.userid+" (plug.dj)",
				description: 'A plug.dj playlist export. (Done with pye.sq10.net)',
				tags: ["plug.dj", "pye.sq10.net", "pye_exported_playlist"]
			},
			status: {
				privacyStatus: 'private'
			}
		}
	});
	request.execute(function(resp){
		if (!resp.error){
			PYE.es.pp++;
			PYE.data.currentPlaylistId = resp.result.id;
			PYE.data.exportedPlaylists[name] = PYE.data.currentPlaylistId;
			PYE.data.videosToExport = [];
			for (var i=0;i<PYE.data.usedPlaylists[name].length;i++){
				PYE.data.videosToExport.push(PYE.data.usedPlaylists[name][i]);
			}
			PYE.data.videosLeft = PYE.data.videosToExport.length;
			PYE.data.videosLength = PYE.data.videosToExport.length;
			PYE.insert_next_playlist_item();
		}
		else{
			debug.error("An error occured while creating playlist!");
			debug.error('Error code: ' + resp.error.code);
			debug.error('Error message: ' + resp.error.message);
			PYE.data.failedPlaylists = [];
			PYE.es.fp++;
			PYE.export_next_playlist();
		}
	});
}

PYE.insert_next_playlist_item = function(){
	$("#export_info").text(PYE.data.pname+": Inserting "+PYE.data.videosToExport.length+" videos");
	var pid = PYE.data.currentPlaylistId;
	var vid;
	var videoCount = 0;
	/*
		A hackish convertion to synchronously insert playlistItems.
		This was originally asynchronous, but because YOUTUBE'S API FUCKING SUCKS, I'm
		forced to do it all synchronously.
	*/
	vid = PYE.data.videosToExport.shift()
	vid = vid.id;
	(function(vid, pid){
		gapi.client.request({
			path: "youtube/v3/playlistItems",
			method: "POST",
			params: {part: 'snippet'},
			body: {
				part: 'snippet',
				snippet: {
					playlistId: pid,
					resourceId: {
						kind: "youtube#video",
						videoId: vid
					}
				}
			},
			callback: function(resp){
				if (!resp.error){
					PYE.es.pv++;
					PYE.count_down_exports();
				}
				else{
					PYE.es.fv++;
					debug.error("An error occured while inserting "+vid);
					debug.error('Error code: ' + resp.error.code);
					debug.error('Error message: ' + resp.error.message);
					PYE.data.failedVideos.push({p:PYE.data.pname, v:vid});
					PYE.count_down_exports();
				}
			}
		});
	})(vid, pid);
}

PYE.count_down_exports = function(){
	PYE.data.videosLeft--;
	var value = (((PYE.data.videosLength-PYE.data.videosLeft)+PYE.data.cumulativeValue)/PYE.data.cumulativeAmt)*100;
	$("#progress_export").text(PYE.data.videosLeft+" videos left");
	$("#progress_export_bar").css('width', value+'%').attr('aria-valuenow', value).text(Math.floor(value)+"%");
	if (PYE.data.videosLeft == 0){
		PYE.data.cumulativeValue += PYE.data.videosLength;
		setTimeout(PYE.export_next_playlist);
	}
	else{
		PYE.insert_next_playlist_item();
	}
}

PYE.finalize_export = function(){
	debug.success("Done exporting!");
	step(8);
}

////////
//Step 8
PYE.step.export_results = function(){
	var value = (PYE.es.pv/PYE.data.cumulativeAmt)*100;
	$("#progress_success_rate").css('width', value+'%').attr('aria-valuenow', value).text(Math.floor(value)+"%");
	for (var i in PYE.data.exportedPlaylists){
		var id = PYE.data.exportedPlaylists[i];
		$("#passed_playlists .list-group").append('<a target="_blank" href="http://youtube.com/playlist?list='+id+'" class="list-group-item">'+i+'</a>')
	}
}