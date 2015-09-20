require! <[ express lisa-middleware ]>

app = express!
router = express.Router!

app.set 'view engine', 'jade'
app.set 'views', "#{__dirname}/views"

app.use '/s/img', express.static "#{__dirname}/s/img"

app.use '/s', lisa-middleware do
    src:
        li: "#{__dirname}/s/ls/"
        sa: "#{__dirname}/s/scss/"
    prefix:
        li: "/js"
        sa: "/css"


app.get '/', (req, res) ->
    res.render 'index'

app.listen 9000