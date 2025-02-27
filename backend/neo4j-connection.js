import { driver as _driver, auth } from 'neo4j-driver';
import dotenv from 'dotenv';

// Cargar las variables de entorno desde el archivo .env
dotenv.config();

const driver = _driver(
    process.env.NEO4J_URI,
    auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

const getSession = () => driver.session();

export { driver, getSession };