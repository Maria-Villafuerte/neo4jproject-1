import express from 'express';
import { getSession } from './neo4j-connection.js';

const router = express.Router();

router.post('/create/oneLabelNode', async (req, res) => {
    const session = getSession();
    const { labelA } = req.body;

    if (!labelA || typeof labelA !== 'string' || !/^[a-zA-Z0-9_]+$/.test(labelA)) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    try {
        const query = `
            CREATE (a:${labelA})
            RETURN a, ID(a) AS nodeId
        `;

        const result = await session.run(query);

        const record = result.records[0];
        if (!record) {
            return res.status(500).json({ error: 'No se pudo crear el nodo' });
        }

        const nodeId = record.get('nodeId').low; 

        res.json({ id: nodeId });
    } catch (error) {
        console.error('Error creando nodo con 1 label:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

router.post('/create/multiLabelNode', async (req, res) => {
    const session = getSession();
    const { labels } = req.body; 

    if (!Array.isArray(labels) || labels.length < 2 || !labels.every(label => /^[a-zA-Z0-9_]+$/.test(label))) {
        return res.status(400).json({ error: 'Se requieren al menos 2 labels válidas' });
    }

    try {
        const labelsString = labels.map(label => `\`${label}\``).join(':');

        const query = `
            CREATE (a:${labelsString})
            RETURN a, ID(a) AS nodeId
        `;

        const result = await session.run(query);

        const record = result.records[0];
        if (!record) {
            return res.status(500).json({ error: 'No se pudo crear el nodo' });
        }

        const nodeId = record.get('nodeId').low;
        res.json({ id: nodeId });
    } catch (error) {
        console.error('Error creando nodo con múltiples labels:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

router.post('/create/nodeWithProperties', async (req, res) => {
    const session = getSession();
    const { label, properties } = req.body;

    // Validar que el label es un string válido
    if (!label || typeof label !== 'string' || !/^[a-zA-Z0-9_]+$/.test(label)) {
        return res.status(400).json({ error: 'Label inválido' });
    }

    // Validar que hay al menos 5 propiedades
    if (!properties || typeof properties !== 'object' || Object.keys(properties).length < 5) {
        return res.status(400).json({ error: 'Se requieren al menos 5 propiedades' });
    }

    try {
        // Construir la consulta dinámicamente
        const propKeys = Object.keys(properties);
        const propParams = propKeys.map(key => `${key}: $${key}`).join(', ');

        const query = `
            CREATE (a:${label} { ${propParams} })
            RETURN a, ID(a) AS nodeId
        `;

        const result = await session.run(query, properties);

        const record = result.records[0];
        if (!record) {
            return res.status(500).json({ error: 'No se pudo crear el nodo' });
        }

        // Extraer ID de Neo4j
        const nodeId = record.get('nodeId').low; 

        res.json({ id: nodeId, node: record.get('a').properties });
    } catch (error) {
        console.error('Error creando nodo con propiedades:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

router.post('/create/multiLabelNodeWithProperties', async (req, res) => {
    const session = getSession();
    const { labels, properties } = req.body;

    // Validar que hay al menos 2 labels válidas
    if (!Array.isArray(labels) || labels.length < 2 || !labels.every(label => /^[a-zA-Z0-9_]+$/.test(label))) {
        return res.status(400).json({ error: 'Se requieren al menos 2 labels válidas' });
    }

    // Validar que hay al menos 5 propiedades
    if (!properties || typeof properties !== 'object' || Object.keys(properties).length < 5) {
        return res.status(400).json({ error: 'Se requieren al menos 5 propiedades' });
    }

    try {
        // Construir labels y propiedades dinámicamente
        const labelsString = labels.map(label => `\`${label}\``).join(':');
        const propKeys = Object.keys(properties);
        const propParams = propKeys.map(key => `${key}: $${key}`).join(', ');

        const query = `
            CREATE (a:${labelsString} { ${propParams} })
            RETURN a, ID(a) AS nodeId
        `;

        const result = await session.run(query, properties);

        const record = result.records[0];
        if (!record) {
            return res.status(500).json({ error: 'No se pudo crear el nodo' });
        }

        // Extraer ID de Neo4j
        const nodeId = record.get('nodeId').low;

        res.json({ id: nodeId, labels, node: record.get('a').properties });
    } catch (error) {
        console.error('Error creando nodo con múltiples labels y propiedades:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});


export default router;