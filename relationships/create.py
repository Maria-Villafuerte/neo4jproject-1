import csv
import random
from faker import Faker

fake = Faker()

NUM_PERSONAS = 2000
NUM_CLIENTES = 1195
NUM_PERSONAL = 875
NUM_TRANSPORTES = 200
NUM_SUCURSALES = 15
NUM_ALMACENES = 10
NUM_PROVEEDORES = 20
NUM_PRODUCTOS = 3000


DIA_PREFERIDO = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
HORAS = ["Mañana", "Tarde", "Noche"]
ESTADOS = ["Activo", "Suspendido", "Baja"]
DISPONIBILIDAD = ["Disponible", "En ruta", "Mantenimiento"]
DIAS_LABORALES = ["Lunes a Viernes", "Lunes a Sábado", "Turnos rotativos"]
PASILLOS = [f"P-{i}" for i in range(1, 11)]
ESTANTERIAS = [f"E-{i}" for i in range(1, 21)]
FRECUENCIAS = ["Diario", "Semanal", "Mensual", "Trimestral"]

# 🏪 Función para 'TIENE' (Sucursal → Producto)
def generar_tiene():
    with open('tiene.csv', 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['start_id', 'start_label', 'type', 'end_id', 'end_label', 'cantidad', 'pasillo', 'estanteria'])

        for _ in range(1500):
            writer.writerow([
                random.randint(0, NUM_SUCURSALES - 1), 'Sucursal', 'TIENE',
                random.randint(0, NUM_PRODUCTOS - 1), 'Producto',
                random.randint(1, 100), random.choice(PASILLOS), random.choice(ESTANTERIAS)
            ])

# 📦 Función para 'ALMACENA' (Almacén → Producto)
def generar_almacena():
    with open('almacena.csv', 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['start_id', 'start_label', 'type', 'end_id', 'end_label', 'cantidad', 'pasillo', 'estanteria'])

        for _ in range(1500):
            writer.writerow([
                random.randint(0, NUM_ALMACENES - 1), 'Almacen', 'ALMACENA',
                random.randint(0, NUM_PRODUCTOS - 1), 'Producto',
                random.randint(1, 200), random.choice(PASILLOS), random.choice(ESTANTERIAS)
            ])

# 🏭 Función para 'PRODUCE' (Proveedor → Producto)
def generar_produce():
    with open('produce.csv', 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['start_id', 'start_label', 'type', 'end_id', 'end_label', 'frecuencia_produccion', 'cantidad_minima'])

        for _ in range(1500):
            writer.writerow([
                random.randint(0, NUM_PROVEEDORES - 1), 'Proveedor', 'PRODUCE',
                random.randint(0, NUM_PRODUCTOS - 1), 'Producto',
                random.choice(FRECUENCIAS), random.randint(50, 500)
            ])

# 🚛 Función para 'PROVEE' (Proveedor → Almacén)
def generar_provee():
    with open('provee.csv', 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['start_id', 'start_label', 'type', 'end_id', 'end_label', 'ultimo_envio', 'cantidad_envios', 'frecuencia_envios'])

        for _ in range(100):
            writer.writerow([
                random.randint(0, NUM_PROVEEDORES - 1), 'Proveedor', 'PROVEE',
                random.randint(0, NUM_ALMACENES - 1), 'Almacen',
                fake.date_this_year(), random.randint(10, 200), random.choice(FRECUENCIAS)
            ])

# 🔄 Función para 'SUMINISTRA' (Almacén → Sucursal)
def generar_suministra():
    with open('suministra.csv', 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['start_id', 'start_label', 'type', 'end_id', 'end_label', 'ultimo_envio', 'cantidad_envios', 'frecuencia_envios'])

        for _ in range(100):
            writer.writerow([
                random.randint(0, NUM_ALMACENES - 1), 'Almacen', 'SUMINISTRA',
                random.randint(0, NUM_SUCURSALES - 1), 'Sucursal',
                fake.date_this_year(), random.randint(20, 300), random.choice(FRECUENCIAS)
            ])

# 👥 Función para 'RECURRE' (Cliente → Sucursal)
def generar_recurre():
    with open('recurre.csv', 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['start_id', 'start_label', 'type', 'end_id', 'end_label', 'ultima_visita', 'dia_preferido', 'hora_preferida'])

        for i in range(NUM_CLIENTES):
            writer.writerow([
                i, 'Cliente', 'RECURRE',
                random.randint(0, NUM_SUCURSALES - 1), 'Sucursal',
                fake.date_this_year(), random.choice(DIA_PREFERIDO), random.choice(HORAS)
            ])

# 💼 Función para 'TRABAJA EN' (Personal → Sucursal/Almacén)
def generar_trabaja_en():
    with open('trabaja_en.csv', 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['start_id', 'start_label', 'type', 'end_id', 'end_label', 'horario', 'dias_laborales', 'estado'])

        for i in range(NUM_PERSONAL):
            lugar = random.choice(["Sucursal", "Almacen"])
            writer.writerow([
                i, 'Personal', 'TRABAJA_EN',
                random.randint(0, NUM_SUCURSALES - 1) if lugar == "Sucursal" else random.randint(0, NUM_ALMACENES - 1), lugar,
                fake.time(), random.choice(DIAS_LABORALES), random.choice(ESTADOS)
            ])

# 🚚 Función para 'ASIGNADO A' (Transporte → Sucursal/Almacén)
def generar_asignado_a():
    with open('asignado_a.csv', 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['start_id', 'start_label', 'type', 'end_id', 'end_label', 'fecha_asignacion', 'disponibilidad', 'cantidad_de_viajes'])

        for i in range(NUM_TRANSPORTES):
            destino = random.choice(["Sucursal", "Almacen"])
            writer.writerow([
                i, 'Transporte', 'ASIGNADO_A',
                random.randint(0, NUM_SUCURSALES - 1) if destino == "Sucursal" else random.randint(0, NUM_ALMACENES - 1), destino,
                fake.date_this_year(), random.choice(DISPONIBILIDAD), random.randint(5, 100)
            ])

# 🔥 Generar todos los archivos
if __name__ == "__main__":
    generar_tiene()
    generar_almacena()
    generar_produce()
    generar_provee()
    generar_suministra()
    generar_recurre()
    generar_trabaja_en()
    generar_asignado_a()

    print("✅ Todos los archivos de relaciones han sido generados.")


