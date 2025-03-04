import express from 'express';
import { getSession } from '../neo4j-connection.js';

const router = express.Router();

/**
 * Este endpoint devuelve estadísticas de clientes por región.
 * Para cada región, muestra la cantidad de clientes, cantidad de sucursales,
 * y la proporción de clientes por sucursal.
 * Los resultados están ordenados por la cantidad de clientes por sucursal en orden descendente.
 */
router.get('/analytics/clientes-por-region', async (req, res) => {
    const session = getSession();

    try {
        const query = `
            MATCH (c:Persona:Cliente)-[r:RECURRE]->(s:Sucursal)
            WITH s.estado AS region, count(DISTINCT c) AS clientes, count(DISTINCT s) AS sucursales
            RETURN region, clientes, sucursales, toFloat(clientes)/sucursales AS clientes_por_sucursal
            ORDER BY clientes_por_sucursal DESC
            LIMIT 10;
        `;

        const result = await session.run(query);

        const regiones = result.records.map(record => ({
            region: record.get('region'),
            clientes: record.get('clientes').toNumber(),
            sucursales: record.get('sucursales').toNumber(),
            clientes_por_sucursal: record.get('clientes_por_sucursal')
        }));

        if (regiones.length === 0) {
            return res.status(404).json({ error: 'No se encontraron datos de clientes por región.' });
        }

        res.json(regiones);
    } catch (error) {
        console.error('Error obteniendo los datos de clientes por región:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

export default router;