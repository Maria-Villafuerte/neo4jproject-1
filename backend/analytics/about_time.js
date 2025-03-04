import express from 'express';
import { getSession } from '../neo4j-connection.js';

const router = express.Router();

/**
 * Este endpoint obtiene los días y horarios con mayor número de visitas en cada sucursal. La información se basa en la relación RECURRE de los 
 * clientes (Cliente) con las sucursales (Sucursal), analizando los atributos dia_preferido y hora_preferida.
 */
router.get('/analytics/favoriteTime', async (req, res) => {
    const session = getSession();  

    try {
        const query = `
            MATCH (c:Cliente)-[r:RECURRE]->(s:Sucursal)
            RETURN s.nombre AS sucursal, 
                   r.dia_preferido AS dia, 
                   r.hora_preferida AS hora, 
                   COUNT(c) AS frecuencia_visitas
            ORDER BY frecuencia_visitas DESC;
        `;

        const result = await session.run(query);

        const horariosFavoritos = result.records.map(record => ({
            sucursal: record.get('sucursal'),
            dia: record.get('dia'),
            hora: record.get('hora'),
            frecuencia_visitas: record.get('frecuencia_visitas').toNumber()
        }));

        if (horariosFavoritos.length === 0) {
            return res.status(404).json({ error: 'No se encontraron datos de horarios de visita preferidos.' });
        }

        res.json(horariosFavoritos);
    } catch (error) {
        console.error('Error obteniendo los horarios de visita:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

export default router;