import express from 'express';
import { getSession } from './neo4j-connection.js';

const router = express.Router();


/**
 * Operación GET que realice consultas de nodos con base a determinados filtros
 * y se muestre la información de las propiedades de estos.
 * 
 * Permite buscar nodos según sus etiquetas y/o propiedades con filtros avanzados,
 * devolviendo todos los nodos que coincidan con los criterios especificados.
 * 
 * El contenido del filtro puede incluir:
 * - labels (opcional): Array de etiquetas para filtrar
 * - properties (opcional): Objeto con propiedades para filtrar (simple o con operadores)
 * - sort (opcional): Propiedad y dirección para ordenar
 * - skip (opcional): Número de nodos a saltar para paginación
 * - limit (opcional): Número máximo de nodos a devolver
 */
router.get('/visualize/filter', async (req, res) => {
    const session = getSession();
    
    try {
        // Get the filter parameter and parse it
        const filterParam = req.query.filter;
        if (!filterParam) {
            return res.status(400).json({ error: 'Se requiere el parámetro "filter" con un objeto JSON válido' });
        }
        
        let filterObj;
        try {
            filterObj = JSON.parse(filterParam);
        } catch (e) {
            return res.status(400).json({ error: 'El parámetro "filter" debe ser un objeto JSON válido' });
        }
        
        // Extract filter components
        const { labels, properties, sort, skip = 0, limit = 100 } = filterObj;
        
        // Validate numeric parameters
        if (isNaN(skip) || skip < 0) {
            return res.status(400).json({ error: 'Valor de skip inválido' });
        }
        
        if (isNaN(limit) || limit <= 0 || limit > 1000) {
            return res.status(400).json({ error: 'Valor de limit inválido (debe estar entre 1 y 1000)' });
        }
        
        // Construct the query
        let query = 'MATCH (n';
        
        // Add labels if provided
        if (Array.isArray(labels) && labels.length > 0 && labels.every(label => /^[a-zA-Z0-9_]+$/.test(label))) {
            const labelsString = labels.map(label => `\`${label}\``).join(':');
            query += `:${labelsString}`;
        }
        
        query += ')';
        
        // Prepare parameters for the query
        const params = {};
        
        // Add WHERE clause if properties are provided
        if (properties && typeof properties === 'object' && Object.keys(properties).length > 0) {
            const whereConditions = [];
            
            // Process each property for filtering
            for (const [key, value] of Object.entries(properties)) {
                // Check if the value is a complex filter with operator
                if (typeof value === 'object' && value !== null && 'operator' in value && 'value' in value) {
                    const { operator, value: propValue } = value;
                    
                    // Validate operator
                    const validOperators = ['=', '>', '<', '>=', '<=', '!=', 'CONTAINS', 'STARTS WITH', 'ENDS WITH'];
                    if (!validOperators.includes(operator)) {
                        return res.status(400).json({ 
                            error: `Operador inválido para la propiedad ${key}. Operadores válidos: ${validOperators.join(', ')}` 
                        });
                    }
                    
                    // Add condition with the specified operator
                    whereConditions.push(`n.${key} ${operator} $${key}`);
                    params[key] = propValue;
                } else {
                    // Simple equality condition
                    whereConditions.push(`n.${key} = $${key}`);
                    params[key] = value;
                }
            }
            
            // Add WHERE clause if there are conditions
            if (whereConditions.length > 0) {
                query += ` WHERE ${whereConditions.join(' AND ')}`;
            }
        }
        
        // Add RETURN clause with basic node information
        query += ' RETURN n, ID(n) AS nodeId, labels(n) AS nodeLabels';
        
        // Add ORDER BY clause if sort is provided
        if (sort && typeof sort === 'object' && sort.property) {
            const direction = (sort.direction === 'DESC') ? 'DESC' : 'ASC';
            query += ` ORDER BY n.${sort.property} ${direction}`;
        }
        
        // Add SKIP and LIMIT for pagination
        query += ` SKIP ${skip} LIMIT ${limit}`;
        
        // Execute the query
        const result = await session.run(query, params);
        
        // Process the results
        const nodes = result.records.map(record => ({
            id: record.get('nodeId').low,
            properties: record.get('n').properties,
            labels: record.get('nodeLabels')
        }));
        
        // Return the nodes with count
        res.json({ 
            nodes, 
            count: nodes.length,
            pagination: {
                skip,
                limit,
                hasMore: nodes.length === limit
            }
        });
    } catch (error) {
        console.error('Error consultando nodos:', error);
        res.status(500).json({ 
            error: 'Error en la base de datos', 
            details: error.message 
        });
    } finally {
        await session.close();
    }
});

