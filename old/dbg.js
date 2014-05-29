String.prototype.hashCode = function() {
  var hash = 0, i, chr, len;
  if (this.length == 0) return hash;
  for (i = 0, len = this.length; i < len; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

var dbg = {};
dbg.log = function(msg){
	dbg.format(msg, "log");
}

dbg.warn = function(msg){
	dbg.format(msg, "warn");
}

dbg.error = function(msg){
	dbg.format(msg, "error");
}

dbg.format = function(msg, type){
	var id = String(Date.now()+msg).hashCode();
	$("#dbg_console").append("<pre class='msg "+type+" id_"+id+"'></pre>");
	$("#dbg_console .id_"+id).html(msg);
	$("#dbg_console").scrollTop($("#dbg_console")[0].scrollHeight);
}

window.console = dbg;