import express from 'express';
import { getSession } from './neo4j-connection.js';
import transformProperties from './for_datatypes.js';

const router = express.Router();

/**
 * Operación que permite agregar 1 o más propiedades a una relación existente.
 * 
 * Identifica la relación mediante los nodos origen y destino (por etiqueta y propiedad)
 * y el tipo de relación. Luego agrega o actualiza las propiedades especificadas.
 * 
 * Ejemplo de uso:
 * {
 *   "sourceNode": {
 *     "label": "Persona",
 *     "property": {
 *       "key": "id",
 *       "value": 527
 *     }
 *   },
 *   "targetNode": {
 *     "label": "Establecimiento",
 *     "property": {
 *       "key": "id",
 *       "value": 2015
 *     }
 *   },
 *   "relationType": "RECURRE",
 *   "propertiesToAdd": {
 *     "frecuencia": "Semanal",
 *     "calificacion": 4.5
 *   }
 * }
 * 
 * El query de consulta se vería como:
 * MATCH (source:Persona)
 * WHERE source.id = 527 OR source.id = '527'
 * MATCH (target:Establecimiento) 
 * WHERE target.id = 2015 OR target.id = '2015'
 * MATCH (source)-[r:RECURRE]->(target)
 * SET r += $propertiesToAdd
 * RETURN source, r, target
 */
router.post('/add/relation/properties', async (req, res) => {
    const session = getSession();
    const { sourceNode, targetNode, relationType, propertiesToAdd } = req.body;

    // Validar que todos los datos requeridos estén presentes
    if (!sourceNode || !targetNode || !relationType || !propertiesToAdd) {
        return res.status(400).json({ error: 'Faltan datos requeridos: sourceNode, targetNode, relationType, propertiesToAdd' });
    }

    // Validar los nodos origen y destino
    if (!sourceNode.label || !sourceNode.property || !sourceNode.property.key || sourceNode.property.value === undefined) {
        return res.status(400).json({ error: 'El nodo origen debe tener label y property (key, value)' });
    }

    if (!targetNode.label || !targetNode.property || !targetNode.property.key || targetNode.property.value === undefined) {
        return res.status(400).json({ error: 'El nodo destino debe tener label y property (key, value)' });
    }

    // Transformar las propiedades para manejar tipos de datos especiales (como fechas)
    const transformedProperties = transformProperties(propertiesToAdd);

    try {
        // Construir la consulta Cypher
        const query = `
            MATCH (source:${sourceNode.label})
            WHERE source.${sourceNode.property.key} = $sourceValue OR source.${sourceNode.property.key} = $sourceValueStr
            MATCH (target:${targetNode.label}) 
            WHERE target.${targetNode.property.key} = $targetValue OR target.${targetNode.property.key} = $targetValueStr
            MATCH (source)-[r:${relationType}]->(target)
            SET r += $propertiesToAdd
            RETURN source, r, target
        `;

        // Preparar los parámetros para la consulta
        const params = {
            sourceValue: sourceNode.property.value,
            sourceValueStr: String(sourceNode.property.value),
            targetValue: targetNode.property.value,
            targetValueStr: String(targetNode.property.value),
            propertiesToAdd: transformedProperties
        };

        // Ejecutar la consulta
        const result = await session.run(query, params);

        // Verificar si se encontró y actualizó la relación
        if (result.records.length === 0) {
            return res.status(404).json({ 
                error: 'No se encontró ninguna relación que coincida con los criterios especificados',
                details: {
                    sourceNode: `${sourceNode.label} con ${sourceNode.property.key}=${sourceNode.property.value}`,
                    targetNode: `${targetNode.label} con ${targetNode.property.key}=${targetNode.property.value}`,
                    relationType
                }
            });
        }

        // Preparar la respuesta
        const response = result.records.map(record => ({
            sourceNode: record.get('source').properties,
            relationship: record.get('r').properties,
            targetNode: record.get('target').properties
        }));

        res.json({
            message: 'Propiedades de la relación actualizadas correctamente',
            updated: response
        });
    } catch (error) {
        console.error('Error actualizando propiedades de la relación:', error);
        res.status(500).json({ 
            error: 'Error en la base de datos',
            details: error.message
        });
    } finally {
        await session.close();
    }
});


export default router;