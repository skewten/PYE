/*
  debug.js
  A convenient alternative to console 
*/
String.prototype.hashCode = function() {
    var hash = 0,
        i,
        chr,
        len;
    if (this.length == 0)
        return hash;
    for (i=0,len=this.length;i<len;i++){
        chr   = this.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

var debug = {};
debug.log = function(msg){
    debug.format(msg, "log");
}
debug.warn = function(msg){
    debug.format(msg, "warn");
}
debug.error = function(msg){
    debug.format(msg, "error");
}
debug.success = function(msg){
    debug.format(msg, "success");
}
debug.format = function(msg, type){
    var id = String(Date.now()+msg).hashCode();
    $("#debug_console").append("<pre class='msg "+type+" id_"+id+"'></pre>");
    $("#debug_console .id_"+id).html(msg);
    $("#debug_console").scrollTop($("#debug_console")[0].scrollHeight);
    window.console && console[type] && console[type](msg);
}