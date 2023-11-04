const express = require('express');
const mysql = require('mysql2/promise');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json());//se usa para recibir el json de las peticiones post

// Configuración de la conexión a la base de datos
const dbConfig = JSON.parse(fs.readFileSync('bdConection.json', 'utf8'));

let connection;

async function init() {
    connection = await mysql.createConnection(dbConfig);
    
    app.get('/api/items', async (req, res) => {
      try {
        // Realizar una consulta a la base de datos
        const [rows] = await connection.execute('SELECT * FROM tbl_productos');
        
        // Enviar los resultados como respuesta
        res.json(rows);
      } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Error al consultar la base de datos' });
      }
    });

    //TODO: HACER UN DELETE EN VEZ DE UN GET
    app.get('/api/items/delete/:id', async (req, res) => {
      const { id } = req.params;
      
      try {
        console.log(id);
        await connection.execute('DELETE FROM tbl_productos WHERE id_producto = ?', [id]);
        res.json({ success: true, message: 'Registro eliminado correctamente' });
      } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el registro' });
      }
    });

    app.get('/api/items/searchById/:id', async (req, res) => {
      const { id } = req.params;
      
      try {
        console.log(id);
        const [rows] = await connection.execute('select * FROM tbl_productos WHERE id_producto = ?', [id]);
        if(rows.length > 0){
          res.json(rows);
        }
        else{
          res.json({success: true, message: 'No existe el registro'});
        }
      } catch (error) {
        res.status(500).json({ error: 'Error al buscar registro' });
      }
    });
    
    app.get('/api/items/searchByBarCode/:code', async (req, res) => {
      const { code } = req.params;
      
      try {
        console.log(code);
        const [rows] = await connection.execute('select * FROM tbl_productos WHERE codigo_barras = ?', [code]);
        if(rows.length > 0){
          res.json(rows);
        }
        else{
          res.json({success: true, message: 'No existe el registro'});
        }
      } catch (error) {
        res.status(500).json({ error: 'Error al buscar registro' });
      }
    });

    app.post('/api/item/new', async (req, res) => {
      // Extraer los datos del cuerpo de la solicitud
      console.log(req.body)
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
    });    

    app.post('/api/item/updateById', async (req, res) => {
      // Extraer los datos del cuerpo de la solicitud
      console.log(req.body)
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
      console.log(id_producto)
      if(id_producto === null || id_producto == '' || id_producto <= 0 || id_producto === undefined){
        return res.status(201).json({ success: false, message: 'Id producto no proporcionado'});
      }
      try {
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
    });   

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
}

init();
