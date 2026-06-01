import os
import psycopg2

def main():
    migration_path = os.path.join(os.path.dirname(__file__), '..', '..', 'supabase', 'migrations', '001_init.sql')
    if not os.path.exists(migration_path):
        print(f"ERROR: No se encontró el archivo de migración en: {migration_path}")
        return

    # Leer SQL
    with open(migration_path, 'r') as f:
        sql = f.read()

    project_ref = "rxiljcyrexddrkqowzes"
    user = f"postgres.{project_ref}"
    password = "DanielaTatianaLuchis"
    database = "postgres"

    host = "aws-1-us-east-2.pooler.supabase.com"
    connected_host = host
    print(f"Conectando a {host} en puerto 6543...")
    try:
        conn = psycopg2.connect(
            host=host,
            port=6543,
            user=user,
            password=password,
            database=database,
            connect_timeout=10
        )
        print(f"¡Conectado exitosamente a {host}!")
    except Exception as e:
        print(f"ERROR: No se pudo conectar al pooler de Supabase: {e}")
        return

    conn.autocommit = True
    cursor = conn.cursor()

    print(f"Aplicando migración SQL en {connected_host}...")
    try:
        cursor.execute(sql)
        print("¡MIGRACIÓN APLICADA EXITOSAMENTE EN SUPABASE!")
    except Exception as e:
        print(f"Error al ejecutar la migración: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
