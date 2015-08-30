require! <[ gulp nodemon browser-sync del ]>

gulp.task 'default', ['clean', 'browser-sync'], ->

gulp.task 'clean', (cb) ->
    del [
        'src/s/js'
        'src/s/css'
    ], cb

gulp.task 'browser-sync', ['server'], ->
    browser-sync.init null,
        proxy: "http://localhost:9000"
        files: "src/**/*.*"
        port: 9001

gulp.task 'server', ->
    require './src/server.ls'