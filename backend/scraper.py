import httpx
from bs4 import BeautifulSoup
from .models import LegalRequirement
from .notifications import send_telegram_alert, send_email_alert
from sqlalchemy.orm import Session
import asyncio
from datetime import datetime

KEYWORDS = ["ambiente", "ambiental", "energía", "energética", "seguridad", "higiene", "residuos", "emisiones", "presas", "represas", "hidroeléctrica", "cuenca", "agua", "rio paraná", "pesca", "reservas"]

async def scrape_nacion(client, db: Session):
    url = "https://www.boletinoficial.gob.ar/seccion/primera"
    nuevas = []
    try:
        response = await client.get(url)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            avisos = soup.find_all("div", class_="linea-aviso")
            for aviso in avisos:
                textos = [p.get_text(strip=True) for p in aviso.find_all("p")]
                if not textos: continue
                texto_completo = " - ".join(textos)
                if any(kw in texto_completo.lower() for kw in KEYWORDS):
                    titulo = texto_completo
                    existe = db.query(LegalRequirement).filter(LegalRequirement.titulo_tema == titulo).first()
                    if not existe:
                        tipo_norma = textos[1].split()[0] if len(textos)>1 and " " in textos[1] else "Normativa"
                        req = LegalRequirement(
                            ambito="Transversal", jurisdiccion="Nacional",
                            tipo_norma=tipo_norma, titulo_tema=titulo,
                            autoridad_aplicacion=textos[0] if textos else "Nacional",
                            estado_cumplimiento="A Revisar", estado_vigencia="Vigente"
                        )
                        db.add(req)
                        nuevas.append(req)
    except Exception as e:
        print(f"Error scraping Nacion: {e}")
    return nuevas

async def scrape_caba(client, db: Session):
    today_caba = datetime.now().strftime('%d-%m-%Y')
    url = f"https://api-restboletinoficial.buenosaires.gob.ar/obtenerBoletin/{today_caba}/true"
    nuevas = []
    try:
        response = await client.get(url)
        if response.status_code == 200:
            data = response.json()
            if "normas" in data:
                for norma in data["normas"]:
                    texto_completo = f"{norma.get('reparticion', '')} - {norma.get('sintesis', '')}"
                    if any(kw in texto_completo.lower() for kw in KEYWORDS):
                        titulo = texto_completo
                        existe = db.query(LegalRequirement).filter(LegalRequirement.titulo_tema == titulo).first()
                        if not existe:
                            req = LegalRequirement(
                                ambito="Transversal", jurisdiccion="CABA",
                                tipo_norma=norma.get('tipo_norma_desc', 'Normativa'), titulo_tema=titulo,
                                autoridad_aplicacion=norma.get('reparticion', 'CABA'),
                                estado_cumplimiento="A Revisar", estado_vigencia="Vigente"
                            )
                            db.add(req)
                            nuevas.append(req)
    except Exception as e:
        print(f"Error scraping CABA: {e}")
    return nuevas

async def scrape_pba(client, db: Session):
    today_pba = datetime.now().strftime('%d/%m/%Y')
    url = f"https://boletinoficial.gba.gob.ar/buscar?search[words]=ambiente&search[date_gteq]={today_pba}&search[date_lteq]={today_pba}"
    nuevas = []
    try:
        response = await client.get(url)
        if response.status_code == 200:
            html = response.text
            if "No se encontraron resultados" not in html:
                # PBA structure needs deep HTML parsing, simplified for demo:
                soup = BeautifulSoup(html, "html.parser")
                resultados = soup.find_all("div", class_="bulletin-box") # Approximate parsing based on UI
                for res in resultados:
                    texto = res.get_text(strip=True)
                    existe = db.query(LegalRequirement).filter(LegalRequirement.titulo_tema == texto).first()
                    if not existe and texto:
                        req = LegalRequirement(
                            ambito="Transversal", jurisdiccion="PBA",
                            tipo_norma="Normativa", titulo_tema=texto,
                            autoridad_aplicacion="Provincia de Buenos Aires",
                            estado_cumplimiento="A Revisar", estado_vigencia="Vigente"
                        )
                        db.add(req)
                        nuevas.append(req)
    except Exception as e:
        print(f"Error scraping PBA: {e}")
    return nuevas

async def scrape_misiones(client, db: Session):
    today_str = datetime.now().strftime('%d/%m/%Y')
    url = "https://www.boletin.misiones.gov.ar/"
    nuevas = []
    try:
        response = await client.get(url)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            texto_completo = soup.get_text(separator=" ", strip=True).lower()
            encontradas = [kw for kw in KEYWORDS if kw in texto_completo]
            if encontradas:
                titulo = f"Novedad detectada (Palabras: {', '.join(encontradas[:3])}) - {today_str}"
                existe = db.query(LegalRequirement).filter(LegalRequirement.jurisdiccion == "Misiones", LegalRequirement.titulo_tema == titulo).first()
                if not existe:
                    req = LegalRequirement(
                        ambito="Transversal", jurisdiccion="Misiones",
                        tipo_norma="Decreto/Resolución", titulo_tema=titulo,
                        autoridad_aplicacion="Provincia de Misiones",
                        estado_cumplimiento="A Revisar", estado_vigencia="Vigente"
                    )
                    db.add(req)
                    nuevas.append(req)
    except Exception as e:
        print(f"Error scraping Misiones: {e}")
    return nuevas

