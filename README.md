# Backend con Express y Neo4j

Este proyecto es un backend desarrollado con Node.js y Express que se conecta a una base de datos Neo4j utilizando el driver oficial. Permite obtener nodos almacenados en la base de datos a través de una API REST.

## 🚀 Tecnologías Utilizadas

- Node.js
- Express
- Neo4j
- dotenv (para manejo de variables de entorno)
- cors (para permitir solicitudes desde el frontend)

## 📂 Instalación

1. Clona este repositorio:
   ```sh
   git clone https://github.com/tuusuario/neo4jproject-1.git
   cd neo4jproject-1/backend
   ```
2. Instala las dependencias:
   ```sh
   npm install
   ```
3. Crea un archivo `.env` en la raíz de `backend/` y agrega tus credenciales de Neo4j:
   ```env
   NEO4J_URI=neo4j+s://<TU_INSTANCIA>.databases.neo4j.io
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=<TU_CONTRASEÑA>
   PORT=5000
   ```
4. Asegúrate de que `.env` está en el archivo `.gitignore` para no subir credenciales al repositorio.

## 🚀 Uso

Para iniciar el servidor en modo desarrollo:
```sh
npm run dev
```
O en modo producción:
```sh
npm start
```

## 📡 Endpoints

### Obtener nodos de Neo4j
**GET** `/api/nodos`
- **Descripción:** Obtiene los primeros 5 nodos de la base de datos.
- **Respuesta:**
  ```json
  [
    {
      "nombre": "Ejemplo",
      "edad": 25
    }
  ]
  ```

## 🛠 Estructura del Proyecto
```
neo4jproject-1/
│── node_modules/
│── .gitignore              # Archivos ignorados en Git
│── package.json           # Dependencias y configuración
│── README.md              # Documentación
├── .env                   # Variables de entorno (IGNORADO en Git)
│── backend/
│   ├── server.js          # Archivo principal del servidor
│   ├── neo4j-connection.js # Configuración de conexión a Neo4j

```

## 📌 Notas
- Asegúrate de que Neo4j está en ejecución y accesible.
- Si tienes problemas con variables de entorno, usa `console.log(process.env.NEO4J_URI);` para verificar su carga.
