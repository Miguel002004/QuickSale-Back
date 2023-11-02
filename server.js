const express = require('express');
const mysql = require('mysql2/promise');
const fs = require('fs');

const app = express();
const PORT = 3000;

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
    
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
}

init();
