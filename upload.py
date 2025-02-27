from neo4j import GraphDatabase
import csv
from dotenv import load_dotenv
import os

# Configura la conexión a tu instancia de Neo4j Aura
URI = os.getenv("NEO4J_URI")
USER = os.getenv("NEO4J_USER")
PASSWORD = os.getenv("NEO4J_PASSWORD")

# Función para conectar y ejecutar queries en Neo4j
def insert_personas():
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

    with driver.session() as session:
        with open("personas.csv", "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)
            
            for row in reader:
                nombre = row["nombre"]
                apellido = row["apellido"]
                telefono = row["telefono"]
                dpi = row["dpi"]
                fecha_nacimiento = row["fecha_nacimiento"]

                # 🔹 Obtener etiquetas desde la columna correcta
                labels = row["labels"].split("|")  # Convierte "Persona|Cliente|Personal" en ['Persona', 'Cliente', 'Personal']
                
                if "Cliente" in labels and "Personal" not in labels:
                    # Caso: solo Cliente
                    nit = row["nit"]
                    mem = row["membresia"]
                    num_mem = row["num_membresia"]
                    
                    query = f"""
                    CREATE (p:Persona:Cliente {{
                        nombre: $nombre, apellido: $apellido, telefono: $telefono, dpi: $dpi, fecha_nacimiento: date($fecha_nacimiento), nit: $nit, membresia: $mem, num_membresia: $num_mem
                    }})
                    """
                    session.run(query, {
                        "nombre": nombre,
                        "apellido": apellido,
                        "telefono": telefono,
                        "dpi": dpi,
                        "fecha_nacimiento": fecha_nacimiento,
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
                    planilla = row["planilla"]
                    
                    query = f"""
                    CREATE (p:Persona:Personal {{
                        nombre: $nombre, apellido: $apellido, telefono: $telefono, dpi: $dpi, fecha_nacimiento: date($fecha_nacimiento), 
                        fecha_inicio: date($fecha_inicio), puesto: $puesto, id_empleado: $id_empleado, salario: $salario, planilla: $planilla
                    }})
                    """
                    session.run(query, {
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
                    nit = row["nit"]
                    mem = row["membresia"]
                    num_mem = row["num_membresia"]
                    fecha_inicio = row["fecha_inicio"]
                    puesto = row["puesto"]
                    id_empleado = row["id_empleado"]
                    salario = row["salario"]
                    planilla = row["planilla"]
                    
                    query = f"""
                    CREATE (p:Persona:Cliente:Personal {{
                        nombre: $nombre, apellido: $apellido, telefono: $telefono, dpi: $dpi, fecha_nacimiento: date($fecha_nacimiento), 
                        nit: $nit, membresia: $mem, num_membresia: $num_mem,
                        fecha_inicio: date($fecha_inicio), puesto: $puesto, id_empleado: $id_empleado, salario: $salario, planilla: $planilla
                    }})
                    """
                    session.run(query, {
                        "nombre": nombre,
                        "apellido": apellido,
                        "telefono": telefono,
                        "dpi": dpi,
                        "fecha_nacimiento": fecha_nacimiento,
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
                        nombre: $nombre, apellido: $apellido, telefono: $telefono, dpi: $dpi, fecha_nacimiento: date($fecha_nacimiento)
                    }})
                    """
                    session.run(query, {
                        "nombre": nombre,
                        "apellido": apellido,
                        "telefono": telefono,
                        "dpi": dpi,
                        "fecha_nacimiento": fecha_nacimiento,
                    })
                

    driver.close()

# 🔹 Ejecutar el script
insert_personas()
print("Personas importadas correctamente ✅")
