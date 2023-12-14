const express = require('express');
const mysql = require('mysql2/promise');
const fs = require('fs');
const bcryptjs = require('bcryptjs');
const session = require('express-session');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(express.json());//se usa para recibir el json de las peticiones post
app.use(cors());
/*const corsOptions = {
  origin: 'http://localhost:8080', // Asegúrate de que esta es la URL de tu cliente Vue
};*/
//app.use(cors(corsOptions));
app.use(session({
   secret:'seretkey',
   resave: true,
   saveUninitialized: true
}));

// Configuración de la conexión a la base de datos
const dbConfig = JSON.parse(fs.readFileSync('bdConection.json', 'utf8'));

let connection;

async function init() {
    //connection = await mysql.createConnection(dbConfig);
    const pool = mysql.createPool(dbConfig);
    
    app.get('/api/login', async (req, res) => {
      const { user, password } = req.query;
      try {
        if(user && password){
          console.log({user:user, password:password});
          connection = await pool.getConnection();
          const [rows] = await connection.execute('SELECT * FROM tbl_usuarios WHERE nombre_usuario = ?', [user]);//Se obtiene el ultimo id de la tabla, por que no lo pude hacer autoincrementable
          if(rows.length < 1){
            return res.json({success:false, message:'Usuario o contraseña incorrectas'});
          }
          else if(!await bcryptjs.compare(password, rows[0].password)){
            return res.json({success:false, message:'Usuario o contraseña incorrectas'});
          }
          else{
            req.session.loggedin = true;
            req.session.name = rows[0].nombre_usuario;
            return res.json({success:true, message:'Login correcto', data:{user_name: rows[0].nombre_usuario}});
          }
        }
        else{
          return res.json({success:false, message:'No se puede iniciar sesion'});
        }
      } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Error al inicair sesion' });
      }
      finally{
        connection.release();
      }
    });
