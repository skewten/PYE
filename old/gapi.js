var GAPI = {};
//Google API client ID.
GAPI.clientId = '889751255111-qjkp9cvcrn7m3rkv2kuhoia0flguvhbr.apps.googleusercontent.com';
//Google API key.
GAPI.apiKey = 'AIzaSyA8d5uzO4wx3h1ZXcyVw-N2F9a-yhx8TtI';
//Google API scopes, in this case the managing of a Youtube account.
GAPI.scopes = 'https://www.googleapis.com/auth/youtube';
GAPI.init = function(){
  $.getScript("https://apis.google.com/js/client.js?onload=GAPI_load_client").fail(function(err){
    console.error("Could not load the Google API client JS!");
    console.error(JSON.stringify(err, null, 2));
  });
}

GAPI_load_client = function(){
  console.log("Google API: Loaded, setting credentials.");
  $("#authbutton").click(GAPI.auth_click);
  //Set API key.
  gapi.client.setApiKey(GAPI.apiKey);
  show_step2();
}

GAPI.authorize_client = function(){
  console.log("Google API: Authorizing client.");
  gapi.auth.authorize({client_id: GAPI.clientId, scope: GAPI.scopes, immediate: false}, GAPI.handle_authorization_result);
}

GAPI.auth_click = function(event){
  GAPI.authorize_client(true);
}

GAPI.handle_authorization_result = function(authResult){
  console.log("Google API: Authorized client, checking status.");
  if (authResult){
    if (authResult.error){
      console.error("Google API: Got an error.");
      console.error(JSON.stringify(authResult.error));
    }
    else{
      GAPI.api_ready();
    }
  }
  else{
    console.warn("Google API: No auth result! User must re-auth.");
  }
}

GAPI.api_ready = function(){
  console.log("Google API: Ready to make calls.");
  show_step4();
}

GAPI.passedPlaylists = 0;
GAPI.failedPlaylists = 0;
GAPI.passed = 0;
GAPI.failed = 0;

GAPI.playlistNames = [];
GAPI.createdPlaylists = {};

GAPI.playlistItems = [];
GAPI.currentPlaylist;

GAPI.write_playlists = function(){
  $("#exportbutton").hide();
  console.log("Google API: Loading Youtube v3 API.");
  gapi.client.load('youtube', 'v3', function(){
    for (var i in EP){
      GAPI.playlistNames.push(i);
    }
    GAPI.insert_next_playlist();
  });
}

GAPI.insert_next_playlist = function(){
  if (GAPI.playlistNames.length == 0){
    finalize_import();
    return;
  }
  var name = GAPI.playlistNames.shift();
  console.log("Making playlist: "+name);
  var request = gapi.client.youtube.playlists.insert({
    part: 'snippet,status',
    resource: {
      snippet: {
        title: 'plug.dj: '+EU+' - '+name,
        description: 'A plug.dj playlist export. (Done with pye.sq10.net)',
        tags: ["plug.dj", "pye.sq10.net", "exported_playlist"]
      },
      status: {
        privacyStatus: 'private'
      }
    }
  });
  request.execute(function(resp){
    if (!resp.error){
      console.log("Playlist created.");
      GAPI.passedPlaylists++;
      GAPI.currentPlaylist = resp.result.id;
      console.log("ID: "+GAPI.currentPlaylist);
      GAPI.createdPlaylists[name] = GAPI.currentPlaylist;
      GAPI.playlistItems = [];
      for (var i=0;i<EP[name].length;i++){
        GAPI.playlistItems.push(EP[name][i]);
      }
      GAPI.insert_next_playlist_item();
    }
    else{
      console.error("An error occured while creating playlist!");
      console.error('Error code: ' + resp.error.code);
      console.error('Error message: ' + resp.error.message);
      GAPI.failedPlaylists++;
      GAPI.insert_next_playlist();
    }
  });
}

GAPI.insert_next_playlist_item = function(){
  if (GAPI.playlistItems.length == 0){
    GAPI.insert_next_playlist();
    return;
  }
  var pid = GAPI.currentPlaylist;
  var vid = GAPI.playlistItems.shift();
  console.log("Inserting item "+vid+" into playlist.");
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
        GAPI.passed++;
        GAPI.insert_next_playlist_item();
      }
      else{
        GAPI.failed++;
        console.error("An error occured while inserting playlist item!");
        console.error('Error code: ' + resp.error.code);
        console.error('Error message: ' + resp.error.message);
        GAPI.insert_next_playlist_item();
      }
    }
  });
}