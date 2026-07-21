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
    name = Column(String, unique=True, index=True)
    drive_folder_id = Column(String, nullable=True)
    
    users = relationship("User", secondary=user_workspaces, back_populates="workspaces")
    requirements = relationship("LegalRequirement", back_populates="workspace")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    allowed_jurisdictions = Column(String, default="[]")

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
    link_web = Column(String, nullable=True)

    workspace = relationship("Workspace", back_populates="requirements")


class ScraperInbox(Base):
    __tablename__ = "scraper_inbox"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(String, default="")
    jurisdiccion_nacional = Column(String, default="")
    jurisdiccion_local = Column(String, default="")
    tipo_norma = Column(String, default="")
    titulo = Column(Text, default="")
    autoridad_aplicacion = Column(String, default="")
    link_web = Column(String, nullable=True)


class ActionPlan(Base):
    __tablename__ = "action_plans"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"))
    requirement_id = Column(Integer, ForeignKey("legal_requirements.id"), nullable=True)
    
    nc_id = Column(String, default="")
    origen_nc = Column(String, default="")
    responsable = Column(String, default="")
    fecha_compromiso = Column(String, default="")
    accion_implementar = Column(Text, default="")
    estado_avance = Column(String, default="Pendiente")
    fecha_cierre = Column(String, default="")

    workspace = relationship("Workspace")
    requirement = relationship("LegalRequirement")

class WorkspaceIntegration(Base):
    __tablename__ = "workspace_integrations"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), unique=True)
    kobo_webhook_secret = Column(String, default="")

    workspace = relationship("Workspace")

class MeetingMinute(Base):
    __tablename__ = "meeting_minutes"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"))
    
    fecha = Column(String, default="")
    participantes = Column(Text, default="")
    temas_tratados = Column(Text, default="")
    archivo_adjunto = Column(Text, default="")  # Para base64 o link

    workspace = relationship("Workspace")

class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"))
    
    fecha = Column(String, default="")
    tipo = Column(String, default="Consulta") # Consulta, Sugerencia, Aviso de Riesgo
    detalle = Column(Text, default="")
    es_anonimo = Column(Integer, default=0) # 1 = Si, 0 = No
    autor = Column(String, default="")
    estado = Column(String, default="Pendiente")
    analisis_gestor = Column(Text, default="")
    archivo_adjunto = Column(Text, default="")

    workspace = relationship("Workspace")

class IncidentReport(Base):
    __tablename__ = "incident_reports"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"))
    
    # 1. Datos Generales
    fecha_reporte = Column(String, default="")
    fecha_evento = Column(String, default="")
    ubicacion = Column(String, default="")
    sector = Column(String, default="")
    reportador = Column(String, default="")
    clasificacion = Column(String, default="") # JSON list string of selected categories
    condiciones_entorno = Column(Text, default="")
    
    # 2. Descripción
    relato = Column(Text, default="")
    testigos = Column(Text, default="")
    evidencia = Column(Text, default="")
    
    # 3. Módulos Condicionales ISO (Stored as JSON string)
    datos_especificos = Column(Text, default="{}")
    
    # 4. Corrección Inmediata
    medida_contencion = Column(Text, default="")
    responsable_contencion = Column(String, default="")
    fecha_contencion = Column(String, default="")
    
    # 5. ACR
    metodologia_acr = Column(String, default="")
    detalle_acr = Column(Text, default="")
    causas_raiz = Column(Text, default="{}") # JSON of personal, trabajo, equipos, entorno, gestion
    
    # 7. Gestión de Cambio
    requiere_actualizacion = Column(Text, default="{}") # JSON of checkboxes
    
    workspace = relationship("Workspace")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"))
    
    codigo = Column(String, index=True)
    titulo = Column(String)
    tipo = Column(String)
    version = Column(Integer, default=0)
    estado = Column(String, default="Borrador") # Borrador, Pendiente Revisión, Pendiente Aprobación, Vigente, Obsoleto
    link_archivo = Column(Text, default="")
    
    fecha_creacion = Column(String, default="")
    fecha_aprobacion = Column(String, default="")
    fecha_proxima_rev = Column(String, default="")
    
    autor = Column(String, default="")
    revisor = Column(String, default="")
    aprobador = Column(String, default="")
    motivo_cambio = Column(Text, default="")

    workspace = relationship("Workspace")

class DocumentAuditLog(Base):
    __tablename__ = "document_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    fecha = Column(String)
    usuario = Column(String)
    accion = Column(String)
    comentario = Column(Text, default="")

class DocumentReadReceipt(Base):
    __tablename__ = "document_read_receipts"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    usuario_email = Column(String)
    fecha_lectura = Column(String)
