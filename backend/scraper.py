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
            
            keywords = ["ambiente", "ambiental", "energía", "energética", "seguridad", "higiene", "residuos", "emisiones", "presupuesto"]
            
            nuevas_normativas = []
            
            # Buscamos todos los avisos en el HTML del BORA
            avisos = soup.find_all("div", class_="linea-aviso")
            
            for aviso in avisos:
                # Extraemos el texto de cada párrafo dentro del aviso
                textos = [p.get_text(strip=True) for p in aviso.find_all("p")]
                if not textos:
                    continue
                    
                texto_completo = " - ".join(textos)
                texto_lower = texto_completo.lower()
                
                # Verificamos si contiene alguna palabra clave
                if any(kw in texto_lower for kw in keywords):
                    
                    # Extraer partes de la normativa
                    autoridad = textos[0] if len(textos) > 0 else "Nacional"
                    tipo_norma = "Normativa"
                    
                    if len(textos) > 1:
                        # Extraer solo la primera palabra ("Decreto", "Resolución", etc.)
                        tipo_norma = textos[1].split()[0] if " " in textos[1] else textos[1]
                    
                    titulo = texto_completo
                    
                    # Comprobar si ya existe en la base de datos
                    existe = db.query(LegalRequirement).filter(LegalRequirement.titulo_tema == titulo).first()
                    if not existe:
                        nuevo_req = LegalRequirement(
                            ambito="Transversal", # Default para scraping automático
                            jurisdiccion="Nacional",
                            tipo_norma=tipo_norma,
                            titulo_tema=titulo,
                            autoridad_aplicacion=autoridad,
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
