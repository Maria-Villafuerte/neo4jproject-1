import express from 'express';
import { getSession } from './neo4j-connection.js';

const router = express.Router();

/**
 * Operación DELETE que elimina una relación específica entre dos nodos.
 * 
 * La relación es identificada por los nodos origen y destino por sus propiedades clave,
 * y por el tipo de relación, independientemente de las etiquetas de los nodos.
 * Soporta ambas direcciones de relación (entrante o saliente).
 * Maneja diferentes tipos de valores (string o número) para las propiedades de identificación.
 * 
 * Usa como parámetros:
 * - sourceNode: Datos del nodo origen (propiedad para identificarlo)
 * - targetNode: Datos del nodo destino (propiedad para identificarlo)
 * - relationType: Tipo de relación a eliminar
 * - direction: Opcional, dirección de la relación ('outgoing' o 'incoming')
 * 
 * El query de consulta se vería como:
 * Para relaciones salientes (direction=outgoing):
 * MATCH (source)-[r:RELATION_TYPE]->(target)
 * WHERE (source.key = $sourceValue OR source.key = $sourceValueStr)
 * AND (target.key = $targetValue OR target.key = $targetValueStr)
 * DELETE r
 * 
 * Para relaciones entrantes (direction=incoming):
 * MATCH (source)<-[r:RELATION_TYPE]-(target)
 * WHERE (source.key = $sourceValue OR source.key = $sourceValueStr)
 * AND (target.key = $targetValue OR target.key = $targetValueStr)
 * DELETE r
 */
router.delete('/delete/relation', async (req, res) => {
    const session = getSession();
    const { sourceNode, targetNode, relationType, direction = 'outgoing' } = req.body;

    // Validar datos requeridos
    if (!sourceNode || !targetNode || !relationType) {
        return res.status(400).json({ 
            error: 'Datos incompletos', 
            required: {
                sourceNode: "Información del nodo origen (property)",
                targetNode: "Información del nodo destino (property)",
                relationType: "Tipo de relación a eliminar",
                direction: "Dirección de la relación (opcional, valores: 'outgoing', 'incoming')"
            }
        });
    }

    // Validar estructura de los nodos (solo requiere las propiedades, no la etiqueta)
    if (!sourceNode.property || !sourceNode.property.key || sourceNode.property.value === undefined) {
        return res.status(400).json({ error: 'El nodo origen debe tener property (key, value)' });
    }

    if (!targetNode.property || !targetNode.property.key || targetNode.property.value === undefined) {
        return res.status(400).json({ error: 'El nodo destino debe tener property (key, value)' });
    }

    try {
        // Consulta Cypher modificada para manejar ambas direcciones de la relación
        let query;
        
        if (direction === 'incoming') {
            // Relación entrante: target-[r]->source
            query = `
                MATCH (source)<-[r:${relationType}]-(target)
                WHERE (source.${sourceNode.property.key} = $sourceValue OR source.${sourceNode.property.key} = $sourceValueStr)
                AND (target.${targetNode.property.key} = $targetValue OR target.${targetNode.property.key} = $targetValueStr)
                DELETE r
                RETURN count(r) AS deletedCount, source, target
            `;
        } else {
            // Relación saliente (por defecto): source-[r]->target
            query = `
                MATCH (source)-[r:${relationType}]->(target)
                WHERE (source.${sourceNode.property.key} = $sourceValue OR source.${sourceNode.property.key} = $sourceValueStr)
                AND (target.${targetNode.property.key} = $targetValue OR target.${targetNode.property.key} = $targetValueStr)
                DELETE r
                RETURN count(r) AS deletedCount, source, target
            `;
        }

        // Preparar parámetros para la consulta, incluyendo versiones numéricas y string
        const params = {
            sourceValue: typeof sourceNode.property.value === 'string' && !isNaN(sourceNode.property.value) 
                ? parseInt(sourceNode.property.value, 10)
                : sourceNode.property.value,
            sourceValueStr: String(sourceNode.property.value),
            targetValue: typeof targetNode.property.value === 'string' && !isNaN(targetNode.property.value)
                ? parseInt(targetNode.property.value, 10)
                : targetNode.property.value,
            targetValueStr: String(targetNode.property.value)
        };

        const result = await session.run(query, params);
        
        if (result.records.length === 0) {
            return res.status(404).json({ 
                error: 'No se encontró ninguna relación que coincida con los criterios especificados',
                criteria: {
                    sourceNode: `Nodo con ${sourceNode.property.key}=${sourceNode.property.value}`,
                    targetNode: `Nodo con ${targetNode.property.key}=${targetNode.property.value}`,
                    relationType
                }
            });
        }

        const deletedCount = result.records[0].get('deletedCount').low;

        if (deletedCount === 0) {
            return res.status(404).json({ 
                error: 'No se encontró ninguna relación que coincida con los criterios especificados',
                criteria: {
                    sourceNode: `Nodo con ${sourceNode.property.key}=${sourceNode.property.value}`,
                    targetNode: `Nodo con ${targetNode.property.key}=${targetNode.property.value}`,
                    relationType
                }
            });
        }

        const sourceNodeData = result.records[0].get('source').properties;
        const targetNodeData = result.records[0].get('target').properties;
        const sourceLabels = result.records[0].get('source').labels;
        const targetLabels = result.records[0].get('target').labels;

        res.json({ 
            message: `Relación de tipo ${relationType} eliminada correctamente`,
            details: {
                sourceNode: {
                    labels: sourceLabels,
                    properties: sourceNodeData
                },
                targetNode: {
                    labels: targetLabels,
                    properties: targetNodeData
                },
                relationType,
                count: deletedCount
            }
        });
    } catch (error) {
        console.error('Error eliminando relación:', error);
        res.status(500).json({ 
            error: 'Error en la base de datos',
            details: error.message
        });
    } finally {
        await session.close();
    }
});

