import express, { json } from 'express';
import cors from 'cors';
import { getSession } from './neo4j-connection.js';

const app = express();
app.use(cors());
app.use(json());

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

        const query = `
            MATCH (a:${labelN} {${key}: $keyValue})
            SET a += $propertiesToAdd
            RETURN a
        `;

        const result = await session.run(query, {
            keyValue,
            propertiesToAdd
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

        const query = `
            UNWIND $keyProperties AS keyData
            MATCH (a:${labelN} {${key}: keyData.${key}})
            SET a += $propertiesToAdd
            RETURN a
        `;

        const result = await session.run(query, {
            keyProperties,
            propertiesToAdd
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
