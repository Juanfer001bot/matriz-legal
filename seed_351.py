import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import Base, LegalRequirement
from backend.database import SessionLocal, init_db

def seed_351():
    init_db()
    db = SessionLocal()
    
    # 1. Eliminar la entrada genérica del Decreto 351/1979 si existe
    generic_351 = db.query(LegalRequirement).filter(
        LegalRequirement.numero_anio == "351/1979",
        LegalRequirement.titulo_tema.like("Reglamento de la Ley%")
    ).first()
    
    if generic_351:
        db.delete(generic_351)
        db.commit()
    
    # 2. Agregar los capítulos específicos
    capitulos = [
        ("Capítulo 5", "Proyecto de Instalación, ampliación, acondicionamiento y modificación."),
        ("Capítulo 6", "Provisión de Agua Potable."),
        ("Capítulo 7", "Desagües Industriales."),
        ("Capítulo 8", "Carga Térmica."),
        ("Capítulo 9", "Contaminación Ambiental."),
        ("Capítulo 10", "Radiaciones."),
        ("Capítulo 11", "Ventilación."),
        ("Capítulo 12", "Iluminación y Color."),
        ("Capítulo 13", "Ruidos y Vibraciones."),
        ("Capítulo 14", "Instalaciones Eléctricas."),
        ("Capítulo 15", "Máquinas y Herramientas."),
        ("Capítulo 16", "Aparatos para Izar, Ascensores y Montacargas."),
        ("Capítulo 17", "Aparatos Sometidos a Presión."),
        ("Capítulo 18", "Protección contra Incendios."),
        ("Capítulo 19", "Equipos de Protección Personal (EPP)."),
        ("Capítulo 20", "Capacitación."),
        ("Capítulo 21", "Registro de Accidentes y Enfermedades Profesionales.")
    ]
    
    count = 0
    for cap, tema in capitulos:
        titulo_completo = f"{cap} - {tema}"
        existe = db.query(LegalRequirement).filter(
            LegalRequirement.numero_anio == "351/1979", 
            LegalRequirement.titulo_tema == titulo_completo
        ).first()
        
        if not existe:
            req = LegalRequirement(
                ambito="SST",
                jurisdiccion="Nacional",
                tipo_norma="Decreto",
                numero_anio="351/1979",
                titulo_tema=titulo_completo,
                autoridad_aplicacion="SRT",
                estado_vigencia="Vigente",
                estado_cumplimiento="No Evaluado"
            )
            db.add(req)
            count += 1
            
    db.commit()
    print(f"Se desglosó el Decreto 351/1979 agregando {count} capítulos a la Matriz Legal.")
    db.close()

if __name__ == "__main__":
    seed_351()
