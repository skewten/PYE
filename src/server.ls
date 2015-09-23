require! <[ express lisa-middleware ]>

app = express!
router = express.Router!

app.set 'view engine', 'jade'
app.set 'views', "#{__dirname}/views"

app.use '/s', lisa-middleware do
    src:
        li: "#{__dirname}/s/ls/"
        sa: "#{__dirname}/s/scss/"
    prefix:
        li: "/js"
        sa: "/css"

app.use '/s', express.static "#{__dirname}/s"

app.get '/', (req, res) ->
    res.render 'index'

app.listen 9000