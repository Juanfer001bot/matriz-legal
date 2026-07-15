import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import Base, LegalRequirement
from backend.database import SessionLocal, init_db

def seed():
    init_db()
    db = SessionLocal()
    
    normativas = [
        # MEDIO AMBIENTE
        {
            "ambito": "Medio Ambiente",
            "jurisdiccion": "Nacional",
            "tipo_norma": "Ley",
            "numero_anio": "25.675",
            "titulo_tema": "Ley General del Ambiente. Establece los presupuestos mínimos para el logro de una gestión sustentable y adecuada del ambiente, la preservación y protección de la diversidad biológica y la implementación del desarrollo sustentable.",
            "autoridad_aplicacion": "Ministerio de Ambiente y Desarrollo Sostenible"
        },
        {
            "ambito": "Medio Ambiente",
            "jurisdiccion": "Nacional",
            "tipo_norma": "Ley",
            "numero_anio": "24.051",
            "titulo_tema": "Régimen de Residuos Peligrosos. Generación, manipulación, transporte, tratamiento y disposición final de residuos peligrosos.",
            "autoridad_aplicacion": "Ministerio de Ambiente y Desarrollo Sostenible"
        },
        {
            "ambito": "Medio Ambiente",
            "jurisdiccion": "Nacional",
            "tipo_norma": "Decreto",
            "numero_anio": "831/1993",
            "titulo_tema": "Decreto Reglamentario de la Ley 24.051 de Residuos Peligrosos.",
            "autoridad_aplicacion": "Ministerio de Ambiente y Desarrollo Sostenible"
        },
        {
            "ambito": "Medio Ambiente",
            "jurisdiccion": "Nacional",
            "tipo_norma": "Ley",
            "numero_anio": "25.612",
            "titulo_tema": "Gestión Integral de Residuos Industriales y de Actividades de Servicios.",
            "autoridad_aplicacion": "Ministerio de Ambiente y Desarrollo Sostenible"
        },
        {
            "ambito": "Medio Ambiente",
            "jurisdiccion": "Nacional",
            "tipo_norma": "Ley",
            "numero_anio": "25.688",
            "titulo_tema": "Régimen de Gestión Ambiental de Aguas. Presupuestos mínimos ambientales para la preservación de las aguas, su aprovechamiento y uso racional.",
            "autoridad_aplicacion": "Ministerio de Ambiente y Desarrollo Sostenible"
        },
        {
            "ambito": "Medio Ambiente",
            "jurisdiccion": "Nacional",
            "tipo_norma": "Ley",
            "numero_anio": "27.520",
            "titulo_tema": "Ley de Presupuestos Mínimos de Adaptación y Mitigación al Cambio Climático Global.",
            "autoridad_aplicacion": "Ministerio de Ambiente y Desarrollo Sostenible"
        },
        
        # HIGIENE Y SEGURIDAD (SST)
        {
            "ambito": "SST",
            "jurisdiccion": "Nacional",
            "tipo_norma": "Ley",
            "numero_anio": "19.587",
            "titulo_tema": "Ley de Higiene y Seguridad en el Trabajo. Condiciones de seguridad e higiene que deben cumplirse en todos los lugares de trabajo.",
            "autoridad_aplicacion": "Superintendencia de Riesgos del Trabajo (SRT)"
        },
        {
            "ambito": "SST",
            "jurisdiccion": "Nacional",
            "tipo_norma": "Decreto",
            "numero_anio": "351/1979",
            "titulo_tema": "Reglamento de la Ley 19.587 de Higiene y Seguridad en el Trabajo. (Industria en general).",
            "autoridad_aplicacion": "SRT"
        },
        {
            "ambito": "SST",
            "jurisdiccion": "Nacional",
            "tipo_norma": "Ley",
            "numero_anio": "24.557",
            "titulo_tema": "Ley de Riesgos del Trabajo (LRT). Prevención de riesgos y reparación de daños derivados del trabajo.",
            "autoridad_aplicacion": "SRT"
        },
        {
            "ambito": "SST",
            "jurisdiccion": "Nacional",
            "tipo_norma": "Resolución",
            "numero_anio": "295/2003",
            "titulo_tema": "Especificaciones técnicas sobre ergonomía y levantamiento manual de cargas, radiaciones, estrés térmico, etc.",
            "autoridad_aplicacion": "SRT"
        },
        {
            "ambito": "SST",
            "jurisdiccion": "Nacional",
            "tipo_norma": "Resolución",
            "numero_anio": "905/2015",
            "titulo_tema": "Funciones que deben desarrollar los Servicios de Higiene y Seguridad en el Trabajo y de Medicina del Trabajo.",
            "autoridad_aplicacion": "SRT"
        },
        {
            "ambito": "SST",
            "jurisdiccion": "Nacional",
            "tipo_norma": "Resolución",
            "numero_anio": "886/2015",
            "titulo_tema": "Protocolo de Ergonomía. Planilla de identificación de factores de riesgo ergonómico.",
            "autoridad_aplicacion": "SRT"
        },

        # ENERGÍA
        {
            "ambito": "Energía",
            "jurisdiccion": "Nacional",
            "tipo_norma": "Ley",
            "numero_anio": "15.336",
            "titulo_tema": "Ley de Energía Eléctrica.",
            "autoridad_aplicacion": "Secretaría de Energía"
        },
        {
            "ambito": "Energía",
            "jurisdiccion": "Nacional",
            "tipo_norma": "Ley",
            "numero_anio": "24.065",
            "titulo_tema": "Régimen de la Energía Eléctrica. Marco regulatorio eléctrico.",
            "autoridad_aplicacion": "ENRE (Ente Nacional Regulador de la Electricidad)"
        },
        {
            "ambito": "Energía",
            "jurisdiccion": "Nacional",
            "tipo_norma": "Ley",
            "numero_anio": "27.191",
            "titulo_tema": "Régimen de Fomento Nacional para el uso de Fuentes Renovables de Energía destinada a la Producción de Energía Eléctrica.",
            "autoridad_aplicacion": "Secretaría de Energía"
        },
        {
            "ambito": "Energía",
            "jurisdiccion": "Nacional",
            "tipo_norma": "Ley",
            "numero_anio": "27.424",
            "titulo_tema": "Régimen de Fomento a la Generación Distribuida de Energía Renovable integrada a la Red Eléctrica Pública.",
            "autoridad_aplicacion": "Secretaría de Energía"
        },
        {
            "ambito": "Energía",
            "jurisdiccion": "Nacional",
            "tipo_norma": "Ley",
            "numero_anio": "17.319",
            "titulo_tema": "Ley de Hidrocarburos. Exploración, explotación, industrialización, transporte y comercialización de hidrocarburos.",
            "autoridad_aplicacion": "Secretaría de Energía"
        },
        {
            "ambito": "Energía",
            "jurisdiccion": "Nacional",
            "tipo_norma": "Ley",
            "numero_anio": "27.640",
            "titulo_tema": "Marco Regulatorio de Biocombustibles.",
            "autoridad_aplicacion": "Secretaría de Energía"
        }
    ]

    count = 0
    for n in normativas:
        existe = db.query(LegalRequirement).filter(LegalRequirement.numero_anio == n["numero_anio"], LegalRequirement.tipo_norma == n["tipo_norma"]).first()
        if not existe:
            req = LegalRequirement(
                ambito=n["ambito"],
                jurisdiccion=n["jurisdiccion"],
                tipo_norma=n["tipo_norma"],
                numero_anio=n["numero_anio"],
                titulo_tema=n["titulo_tema"],
                autoridad_aplicacion=n["autoridad_aplicacion"],
                estado_vigencia="Vigente",
                estado_cumplimiento="No Evaluado"
            )
            db.add(req)
            count += 1
            
    db.commit()
    print(f"Se agregaron {count} normativas semilla a la Matriz Legal.")
    db.close()

if __name__ == "__main__":
    seed()
