require! <[ express livescript-middleware node-sass-middleware ]>

app = express!
router = express.Router!

app.set 'view engine', 'jade'
app.set 'views', "#{__dirname}/views"

app.use node-sass-middleware do
    src: "#{__dirname}/s/scss/"
    dest: "#{__dirname}/s/css/"

app.use "/js", livescript-middleware do
  src: "#{__dirname}/s/ls"
  dest: "#{__dirname}/s/js"

app.use '/s', express.static 's'

app.get '/', (req, res) ->
    res.render 'index'

app.listen 9000