/**
 * Operación GET que consulta un nodo específico por su ID.
 * 
 * Este endpoint devuelve las propiedades y etiquetas de un nodo en base a su ID único.
 * Es un método simplificado para consultar directamente un nodo cuando se conoce su ID.
 * 
 * El query de consulta se vería como:
 * MATCH (n)
 * WHERE ID(n) = $nodeId
 * RETURN n, ID(n) AS nodeId, labels(n) AS nodeLabels
 */
router.get('/visualize/node/:id', async (req, res) => {
    const session = getSession();
    const nodeId = parseInt(req.params.id, 10);

    if (isNaN(nodeId)) {
        return res.status(400).json({ error: 'ID de nodo inválido' });
    }

    try {
        const query = `
            MATCH (n)
            WHERE ID(n) = $nodeId
            RETURN n, ID(n) AS nodeId, labels(n) AS nodeLabels
        `;

        const result = await session.run(query, { nodeId });

        // Verificar si el nodo existe
        if (result.records.length === 0) {
            return res.status(404).json({ error: `Nodo con ID ${nodeId} no encontrado` });
        }

        // Extraer datos del nodo
        const record = result.records[0];
        const node = {
            id: record.get('nodeId').low,
            properties: record.get('n').properties,
            labels: record.get('nodeLabels')
        };

        res.json(node);
    } catch (error) {
        console.error('Error consultando nodo:', error);
        res.status(500).json({ 
            error: 'Error en la base de datos', 
            details: error.message 
        });
    } finally {
        await session.close();
    }
});

/**
 * Operación GET simple para consultar múltiples nodos por etiqueta
 * 
 * Permite obtener todos los nodos de una determinada etiqueta con un límite opcional.
 * Si no se proporciona etiqueta, devuelve nodos de cualquier tipo.
 * 
 * Parámetros de consulta:
 * - label (opcional): Etiqueta para filtrar los nodos
 * - limit (opcional): Cantidad máxima de nodos a devolver (default: 100)
 */
