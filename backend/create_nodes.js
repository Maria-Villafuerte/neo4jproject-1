import express from 'express';
import { getSession } from './neo4j-connection.js';

const router = express.Router();

/**
 * Operación CREATE que crea un nodo con una sola etiqueta.
 * 
 * El nodo será creado con una etiqueta única sin propiedades adicionales. La consulta simplemente creará el nodo con la etiqueta proporcionada.
 * 
 * Usa como parámetro la etiqueta del nodo, pero no se requieren propiedades.
 * 
 * El query de consulta se vería como:
 * CREATE (n:Label)
 */
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

/**
 * Operación CREATE que crea un nodo con múltiples etiquetas.
 * 
 * El nodo será creado con varias etiquetas proporcionadas en el cuerpo de la solicitud, sin necesidad de propiedades adicionales.
 * 
 * Usa como parámetro un arreglo de etiquetas del nodo, pero no se requieren propiedades.
 * 
 * El query de consulta se vería como:
 * CREATE (n:Label1:Label2)
 **/
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

/**
 * Operación CREATE que crea un nodo con una sola etiqueta y propiedades específicas.
 * 
 * El nodo será creado con una etiqueta única y un conjunto de propiedades proporcionadas en el cuerpo de la solicitud.
 * La consulta verificará si el nodo ya existe; si no, lo creará con los valores indicados.
 * 
 * Usa como parámetro la etiqueta del nodo y las propiedades que debe tener (al menos 5 propiedades).
 * 
 * El query de consulta se vería como:
 * CREATE (n:Label {property1: value1, property2: value2, property3: value3, ..., property5: value5})
 */
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
        // Obtener la cantidad de nodos existentes con la etiqueta dada
        const countQuery = `
            MATCH (n:${label})
            RETURN COUNT(n) AS count
        `;

        const countResult = await session.run(countQuery);
        const count = countResult.records[0]?.get('count').toNumber() || 0;

        // Incluir la propiedad `id` como string
        const nodeProperties = { ...properties, id: (count + 1).toString() };

        // Construir la consulta dinámicamente con las propiedades
        const propKeys = Object.keys(nodeProperties);
        const propParams = propKeys.map(key => `${key}: $${key}`).join(', ');

        const query = `
            CREATE (a:${label} { ${propParams} })
            RETURN a, ID(a) AS nodeId
        `;

        const result = await session.run(query, nodeProperties);

        const record = result.records[0];
        if (!record) {
            return res.status(500).json({ error: 'No se pudo crear el nodo' });
        }

        // Extraer ID de Neo4j
        const nodeId = record.get('nodeId').low;

        res.json({ id: nodeId.toString(), node: record.get('a').properties });
    } catch (error) {
        console.error('Error creando nodo con propiedades:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});



/**
 * Operación CREATE que crea un nodo con múltiples etiquetas y propiedades específicas.
 * 
 * El nodo será creado con múltiples etiquetas y un conjunto de propiedades proporcionadas en el cuerpo de la solicitud.
 * Se asegura de que al menos 5 propiedades sean definidas para el nodo.
 * 
 * Usa como parámetros las etiquetas del nodo y las propiedades que debe tener (al menos 5 propiedades).
 * 
 * El query de consulta se vería como:
 * CREATE (n:Label1:Label2 {property1: value1, property2: value2, property3: value3, ..., property5: value5})
 */
router.post('/create/multiLabelNodeWithProperties', async (req, res) => {
    const session = getSession();
    const { labels, properties } = req.body;

    console.log(labels) // Validar que hay al menos 2 labels válidas
    if (!Array.isArray(labels) || labels.length < 2 || !labels.every(label => /^[a-zA-Z0-9_]+$/.test(label))) {
        return res.status(400).json({ error: 'Se requieren al menos 2 labels válidas' });
    }

    // Validar que hay al menos 5 propiedades
    if (!properties || typeof properties !== 'object' || Object.keys(properties).length < 5) {
        return res.status(400).json({ error: 'Se requieren al menos 5 propiedades' });
    }

    try {
        const countClientesQuery = `MATCH (n:Cliente) RETURN COUNT(n) AS count`;
        const countPersonalQuery = `MATCH (n:Personal) RETURN COUNT(n) AS count`;
        const countPersonaQuery = `MATCH (n:Persona) RETURN COUNT(n) AS count`;

        const countResultC = await session.run(countClientesQuery);
        const countResultP = await session.run(countPersonalQuery);
        const countResultPP = await session.run(countPersonaQuery);

        const countC = countResultC.records[0]?.get('count').toNumber() || 0;
        const countP = countResultP.records[0]?.get('count').toNumber() || 0;
        const countPP = countResultP.records[0]?.get('count').toNumber() || 0;

        // Determinar qué tipo de ID asignar según las labels
        let nodeProperties = { ...properties };

        if (labels.includes("Persona")) {
            nodeProperties.id = (countPP + 1).toString();
        } 
        if (labels.includes("Cliente")) {
            nodeProperties.id_cliente = (countC + 1).toString();
        } 
        if (labels.includes("Personal")) {
            nodeProperties.id_empleado = (countP + 1).toString();
        }

        // Construir labels y propiedades dinámicamente
        const labelsString = labels.map(label => `\`${label}\``).join(':');
        const propKeys = Object.keys(nodeProperties);
        const propParams = propKeys.map(key => `${key}: $${key}`).join(', ');

        const query = `
            CREATE (a:${labelsString} { ${propParams} })
            RETURN a, ID(a) AS nodeId
        `;

        const result = await session.run(query, nodeProperties);

        const record = result.records[0];
        if (!record) {
            return res.status(500).json({ error: 'No se pudo crear el nodo' });
        }

        // Extraer ID de Neo4j
        const nodeId = record.get('nodeId').low;

        res.json({ id: nodeId.toString(), labels, node: record.get('a').properties });
    } catch (error) {
        console.error('Error creando nodo con múltiples labels y propiedades:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});


export default router;