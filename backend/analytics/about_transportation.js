import express from 'express';
import { getSession } from '../neo4j-connection.js';

const router = express.Router();

/**
 * Este endpoint devuelve los 10 vehículos de transporte con mayor cantidad de viajes realizados en la cadena de suministros del supermercado. 
 * La información se obtiene analizando la relación entre los nodos Transporte y Sucursal/ Almancen.
 */
router.get('/analytics/transport', async (req, res) => {
    const session = getSession();

    try {
        const query = `
            MATCH (t:Transporte)-[r:ASIGNADO_A]->()
            RETURN t.placa AS placa, t.kilometraje AS kilometraje, r.cantidad_de_viajes AS cantidad_viajes
            ORDER BY cantidad_viajes DESC
            LIMIT 10;
        `;

        const result = await session.run(query);

        const transportes = result.records.map(record => ({
            placa: record.get('placa'),
            kilometraje: record.get('kilometraje'),  
            cantidad_viajes: record.get('cantidad_viajes')
        }));

        if (transportes.length === 0) {
            return res.status(404).json({ error: 'No se encontraron datos de transporte.' });
        }

        res.json(transportes);
    } catch (error) {
        console.error('Error obteniendo los datos de transporte:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

export default router;