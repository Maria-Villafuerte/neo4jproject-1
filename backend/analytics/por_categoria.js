import express from 'express';
import { getSession } from '../neo4j-connection.js';

const router = express.Router();

/**
 * Este endpoint devuelve estadísticas de productos agrupados por categoría.
 * Para cada categoría, muestra la cantidad de productos y el precio promedio.
 * Los resultados están ordenados por la cantidad de productos en orden descendente.
 */
router.get('/analytics/productos-por-categoria', async (req, res) => {
    const session = getSession();

    try {
        const query = `
            MATCH (p:Producto)
            WITH p.categoria AS categoria, count(p) AS cantidad, avg(p.precio_unitario) AS precio_promedio
            RETURN categoria, cantidad, precio_promedio
            ORDER BY cantidad DESC;
        `;

        const result = await session.run(query);

        const categorias = result.records.map(record => ({
            categoria: record.get('categoria'),
            cantidad: record.get('cantidad').toNumber(), // Convertir a número si es un entero de Neo4j
            precio_promedio: record.get('precio_promedio')
        }));

        if (categorias.length === 0) {
            return res.status(404).json({ error: 'No se encontraron datos de categorías de productos.' });
        }

        res.json(categorias);
    } catch (error) {
        console.error('Error obteniendo los datos de categorías de productos:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

export default router;