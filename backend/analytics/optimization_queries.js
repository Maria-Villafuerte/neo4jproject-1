import express from 'express';
import { getSession } from '../neo4j-connection.js';

const router = express.Router();

router.get('/analytics/bestProducer/:marca', async (req, res) => {
    const session = getSession();
    const { marca } = req.params;  

    if (!marca) {
        return res.status(400).json({ error: 'Marca inválida' });
    }

    try {
        const query = `
            MATCH (p:Proveedor)-[r:PRODUCE]->(pr:Producto)
            WHERE toLower(pr.marca) = toLower($marca)
            RETURN p.nombre AS proveedor, SUM(toInteger(r.cantidad_minima)) AS totalProduccion
            ORDER BY totalProduccion DESC
            LIMIT 5
        `;

        const result = await session.run(query, { marca: marca.toLowerCase() });

        const proveedores = result.records.map(record => ({
            proveedor: record.get('proveedor'),
            totalProduccion: record.get('totalProduccion').toNumber()  
        }));

        if (proveedores.length === 0) {
            return res.status(404).json({ error: 'No se encontraron proveedores para la marca especificada' });
        }

        res.json(proveedores);
    } catch (error) {
        console.error('Error obteniendo los proveedores:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

router.get('/analytics/salaryStores', async (req, res) => {
    const session = getSession();  

    try {
        const query = `
            MATCH (p:Personal)-[:TRABAJA_EN]->(s:Sucursal)
            RETURN s.nombre AS sucursal, SUM(toInteger(p.salario)) AS gastoTotal
            ORDER BY gastoTotal DESC
        `;

        const result = await session.run(query);

        const sucursales = result.records.map(record => ({
            sucursal: record.get('sucursal'),
            gastoTotal: record.get('gastoTotal').toNumber()  
        }));

        if (sucursales.length === 0) {
            return res.status(404).json({ error: 'Hubo un error al encontrar lo gastado por salarios en las sucursales' });
        }

        res.json(sucursales);
    } catch (error) {
        console.error('Error obteniendo las sucursales:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});

router.get('/analytics/salaryWarehouses', async (req, res) => {
    const session = getSession();  

    try {
        const query = `
            MATCH (p:Personal)-[:TRABAJA_EN]->(a:Almacen)
            RETURN a.nombre AS almacen, SUM(toInteger(p.salario)) AS gastoTotal
            ORDER BY gastoTotal DESC
        `;

        const result = await session.run(query);

        const almacenes = result.records.map(record => ({
            sucursal: record.get('almacen'),
            gastoTotal: record.get('gastoTotal').toNumber()  
        }));

        if (almacenes.length === 0) {
            return res.status(404).json({ error: 'Hubo un error al encontrar lo gastado por salarios en los almacenes' });
        }

        res.json(almacenes);
    } catch (error) {
        console.error('Error obteniendo los almacenes:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    } finally {
        await session.close();
    }
});


export default router;