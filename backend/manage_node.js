import express from 'express';
import { getSession } from './neo4j-connection.js';
import transformProperties from './for_datatypes.js';

const router = express.Router();

// Operación que permita agregar 1 o más propiedades a un nodo
// Operación que permita realizar la actualización de 1 o más propiedades de un nodo
router.post('/add/node/properties', async (req, res) => {
    const session = getSession();
    const { labelN, keyProperty, propertiesToAdd } = req.body;

    if (!labelN || !keyProperty || !propertiesToAdd) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    try {
        const key = Object.keys(keyProperty)[0]; // Obtener la clave primaria
        const keyValue = keyProperty[key]; // Obtener su valor
        const properties = transformProperties(propertiesToAdd);
        
        const query = `
            MATCH (a:${labelN} {${key}: $keyValue})
            SET a += $properties
            RETURN a
        `;

        const result = await session.run(query, {
            keyValue,
            properties
        });

        const response = result.records.map(record => ({
            updatedNode: record.get('a').properties
        }));

        res.json(response);
    } catch (error) {
        console.error('Error actualizando nodo:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

// Operación que permita agregar 1 o más propiedades a múltiples nodos al mismo tiempo
// Operación que permita realizar la actualización de 1 o más propiedades de múltiples nodos al mismo tiempo
router.post('/add/nodes/properties', async (req, res) => {
    const session = getSession();
    const { labelN, keyProperties, propertiesToAdd } = req.body;

    if (!labelN || !Array.isArray(keyProperties) || keyProperties.length === 0 || !propertiesToAdd) {
        return res.status(400).json({ error: 'Faltan datos requeridos o formato incorrecto' });
    }

    try {
        const key = Object.keys(keyProperties[0])[0]; // Obtener la clave primaria (asumiendo que es la misma en todos)
        const properties = transformProperties(propertiesToAdd);

        const query = `
            UNWIND $keyProperties AS keyData
            MATCH (a:${labelN} {${key}: keyData.${key}})
            SET a += $properties
            RETURN a
        `;

        const result = await session.run(query, {
            keyProperties,
            properties
        });

        const response = result.records.map(record => ({
            updatedNode: record.get('a').properties
        }));

        res.json(response);
    } catch (error) {
        console.error('Error actualizando nodos:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

router.post('/add/nodes/propertiesVariation', async (req, res) => {
    const session = getSession();
    const { nodes } = req.body;

    if (!Array.isArray(nodes) || nodes.length === 0) {
        return res.status(400).json({ error: 'El array nodes está vacío o no es válido' });
    }    

    try {
        nodes.forEach(node => {
            node.propertiesToUpdate = transformProperties(node.propertiesToUpdate)
        });

        const query = `
            UNWIND $nodes AS nodeData
            MATCH (n {id: nodeData.keyProperties.id})  
            WHERE labels(n) = nodeData.labels
            SET n += nodeData.propertiesToUpdate  
            RETURN n
        `;

        const result = await session.run(query, {
            nodes
        });

        const response = result.records.map(record => ({
            updatedNode: record.get('n').properties
        }));

        res.json(response);
    } catch (error) {
        console.error('Error actualizando nodos:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

// Operación que permita eliminar 1 o mas propiedades de un nodo
router.post('/delete/node/properties', async (req, res) => {
    const session = getSession();
    const { labelN, keyProperty, propertiesToRemove } = req.body;

    if (!labelN || !keyProperty || !propertiesToRemove || !Array.isArray(propertiesToRemove)) {
        return res.status(400).json({ error: 'Faltan datos requeridos o el formato es incorrecto' });
    }

    try {
        const key = Object.keys(keyProperty)[0]; // Clave primaria
        const keyValue = keyProperty[key]; // Valor de la clave

        // Construir dinámicamente la lista de propiedades a eliminar
        const removeQuery = propertiesToRemove.map(prop => `a.${prop}`).join(', ');

        const query = `
            MATCH (a:${labelN} {${key}: $keyValue})
            REMOVE ${removeQuery}
            RETURN a
        `;

        const result = await session.run(query, { keyValue });

        const response = result.records.map(record => ({
            updatedNode: record.get('a').properties
        }));

        res.json(response);
    } catch (error) {
        console.error('Error eliminando propiedades del nodo:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

// Operación que permita eliminar 1 o más propiedades de múltiples nodos al mismo tiempo 10
router.post('/delete/nodes/properties', async (req, res) => {
    const session = getSession();
    const { labelN, keyProperties, propertiesToRemove } = req.body;

    if (!labelN || !keyProperties || !Array.isArray(keyProperties) || keyProperties.length === 0 || !propertiesToRemove || !Array.isArray(propertiesToRemove)) {
        return res.status(400).json({ error: 'Faltan datos requeridos o el formato es incorrecto' });
    }

    try {
        // Construir la lista de propiedades a eliminar dinámicamente
        const removeQuery = propertiesToRemove.map(prop => `a.${prop}`).join(', ');

        const query = `
            UNWIND $keyProperties AS keyProp
            MATCH (a:${labelN}) 
            WHERE all(k IN keys(keyProp) WHERE a[k] = keyProp[k])
            REMOVE ${removeQuery}
            RETURN a
        `;

        const result = await session.run(query, { keyProperties });

        const response = result.records.map(record => ({
            updatedNode: record.get('a').properties
        }));

        res.json(response);
    } catch (error) {
        console.error('Error eliminando propiedades de los nodos:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

router.post('/delete/nodes/propertiesVariation', async (req, res) => {
    const session = getSession();
    const { nodes } = req.body;

    if (!Array.isArray(nodes) || nodes.length === 0) {
        return res.status(400).json({ error: 'El array nodes está vacío o no es válido' });
    }  

    try {
        const query = `
            UNWIND $nodes AS nodeData
            MATCH (n {id: nodeData.keyProperties.id})
            WHERE labels(n) = nodeData.labels
            FOREACH (prop IN nodeData.propertiesToRemove | REMOVE n[prop])
            RETURN n
        `;

        const result = await session.run(query, { nodes });

        const response = result.records.map(record => ({
            updatedNode: record.get('n').properties
        }));

        res.json(response);
    } catch (error) {
        console.error('Error eliminando propiedades de los nodos:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

export default router;