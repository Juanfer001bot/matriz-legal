from pydantic import BaseModel, EmailStr
from typing import Optional, List

class Token(BaseModel):
    access_token: str
    token_type: str

class WorkspaceBase(BaseModel):
    name: str
    drive_folder_id: Optional[str] = None

class WorkspaceUpdate(BaseModel):
    drive_folder_id: Optional[str] = None

class WorkspaceCreate(WorkspaceBase):
    pass

class WorkspaceResponse(WorkspaceBase):
    id: int
    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    email: str
    password: str
    workspace_ids: List[int] = []
    allowed_jurisdictions: str = "[]"

class UserUpdate(BaseModel):
    password: Optional[str] = None
    workspace_ids: Optional[List[int]] = None
    allowed_jurisdictions: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    workspaces: List[WorkspaceResponse] = []
    allowed_jurisdictions: str = "[]"

    class Config:
        from_attributes = True

class LegalRequirementBase(BaseModel):
    workspace_id: Optional[int] = None
    tipo_norma: Optional[str] = ""
    numero: Optional[str] = ""
    anio_fecha: Optional[str] = ""
    jurisdiccion_nacional: Optional[str] = ""
    jurisdiccion_local: Optional[str] = ""
    tema: Optional[str] = ""
    titulo: Optional[str] = ""
    breve_descripcion: Optional[str] = ""
    autoridad_aplicacion: Optional[str] = ""
    estado_vigencia: Optional[str] = ""
    articulos_aplicables: Optional[str] = ""
    requisito_obligacion: Optional[str] = ""
    evidencia_cumplimiento: Optional[str] = ""
    estado_cumplimiento: Optional[str] = ""
    link_web: Optional[str] = ""

class LegalRequirementCreate(LegalRequirementBase):
    inbox_id: Optional[int] = None

class LegalRequirementUpdate(LegalRequirementBase):
    pass

class LegalRequirementResponse(LegalRequirementBase):
    id: int

    class Config:
        from_attributes = True

class ScraperInboxResponse(BaseModel):
    id: int
    fecha: str
    jurisdiccion_nacional: str
    jurisdiccion_local: str
    tipo_norma: str
    titulo: str
    autoridad_aplicacion: str
    link_web: Optional[str] = ""

    class Config:
        from_attributes = True

class IncidentReportBase(BaseModel):
    workspace_id: Optional[int] = None
    fecha_reporte: Optional[str] = ""
    fecha_evento: Optional[str] = ""
    ubicacion: Optional[str] = ""
    sector: Optional[str] = ""
    reportador: Optional[str] = ""
    clasificacion: Optional[str] = "" 
    condiciones_entorno: Optional[str] = ""
    relato: Optional[str] = ""
    testigos: Optional[str] = ""
    evidencia: Optional[str] = ""
    datos_especificos: Optional[str] = "{}"
    medida_contencion: Optional[str] = ""
    responsable_contencion: Optional[str] = ""
    fecha_contencion: Optional[str] = ""
    metodologia_acr: Optional[str] = ""
    detalle_acr: Optional[str] = ""
    causas_raiz: Optional[str] = "{}"
    requiere_actualizacion: Optional[str] = "{}"

class IncidentReportCreate(IncidentReportBase):
    pass

class IncidentReportUpdate(IncidentReportBase):
    pass

class IncidentReportResponse(IncidentReportBase):
    id: int

    class Config:
        from_attributes = True

class DocumentBase(BaseModel):
    workspace_id: Optional[int] = None
    codigo: str
    titulo: str
    tipo: str
    version: int
    estado: str
    link_archivo: Optional[str] = ""
    fecha_creacion: Optional[str] = ""
    fecha_aprobacion: Optional[str] = ""
    fecha_proxima_rev: Optional[str] = ""
    autor: Optional[str] = ""
    revisor: Optional[str] = ""
    aprobador: Optional[str] = ""
    motivo_cambio: Optional[str] = ""

class DocumentCreate(DocumentBase):
    pass

class DocumentUpdate(DocumentBase):
    pass

class DocumentResponse(DocumentBase):
    id: int

    class Config:
        from_attributes = True

class DocumentStatusUpdate(BaseModel):
    nuevo_estado: str
    comentario: Optional[str] = ""

class DocumentAuditLogResponse(BaseModel):
    id: int
    document_id: int
    fecha: str
    usuario: str
    accion: str
    comentario: Optional[str] = ""

    class Config:
        from_attributes = True

class DocumentReadReceiptResponse(BaseModel):
    id: int
    document_id: int
    usuario_email: str
    fecha_lectura: str

    class Config:
        from_attributes = True

class BulkDeleteRequest(BaseModel):
    item_ids: List[int]

class ActionPlanBase(BaseModel):
    workspace_id: Optional[int] = None
    requirement_id: Optional[int] = None
    nc_id: Optional[str] = ""
    origen_nc: Optional[str] = ""
    responsable: Optional[str] = ""
    fecha_compromiso: Optional[str] = ""
    accion_implementar: Optional[str] = ""
    estado_avance: Optional[str] = "Pendiente"
    fecha_cierre: Optional[str] = ""

class ActionPlanCreate(ActionPlanBase):
    pass

class ActionPlanUpdate(ActionPlanBase):
    pass

class ActionPlanResponse(ActionPlanBase):
    id: int

    class Config:
        from_attributes = True

class MeetingMinuteBase(BaseModel):
    workspace_id: Optional[int] = None
    fecha: Optional[str] = ""
    participantes: Optional[str] = ""
    temas_tratados: Optional[str] = ""
    archivo_adjunto: Optional[str] = ""

class MeetingMinuteCreate(MeetingMinuteBase):
    pass

class MeetingMinuteUpdate(MeetingMinuteBase):
    pass

class MeetingMinuteResponse(MeetingMinuteBase):
    id: int
    class Config:
        from_attributes = True

class ConsultationBase(BaseModel):
    workspace_id: Optional[int] = None
    fecha: Optional[str] = ""
    tipo: Optional[str] = "Consulta"
    detalle: Optional[str] = ""
    es_anonimo: Optional[int] = 0
    autor: Optional[str] = ""
    estado: Optional[str] = "Pendiente"
    analisis_gestor: Optional[str] = ""
    archivo_adjunto: Optional[str] = ""

class ConsultationCreate(ConsultationBase):
    pass

class ConsultationUpdate(ConsultationBase):
    pass

class ConsultationResponse(ConsultationBase):
    id: int
    class Config:
        from_attributes = True
