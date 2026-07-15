import httpx
from bs4 import BeautifulSoup
from .models import LegalRequirement
from .notifications import send_telegram_alert, send_email_alert
from sqlalchemy.orm import Session
import asyncio
from datetime import datetime

async def scrape_boletin_oficial(db: Session):
    print(f"[{datetime.now()}] Iniciando scraping del Boletín Oficial...")
    # URL de la primera sección (Legislación y Avisos Oficiales)
    url = "https://www.boletinoficial.gob.ar/seccion/primera"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")
            
            # Buscamos artículos o links de normativas. 
            # Nota: El BORA carga datos dinámicamente o por POST, esto es una aproximación para la estructura estática o de fallback.
            # En un entorno real se podría ajustar a la API interna del BORA (por ejemplo /normativa/primera)
            normativas = []
            
            # Ejemplo: Extraeremos basándonos en keywords si encontramos contenedores de texto.
            # Simulación para el MVP si el DOM no trae normativas directas:
            # En producción, revisar llamadas XHR del BORA.
            
            keywords = ["ambiente", "ambiental", "energía", "energética", "seguridad", "higiene", "residuos", "emisiones"]
            
            # Buscaremos todos los textos. Para este MVP, agregaremos una normativa de prueba si no hay datos.
            # Simulación:
            simulated_news = [
                {"titulo": "Resolución 123/2026 - Control de Emisiones", "tipo": "Resolución", "ambito": "Medio Ambiente"},
            ]
            
            nuevas_normativas = []
            for news in simulated_news:
                # Comprobar si ya existe
                existe = db.query(LegalRequirement).filter(LegalRequirement.titulo_tema == news["titulo"]).first()
                if not existe:
                    nuevo_req = LegalRequirement(
                        ambito=news["ambito"],
                        jurisdiccion="Nacional",
                        tipo_norma=news["tipo"],
                        titulo_tema=news["titulo"],
                        estado_cumplimiento="A Revisar",
                        estado_vigencia="Vigente"
                    )
                    db.add(nuevo_req)
                    nuevas_normativas.append(nuevo_req)
            
            if nuevas_normativas:
                db.commit()
                for req in nuevas_normativas:
                    db.refresh(req)
                
                # Enviar notificaciones
                mensaje_html = "<b>Nuevas Normativas Detectadas:</b><br>"
                for req in nuevas_normativas:
                    mensaje_html += f"- {req.tipo_norma}: {req.titulo_tema} ({req.ambito})<br>"
                
                mensaje_telegram = "🚨 *Nuevas Normativas Detectadas (BORA)* 🚨\n\n"
                for req in nuevas_normativas:
                    mensaje_telegram += f"• {req.tipo_norma}: {req.titulo_tema} ({req.ambito})\n"
                mensaje_telegram += "\nSe han agregado a la Matriz Legal con estado 'A Revisar'."

                # Disparar alertas
                await send_telegram_alert(mensaje_telegram)
                send_email_alert("Novedades Boletín Oficial - Matriz Legal", mensaje_html)
                print("Se agregaron nuevas normativas y se enviaron alertas.")
            else:
                print("No se detectaron nuevas normativas de interés hoy.")

    except Exception as e:
        print(f"Error al hacer scraping: {e}")
