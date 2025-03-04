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
 * Operación que permite agregar 1 o más propiedades a múltiples relaciones al mismo tiempo.
 * 
 * Recibe un array de relaciones, cada una identificada por nodo origen, nodo destino y tipo de relación.
 * Aplica las mismas propiedades a todas las relaciones especificadas.
 * 
 */
router.post('/add/group/relations/properties', async (req, res) => {
    const session = getSession();
    const { relationships, propertiesToAdd } = req.body;

    // Validar parámetros
    if (!Array.isArray(relationships) || relationships.length === 0 || !propertiesToAdd) {
        return res.status(400).json({ error: 'Se requiere un array de relaciones y propiedades para agregar' });
    }

    // Validar que cada relación tenga los datos necesarios
    for (const rel of relationships) {
        const { sourceNode, targetNode, relationType } = rel;
        
        if (!sourceNode || !targetNode || !relationType) {
            return res.status(400).json({ 
                error: 'Cada relación debe especificar sourceNode, targetNode y relationType',
                invalidRelation: rel
            });
        }
        
        if (!sourceNode.label || !sourceNode.property || !sourceNode.property.key || sourceNode.property.value === undefined) {
            return res.status(400).json({ 
                error: 'El nodo origen debe tener label y property (key, value)',
                invalidSourceNode: sourceNode
            });
        }
        
        if (!targetNode.label || !targetNode.property || !targetNode.property.key || targetNode.property.value === undefined) {
            return res.status(400).json({ 
                error: 'El nodo destino debe tener label y property (key, value)',
                invalidTargetNode: targetNode
            });
        }
    }

    // Transformar las propiedades
    const transformedProperties = transformProperties(propertiesToAdd);

    try {
        // Preparar el array de resultados
        const results = [];
        
        // Procesar cada relación secuencialmente
        for (const rel of relationships) {
            const { sourceNode, targetNode, relationType } = rel;
            
            const query = `
                MATCH (source:${sourceNode.label})
                WHERE source.${sourceNode.property.key} = $sourceValue OR source.${sourceNode.property.key} = $sourceValueStr
                MATCH (target:${targetNode.label}) 
                WHERE target.${targetNode.property.key} = $targetValue OR target.${targetNode.property.key} = $targetValueStr
                MATCH (source)-[r:${relationType}]->(target)
                SET r += $propertiesToAdd
                RETURN source, r, target
            `;
            
            const params = {
                sourceValue: sourceNode.property.value,
                sourceValueStr: String(sourceNode.property.value),
                targetValue: targetNode.property.value,
                targetValueStr: String(targetNode.property.value),
                propertiesToAdd: transformedProperties
            };
            
            const result = await session.run(query, params);
            
            if (result.records.length > 0) {
                results.push({
                    sourceNode: {
                        label: sourceNode.label,
                        property: sourceNode.property,
                        data: result.records[0].get('source').properties
                    },
                    targetNode: {
                        label: targetNode.label,
                        property: targetNode.property,
                        data: result.records[0].get('target').properties
                    },
                    relationType,
                    relationship: result.records[0].get('r').properties,
                    status: 'updated'
                });
            } else {
                results.push({
                    sourceNode: {
                        label: sourceNode.label,
                        property: sourceNode.property
                    },
                    targetNode: {
                        label: targetNode.label,
                        property: targetNode.property
                    },
                    relationType,
                    status: 'not_found'
                });
            }
        }
        
        res.json({
            message: 'Operación completada',
            results,
            totalUpdated: results.filter(r => r.status === 'updated').length,
            totalNotFound: results.filter(r => r.status === 'not_found').length
        });
    } catch (error) {
        console.error('Error actualizando propiedades de múltiples relaciones:', error);
        res.status(500).json({ 
            error: 'Error en la base de datos',
            details: error.message
        });
    } finally {
        await session.close();
    }
});

/**
 * Operación que permite realizar la actualización de 1 o más propiedades de la relación.
 * 
 * Este endpoint es similar a '/add/relation/properties', pero se proporciona por consistencia
 * con las operaciones de nodos. Actualiza las propiedades existentes o agrega nuevas si no existen.
 * 
 */
