import express from 'express';
import { getSession } from './neo4j-connection.js';

const router = express.Router();

/**
 * Operación que realice consultas de nodos con base a determinados filtros
 * y se muestre la información de las propiedades de estos.
 * 
 * Permite buscar nodos según sus etiquetas y/o propiedades, devolviendo
 * todos los nodos que coincidan con los criterios especificados.
 * 
 * Usa como parámetros:
 * - labels (opcional): Array de etiquetas para filtrar (["Persona", "Cliente"])
 * - properties (opcional): Objeto con propiedades para filtrar ({nombre: "Juan", edad: 30})
 * - limit (opcional): Número máximo de nodos a devolver (default: 100)
 * 
 * El query de consulta se vería como:
 * MATCH (n:Label1:Label2)
 * WHERE n.prop1 = $prop1 AND n.prop2 = $prop2
 * RETURN n LIMIT $limit
 */
router.get('/view/nodesByFilter', async (req, res) => {
    const session = getSession();
    // Parse query parameters
    const labels = req.query.labels ? JSON.parse(req.query.labels) : null;
    const properties = req.query.properties ? JSON.parse(req.query.properties) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;

    
    // Validate limit
    const nodeLimit = parseInt(limit, 10);
    if (isNaN(nodeLimit) || nodeLimit <= 0) {
        return res.status(400).json({ error: 'Límite inválido' });
    }
    
    try {
        let query = 'MATCH (n';
        
        // Add labels if provided
        if (Array.isArray(labels) && labels.length > 0 && labels.every(label => /^[a-zA-Z0-9_]+$/.test(label))) {
            const labelsString = labels.map(label => `\`${label}\``).join(':');
            query += `:${labelsString}`;
        }
        
        query += ')';
        
        // Add WHERE clause if properties are provided
        if (properties && typeof properties === 'object' && Object.keys(properties).length > 0) {
            const propKeys = Object.keys(properties);
            if (propKeys.length > 0) {
                const propConditions = propKeys.map(key => `n.${key} = $${key}`).join(' AND ');
                query += ` WHERE ${propConditions}`;
            }
        }
        
        query += ` RETURN n, ID(n) AS nodeId, labels(n) AS nodeLabels LIMIT ${nodeLimit}`;
        
        const result = await session.run(query, properties || {});
        
        const nodes = result.records.map(record => ({
            id: record.get('nodeId').low,
            properties: record.get('n').properties,
            labels: record.get('nodeLabels')
        }));
        
        res.json({ nodes, count: nodes.length });
    } catch (error) {
        console.error('Error consultando nodos:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

export default router;