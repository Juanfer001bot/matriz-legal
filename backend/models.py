from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    requirements = relationship("LegalRequirement", back_populates="owner")

class LegalRequirement(Base):
    __tablename__ = "legal_requirements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
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

    owner = relationship("User", back_populates="requirements")