/**
 * Operación DELETE que elimina múltiples relaciones basadas en tipo y propiedades.
 * 
 * Las relaciones que coincidan con el tipo y propiedades proporcionadas en el cuerpo de la solicitud serán eliminadas.
 * 
 * Usa como parámetros el tipo de relación a eliminar y un objeto con las propiedades que deben coincidir para la eliminación.
 * Opcionalmente, se pueden especificar etiquetas y propiedades para los nodos origen y destino para una búsqueda más precisa.
 * 
 * El query de consulta se vería como:
 * MATCH (source:SourceLabel)-[r:RELATIONSHIP_TYPE]->(target:TargetLabel)
 * WHERE r.property1 = $property1 AND r.property2 = $property2
 * AND source.sourceProp = $sourcePropValue
 * AND target.targetProp = $targetPropValue
 * DELETE r
 */
router.delete('/delete/multipleRelations', async (req, res) => {
    const session = getSession();
    const { 
        relationType, 
        properties,
        sourceNode,
        targetNode
    } = req.body;

    if (!relationType || typeof relationType !== 'string') {
        return res.status(400).json({ error: 'Se requiere un tipo de relación válido' });
    }

    try {
        let query = 'MATCH ';
        const params = {};

        // Construir la parte del nodo origen
        if (sourceNode && sourceNode.label) {
            query += `(source:${sourceNode.label})`;
            if (sourceNode.property) {
                const { key, value } = sourceNode.property;
                query += ` WHERE source.${key} = $sourceValue `;
                params.sourceValue = value;
            }
        } else {
            query += '(source)';
        }

        // Añadir la relación
        query += `-[r:${relationType}]->`;

        // Construir la parte del nodo destino
        if (targetNode && targetNode.label) {
            query += `(target:${targetNode.label})`;
            if (targetNode.property) {
                const { key, value } = targetNode.property;
                if (query.includes('WHERE')) {
                    query += ` AND target.${key} = $targetValue `;
                } else {
                    query += ` WHERE target.${key} = $targetValue `;
                }
                params.targetValue = value;
            }
        } else {
            query += '(target)';
        }

        // Añadir condiciones para las propiedades de la relación
        if (properties && typeof properties === 'object' && Object.keys(properties).length > 0) {
            const propConditions = Object.keys(properties).map((key, index) => {
                params[`prop${index}`] = properties[key];
                return `r.${key} = $prop${index}`;
            });

            if (query.includes('WHERE')) {
                query += ` AND ${propConditions.join(' AND ')}`;
            } else {
                query += ` WHERE ${propConditions.join(' AND ')}`;
            }
        }

        // Añadir la operación de eliminación y retorno
        query += `
            DELETE r
            RETURN count(r) AS deletedCount
        `;

        const result = await session.run(query, params);
        const deletedCount = result.records[0].get('deletedCount').low;

        if (deletedCount === 0) {
            return res.status(404).json({ 
                message: 'No se encontraron relaciones que coincidan con los criterios especificados',
                criteria: {
                    relationType,
                    properties: properties || null,
                    sourceNode: sourceNode || null,
                    targetNode: targetNode || null
                }
            });
        }

        res.json({ 
            message: `${deletedCount} relación(es) eliminada(s) correctamente`,
            criteria: {
                relationType,
                properties: properties || null,
                sourceNode: sourceNode || null,
                targetNode: targetNode || null
            }
        });
    } catch (error) {
        console.error('Error eliminando relaciones:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

export default router;