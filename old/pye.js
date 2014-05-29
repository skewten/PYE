/*
	plug.dj to Youtube playlist exporter.
	Created by Ivan (sq10.net)
	MIT License.

	(Like this project? Support me by donating! http://sq10.net/donate/)
*/

window.onload = init;
function init(){
  console.log("plug.dj -> Youtube playlist exporter!\nCreated by Ivan (sq10.net)\n================================");
  hide_loading();
}

function hide_loading(){
  $("#loading").hide();
  $("#content").show();
  show_step1();
  attach_handlers();
}

function attach_handlers(){
  $("#fileinputbutton").click(read_file);
  $("#exportbutton").click(GAPI.write_playlists);
  $("#doneselecting").click(prepare_playlists);
}

function show_step1(){
  $("#content > div").hide();
  $("#file").show();
}

function show_step2(){
  $("#content > div").hide();
  $("#authorize").show();
}

function show_step3(){
  $("#content > div").hide();
  $("#select_playlists").show();
}

function show_step4(){
  $("#content > div").hide();
  $("#working").show();
}

function show_step5(){
  $("#content > div").hide();
  $("#result").show(); 
}

function read_file(){
  var reader = new FileReader();
  reader.onload = function(result){
    var contents = result.target.result;
    console.log("Name: "+file.name);
    console.log("Size: "+file.size);
    var fileJson;
    try{
      fileJson = JSON.parse(contents);
      console.log("JSON: true");
    }catch(e){
      console.log("JSON: false");
    }
    if (!fileJson){
      console.error("Invalid file!");
      tell_upload();
      return;
    }
    validate_file(fileJson);
  }
  var files = $("#fileinput").get()[0].files;
  if (!files.length){
    console.warn("No file specified.");
  }
  else{
    var file = files[0];
    reader.readAsText(file);
  }
}

function tell_upload(){
  console.error("Please upload the plug.dj playlists JSON file.");
}

function validate_file(obj){
  console.log("Validating file.");
  if (!obj.is_plugdj_playlist){
    console.error("Bad JSON, not a plug.dj playlists file!!");
    tell_upload();
    return;
  }
  if (!obj.userid){
    console.error("Bad JSON, no userid!");
    tell_upload();
    return;
  }
  if (!obj.playlists){
    console.error("Bad JSON, no playlists array!");
    tell_upload();
    return;
  }
  for (var i in obj.playlists){
    if (Object.prototype.toString.call(obj.playlists[i]) !== '[object Array]'){
      console.error("Bad JSON, one of the playlists isn't an array!");
      tell_upload();
      return;
    }
    for (var z=0;z<obj.playlists[i].length;z++){
      if (!obj.playlists[i][z].type){
        console.error("Bad JSON, one of the playlists' items doesn't have a type!");
        tell_upload();
        return;
      }
      if (!obj.playlists[i][z].id){
        console.error("Bad JSON, one of the playlists' items doesn't have an id!");
        tell_upload();
        return;
      }
    }
  }
  console.log("File looks fine.");
  window.PlaylistObj = obj;
  list_playlists();
}

function list_playlists(){
  window.PlaylistsTable = [];
  for (var i in PlaylistObj.playlists){
    PlaylistsTable.push(i);
    $("#playlists").append("<div class='item i_"+(PlaylistsTable.length-1)+"'>"+i+", items: "+PlaylistObj.playlists[i].length+"</div>");
  }
  $("#playlists .item").on("click", function(evt){
    if ($(evt.currentTarget).hasClass("selected")){
      $(evt.currentTarget).removeClass("selected");
    }
    else{
      $(evt.currentTarget).addClass("selected");
    }
  });
  show_step3();
}

function prepare_playlists(){
  var items = $("#playlists .item.selected").get();
  if (items.length == 0){
    console.error("No playlists selected!");
    return;
  }
  console.log("Preparing playlists object.");
  window.EP = {};
  window.EU = PlaylistObj.userid;
  for (var i=0;i<items.length;i++){
    $(items[i]).removeClass("item");
    $(items[i]).removeClass("selected");
    var name = PlaylistsTable[$(items[i]).attr("class").substr(2)];
    var obj = PlaylistObj.playlists[name];
    name = name.replace(/[^\x00-\x7F]/g, "");
    EP[name] = [];
    for (var x in obj){
      if (obj[x].type == 1){
        EP[name].push(obj[x].id);
      }
    }
  }
  console.log("Done. Preparing API.");
  GAPI.init();
}

function finalize_import(){
  console.log("All done!");
  for (var i in GAPI.createdPlaylists){
    $("#result_playlists").append("<a target='_blank' href='http://youtube.com/playlist?list="+GAPI.createdPlaylists[i]+"'>"+i+"</a>")
  }
  $("#pamt_imported").text(GAPI.passedPlaylists);
  $("#pamt_skipped").text(GAPI.failedPlaylists);
  $("#amt_skipped").text(GAPI.failed);
  $("#amt_imported").text(GAPI.passed);
  show_step5();
}