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

class LegalRequirementCreate(LegalRequirementBase):
    pass

class LegalRequirementUpdate(LegalRequirementBase):
    pass

class LegalRequirementResponse(LegalRequirementBase):
    id: int

    class Config:
        from_attributes = True
