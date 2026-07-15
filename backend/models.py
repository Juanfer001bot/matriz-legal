from sqlalchemy import Column, Integer, String, Date, Text
from sqlalchemy.orm import declarative_base
from datetime import date

Base = declarative_base()

class LegalRequirement(Base):
    __tablename__ = "legal_requirements"

    # 1. Identificación del Requisito
    id = Column(Integer, primary_key=True, index=True)
    ambito = Column(String, default="")
    jurisdiccion = Column(String, default="Nacional")
    tipo_norma = Column(String, default="")
    numero_anio = Column(String, default="")
    autoridad_aplicacion = Column(String, default="")
    titulo_tema = Column(Text, default="")
    estado_vigencia = Column(String, default="Vigente")

    # 2. Análisis de Aplicabilidad
    articulos_aplicables = Column(Text, default="")
    obligacion_requisito = Column(Text, default="")
    justificacion_aplicabilidad = Column(Text, default="")
    vinculacion_tecnica = Column(String, default="")
    frecuencia_cumplimiento = Column(String, default="")

    # 3. Evaluación de Cumplimiento
    estado_cumplimiento = Column(String, default="No Evaluado")  # Cumple, No Cumple, En Proceso, No Evaluado, A Revisar
    evidencia_objetiva = Column(Text, default="")
    fecha_ultima_evaluacion = Column(String, default="")
    responsable_evaluacion = Column(String, default="")
    proxima_fecha_evaluacion = Column(String, default="")

    # 4. Gestión de Desvíos y Acciones
    accion_correctiva = Column(Text, default="")
    numero_nc = Column(String, default="")
    responsable_accion = Column(String, default="")
    fecha_limite = Column(String, default="")

