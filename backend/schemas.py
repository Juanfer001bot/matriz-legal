from pydantic import BaseModel
from typing import Optional

class LegalRequirementBase(BaseModel):
    ambito: Optional[str] = ""
    jurisdiccion: Optional[str] = "Nacional"
    tipo_norma: Optional[str] = ""
    numero_anio: Optional[str] = ""
    autoridad_aplicacion: Optional[str] = ""
    titulo_tema: Optional[str] = ""
    estado_vigencia: Optional[str] = "Vigente"

    articulos_aplicables: Optional[str] = ""
    obligacion_requisito: Optional[str] = ""
    justificacion_aplicabilidad: Optional[str] = ""
    vinculacion_tecnica: Optional[str] = ""
    frecuencia_cumplimiento: Optional[str] = ""

    estado_cumplimiento: Optional[str] = "No Evaluado"
    evidencia_objetiva: Optional[str] = ""
    fecha_ultima_evaluacion: Optional[str] = ""
    responsable_evaluacion: Optional[str] = ""
    proxima_fecha_evaluacion: Optional[str] = ""

    accion_correctiva: Optional[str] = ""
    numero_nc: Optional[str] = ""
    responsable_accion: Optional[str] = ""
    fecha_limite: Optional[str] = ""

class LegalRequirementCreate(LegalRequirementBase):
    pass

class LegalRequirementUpdate(LegalRequirementBase):
    pass

class LegalRequirementResponse(LegalRequirementBase):
    id: int

    class Config:
        from_attributes = True
