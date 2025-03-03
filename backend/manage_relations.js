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
 * Operación que permite agregar 1 o más propiedades a múltiples relaciones al mismo tiempo
 * mediante una lista de IDs de nodos origen.
 * 
 * Usa UNWIND para procesar eficientemente múltiples nodos origen que comparten 
 * el mismo tipo de relación, actualizando todas las relaciones encontradas con las propiedades especificadas.
 * 
 * Ejemplo de uso:
 * {
 *   "sourceNodeIds": ["527", "842", "953", "1021"],
 *   "sourceLabel": "Persona",
 *   "sourceIdProperty": "id",
 *   "relationType": "RECURRE",
 *   "targetFilter": {
 *     "label": "Establecimiento",
 *     "property": {
 *       "key": "categoria", 
 *       "value": "Restaurante"
 *     }
 *   },
 *   "propertiesToAdd": {
 *     "descuento": 0.15,
 *     "actualizado_en": {
 *       "type": "date",
 *       "value": "2025-03-03"
 *     },
 *     "notas": "Actualización masiva"
 *   }
 * }
 * 
 * El query de consulta se vería como:
 * UNWIND $sourceNodeIds AS nodeId
 * MATCH (source:Persona)
 * WHERE source.id = nodeId OR source.id = toString(nodeId)
 * MATCH (source)-[r:RECURRE]->(target:Establecimiento)
 * WHERE target.categoria = 'Restaurante' OR target.categoria = 'Restaurante'
 * SET r += $propertiesToAdd
 * RETURN source, r, target
 */
router.post('/add/relations/properties/bySourceIds', async (req, res) => {
  const session = getSession();
  const { 
      sourceNodeIds, 
      sourceLabel, 
      sourceIdProperty,
      relationType, 
      targetFilter, 
      propertiesToAdd 
  } = req.body;

  // Validar los datos requeridos
  if (!Array.isArray(sourceNodeIds) || sourceNodeIds.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array no vacío de sourceNodeIds' });
  }

  if (!sourceLabel || !sourceIdProperty || !relationType || !propertiesToAdd) {
      return res.status(400).json({ 
          error: 'Faltan datos requeridos: sourceLabel, sourceIdProperty, relationType, propertiesToAdd' 
      });
  }

  // Transformar las propiedades para manejar tipos de datos especiales
  const transformedProperties = transformProperties(propertiesToAdd);

  try {
      // Iniciar construcción de la consulta
      let query = `
          UNWIND $sourceNodeIds AS nodeId
          MATCH (source:${sourceLabel})
          WHERE source.${sourceIdProperty} = nodeId OR source.${sourceIdProperty} = toString(nodeId)
          MATCH (source)-[r:${relationType}]->`;

      // Preparar los parámetros para la consulta
      const params = {
          sourceNodeIds: sourceNodeIds,
          propertiesToAdd: transformedProperties
      };

      // Añadir filtro para el nodo destino si está presente
      if (targetFilter && targetFilter.label) {
          query += `(target:${targetFilter.label})`;
          
          // Añadir filtro de propiedad para el nodo destino si está completo
          if (targetFilter.property && targetFilter.property.key && targetFilter.property.value !== undefined) {
              query += `
              WHERE target.${targetFilter.property.key} = $targetValue OR target.${targetFilter.property.key} = $targetValueStr`;
              params.targetValue = targetFilter.property.value;
              params.targetValueStr = String(targetFilter.property.value);
          }
      } else {
          query += `(target)`;
      }

      // Completar la consulta
      query += `
          SET r += $propertiesToAdd
          RETURN source, r, target`;

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
                  sourceNodeIds,
                  sourceLabel,
                  sourceIdProperty,
                  relationType,
                  targetFilter
              }
          });
      }

      // Agrupar por ID de nodo origen para una respuesta más estructurada
      const groupedBySource = {};
      updatedRelations.forEach(relation => {
          const sourceId = relation.sourceNode[sourceIdProperty];
          if (!groupedBySource[sourceId]) {
              groupedBySource[sourceId] = [];
          }
          groupedBySource[sourceId].push(relation);
      });

      res.json({
          message: `Se actualizaron ${updatedRelations.length} relaciones de ${Object.keys(groupedBySource).length} nodos origen`,
          totalRelationsUpdated: updatedRelations.length,
          totalSourceNodesAffected: Object.keys(groupedBySource).length,
          updatedBySource: groupedBySource
      });
  } catch (error) {
      console.error('Error actualizando múltiples relaciones por IDs de origen:', error);
      res.status(500).json({
          error: 'Error en la base de datos',
          details: error.message
      });
  } finally {
      await session.close();
  }
});


export default router;