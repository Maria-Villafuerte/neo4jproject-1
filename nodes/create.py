import csv
import random
from faker import Faker
from datetime import datetime, timedelta

fake = Faker()

NUM_PERSONAS = 2000
PCT_CLIENTE = 0.5  # 50% de las personas serán clientes
PCT_PERSONAL = 0.3  # 30% serán empleados
PCT_AMBOS = 0.2  # 20% serán ambos

def random_date(start_year=1960, end_year=2005):
    start = datetime(start_year, 1, 1)
    end = datetime(end_year, 12, 31)
    return fake.date_between(start_date=start, end_date=end)

def random_salary():
    return round(random.uniform(3000, 15000), 2)

with open('personas.csv', 'w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    writer.writerow([
        'id', 'labels', 'nombre', 'apellido', 'telefono', 'dpi', 'fecha_nacimiento',
        'id_cliente','nit', 'membresia', 'num_membresia',  
        'fecha_inicio', 'puesto', 'id_empleado', 'salario', 'planilla'  
    ])

    counter = 0
    counterC = 0
    
    for i in range(NUM_PERSONAS):
        es_cliente = random.random() < PCT_CLIENTE
        es_personal = random.random() < PCT_PERSONAL

        # 10% serán ambos
        if random.random() < PCT_AMBOS:
            es_cliente = True
            es_personal = True

        etiquetas = ["Persona"]
        id_cliente = nit = membresia = num_membresia = None
        fecha_inicio = puesto = id_empleado = salario = planilla = None
        

        if es_cliente:
            etiquetas.append("Cliente")
            id_cliente = counterC
            nit = fake.unique.random_int(min=1000000, max=9999999)
            membresia = random.choice([True, False])
            num_membresia = fake.unique.random_int(min=100000, max=999999) if membresia else None
            counterC = counterC + 1

        if es_personal:
            etiquetas.append("Personal")
            fecha_inicio = fake.date_between(start_date=datetime(2010,1,1), end_date=datetime(2024,12,31))
            puesto = random.choice(["Cajero", "Gerente", "Supervisor", "Vendedor", "Repartidor"])
            id_empleado = counter
            salario = random_salary()
            planilla = random.choice([True, False])
            counter = counter + 1

        writer.writerow([
            i,
            "|".join(etiquetas),
            fake.first_name(),
            fake.last_name(),
            fake.phone_number(),
            fake.unique.random_int(min=1000000000000, max=9999999999999),  # DPI simulado
            random_date().strftime('%Y-%m-%d'),
            id_cliente, nit, membresia, num_membresia,  # Cliente
            fecha_inicio, puesto, id_empleado, salario, planilla  # Personal
        ])

print(f"Archivo 'personas.csv' generado con {NUM_PERSONAS} personas (Clientes y Personal incluidos).")

NUM_VEHICULOS = 200  # Ajusta según necesidad

def random_date(last_years=5):
    today = datetime.today()
    start_date = today - timedelta(days=last_years * 365)
    return fake.date_between(start_date=start_date, end_date=today)

