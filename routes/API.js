const express = require('express')
const router = express.Router()
const mysql = require('mysql')
var path = require('path')
const nodemailer = require('nodemailer')
const { route } = require('./publicas')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'cuenta.de.prueba.correo.1234@gmail.com',
    pass: 'Cuenta!123'
  }
})

var pool = mysql.createPool({
  connectionLimit: 20,
  host: 'localhost',
  user: 'rodrigo',
  password: '1qazxsw2',
  database: 'blog_viajes'
})

function enviarCorreoBienvenida(email, nombre){
  const opciones = {
    from: 'cuenta.de.prueba.correo.1234@gmail.com',
    to: email,
    subject: 'Bienvenido al blog de viajes',
    text: `Hola ${nombre}`
  }
  transporter.sendMail(opciones, (error, info) => {
  });
}

//api/v1/publicaciones?busqueda=<palabra>
router.get('/api/v1/publicaciones', (peticion, respuesta) => {
    pool.getConnection((err, connection) =>{
        let consulta
        let modificadorConsulta = ""
        const busqueda = ( connection.escape(peticion.query.busqueda) ) ? peticion.query.busqueda : ""

        if (busqueda != ""){
        modificadorConsulta = `
            WHERE
            titulo LIKE '%${busqueda}%' OR
            resumen LIKE '%${busqueda}%' OR
            contenido LIKE '%${busqueda}%'
        `
        }   
        consulta = `
            SELECT
            publicaciones.id, titulo, resumen, fecha_hora, pseudonimo, votos, avatar
            FROM publicaciones
            INNER JOIN autores
            ON publicaciones.autor_id = autores.id
            ${modificadorConsulta}
        `
        connection.query(consulta, (error, filas, campos) => {
            if (filas.length > 0){
                respuesta.status(200)
                respuesta.json({data: filas})
            }
            else{
                respuesta.status(404)
                respuesta.send({errors: ["No se encuentra(n) esa(s) publicacion(es)"]})
            }
        })
        connection.release()
    })
})
//api/v1/publicaciones/<id>
//Considera cuando el id no existe.
router.get('/api/v1/publicaciones/:id',(peticion,respuesta) =>{
    pool.getConnection((err,connection) =>{
        consulta = `
            SELECT
            publicaciones.id id,titulo, resumen, fecha_hora, pseudonimo, votos, avatar
            FROM publicaciones
            INNER JOIN autores
            ON publicaciones.autor_id = autores.id
            WHERE publicaciones.id = ${connection.escape(peticion.params.id)}         
        `
        connection.query(consulta, (error, filas, campos) => {
            if (filas.length > 0) {
                respuesta.status(200)
                respuesta.json({data: filas[0]})
            }
            else {
                respuesta.status(404)
                respuesta.send({errors: ["No se encuentra esa publicacion"]})
            }
        })
        connection.release()
    })
})
//api/v1/autores
router.get('/api/v1/autores', (peticion, respuesta) =>{
    pool.getConnection((err, connection) =>{
        let consulta = `
        SELECT autores.id id, pseudonimo, avatar, publicaciones.id publicacion_id, titulo
        FROM autores
        INNER JOIN
        publicaciones
        ON
        autores.id = publicaciones.autor_id
        ORDER BY autores.id DESC, publicaciones.fecha_hora DESC
        `
        connection.query(consulta, (error, filas, campos) => {
            if(filas.length != 0){
                respuesta.status(200)
                respuesta.json({data: filas})
            }
            else{
                respuesta.status(404)
                respuesta.send({errors: ["No se encuentran los autores"]})
            }
        })
        connection.release()
    })
})
//api/v1/autores/<id>
//Considera cuando el id no existe.
router.get('/api/v1/autores/:id', (peticion, respuesta) => {
    pool.getConnection((err, connection) => {
      const consulta = `
        SELECT autores.id, email, pseudonimo, avatar, publicaciones.id, titulo
        FROM autores
        INNER JOIN
        publicaciones
        ON
        autores.id = publicaciones.autor_id
        WHERE autores.id = ${connection.escape(peticion.params.id)}
      `
      connection.query(consulta, (error, filas, campos) => {  
        if(filas.length != 0){
            respuesta.status(200)
            respuesta.json({data: filas[0]})
        }
        else{
            respuesta.status(404)
            respuesta.send({errors: ["No se encuentra ese autor"]})
        }
      })
      connection.release()
    })
})
//api/v1/autores
router.post('/api/v1/autores',(peticion,respuesta)=>{
    pool.getConnection((err,connection) =>{
        const email = peticion.body.email.toLowerCase().trim()
        const pseudonimo = peticion.body.pseudonimo.trim()
        const contrasena = peticion.body.contrasena
        const consultaEmail = `
        SELECT *
        FROM autores
        WHERE email = ${connection.escape(email)}
        `
        connection.query(consultaEmail, (error, filas, campos) => {
            if (filas.length > 0) {
                respuesta.status(404)
                respuesta.json({error: "email duplicado"})
                //estado de duplicado
            }
            else {
                const consultaPseudonimo = `
                    SELECT *
                    FROM autores
                    WHERE pseudonimo = ${connection.escape(pseudonimo)}
                `
                connection.query(consultaPseudonimo, (error, filas, campos) => {
                    if (filas.length > 0) {
                        
                        respuesta.json({error: "psuedonimo duplicado"})
                        //estado de duplicado
                    }
                    else {
                        const consulta = `
                                        INSERT INTO
                                        autores
                                        (email, contrasena, pseudonimo)
                                        VALUES (
                                            ${connection.escape(email)},
                                            ${connection.escape(contrasena)},
                                            ${connection.escape(pseudonimo)}
                                        )
                                        `
                        connection.query(consulta, (error, filas, campos) => {
                        const nuevoId = filas.insertId
                        const nuevaQuery = `SELECT email, pseudonimo FROM autores WHERE id = ${connection.escape(nuevoId)}`
                        connection.query(nuevaQuery,(error,filas,campos) =>{
                            respuesta.status(201)
                            respuesta.json({data: filas})
                        })
                    })
                }
              })
            }
        })
        connection.release()
    })
})
//api/v1/publicaciones?email=<email>&contrasena=<contrasena>
router.post('/api/v1/publicaciones',(peticion,respuesta)=>{
    pool.getConnection((err,connection) =>{
        const email = peticion.query.email.toLowerCase().trim()
        const contrasena = peticion.query.contrasena
        const titulo = peticion.body.titulo
        const resumen = peticion.body.resumen
        const contenido = peticion.body.contenido
        const consulta = `
        SELECT *
        FROM autores
        WHERE
        email = ${connection.escape(email)} AND
        contrasena = ${connection.escape(contrasena)}
        `
        connection.query(consultaEmail, (error, filas, campos) => {
            if (filas.length <= 0) {
                respuesta.status(404)
                respuesta.json({error: "email y/o contraseña incorrectos"})
            }
            else {
                const date = new Date()
                const fecha = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
                const consulta = `
                INSERT INTO
                publicaciones
                (titulo, resumen, contenido, autor_id, fecha_hora)
                VALUES
                (
                    ${connection.escape(titulo)},
                    ${connection.escape(resumen)},
                    ${connection.escape(contenido)},
                    ${filas.insertId},
                    ${connection.escape(fecha)}
                )
                `
                connection.query(consulta,(error, filas, campos) => {
                    const nuevoId = filas.insertId
                    const queryConsulta = `SELECT * FROM productos WHERE id=${connection.escape(nuevoId)}`
                    connection.query(queryConsulta,(error,filas,campos) =>{
                        respuesta.status(201)
                        respuesta.json({data: filas})
                    })
                    
                })
            }
        })
        connection.release()
    })
})
//api/v1/publicaciones/<id>?email=<email>&contrasena=<contrasena>
router.delete('/api/v1/publicaciones/:id',(peticion,respuesta)=>{
    pool.getConnection((err,connection) =>{
        const idPublicacion = peticion.params.id
        const email = peticion.query.email
        const contrasena = peticion.query.contrasena
        const consultaUsuario = `
            SELECT * FROM autores WHERE email = ${connection.escape(email)} AND contrasena = ${connection.escape(contrasena)}
        `
        connection.query(consultaUsuario, (err, filas, campos) =>{
            if(filas.length <= 0){
                respuesta.status(404)
                respuesta.json({error: "Usuario y/o contraseña incorrectos"})
            }
            else{
                const idAutor = filas[0].id
                const consultaPublicacion = `
                    SELECT * FROM publicacion WHERE autor_id = ${connection.escape(idAutor)}
                `
                connection.query(consultaPublicacion, (err,filas,campos) =>{
                    if(filas.length <= 0){
                        respuesta.status(404)
                        respuesta.json({error: "La publicacion no le pertenece al usuario"})
                    }
                    else{
                        const eliminar = `
                        DELETE
                        FROM
                        publicaciones
                        WHERE
                        id = ${connection.escape(idPublicacion)}
                        AND
                        autor_id = ${connection.escape(idAutor)} 
                        `
                        connection.query(eliminar,(err,filas,campos)=>{
                            respuesta.status(200)
                            res
                        })
                    }
                })
            }
        })
    })
})
module.exports = router