//TODO: COOMPROBAR QUE EL USUARIO NO EXSTA ANTES DE HACER EL REGISTRO
    app.get('/api/register', async (req, res) => {
      const { name, user, password, id_rol} = req.query;
      let connection;
      try {
        if(user && password && name && id_rol){
          const password_hash = await bcryptjs.hash(password, 8);
          connection = await pool.getConnection();
          const [user_result] = await connection.execute('SELECT * FROM tbl_usuarios WHERE nombre_usuario = ?',[user]);
          if(user_result.length > 0){
            return res.json({success:false, message:'El usario ya exite'});
          }
          const [rows] = await connection.execute('SELECT MAX(id_usuario) as last_user FROM tbl_usuarios');//Se obtiene el ultimo id de la tabla, por que no lo pude hacer autoincrementable
          let last_user = Number(rows[0].last_user)+1;
          console.log({
            id_usuario:last_user,
            name:name,
            user:user,
            password:password,
            id_rol:id_rol
          });
          const result = await connection.execute(`
            INSERT INTO tbl_usuarios (
              id_usuario,
              nombre,
              nombre_usuario,
              password,
              id_rol
            ) VALUES (?, ?, ?, ?, ?)`,
            [
              last_user,
              name,
              user,
              password_hash,
              id_rol
            ]
          );
          res.json({success:true, message:[{id_usuario:last_user, user:user, password:password, password_hash:password_hash}, {message:'Producto creado', id_usuario:last_user}]});
        }
        else{
          return res.json({success:false, message:'No se puede registrar el usuario'});
        }
      } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Error crear el registro' });
      }
      finally{
        connection.release();
      }
    });
    
    app.get('/api/itemsBySucursal/:id_sucursal', async (req, res) => {
      let connection;
      try {
        const { id_sucursal } = req.params;
        connection = await pool.getConnection();
        // Realizar una consulta a la base de datos
        const [rows] = await connection.execute('SELECT * FROM tbl_productos product, tbl_inventario inv WHERE inv.id_producto = product.id_producto AND inv.id_sucursal = ?', [id_sucursal]);
        
        if(rows.length > 0){
          res.json(rows);
        }
        else{
          res.json({success: true, message: 'No existen registros'});
        }
      } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Error al consultar la base de datos' });
      }
      if (connection) {
        console.log("conexion");
        connection.release();
      }
    });

    //TODO: HACER UN DELETE EN VEZ DE UN GET
    app.get('/api/items/delete/:id', async (req, res) => {
      const { id } = req.params;
      let connection;
      try {
        console.log(id);
        connection = await pool.getConnection();
        await connection.execute('DELETE FROM tbl_inventario WHERE id_producto = ?', [id]);
        res.json({ success: true, message: 'Registro eliminado correctamente' });
      } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el registro' });
      }
      finally{
        connection.release();
      }
    });

    app.get('/api/items/searchById', async (req, res) => {
      const { id_producto, id_sucursal } = req.query;
      console.log({id_producto:id_producto, id_sucursal:id_sucursal});
      let connection;
      try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT * FROM tbl_productos product, tbl_inventario inv WHERE inv.id_producto = product.id_producto AND product.id_producto = ? AND inv.id_sucursal = ?', [id_producto, id_sucursal]);
        if(rows.length > 0){
          res.json(rows);
        }
        else{
          res.json({success: true, message: 'No existe el registro'});
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al buscar registro' });
      }
      finally{
        if (connection) {
          connection.release();
        }
      }
    });
    
    app.get('/api/items/searchByBarCode', async (req, res) => {
      const { codigo_barras, id_sucursal } = req.query;
      console.log({codigo_barras:codigo_barras, id_sucursal:id_sucursal});
      let connection;
      try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute(`SELECT 
        product.id_producto,
        codigo_barras,
        imagen,
        nombre_producto,
        precio_venta,
        cantidad_stock
        FROM tbl_productos product, tbl_inventario inv WHERE inv.id_producto = product.id_producto AND product.codigo_barras = ? AND inv.id_sucursal = ? LIMIT 1`, [codigo_barras, id_sucursal]);
        if(rows.length > 0){
          res.json({success: true, result: rows});
        }
        else{
          res.json({success: false, message: 'Producto no encontrado'});
        }
      } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Error al buscar Producto' });
      }
      finally{
        connection.release();
      }
    });

    app.post('/api/item/new', async (req, res) => {
      // Extraer los datos del cuerpo de la solicitud
      console.log(req.body);
      let connection;
      const {
        codigo_barras,
        nombre_producto,
        descripcion,
        precio_compra,
        precio_venta,
        cantidad_stock,
        cantidad_minima,
        cantidad_maxima,
        fecha_caducidad,
        imagen,
        id_categoria,
        iva
      } = req.body;
    
      try {
        connection = await pool.getConnection();
        // Crear el nuevo registro en la base de datos
        const result = await connection.execute(`
          INSERT INTO tbl_productos (
            codigo_barras,
            nombre_producto,
            descripcion,
            precio_compra,
            precio_venta,
            cantidad_stock,
            cantidad_minima,
            cantidad_maxima,
            fecha_caducidad,
            imagen,
            id_categoria,
            iva
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            codigo_barras,
            nombre_producto,
            descripcion,
            precio_compra,
            precio_venta,
            cantidad_stock,
            cantidad_minima,
            cantidad_maxima,
            fecha_caducidad,
            imagen,
            id_categoria,
            iva
          ]
        );
    
        // Envía una respuesta de éxito con el ID del nuevo producto
        res.status(201).json({ success: true, message: 'Producto creado', id_producto: result[0].insertId });
        console.log(codigo_barras);
      } catch (error) {
        // Si hay un error, envía una respuesta de error
        console.log(error);
        res.status(500).json({ error: 'Error al crear el producto' });
      }
      finally{
        connection.release();
      }
    });    

    app.post('/api/item/updateById', async (req, res) => {
      // Extraer los datos del cuerpo de la solicitud
      console.log(req.body);
      let connection;
      const {
        id_producto,
        codigo_barras,
        nombre_producto,
        descripcion,
        precio_compra,
        precio_venta,
        cantidad_stock,
        cantidad_minima,
        cantidad_maxima,
        fecha_caducidad,
        imagen,
        id_categoria,
        iva
      } = req.body;
      console.log(id_producto);
      if(id_producto === null || id_producto == '' || id_producto <= 0 || id_producto === undefined){
        return res.status(201).json({ success: false, message: 'Id producto no proporcionado'});
      }
      try {
        connection = await pool.getConnection();
        // Crear el nuevo registro en la base de datos
        const result = await connection.execute(`
          UPDATE tbl_productos set
            codigo_barras = ?,
            nombre_producto = ?,
            descripcion = ?,
            precio_compra = ?,
            precio_venta = ?,
            cantidad_stock = ?,
            cantidad_minima = ?,
            cantidad_maxima = ?,
            fecha_caducidad = ?,
            imagen = ?,
            id_categoria = ?,
            iva = ?
            where id_producto = ? 
            `,
          [
            codigo_barras,
            nombre_producto,
            descripcion,
            precio_compra,
            precio_venta,
            cantidad_stock,
            cantidad_minima,
            cantidad_maxima,
            fecha_caducidad,
            imagen,
            id_categoria,
            iva,
            id_producto
          ]
        );
    
        // Envía una respuesta de éxito con el ID del nuevo producto
        res.status(201).json({ success: true, message: 'Producto actualizado correctamente'});
        console.log(codigo_barras);
      } catch (error) {
        // Si hay un error, envía una respuesta de error
        console.log(error);
        res.status(500).json({ error: 'Error al actualizar el producto' });
      }
      finally{
        connection.release();
      }
    });   

    app.get('/api/roles', async (req, res) => {
      let connection;
      try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT ID_ROL, ROL FROM tbl_roles');
        if(rows.length > 0){
          res.json({success: true, result: rows});
        }
        else{
          res.json({success: false, message: 'No existe el registro'});
        }
      } catch (error) {
        res.status(500).json({ error: 'Error al buscar registro' });
      }
      finally{
        connection.release();
      }
    });

     //TODO: HACER UN DELETE EN VEZ DE UN GET
     app.get('/api/user/delete/:id', async (req, res) => {
      const { id } = req.params;
      let connection;
      try {
        console.log(id);
        connection = await pool.getConnection();
        await connection.execute('DELETE FROM tbl_usuarios WHERE id_usuario = ?', [id]);
        res.json({ success: true, message: 'Registro eliminado correctamente' });
      } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el registro' });
      }
      finally{
        connection.release();
      }
    });

    app.get('/', async (req, res) => {
      if(req.session.loggedin){
        res.json({success: true, message: 'Bienvenido '+req.session.name});
      }
      else{
        res.json({success: true, message: 'Por favor inicia sesion'});
      }
    });

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
}

init();
