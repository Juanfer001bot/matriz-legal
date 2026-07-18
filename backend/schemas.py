from pydantic import BaseModel
from typing import Optional

class LegalRequirementBase(BaseModel):
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