router.get('/visualize/multipleNodes', async (req, res) => {
    const session = getSession();
    
    try {
        // Obtener parámetros de la consulta
        const label = req.query.label;
        const limitParam = req.query.limit ? parseInt(req.query.limit, 10) : 100;
        
        // Validar límite
        if (isNaN(limitParam) || limitParam <= 0 || limitParam > 1000) {
            return res.status(400).json({ error: 'El límite debe estar entre 1 y 1000' });
        }
        
        // Construir consulta con el límite directamente en la cadena SQL
        let query;
        if (label && /^[a-zA-Z0-9_]+$/.test(label)) {
            // Consulta con etiqueta específica
            query = `
                MATCH (n:${label})
                RETURN n, ID(n) AS nodeId, labels(n) AS nodeLabels
                LIMIT ${limitParam}
            `;
        } else {
            // Consulta sin etiqueta (todos los nodos)
            query = `
                MATCH (n)
                RETURN n, ID(n) AS nodeId, labels(n) AS nodeLabels
                LIMIT ${limitParam}
            `;
        }
        
        // Ejecutar consulta sin pasar el límite como parámetro
        const result = await session.run(query);
        
        // Procesar resultados
        const nodes = result.records.map(record => ({
            id: record.get('nodeId').low,
            properties: record.get('n').properties,
            labels: record.get('nodeLabels')
        }));
        
        // Devolver nodos
        res.json({
            nodes,
            count: nodes.length
        });
        
    } catch (error) {
        console.error('Error consultando nodos:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

/**
 * Operación GET que realiza consultas agregadas sobre nodos según su etiqueta.
 * 
 * Permite realizar operaciones de agregación como COUNT, SUM, AVG, MIN, MAX 
 * sobre propiedades de nodos, opcionalmente agrupando por alguna propiedad.
 * 
 * Parámetros de consulta:
 * - label (requerido): Etiqueta de los nodos a agregar
 * - groupBy (opcional): Propiedad por la cual agrupar los resultados
 * - aggregateFunction: Función de agregación a aplicar (count, sum, avg, min, max)
 * - property (opcional): Propiedad sobre la cual aplicar la agregación (requerida para sum, avg, min, max)
 * - limit (opcional): Límite de resultados a devolver (default: 100)
 */
router.get('/visualize/aggregate', async (req, res) => {
    const session = getSession();
    
    try {
        // Obtener parámetros de la consulta
        const { label, groupBy, aggregateFunction, property, limit = 100 } = req.query;
        
        // Validar parámetros requeridos
        if (!label || !/^[a-zA-Z0-9_]+$/.test(label)) {
            return res.status(400).json({ error: 'Se requiere una etiqueta válida' });
        }
        
        if (!aggregateFunction || !['count', 'sum', 'avg', 'min', 'max'].includes(aggregateFunction)) {
            return res.status(400).json({ 
                error: 'Se requiere una función de agregación válida (count, sum, avg, min, max)' 
            });
        }
        
        // Validar property para funciones que no sean count
        if (aggregateFunction !== 'count' && !property) {
            return res.status(400).json({ 
                error: `Se requiere especificar una propiedad para la función ${aggregateFunction}`
            });
        }
        
        // Validar limit
        const limitValue = parseInt(limit, 10);
        if (isNaN(limitValue) || limitValue <= 0 || limitValue > 1000) {
            return res.status(400).json({ error: 'El límite debe estar entre 1 y 1000' });
        }
        
        // Construir la consulta según los parámetros
        let query = `MATCH (n:${label})`;
        let aggregationClause;
        
        // Determinar la cláusula de agregación
        switch (aggregateFunction) {
            case 'count':
                aggregationClause = 'COUNT(n) AS count';
                break;
            case 'sum':
                aggregationClause = `SUM(n.${property}) AS sum`;
                break;
            case 'avg':
                aggregationClause = `AVG(n.${property}) AS average`;
                break;
            case 'min':
                aggregationClause = `MIN(n.${property}) AS minimum`;
                break;
            case 'max':
                aggregationClause = `MAX(n.${property}) AS maximum`;
                break;
        }
        
        // Agregar agrupación si se proporciona groupBy
        if (groupBy) {
            query += ` RETURN n.${groupBy} AS groupKey, ${aggregationClause} ORDER BY groupKey`;
        } else {
            query += ` RETURN ${aggregationClause}`;
        }
        
        // Agregar limit
        query += ` LIMIT ${limitValue}`;
        
        // Ejecutar la consulta
        const result = await session.run(query);
        
        // Procesar los resultados
        const aggregationResults = result.records.map(record => {
            const resultObj = {};
            
            // Agregar la clave de grupo si existe
            if (groupBy) {
                resultObj.groupKey = record.get('groupKey');
            }
            
            // Agregar el resultado de la agregación
            switch (aggregateFunction) {
                case 'count':
                    resultObj.count = record.get('count').low;
                    break;
                case 'sum':
                    resultObj.sum = record.get('sum');
                    break;
                case 'avg':
                    resultObj.average = record.get('average');
                    break;
                case 'min':
                    resultObj.minimum = record.get('minimum');
                    break;
                case 'max':
                    resultObj.maximum = record.get('maximum');
                    break;
            }
            
            return resultObj;
        });
        
        // Devolver los resultados
        res.json({
            label,
            aggregation: aggregateFunction,
            property: property || null,
            groupedBy: groupBy || null,
            results: aggregationResults,
            count: aggregationResults.length
        });
        
    } catch (error) {
        console.error('Error ejecutando agregación:', error);
        res.status(500).json({ 
            error: 'Error en la base de datos', 
            details: error.message 
        });
    } finally {
        await session.close();
    }
});

export default router;