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
router.get('/get/nodesByFilter', async (req, res) => {
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


/**
 * Operación que consulta un nodo específico por su ID.
 * 
 * Devuelve un único nodo con todas sus etiquetas y propiedades.
 * 
 * Usa como parámetros:
 * - id: ID del nodo a consultar
 * 
 * El query de consulta se vería como:
 * MATCH (n) WHERE ID(n) = $id RETURN n, ID(n) AS nodeId, labels(n) AS nodeLabels
 */
router.get('/get/singleNode', async (req, res) => {
    const session = getSession();
    const nodeId = req.query.id;
    
    // Validate nodeId
    if (!nodeId) {
        return res.status(400).json({ error: 'Se requiere el ID del nodo' });
    }
    
    try {
        const query = 'MATCH (n) WHERE ID(n) = $id RETURN n, ID(n) AS nodeId, labels(n) AS nodeLabels';
        
        const result = await session.run(query, { id: parseInt(nodeId, 10) });
        
        if (result.records.length === 0) {
            return res.status(404).json({ error: 'Nodo no encontrado' });
        }
        
        const record = result.records[0];
        const node = {
            id: record.get('nodeId').low,
            properties: record.get('n').properties,
            labels: record.get('nodeLabels')
        };
        
        res.json({ node });
    } catch (error) {
        console.error('Error consultando nodo:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

export default router;