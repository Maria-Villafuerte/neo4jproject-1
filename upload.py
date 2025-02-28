from neo4j import GraphDatabase
import csv
from dotenv import load_dotenv
import os
import json

load_dotenv()

# Configura la conexión a tu instancia de Neo4j Aura
URI = os.getenv("NEO4J_URI")
USER = os.getenv("NEO4J_USER")
PASSWORD = os.getenv("NEO4J_PASSWORD")

# Función para conectar y ejecutar queries en Neo4j
def insert_personas():
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

    with driver.session() as session:
        with open("./nodes/personas.csv", "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)
            
            for row in reader:
                id = row['id']
                nombre = row["nombre"]
                apellido = row["apellido"]
                telefono = row["telefono"]
                dpi = row["dpi"]
                fecha_nacimiento = row["fecha_nacimiento"]

                # 🔹 Obtener etiquetas desde la columna correcta
                labels = row["labels"].split("|")  # Convierte "Persona|Cliente|Personal" en ['Persona', 'Cliente', 'Personal']
                
                if "Cliente" in labels and "Personal" not in labels:
                    # Caso: solo Cliente
                    idC = row["id_cliente"]
                    nit = row["nit"]
                    mem = row["membresia"].strip().lower() == 'true'
                    num_mem = row["num_membresia"]
                    
                    query = f"""
                    CREATE (p:Persona:Cliente {{
                        id: $id, nombre: $nombre, apellido: $apellido, telefono: $telefono, dpi: $dpi, fecha_nacimiento: date($fecha_nacimiento), id_cliente: $idC, nit: $nit, membresia: $mem, num_membresia: $num_mem
                    }})
                    """
                    session.run(query, {
                        "id": id,
                        "nombre": nombre,
                        "apellido": apellido,
                        "telefono": telefono,
                        "dpi": dpi,
                        "fecha_nacimiento": fecha_nacimiento,
                        "idC": idC,
                        "nit": nit,
                        "mem": mem,
                        "num_mem": num_mem,
                    })
                    
                elif "Personal" in labels and "Cliente" not in labels:
                    # Caso: solo Personal
                    fecha_inicio = row["fecha_inicio"]
                    puesto = row["puesto"]
                    id_empleado = row["id_empleado"]
                    salario = row["salario"]
                    planilla = row["planilla"].strip().lower() == 'true'
                    
                    query = f"""
                    CREATE (p:Persona:Personal {{
                        id: $id, nombre: $nombre, apellido: $apellido, telefono: $telefono, dpi: $dpi, fecha_nacimiento: date($fecha_nacimiento), 
                        fecha_inicio: date($fecha_inicio), puesto: $puesto, id_empleado: $id_empleado, salario: $salario, planilla: $planilla
                    }})
                    """
                    session.run(query, {
                        "id": id,
                        "nombre": nombre,
                        "apellido": apellido,
                        "telefono": telefono,
                        "dpi": dpi,
                        "fecha_nacimiento": fecha_nacimiento,
                        "fecha_inicio": fecha_inicio,
                        "puesto": puesto,
                        "id_empleado": id_empleado,
                        "salario": salario,
                        "planilla": planilla
                    })
                    
                elif "Cliente" in labels and "Personal" in labels:
                    # Caso: Cliente y Personal
                    idC = row["id_cliente"]
                    nit = row["nit"]
                    mem = row["membresia"].strip().lower() == 'true'
                    num_mem = row["num_membresia"]
                    fecha_inicio = row["fecha_inicio"]
                    puesto = row["puesto"]
                    id_empleado = row["id_empleado"]
                    salario = row["salario"]
                    planilla = row["planilla"].strip().lower() == 'true'
                    
                    query = f"""
                    CREATE (p:Persona:Cliente:Personal {{
                        id: $id, nombre: $nombre, apellido: $apellido, telefono: $telefono, dpi: $dpi, fecha_nacimiento: date($fecha_nacimiento), 
                        id_cliente: $idC, nit: $nit, membresia: $mem, num_membresia: $num_mem,
                        fecha_inicio: date($fecha_inicio), puesto: $puesto, id_empleado: $id_empleado, salario: $salario, planilla: $planilla
                    }})
                    """
                    session.run(query, {
                        "id": id,
                        "nombre": nombre,
                        "apellido": apellido,
                        "telefono": telefono,
                        "dpi": dpi,
                        "fecha_nacimiento": fecha_nacimiento,
                        "idC": idC,
                        "nit": nit,
                        "mem": mem,
                        "num_mem": num_mem,
                        "fecha_inicio": fecha_inicio,
                        "puesto": puesto,
                        "id_empleado": id_empleado,
                        "salario": salario,
                        "planilla": planilla
                    })
                    
                else:
                    # Caso por defecto (cuando no es ninguno de los tres casos)
                    query = f"""
                    CREATE (p:Persona {{
                        id: $id, nombre: $nombre, apellido: $apellido, telefono: $telefono, dpi: $dpi, fecha_nacimiento: date($fecha_nacimiento)
                    }})
                    """
                    session.run(query, {
                        "id": id,
                        "nombre": nombre,
                        "apellido": apellido,
                        "telefono": telefono,
                        "dpi": dpi,
                        "fecha_nacimiento": fecha_nacimiento,
                    })
                

    driver.close()

def insert_almacenes():
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

    with driver.session() as session:
        with open("./nodes/almacenes.csv", "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)

            for row in reader:
                id = row['id']
                nombre = row["nombre"]
                ubicacion = row["ubicacion"]
                estado = row["estado"]
                tipo = row["tipo"]
                
                # Usar json.loads() para convertir las cadenas a listas
                try:
                    capacidad_max = json.loads(row["capacidad_max"])
                    capacidad_actual = json.loads(row["capacidad_actual"])
                except json.JSONDecodeError:
                    # Si la conversión falla, asigna un valor vacío o un valor por defecto
                    capacidad_max = []
                    capacidad_actual = []

                # Crear nodo Almacén
                query = f"""
                CREATE (a:Almacen {{
                    id: $id, nombre: $nombre, ubicacion: $ubicacion, estado: $estado, tipo: $tipo, 
                    capacidad_max: $capacidad_max, capacidad_actual: $capacidad_actual
                }})
                """
                session.run(query, {
                    "id": id,
                    "nombre": nombre,
                    "ubicacion": ubicacion,
                    "estado": estado,
                    "tipo": tipo,
                    "capacidad_max": capacidad_max,
                    "capacidad_actual": capacidad_actual
                })
                
    driver.close()
    
def insert_sucursales():
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

    with driver.session() as session:
        with open("./nodes/sucursales.csv", "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)

            for row in reader:
                id = row["id"]  
                nombre = row["nombre"]
                fecha_inauguracion = row["fecha_inauguracion"]
                pedidos_domicilio = row["pedidos_domicilio"].strip().lower() == 'true'
                ubicacion = row["ubicacion"]
                estado = row["estado"]

                # Crear nodo Sucursal con id
                query = f"""
                CREATE (s:Sucursal {{
                    id: $id, nombre: $nombre, fecha_inauguracion: date($fecha_inauguracion), 
                    pedidos_domicilio: $pedidos_domicilio, ubicacion: $ubicacion, estado: $estado
                }})
                """
                session.run(query, {
                    "id": id,
                    "nombre": nombre,
                    "fecha_inauguracion": fecha_inauguracion,
                    "pedidos_domicilio": pedidos_domicilio,
                    "ubicacion": ubicacion,
                    "estado": estado
                })

    driver.close()
    
def insert_proveedores():
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

    with driver.session() as session:
        with open("./nodes/proveedores.csv", "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)

            for row in reader:
                id = row["id"]  # Agregar id
                nombre = row["nombre"]
                ubicacion = row["ubicacion"]
                estado = row["estado"]
                tipo_produccion = row["tipo_produccion"]
                marca = row["marca"]

                # Crear nodo Proveedor con id
                query = f"""
                CREATE (p:Proveedor {{
                    id: $id, nombre: $nombre, ubicacion: $ubicacion, 
                    estado: $estado, tipo_produccion: $tipo_produccion, marca: $marca
                }})
                """
                session.run(query, {
                    "id": id,
                    "nombre": nombre,
                    "ubicacion": ubicacion,
                    "estado": estado,
                    "tipo_produccion": tipo_produccion,
                    "marca": marca
                })

    driver.close()
    
def insert_productos():
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

    with driver.session() as session:
        with open("./nodes/productos.csv", "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)

            for row in reader:
                id = row["id"]
                nombre = row["nombre"]
                categoria = row["categoria"]
                marca = row["marca"]
                precio_unitario = float(row["precio_unitario"])  # Convertir a float
                local_importado = row["local_importado"].strip().lower() == "true"  # Convertir a booleano

                # Crear nodo Producto
                query = f"""
                CREATE (p:Producto {{id: $id, nombre: $nombre, categoria: $categoria, marca: $marca, 
                                    precio_unitario: $precio_unitario, local_importado: $local_importado}})
                """
                session.run(query, {
                    "id": id,
                    "nombre": nombre,
                    "categoria": categoria,
                    "marca": marca,
                    "precio_unitario": precio_unitario,
                    "local_importado": local_importado
                })

    driver.close()

def insert_transportes():
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

    with driver.session() as session:
        with open("./nodes/transporte.csv", "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)

            for row in reader:
                id = row["id"]
                placa = row["placa"]
                modelo = row["modelo"]
                capacidad_carga = float(row["capacidad_carga"])  # Convertir a float
                kilometraje = float(row["kilometraje"])  # Convertir a float
                ultima_supervision = row["ultima_supervision"]

                # Crear nodo Transporte
                query = f"""
                CREATE (t:Transporte {{id: $id, placa: $placa, modelo: $modelo, 
                                       capacidad_carga: $capacidad_carga, kilometraje: $kilometraje, 
                                       ultima_supervision: date($ultima_supervision)}})
                """
                session.run(query, {
                    "id": id,
                    "placa": placa,
                    "modelo": modelo,
                    "capacidad_carga": capacidad_carga,
                    "kilometraje": kilometraje,
                    "ultima_supervision": ultima_supervision
                })

    driver.close()

def insert_relaciones(relationFile):
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

    with driver.session() as session:
        with open(relationFile, "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)

            for row in reader:
                start_id = row['start_id']
                start_label = row['start_label']
                relation_type = row['type']
                end_id = row['end_id']
                end_label = row['end_label']
                
                # Construir propiedades dinámicas de la relación
                # Excluir las columnas que no son propiedades de la relación (id, labels, etc.)
                relation_properties = {key: value for key, value in row.items() if key not in ['start_id', 'start_label', 'type', 'end_id', 'end_label']}
                
                # Crear la relación con propiedades dinámicas
                query = f"""
                MATCH (start:{start_label} {{id: $start_id}}), (end:{end_label} {{id: $end_id}})
                CREATE (start)-[r:{relation_type}]->(end)
                SET r = $properties
                """
                
                session.run(query, {
                    "start_id": start_id,
                    "start_label": start_label,
                    "end_id": end_id,
                    "end_label": end_label,
                    "properties": relation_properties
                })
                
    driver.close()
    
    
#print("Insertando Personas")
#insert_personas()
#print("Insertadas Personas Correctamente")

#print("Insertando Almacenes")
#insert_almacenes()
#print("Insertados Almacenes Correctamente")

#print("Insertando Sucursales")
#insert_sucursales()
#print("Insertadas Sucursales Correctamente")

#print("Insertando Proveedores")
#insert_proveedores()
#print("Insertados Proveedores Correctamente")

#print("Insertando Productos")
#insert_productos()
#print("Insertados Productos Correctamente")

print("Insertando Transportes")
insert_transportes()
print("Insertados Transportes Correctamente")

# Relaciones
print("Insertando Relaciones: almancena")
insert_relaciones("./relationships/almacena.csv")
print("Relación almancena insertada Correctamente")

print("Insertando Relaciones: asignado_a")
insert_relaciones("./relationships/asignado_a.csv")
print("Relación asignado_a insertada Correctamente")

print("Insertando Relaciones: produce")
insert_relaciones("./relationships/produce.csv")
print("Relación produce insertada Correctamente")

print("Insertando Relaciones: provee")
insert_relaciones("./relationships/provee.csv")
print("Relación provee insertada Correctamente")

print("Insertando Relaciones: recurre")
insert_relaciones("./relationships/recurre.csv")
print("Relación recurre insertada Correctamente")

print("Insertando Relaciones: suministra")
insert_relaciones("./relationships/suministra.csv")
print("Relación suministra insertada Correctamente")

print("Insertando Relaciones: tiene")
insert_relaciones("./relationships/tiene.csv")
print("Relación tiene insertada Correctamente")

print("Insertando Relaciones: trabaja_en")
insert_relaciones("./relationships/trabaja_en.csv")
print("Relación trabaja_en insertada Correctamente")
