import express from 'express';
import { getSession } from './neo4j-connection.js';
import transformProperties from './for_datatypes.js';

const router = express.Router();

/**
 * Operación CREATE que cree una relación entre 2 nodos ya existentes
 * Incluye el tipo de la relación y sus propiedades
 * 
 * Usa de parámetros para hacer una generalización de la creación de relaciones
 * 
 * El query de consulta se veria como:
 * MERGE (a:LabelA {propertyN: value_propertyA})
 * -[r:relationship {propertyR1: value_propertyR1, propertyR2: value_propertyR2, propertyR3: value_propertyR3}]
 * ->(b:LabelB {propertyN: value_propertyB})
 */
router.post('/create/relacion', async (req, res) => {
    const session = getSession();
    const { labelA, propertiesA, relationship, propertiesR, labelB, propertiesB } = req.body;

    if (!labelA || !labelB || !relationship || !propertiesR || !propertiesA || !propertiesB) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // Nos aseguramos que cada dato tenga el tipo adecuado
    const properties_a = transformProperties(propertiesA);
    const properties_b = transformProperties(propertiesB);
    const properties_r = transformProperties(propertiesR);

    // Convertimos los objetos en cadenas de propiedades Cypher
    const propertiesAString = Object.entries(properties_a)
        .map(([key, value]) => `${key}: $propsA.${key}`)
        .join(', ');

    const propertiesBString = Object.entries(properties_b)
        .map(([key, value]) => `${key}: $propsB.${key}`)
        .join(', ');

    const propertiesRString = Object.entries(properties_r)
        .map(([key, value]) => `${key}: $propsR.${key}`)
        .join(', ');

    try {
        const query = `
            MERGE (a:${labelA} { ${propertiesAString} })
            MERGE (b:${labelB} { ${propertiesBString} })
            MERGE (a)-[r:${relationship} { ${propertiesRString} }]->(b)
            RETURN a, r, b
        `;

        const result = await session.run(query, {
            propsA: properties_a,
            propsB: properties_b,
            propsR: properties_r
        });

        const response = result.records.map(record => ({
            nodeA: record.get('a').properties,
            relationship: record.get('r').properties,
            nodeB: record.get('b').properties
        }));

        res.json(response);
    } catch (error) {
        console.error('Error creando relación:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

export default router;
