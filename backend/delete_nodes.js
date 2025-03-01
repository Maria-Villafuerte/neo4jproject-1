import express from 'express';
import { getSession } from './neo4j-connection.js';

const router = express.Router();

/**
 * Operación DELETE que elimina un nodo específico basado en su ID.
 * 
 * El nodo es identificado por su ID único (proporcionado en la URL) y luego es eliminado con la opción DETACH DELETE,
 * lo que también elimina cualquier relación conectada al nodo.
 * 
 * Usa como parámetro el ID del nodo que se desea eliminar.
 * 
 * El query de consulta se vería como:
 * MATCH (n)
 * WHERE ID(n) = $nodeId
 * DETACH DELETE n
 */
router.delete('/delete/node/:id', async (req, res) => {
    const session = getSession();
    const nodeId = parseInt(req.params.id, 10);

    if (isNaN(nodeId)) {
        return res.status(400).json({ error: 'ID inválido' });
    }

    try {
        const query = `
            MATCH (n)
            WHERE ID(n) = $nodeId
            DETACH DELETE n
        `;

        await session.run(query, { nodeId });

        res.json({ message: `Nodo con ID ${nodeId} eliminado correctamente` });
    } catch (error) {
        console.error('Error eliminando nodo:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

/**
 * Operación DELETE que elimina múltiples nodos basados en etiquetas y propiedades.
 * 
 * Los nodos que coincidan con las etiquetas y propiedades proporcionadas en el cuerpo de la solicitud serán eliminados.
 * Se utiliza DETACH DELETE para eliminar también las relaciones asociadas a los nodos.
 * 
 * Usa como parámetros las etiquetas de los nodos a eliminar y un objeto con las propiedades que deben coincidir para la eliminación.
 * 
 * El query de consulta se vería como:
 * MATCH (n:Label1:Label2)
 * WHERE n.property1 = $property1 AND n.property2 = $property2
 * DETACH DELETE n
 */
router.delete('/delete/multipleNodes', async (req, res) => {
    const session = getSession();
    const { labels, properties } = req.body;

    if (!Array.isArray(labels) || !labels.every(label => /^[a-zA-Z0-9_]+$/.test(label))) {
        return res.status(400).json({ error: 'Se requieren al menos labels validos' });
    }

    if (!properties || typeof properties !== 'object' || Object.keys(properties).length === 0) {
        return res.status(400).json({ error: 'Se requieren propiedades válidas' });
    }

    try {
        const labelsString = labels.map(label => `\`${label}\``).join(':');

        // Crear una cadena dinámica de las condiciones WHERE para las propiedades
        const propKeys = Object.keys(properties);
        const propConditions = propKeys.length === 1
            ? `n.${propKeys[0]} = $${propKeys[0]}`
            : propKeys.map(key => `n.${key} = $${key}`).join(' AND ');

        const query = `
            MATCH (n:${labelsString})
            WHERE ${propConditions}
            DETACH DELETE n
        `;

        await session.run(query, properties);

        res.json({ message: `Nodos con las propiedades ${JSON.stringify(properties)} eliminados correctamente` });
    } catch (error) {
        console.error('Error eliminando nodos por propiedades:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});


export default router;
