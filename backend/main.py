import os
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List

from . import models, schemas
from .database import engine, init_db, get_db
from .scraper import scrape_boletin_oficial

# Inicializar Base de Datos
init_db()

app = FastAPI(title="Matriz Legal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Endpoints
@app.get("/api/requirements", response_model=List[schemas.LegalRequirementResponse])
def get_requirements(db: Session = Depends(get_db)):
    return db.query(models.LegalRequirement).all()

@app.post("/api/requirements", response_model=schemas.LegalRequirementResponse)
def create_requirement(req: schemas.LegalRequirementCreate, db: Session = Depends(get_db)):
    db_req = models.LegalRequirement(**req.model_dump())
    db.add(db_req)
    db.commit()
    db.refresh(db_req)
    return db_req

@app.put("/api/requirements/{req_id}", response_model=schemas.LegalRequirementResponse)
def update_requirement(req_id: int, req: schemas.LegalRequirementUpdate, db: Session = Depends(get_db)):
    db_req = db.query(models.LegalRequirement).filter(models.LegalRequirement.id == req_id).first()
    if not db_req:
        raise HTTPException(status_code=404, detail="Requisito no encontrado")
    
    for key, value in req.model_dump().items():
        setattr(db_req, key, value)
        
    db.commit()
    db.refresh(db_req)
    return db_req

@app.delete("/api/requirements/{req_id}")
def delete_requirement(req_id: int, db: Session = Depends(get_db)):
    db_req = db.query(models.LegalRequirement).filter(models.LegalRequirement.id == req_id).first()
    if not db_req:
        raise HTTPException(status_code=404, detail="Requisito no encontrado")
    db.delete(db_req)
    db.commit()
    return {"message": "Requisito eliminado exitosamente"}

# Endpoint para Cron-job externo
@app.post("/api/bot/run-scraper")
async def trigger_scraper(authorization: str = Header(None), db: Session = Depends(get_db)):
    cron_secret = os.getenv("CRON_SECRET", "mi_clave_secreta_123")
    if authorization != f"Bearer {cron_secret}":
        raise HTTPException(status_code=401, detail="No autorizado")
    
    await scrape_boletin_oficial(db)
    return {"status": "success", "message": "Scraping ejecutado"}

# Servir Frontend
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

