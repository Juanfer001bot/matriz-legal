from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class LegalRequirement(Base):
    __tablename__ = "legal_requirements"

    id = Column(Integer, primary_key=True, index=True)
    tipo_norma = Column(String, default="")
    numero = Column(String, default="")
    anio_fecha = Column(String, default="")
    jurisdiccion_nacional = Column(String, default="")
    jurisdiccion_local = Column(String, default="")
    tema = Column(String, default="")
    titulo = Column(Text, default="")
    breve_descripcion = Column(Text, default="")
    autoridad_aplicacion = Column(String, default="")
    estado_vigencia = Column(String, default="")
    articulos_aplicables = Column(Text, default="")
    requisito_obligacion = Column(Text, default="")
    evidencia_cumplimiento = Column(Text, default="")
    estado_cumplimiento = Column(String, default="")

