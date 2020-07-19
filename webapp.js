const express = require('express')
const aplicacion = express()
const mysql = require('mysql')
const bodyParser = require('body-parser')
const session = require('express-session')
const flash = require('express-flash')
const fileUpload = require('express-fileupload')

const rutasMiddleware = require('./routes/middleware')
const rutasPublicas = require('./routes/publicas')
const rutasPrivadas = require('./routes/privadas')
const rutasApi = require('./routes/API')

aplicacion.use(bodyParser.json())
aplicacion.use(bodyParser.urlencoded({ extended: true }))
aplicacion.set("view engine", "ejs")
aplicacion.use(session({ secret: 'token-muy-secreto', resave: true, saveUninitialized: true }));
aplicacion.use(flash())
aplicacion.use(express.static(__dirname +'/public'))
aplicacion.use(fileUpload({createParentPath: true}))

aplicacion.use(rutasMiddleware)
aplicacion.use(rutasPublicas)
aplicacion.use(rutasPrivadas)
aplicacion.use(rutasApi)

aplicacion.listen(8080, function(){
  console.log("Servidor iniciado")
})
