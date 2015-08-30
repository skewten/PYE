require! <[ express livescript-middleware node-sass-middleware ]>

app = express!
router = express.Router!

app.set 'view engine', 'jade'
app.set 'views', "#{__dirname}/views"

app.use '/s', express.static "#{__dirname}/s"

app.use node-sass-middleware do
    src: "#{__dirname}/s/scss/"
    dest: "#{__dirname}/s/css/"
    prefix: "/s/css/"

app.use "/s/js", livescript-middleware do
  src: "#{__dirname}/s/ls"
  dest: "#{__dirname}/s/js"

app.get '/', (req, res) ->
    res.render 'index'

app.listen 9000