router.post('/update/relation/properties', async (req, res) => {
    const session = getSession();
    const { sourceNode, targetNode, relationType, propertiesToUpdate } = req.body;

    // Validar que todos los datos requeridos estén presentes
    if (!sourceNode || !targetNode || !relationType || !propertiesToUpdate) {
        return res.status(400).json({ error: 'Faltan datos requeridos: sourceNode, targetNode, relationType, propertiesToUpdate' });
    }

    // Validar los nodos origen y destino
    if (!sourceNode.label || !sourceNode.property || !sourceNode.property.key || sourceNode.property.value === undefined) {
        return res.status(400).json({ error: 'El nodo origen debe tener label y property (key, value)' });
    }

    if (!targetNode.label || !targetNode.property || !targetNode.property.key || targetNode.property.value === undefined) {
        return res.status(400).json({ error: 'El nodo destino debe tener label y property (key, value)' });
    }

    // Transformar las propiedades para manejar tipos de datos especiales (como fechas)
    const transformedProperties = transformProperties(propertiesToUpdate);

    try {
        // Construir la consulta Cypher
        const query = `
            MATCH (source:${sourceNode.label})
            WHERE source.${sourceNode.property.key} = $sourceValue OR source.${sourceNode.property.key} = $sourceValueStr
            MATCH (target:${targetNode.label}) 
            WHERE target.${targetNode.property.key} = $targetValue OR target.${targetNode.property.key} = $targetValueStr
            MATCH (source)-[r:${relationType}]->(target)
            SET r += $propertiesToUpdate
            RETURN source, r, target
        `;

        // Preparar los parámetros para la consulta
        const params = {
            sourceValue: sourceNode.property.value,
            sourceValueStr: String(sourceNode.property.value),
            targetValue: targetNode.property.value,
            targetValueStr: String(targetNode.property.value),
            propertiesToUpdate: transformedProperties
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
 * Operación que permite realizar la actualización de 1 o más propiedades de múltiples relaciones al mismo tiempo.
 * 
 * Este endpoint es similar a '/add/relations/properties', pero se proporciona por consistencia
 * con las operaciones de nodos.
 */
router.post('/update/group/relations/properties', async (req, res) => {
    const session = getSession();
    const { relationships, propertiesToUpdate } = req.body;

    // Validar parámetros
    if (!Array.isArray(relationships) || relationships.length === 0 || !propertiesToUpdate) {
        return res.status(400).json({ error: 'Se requiere un array de relaciones y propiedades para actualizar' });
    }

    // Validar que cada relación tenga los datos necesarios
    for (const rel of relationships) {
        const { sourceNode, targetNode, relationType } = rel;
        
        if (!sourceNode || !targetNode || !relationType) {
            return res.status(400).json({ 
                error: 'Cada relación debe especificar sourceNode, targetNode y relationType',
                invalidRelation: rel
            });
        }
        
        if (!sourceNode.label || !sourceNode.property || !sourceNode.property.key || sourceNode.property.value === undefined) {
            return res.status(400).json({ 
                error: 'El nodo origen debe tener label y property (key, value)',
                invalidSourceNode: sourceNode
            });
        }
        
        if (!targetNode.label || !targetNode.property || !targetNode.property.key || targetNode.property.value === undefined) {
            return res.status(400).json({ 
                error: 'El nodo destino debe tener label y property (key, value)',
                invalidTargetNode: targetNode
            });
        }
    }

    // Transformar las propiedades
    const transformedProperties = transformProperties(propertiesToUpdate);

    try {
        // Preparar el array de resultados
        const results = [];
        
        // Procesar cada relación secuencialmente
        for (const rel of relationships) {
            const { sourceNode, targetNode, relationType } = rel;
            
            const query = `
                MATCH (source:${sourceNode.label})
                WHERE source.${sourceNode.property.key} = $sourceValue OR source.${sourceNode.property.key} = $sourceValueStr
                MATCH (target:${targetNode.label}) 
                WHERE target.${targetNode.property.key} = $targetValue OR target.${targetNode.property.key} = $targetValueStr
                MATCH (source)-[r:${relationType}]->(target)
                SET r += $propertiesToUpdate
                RETURN source, r, target
            `;
            
            const params = {
                sourceValue: sourceNode.property.value,
                sourceValueStr: String(sourceNode.property.value),
                targetValue: targetNode.property.value,
                targetValueStr: String(targetNode.property.value),
                propertiesToUpdate: transformedProperties
            };
            
            const result = await session.run(query, params);
            
            if (result.records.length > 0) {
                results.push({
                    sourceNode: {
                        label: sourceNode.label,
                        property: sourceNode.property,
                        data: result.records[0].get('source').properties
                    },
                    targetNode: {
                        label: targetNode.label,
                        property: targetNode.property,
                        data: result.records[0].get('target').properties
                    },
                    relationType,
                    relationship: result.records[0].get('r').properties,
                    status: 'updated'
                });
            } else {
                results.push({
                    sourceNode: {
                        label: sourceNode.label,
                        property: sourceNode.property
                    },
                    targetNode: {
                        label: targetNode.label,
                        property: targetNode.property
                    },
                    relationType,
                    status: 'not_found'
                });
            }
        }
        
        res.json({
            message: 'Operación completada',
            results,
            totalUpdated: results.filter(r => r.status === 'updated').length,
            totalNotFound: results.filter(r => r.status === 'not_found').length
        });
    } catch (error) {
        console.error('Error actualizando propiedades de múltiples relaciones:', error);
        res.status(500).json({ 
            error: 'Error en la base de datos',
            details: error.message
        });
    } finally {
        await session.close();
    }
});

/**
 * Operación que permita eliminar 1 o más propiedades de una relación.
 * 
 * Elimina las propiedades especificadas de una relación identificada por
 * nodo origen, nodo destino y tipo de relación.
 */
router.post('/delete/relation/properties', async (req, res) => {
    const session = getSession();
    const { sourceNode, targetNode, relationType, propertiesToRemove } = req.body;

    // Validar que todos los datos requeridos estén presentes
    if (!sourceNode || !targetNode || !relationType || !propertiesToRemove || !Array.isArray(propertiesToRemove)) {
        return res.status(400).json({ error: 'Faltan datos requeridos o formato incorrecto' });
    }

    // Validar los nodos origen y destino
    if (!sourceNode.label || !sourceNode.property || !sourceNode.property.key || sourceNode.property.value === undefined) {
        return res.status(400).json({ error: 'El nodo origen debe tener label y property (key, value)' });
    }

    if (!targetNode.label || !targetNode.property || !targetNode.property.key || targetNode.property.value === undefined) {
        return res.status(400).json({ error: 'El nodo destino debe tener label y property (key, value)' });
    }

    try {
        // Construir dinámicamente la lista de propiedades a eliminar
        const removeQuery = propertiesToRemove.map(prop => `r.${prop}`).join(', ');

        // Construir la consulta Cypher
        const query = `
            MATCH (source:${sourceNode.label})
            WHERE source.${sourceNode.property.key} = $sourceValue OR source.${sourceNode.property.key} = $sourceValueStr
            MATCH (target:${targetNode.label}) 
            WHERE target.${targetNode.property.key} = $targetValue OR target.${targetNode.property.key} = $targetValueStr
            MATCH (source)-[r:${relationType}]->(target)
            REMOVE ${removeQuery}
            RETURN source, r, target
        `;

        // Preparar los parámetros para la consulta
        const params = {
            sourceValue: sourceNode.property.value,
            sourceValueStr: String(sourceNode.property.value),
            targetValue: targetNode.property.value,
            targetValueStr: String(targetNode.property.value)
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
            message: 'Propiedades de la relación eliminadas correctamente',
            updated: response,
            propertiesRemoved: propertiesToRemove
        });
    } catch (error) {
        console.error('Error eliminando propiedades de la relación:', error);
        res.status(500).json({ 
            error: 'Error en la base de datos',
            details: error.message
        });
    } finally {
        await session.close();
    }
});

/**
 * Operación que permite eliminar 1 o más propiedades de múltiples relaciones al mismo tiempo.
 * 
 * Elimina las propiedades especificadas de múltiples relaciones identificadas por
 * nodo origen, nodo destino y tipo de relación.
 */
router.post('/delete/group/relations/properties', async (req, res) => {
    const session = getSession();
    const { relationships, propertiesToRemove } = req.body;

    // Validar parámetros
    if (!Array.isArray(relationships) || relationships.length === 0 || !propertiesToRemove || !Array.isArray(propertiesToRemove)) {
        return res.status(400).json({ error: 'Se requiere un array de relaciones y propiedades para eliminar' });
    }

    // Validar que cada relación tenga los datos necesarios
    for (const rel of relationships) {
        const { sourceNode, targetNode, relationType } = rel;
        
        if (!sourceNode || !targetNode || !relationType) {
            return res.status(400).json({ 
                error: 'Cada relación debe especificar sourceNode, targetNode y relationType',
                invalidRelation: rel
            });
        }
        
        if (!sourceNode.label || !sourceNode.property || !sourceNode.property.key || sourceNode.property.value === undefined) {
            return res.status(400).json({ 
                error: 'El nodo origen debe tener label y property (key, value)',
                invalidSourceNode: sourceNode
            });
        }
        
        if (!targetNode.label || !targetNode.property || !targetNode.property.key || targetNode.property.value === undefined) {
            return res.status(400).json({ 
                error: 'El nodo destino debe tener label y property (key, value)',
                invalidTargetNode: targetNode
            });
        }
    }

    try {
        // Construir dinámicamente la lista de propiedades a eliminar
        const removeQuery = propertiesToRemove.map(prop => `r.${prop}`).join(', ');
        
        // Preparar el array de resultados
        const results = [];
        
        // Procesar cada relación secuencialmente
        for (const rel of relationships) {
            const { sourceNode, targetNode, relationType } = rel;
            
            const query = `
                MATCH (source:${sourceNode.label})
                WHERE source.${sourceNode.property.key} = $sourceValue OR source.${sourceNode.property.key} = $sourceValueStr
                MATCH (target:${targetNode.label}) 
                WHERE target.${targetNode.property.key} = $targetValue OR target.${targetNode.property.key} = $targetValueStr
                MATCH (source)-[r:${relationType}]->(target)
                REMOVE ${removeQuery}
                RETURN source, r, target
            `;
            
            const params = {
                sourceValue: sourceNode.property.value,
                sourceValueStr: String(sourceNode.property.value),
                targetValue: targetNode.property.value,
                targetValueStr: String(targetNode.property.value)
            };
            
            const result = await session.run(query, params);
            
            if (result.records.length > 0) {
                results.push({
                    sourceNode: {
                        label: sourceNode.label,
                        property: sourceNode.property,
                        data: result.records[0].get('source').properties
                    },
                    targetNode: {
                        label: targetNode.label,
                        property: targetNode.property,
                        data: result.records[0].get('target').properties
                    },
                    relationType,
                    relationship: result.records[0].get('r').properties,
                    status: 'updated'
                });
            } else {
                results.push({
                    sourceNode: {
                        label: sourceNode.label,
                        property: sourceNode.property
                    },
                    targetNode: {
                        label: targetNode.label,
                        property: targetNode.property
                    },
                    relationType,
                    status: 'not_found'
                });
            }
        }
        
        res.json({
            message: 'Operación completada',
            results,
            propertiesRemoved: propertiesToRemove,
            totalUpdated: results.filter(r => r.status === 'updated').length,
            totalNotFound: results.filter(r => r.status === 'not_found').length
        });
    } catch (error) {
        console.error('Error eliminando propiedades de múltiples relaciones:', error);
        res.status(500).json({ 
            error: 'Error en la base de datos',
            details: error.message
        });
    } finally {
        await session.close();
    }
});

export default router;