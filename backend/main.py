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

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from zoneinfo import ZoneInfo
from .database import SessionLocal

scheduler = AsyncIOScheduler()

async def scheduled_scraping():
    db = SessionLocal()
    try:
        print("⏰ Ejecutando escaneo automático programado...")
        await scrape_boletin_oficial(db)
    except Exception as e:
        print(f"Error en el escaneo automático: {e}")
    finally:
        db.close()

@app.on_event("startup")
def start_scheduler():
    tz = ZoneInfo('America/Argentina/Buenos_Aires')
    trigger = CronTrigger(hour=8, minute=0, timezone=tz)
    scheduler.add_job(scheduled_scraping, trigger)
    scheduler.start()
    print("⏰ Reloj biológico interno iniciado (alarma a las 8:00 AM AR).")

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

import httpx
from pydantic import BaseModel
from typing import Any, Dict
from .chatbot import get_chatbot_response
from .notifications import send_telegram_alert, TELEGRAM_BOT_TOKEN

class TelegramWebhook(BaseModel):
    update_id: int
    message: Dict[str, Any] = None

@app.post("/api/bot/webhook")
async def telegram_webhook(update: TelegramWebhook, db: Session = Depends(get_db)):
    if update.message and "text" in update.message and "chat" in update.message:
        chat_id = str(update.message["chat"]["id"])
        texto_usuario = update.message["text"]
        
        # Opcional: Podrías verificar si chat_id está en TELEGRAM_CHAT_IDS para seguridad
        
        # 1. Avisar que estamos pensando (opcional, pero da buen UX)
        # 2. Consultar a Gemini
        respuesta_ia = await get_chatbot_response(texto_usuario, db)
        
        # 3. Enviar respuesta usando httpx directamente a ese chat_id
        if TELEGRAM_BOT_TOKEN:
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
            payload = {"chat_id": chat_id, "text": respuesta_ia}
            async with httpx.AsyncClient() as client:
                await client.post(url, json=payload)
                
    return {"status": "ok"}

@app.get("/api/bot/set-webhook")
async def set_telegram_webhook(url: str):
    """Llama a este endpoint pasándole la URL de tu app en Render (ej: url=https://matriz-legal.onrender.com/api/bot/webhook)"""
    if not TELEGRAM_BOT_TOKEN:
        return {"error": "Falta TELEGRAM_BOT_TOKEN"}
    
    tg_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook"
    async with httpx.AsyncClient() as client:
        res = await client.post(tg_url, json={"url": url})
        return res.json()

from seed_db import seed
from seed_351 import seed_351
from .notifications import send_email_alert

# Endpoint temporal para cargar leyes
@app.get("/api/bot/cargar-leyes-oculto")
def cargar_leyes():
    try:
        seed()
        seed_351()
        return {"status": "success", "message": "Leyes cargadas con éxito"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Endpoint temporal para forzar un correo de prueba (y ver errores)
@app.get("/api/bot/force-test-email")
def force_test_email():
    try:
        send_email_alert("TEST - Matriz Legal", "Este es un correo de prueba forzado. Si lo ves, el correo funciona bien.")
        return {"status": "success", "message": "Correo enviado sin errores desde el servidor."}
    except Exception as e:
        return {"status": "error", "message": f"Fallo al enviar correo: {str(e)}"}

# Servir Frontend
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

