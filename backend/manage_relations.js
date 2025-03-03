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

/**
 * Operación que permite agregar propiedades a múltiples relaciones que cumplan ciertos criterios.
 * 
 * Identifica las relaciones mediante un tipo de relación y criterios de filtrado opcionales
 * para los nodos origen y destino.
 * 
 * Ejemplo de uso:
 * {
 *   "relationType": "RECURRE",
 *   "sourceFilter": {
 *     "label": "Persona",
 *     "property": {
 *       "key": "membresia",
 *       "value": true
 *     }
 *   },
 *   "targetFilter": {
 *     "label": "Establecimiento",
 *     "property": {
 *       "key": "categoria",
 *       "value": "Restaurante"
 *     }
 *   },
 *   "propertiesToAdd": {
 *     "descuento": 0.15,
 *     "actualizado_en": "2025-03-03"
 *   }
 * }
 */
router.post('/add/relations/properties', async (req, res) => {
    const session = getSession();
    const { relationType, sourceFilter, targetFilter, propertiesToAdd } = req.body;

    // Validar los datos requeridos
    if (!relationType || !propertiesToAdd) {
        return res.status(400).json({ error: 'Faltan datos requeridos: relationType, propertiesToAdd' });
    }

    // Transformar las propiedades para manejar tipos de datos especiales
    const transformedProperties = transformProperties(propertiesToAdd);

    try {
        // Construir la consulta base
        let query = 'MATCH ';
        const params = {
            propertiesToAdd: transformedProperties
        };

        // Añadir filtro para el nodo origen si está presente
        if (sourceFilter && sourceFilter.label) {
            query += `(source:${sourceFilter.label})`;
            
            // Añadir filtro de propiedad para el nodo origen si está completo
            if (sourceFilter.property && sourceFilter.property.key && sourceFilter.property.value !== undefined) {
                query += ` WHERE source.${sourceFilter.property.key} = $sourceValue OR source.${sourceFilter.property.key} = $sourceValueStr`;
                params.sourceValue = sourceFilter.property.value;
                params.sourceValueStr = String(sourceFilter.property.value);
            }
        } else {
            query += '(source)';
        }

        // Añadir la relación
        query += `-[r:${relationType}]->`;

        // Añadir filtro para el nodo destino si está presente
        if (targetFilter && targetFilter.label) {
            query += `(target:${targetFilter.label})`;
            
            // Añadir filtro de propiedad para el nodo destino si está completo
            if (targetFilter.property && targetFilter.property.key && targetFilter.property.value !== undefined) {
                // Si ya hay un WHERE para el nodo origen, usamos AND
                if (params.sourceValue !== undefined) {
                    query += ` AND target.${targetFilter.property.key} = $targetValue OR target.${targetFilter.property.key} = $targetValueStr`;
                } else {
                    query += ` WHERE target.${targetFilter.property.key} = $targetValue OR target.${targetFilter.property.key} = $targetValueStr`;
                }
                params.targetValue = targetFilter.property.value;
                params.targetValueStr = String(targetFilter.property.value);
            }
        } else {
            query += '(target)';
        }

        // Completar la consulta
        query += `
            SET r += $propertiesToAdd
            RETURN source, r, target
        `;

        // Ejecutar la consulta
        const result = await session.run(query, params);

        // Preparar la respuesta
        const updatedRelations = result.records.map(record => ({
            sourceNode: record.get('source').properties,
            relationship: record.get('r').properties,
            targetNode: record.get('target').properties
        }));

        if (updatedRelations.length === 0) {
            return res.status(404).json({
                message: 'No se encontraron relaciones que coincidan con los criterios especificados',
                details: {
                    relationType,
                    sourceFilter,
                    targetFilter
                }
            });
        }

        res.json({
            message: `Se actualizaron ${updatedRelations.length} relaciones correctamente`,
            count: updatedRelations.length,
            updated: updatedRelations
        });
    } catch (error) {
        console.error('Error actualizando múltiples relaciones:', error);
        res.status(500).json({
            error: 'Error en la base de datos',
            details: error.message
        });
    } finally {
        await session.close();
    }
});

export default router;