from pydantic import BaseModel, EmailStr
from typing import Optional, List

class Token(BaseModel):
    access_token: str
    token_type: str

class WorkspaceBase(BaseModel):
    name: str

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
