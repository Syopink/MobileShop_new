const express = require("express");
const app = express();
const config = require("config");
const session = require("express-session");
const { populate } = require("./models/product");
const cookieParser = require("cookie-parser")

require("../common/passport");
app.use(cookieParser())
app.use(express.urlencoded({extended: true}));
app.use("/static", express.static(config.get("app.static_folder")));  

app.set("views", config.get("app.views_folder"));
app.set("view engine", config.get("app.view_engine"));

app.set('trust proxy', 1) // trust first proxy

app.use(session({
  secret: config.get("app.session_key"),
  resave: false,
  saveUninitialized: true,
  cookie: { secure: config.get("app.session_secure"), },
}))

app.use(require(`${__dirname}/middlewares/cart`)); // chưa config đường dẫn vào file config
app.use(require(`${__dirname}/middlewares/share`)); // chưa config đường dẫn vào file config



app.use(require(`${__dirname}/../routers/web`)); // chua congif
module.exports = app;