with open('transporte.csv', 'w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    writer.writerow(['id', 'labels', 'placa', 'modelo', 'capacidad_carga', 'kilometraje', 'ultima_supervision'])

    for i in range(NUM_VEHICULOS):
        writer.writerow([
            i,
            "Transporte",
            fake.unique.license_plate(),
            random.randint(2000, 2024),  # Modelo entre 2000 y 2024
            round(random.uniform(500, 5000), 2),  # Capacidad de carga en kg
            round(random.uniform(10000, 500000), 2),  # Kilometraje
            random_date().strftime('%Y-%m-%d')  # Última supervisión
        ])

print(f"Archivo 'transporte.csv' generado con {NUM_VEHICULOS} vehículos.")

import csv
import random
from faker import Faker
from datetime import datetime, timedelta

fake = Faker()

NUM_SUCURSALES = 15
NUM_ALMACENES = 10
NUM_PROVEEDORES = 20

# Función para generar una fecha aleatoria de inauguración
def random_date(start_year=1990, end_year=2023):
    start_date = datetime(start_year, 1, 1)
    end_date = datetime(end_year, 12, 31)
    return fake.date_between(start_date=start_date, end_date=end_date)

# Generar Sucursales
with open('sucursales.csv', 'w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    writer.writerow(['id', 'labels', 'nombre', 'fecha_inauguracion', 'pedidos_domicilio', 'ubicacion', 'estado'])

    for i in range(NUM_SUCURSALES):
        writer.writerow([
            i,
            "Sucursal",
            fake.company(),
            random_date().strftime('%Y-%m-%d'),
            random.choice([True, False]),
            fake.address(),
            fake.state()
        ])

print(f"Archivo 'sucursales.csv' generado con {NUM_SUCURSALES} sucursales.")

# Generar Almacenes
with open('almacenes.csv', 'w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    writer.writerow(['id', 'labels', 'nombre', 'ubicacion', 'estado', 'tipo', 'capacidad_max', 'capacidad_actual'])

    for i in range(NUM_ALMACENES):
        capacidad_max = [round(random.uniform(5000, 50000), 2) for _ in range(3)]
        capacidad_actual = [round(c * random.uniform(0.2, 0.9), 2) for c in capacidad_max]  # Entre 20% y 90% de su capacidad

        writer.writerow([
            i,
            "Almacen",
            f"Almacén {fake.city()}",
            fake.address(),
            fake.state(),
            random.choice(["Seco", "Refrigerado", "Congelado"]),
            capacidad_max,
            capacidad_actual
        ])

print(f"Archivo 'almacenes.csv' generado con {NUM_ALMACENES} almacenes.")

# Generar Proveedores
with open('proveedores.csv', 'w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    writer.writerow(['id', 'labels', 'nombre', 'ubicacion', 'estado', 'tipo_produccion', 'marca'])

    for i in range(NUM_PROVEEDORES):
        writer.writerow([
            i,
            "Proveedor",
            fake.company(),
            fake.address(),
            fake.state(),
            random.choice(["Manufactura", "Agrícola", "Importación"]),
            fake.company_suffix()  # Simula una marca
        ])

print(f"Archivo 'proveedores.csv' generado con {NUM_PROVEEDORES} proveedores.")

NUM_PRODUCTOS = 3000  # Ajustar según sea necesario

# Categorías y marcas de productos
CATEGORIAS = {
    "Electrónica": ["Samsung", "Apple", "Sony", "LG", "Xiaomi"],
    "Hogar": ["Black+Decker", "Oster", "Hamilton Beach", "T-Fal"],
    "Deportes": ["Nike", "Adidas", "Puma", "Reebok"],
    "Automotriz": ["Michelin", "Bridgestone", "Goodyear", "Castrol"],
    "Alimentos": ["Nestlé", "Kellogg's", "PepsiCo", "Unilever"]
}

# Función para generar precios realistas según la categoría
def generar_precio(categoria):
    if categoria == "Electrónica":
        return round(random.uniform(100, 2000), 2)
    elif categoria == "Hogar":
        return round(random.uniform(20, 500), 2)
    elif categoria == "Deportes":
        return round(random.uniform(15, 300), 2)
    elif categoria == "Automotriz":
        return round(random.uniform(50, 800), 2)
    elif categoria == "Alimentos":
        return round(random.uniform(1, 50), 2)
    return round(random.uniform(10, 1000), 2)

# Generar Productos
with open('productos.csv', 'w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    writer.writerow(['id', 'labels', 'nombre', 'categoria', 'marca', 'precio_unitario', 'local_importado'])

    for i in range(NUM_PRODUCTOS):
        categoria = random.choice(list(CATEGORIAS.keys()))
        marca = random.choice(CATEGORIAS[categoria])
        nombre_producto = f"{fake.word().capitalize()} {marca}"
        precio = generar_precio(categoria)
        local_importado = random.choice([True, False])

        writer.writerow([
            i,
            "Producto",
            nombre_producto,
            categoria,
            marca,
            precio,
            local_importado
        ])

print(f"Archivo 'productos.csv' generado con {NUM_PRODUCTOS} productos.")


