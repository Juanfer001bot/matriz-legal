import os
from fastapi import FastAPI, Depends, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from zoneinfo import ZoneInfo
import httpx
from pydantic import BaseModel

from . import models, schemas
from .database import engine, init_db, get_db, SessionLocal
from .scraper import scrape_boletin_oficial
from .chatbot import get_chatbot_response
from .notifications import send_telegram_alert, TELEGRAM_BOT_TOKEN, send_email_alert
from .auth import verify_password, get_password_hash, create_access_token, get_current_user

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

scheduler = AsyncIOScheduler()

async def scheduled_scraping():
    db = SessionLocal()
    try:
        print("[CRON] Ejecutando escaneo automático programado...")
        await scrape_boletin_oficial(db)
    except Exception as e:
        print(f"Error en el escaneo automático: {e}")
    finally:
        db.close()

@app.on_event("startup")
def on_startup():
    init_db()
    tz = ZoneInfo('America/Argentina/Buenos_Aires')
    trigger = CronTrigger(hour=8, minute=0, timezone=tz)
    scheduler.add_job(scheduled_scraping, trigger)
    scheduler.start()
    print("[CRON] Reloj biológico interno iniciado (alarma a las 8:00 AM AR).")

# Auth Endpoints
@app.post("/api/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.email != "juan@test.com":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Clonar las normativas del usuario administrador (id = 1)
    admin_reqs = db.query(models.LegalRequirement).filter(models.LegalRequirement.user_id == 1).order_by(models.LegalRequirement.id.asc()).all()
    if admin_reqs:
        for r in admin_reqs:
            req_clone = models.LegalRequirement(
                user_id=new_user.id,
                tipo_norma=r.tipo_norma,
                numero=r.numero,
                anio_fecha=r.anio_fecha,
                jurisdiccion_nacional=r.jurisdiccion_nacional,
                jurisdiccion_local=r.jurisdiccion_local,
                tema=r.tema,
                titulo=r.titulo,
                breve_descripcion=r.breve_descripcion,
                autoridad_aplicacion=r.autoridad_aplicacion,
                estado_vigencia=r.estado_vigencia,
                articulos_aplicables=r.articulos_aplicables,
                requisito_obligacion=r.requisito_obligacion,
                evidencia_cumplimiento=r.evidencia_cumplimiento,
                estado_cumplimiento=r.estado_cumplimiento
            )
            db.add(req_clone)
        db.commit()

    return new_user

@app.get("/api/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/api/users", response_model=List[schemas.UserResponse])
def get_users(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.email != "juan@test.com":
        raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(models.User).all()

@app.put("/api/users/{user_id}", response_model=schemas.UserResponse)
def update_user(user_id: int, user_update: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.email != "juan@test.com" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user_update.password:
        db_user.hashed_password = get_password_hash(user_update.password)
        db.commit()
        db.refresh(db_user)
    return db_user

@app.delete("/api/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.email != "juan@test.com":
        raise HTTPException(status_code=403, detail="Not authorized")
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if db_user.id == 1 or db_user.email == "juan@test.com":
        raise HTTPException(status_code=400, detail="No se puede eliminar el administrador")
        
    db.query(models.LegalRequirement).filter(models.LegalRequirement.user_id == user_id).delete()
    db.delete(db_user)
    db.commit()
    return {"status": "deleted"}

@app.post("/api/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

# Protected CRUD Endpoints
@app.get("/api/requirements", response_model=List[schemas.LegalRequirementResponse])
def get_requirements(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.LegalRequirement).filter(models.LegalRequirement.user_id == current_user.id).order_by(models.LegalRequirement.id.asc()).all()

@app.post("/api/requirements", response_model=schemas.LegalRequirementResponse)
def create_requirement(req: schemas.LegalRequirementCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_req = models.LegalRequirement(**req.dict(), user_id=current_user.id)
    db.add(db_req)
    db.commit()
    db.refresh(db_req)
    return db_req

@app.put("/api/requirements/{req_id}", response_model=schemas.LegalRequirementResponse)
def update_requirement(req_id: int, req: schemas.LegalRequirementCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_req = db.query(models.LegalRequirement).filter(models.LegalRequirement.id == req_id, models.LegalRequirement.user_id == current_user.id).first()
    if not db_req:
        raise HTTPException(status_code=404, detail="Requirement not found or not owned by user")
    
    for key, value in req.dict(exclude_unset=True).items():
        setattr(db_req, key, value)
        
    db.commit()
    db.refresh(db_req)
    return db_req

@app.delete("/api/requirements/{req_id}")
def delete_requirement(req_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_req = db.query(models.LegalRequirement).filter(models.LegalRequirement.id == req_id, models.LegalRequirement.user_id == current_user.id).first()
    if not db_req:
        raise HTTPException(status_code=404, detail="Requirement not found or not owned by user")
    
    db.delete(db_req)
    db.commit()
    return {"status": "deleted"}

# Bot Endpoints
@app.post("/api/bot/run-scraper")
async def trigger_scraper(authorization: str = Header(None), db: Session = Depends(get_db)):
    cron_secret = os.getenv("CRON_SECRET", "mi_clave_secreta_123")
    if authorization != f"Bearer {cron_secret}":
        raise HTTPException(status_code=401, detail="No autorizado")
    
    await scrape_boletin_oficial(db)
    return {"status": "success", "message": "Scraping ejecutado"}

class TelegramWebhook(BaseModel):
    update_id: int
    message: Dict[str, Any] = None

@app.post("/api/bot/webhook")
async def telegram_webhook(update: TelegramWebhook, db: Session = Depends(get_db)):
    if update.message and "text" in update.message and "chat" in update.message:
        chat_id = str(update.message["chat"]["id"])
        texto_usuario = update.message["text"]
        
        respuesta_ia = await get_chatbot_response(texto_usuario, db)
        
        if TELEGRAM_BOT_TOKEN:
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
            payload = {"chat_id": chat_id, "text": respuesta_ia}
            async with httpx.AsyncClient() as client:
                await client.post(url, json=payload)
                
    return {"status": "ok"}

@app.get("/api/bot/set-webhook")
async def set_telegram_webhook(url: str):
    if not TELEGRAM_BOT_TOKEN:
        return {"error": "Falta TELEGRAM_BOT_TOKEN"}
    
    tg_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook"
    async with httpx.AsyncClient() as client:
        res = await client.post(tg_url, json={"url": url})
        return res.json()

from backend.seed_excel import seed_from_excel

# Endpoint temporal para cargar leyes en Render
@app.get("/api/bot/cargar-leyes-oculto")
def cargar_leyes(email: str = "juan@test.com"):
    try:
        count = seed_from_excel("Matriz Legal Integrada.xlsx", email=email)
        return {"status": "success", "message": f"Leyes cargadas con éxito desde Excel. Total insertadas: {count} para el usuario {email}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/bot/alert-email")
def alert_email(body: dict):
    send_email_alert(body.get("subject", "Alerta Legal"), body.get("message", ""))
    return {"status": "success"}

# Servir Frontend
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
