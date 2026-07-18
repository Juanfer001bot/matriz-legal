import os
import sys
import pandas as pd
from sqlalchemy.orm import Session
from datetime import datetime

# Adjust Python path so we can import backend modules from the project root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import engine, SessionLocal
from backend.models import Base, LegalRequirement, User
from backend.auth import get_password_hash

def seed_from_excel(excel_path="Matriz Legal Integrada.xlsx", email="juan@test.com"):
    print("Iniciando reseteo de la base de datos...")
    
    # Drop and recreate tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Base de datos limpia creada.")

    if not os.path.exists(excel_path):
        raise FileNotFoundError(f"Error: No se encontró el archivo {excel_path} en el directorio actual: {os.getcwd()}")

    print("Leyendo Excel...")
    df = pd.read_excel(excel_path)
    df = df.fillna("")

    db: Session = SessionLocal()
    
    # Crear usuario default si no existe
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, hashed_password=get_password_hash("password123"))
        db.add(user)
        db.commit()
        db.refresh(user)
    
    agregados = 0
    for _, row in df.iterrows():
        req = LegalRequirement(
            user_id=user.id,
            tipo_norma=str(row.get('Tipo de norma', '')),
            numero=str(row.get('Numero', '')),
            anio_fecha=str(row.get('Año / Fecha de Publicación', '')),
            jurisdiccion_nacional=str(row.get('Jurisdicción Nacional', '')),
            jurisdiccion_local=str(row.get('Jurisdicción Local/Provincial', '')),
            tema=str(row.get('Tema', '')),
            titulo=str(row.get('Titulo', '')),
            breve_descripcion=str(row.get('Breve descripción', '')),
            autoridad_aplicacion=str(row.get('Autoridad de Aplicación', '')),
            estado_vigencia=str(row.get('Estado de Vigencia', '')),
            articulos_aplicables=str(row.get('Artículo(s) Aplicable(s)', '')),
            requisito_obligacion=str(row.get('Requisito / Obligación Específica', '')),
            evidencia_cumplimiento=str(row.get('Evidencia de Cumplimiento', '')),
            estado_cumplimiento=str(row.get('Estado de Cumplimiento', ''))
        )
        db.add(req)
        agregados += 1
        
    try:
        db.commit()
        print(f"¡Éxito! Se han importado {agregados} requisitos a la matriz.")
        return agregados
    except Exception as e:
        db.rollback()
        print(f"Error al guardar en base de datos: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_from_excel()
