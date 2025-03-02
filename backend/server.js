import express, { json } from 'express';
import cors from 'cors';
import { getSession } from './neo4j-connection.js';

const app = express();
app.use(cors());
app.use(json());

app.get('/api/nodos', async (req, res) => {
    const session = getSession();
    try {
        const result = await session.run('MATCH (n) RETURN n LIMIT 5');
        const nodes = result.records.map(record => record.get('n').properties);
        res.json(nodes);
    } catch (error) {
        console.error('Error ejecutando consulta:', error);
        res.status(500).json({ error: 'Error consultando Neo4j' });
    } finally {
        await session.close();
    }
});

//Usar las rutas de creación de nodos 
import createNodesRoutes from './create_nodes.js';
app.use('', createNodesRoutes);

// Usar las rutas de características
import createRelationsRoutes from './create_relations.js';
app.use('', createRelationsRoutes);

// Usar las rutas de características
import manageNodesRoutes from './manage_node.js';
app.use('', manageNodesRoutes);

// Usar lasrutas de eliminación de nodos
import deleteNodesRoutes from './delete_nodes.js';
app.use('', deleteNodesRoutes);

// Importar las rutas de consulta de nodos
import getNodesRoutes from './view_nodes.js';
app.use('', getNodesRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
