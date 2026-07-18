from sqlalchemy import Column, Integer, String, Text, ForeignKey, Table
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

user_workspaces = Table(
    'user_workspaces',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('workspace_id', Integer, ForeignKey('workspaces.id'))
)

class Workspace(Base):
    __tablename__ = "workspaces"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    
    users = relationship("User", secondary=user_workspaces, back_populates="workspaces")
    requirements = relationship("LegalRequirement", back_populates="workspace")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    workspaces = relationship("Workspace", secondary=user_workspaces, back_populates="users")

class LegalRequirement(Base):
    __tablename__ = "legal_requirements"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"))
    
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

    workspace = relationship("Workspace", back_populates="requirements")