async def scrape_corrientes(client, db: Session):
    today_str = datetime.now().strftime('%d/%m/%Y')
    url = "https://boletinoficial.corrientes.gob.ar/feed"
    nuevas = []
    try:
        response = await client.get(url)
        if response.status_code == 200:
            texto_completo = response.text.lower()
            encontradas = [kw for kw in KEYWORDS if kw in texto_completo]
            if encontradas:
                titulo = f"Novedad detectada (Palabras: {', '.join(encontradas[:3])}) - {today_str}"
                existe = db.query(LegalRequirement).filter(LegalRequirement.jurisdiccion == "Corrientes", LegalRequirement.titulo_tema == titulo).first()
                if not existe:
                    req = LegalRequirement(
                        ambito="Transversal", jurisdiccion="Corrientes",
                        tipo_norma="Normativa Provincial", titulo_tema=titulo,
                        autoridad_aplicacion="Provincia de Corrientes",
                        estado_cumplimiento="A Revisar", estado_vigencia="Vigente"
                    )
                    db.add(req)
                    nuevas.append(req)
    except Exception as e:
        print(f"Error scraping Corrientes: {e}")
    return nuevas

async def scrape_paraguay(client, db: Session):
    today_str = datetime.now().strftime('%d/%m/%Y')
    url = "https://www.gacetaoficial.gov.py/"
    nuevas = []
    try:
        response = await client.get(url)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            texto_completo = soup.get_text(separator=" ", strip=True).lower()
            encontradas = [kw for kw in KEYWORDS if kw in texto_completo]
            if encontradas:
                titulo = f"Novedad detectada en Gaceta Oficial (Palabras: {', '.join(encontradas[:3])}) - {today_str}"
                existe = db.query(LegalRequirement).filter(LegalRequirement.jurisdiccion == "Paraguay", LegalRequirement.titulo_tema == titulo).first()
                if not existe:
                    req = LegalRequirement(
                        ambito="Transversal", jurisdiccion="Paraguay",
                        tipo_norma="Ley/Decreto Presidencial", titulo_tema=titulo,
                        autoridad_aplicacion="República del Paraguay",
                        estado_cumplimiento="A Revisar", estado_vigencia="Vigente"
                    )
                    db.add(req)
                    nuevas.append(req)
    except Exception as e:
        print(f"Error scraping Paraguay: {e}")
    return nuevas

async def scrape_boletin_oficial(db: Session):
    print(f"[{datetime.now()}] Iniciando scraping de EBY (Nación, CABA, PBA, Misiones, Corrientes, Paraguay)...")
    
    async with httpx.AsyncClient(timeout=15.0, verify=False, follow_redirects=True) as client:
        nuevas_nacion = await scrape_nacion(client, db)
        nuevas_caba = await scrape_caba(client, db)
        nuevas_pba = await scrape_pba(client, db)
        nuevas_misiones = await scrape_misiones(client, db)
        nuevas_corrientes = await scrape_corrientes(client, db)
        nuevas_paraguay = await scrape_paraguay(client, db)
        
        todas_nuevas = nuevas_nacion + nuevas_caba + nuevas_pba + nuevas_misiones + nuevas_corrientes + nuevas_paraguay
        
        if todas_nuevas:
            db.commit()
            
            # Formatear el reporte consolidado
            mensaje = "🚨 *Nuevas Normativas Detectadas* 🚨\n\n"
            
            if nuevas_nacion:
                mensaje += "🇦🇷 *NACIONAL:*\n"
                for req in nuevas_nacion:
                    mensaje += f"• {req.tipo_norma}: {req.titulo_tema}\n"
                mensaje += "\n"
                
            if nuevas_caba:
                mensaje += "🏙️ *CABA:*\n"
                for req in nuevas_caba:
                    mensaje += f"• {req.tipo_norma}: {req.titulo_tema}\n"
                mensaje += "\n"
                
            if nuevas_pba:
                mensaje += "🌲 *PROV. BS AS:*\n"
                for req in nuevas_pba:
                    mensaje += f"• {req.tipo_norma}: {req.titulo_tema}\n"
                mensaje += "\n"
                
            if nuevas_misiones:
                mensaje += "🧉 *MISIONES:*\n"
                for req in nuevas_misiones:
                    mensaje += f"• {req.tipo_norma}: {req.titulo_tema}\n"
                mensaje += "\n"
                
            if nuevas_corrientes:
                mensaje += "🦦 *CORRIENTES:*\n"
                for req in nuevas_corrientes:
                    mensaje += f"• {req.tipo_norma}: {req.titulo_tema}\n"
                mensaje += "\n"
                
            if nuevas_paraguay:
                mensaje += "🇵🇾 *PARAGUAY:*\n"
                for req in nuevas_paraguay:
                    mensaje += f"• {req.tipo_norma}: {req.titulo_tema}\n"
                mensaje += "\n"
                
            mensaje += "Se han agregado a la Matriz Legal con estado 'A Revisar'."
            await send_telegram_alert(mensaje)
            
            # HTML para el email
            mensaje_html = mensaje.replace("\n", "<br>")
            send_email_alert("Novedades Boletín Oficial - Matriz Legal", mensaje_html)
            print(f"Se agregaron {len(todas_nuevas)} nuevas normativas y se enviaron alertas.")
            
        else:
            mensaje_vacio = (
                "✅ <b>Matriz Legal OK</b>\n\n"
                "El bot revisó los Boletines Oficiales de:\n"
                "- Nación 🇦🇷\n- CABA 🏙️\n- Provincia de Bs As 🌲\n"
                "- Misiones 🧉\n- Corrientes 🦦\n- Paraguay 🇵🇾\n\n"
                "<b>No se encontró</b> ninguna normativa de ambiente, energía o represas nueva el día de hoy."
            )
            await send_telegram_alert(mensaje_vacio)
            print("No se detectaron nuevas normativas en ninguna jurisdicción hoy.")
