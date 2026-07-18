import httpx
from bs4 import BeautifulSoup
from .models import LegalRequirement
from .notifications import send_telegram_alert, send_email_alert
from sqlalchemy.orm import Session
import asyncio
from datetime import datetime

KEYWORDS = ["ambiente", "ambiental", "energía", "energética", "seguridad", "higiene", "residuos", "emisiones", "presas", "represas", "hidroeléctrica", "cuenca", "agua", "rio paraná", "pesca", "reservas"]

from .pdf_analyzer import analyze_pdf_for_norms, analyze_html_for_summary

async def scrape_nacion(client, db: Session):
    url = "https://www.boletinoficial.gob.ar/seccion/primera"
    nuevas = []
    textos_brutos = []
    try:
        response = await client.get(url)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            avisos = soup.find_all("div", class_="linea-aviso")
            for aviso in avisos:
                textos = [p.get_text(strip=True) for p in aviso.find_all("p")]
                if not textos: continue
                texto_completo = " - ".join(textos)
                textos_brutos.append(texto_completo)
                
                if any(kw in texto_completo.lower() for kw in KEYWORDS):
                    titulo = texto_completo
                    existe = db.query(LegalRequirement).filter(LegalRequirement.titulo_tema == titulo).first()
                    if not existe:
                        import re
                        patron = r"(Ley|Decreto|Resolución|Disposición|Decisión Administrativa|Aviso)\s*(?:N°|Nro\.)?\s*([\d\.]+/?\d*)"
                        match = re.search(patron, titulo, re.IGNORECASE)
                        if match:
                            tipo_norma = f"{match.group(1).capitalize()} {match.group(2)}"
                            numero_anio = match.group(2)
                        else:
                            tipo_norma = textos[1].split()[0] if len(textos)>1 and " " in textos[1] else "Normativa"
                            numero_anio = ""
                            
                        req = LegalRequirement(
                            ambito="Transversal", jurisdiccion="Nacional",
                            tipo_norma=tipo_norma, numero_anio=numero_anio, titulo_tema=titulo,
                            autoridad_aplicacion=textos[0] if textos else "Nacional",
                            estado_cumplimiento="A Revisar", estado_vigencia="Vigente"
                        )
                        db.add(req)
                        nuevas.append(req)
                        
        resumen = analyze_html_for_summary(textos_brutos, "Nación Argentina")
    except Exception as e:
        print(f"Error scraping Nacion: {e}")
        resumen = ["Error al obtener resumen de Nación."]
    return nuevas, resumen

async def scrape_caba(client, db: Session):
    today_caba = datetime.now().strftime('%d-%m-%Y')
    url = f"https://api-restboletinoficial.buenosaires.gob.ar/obtenerBoletin/{today_caba}/true"
    nuevas = []
    textos_brutos = []
    try:
        response = await client.get(url)
        if response.status_code == 200:
            data = response.json()
            if "normas" in data:
                for norma in data["normas"]:
                    texto_completo = f"{norma.get('reparticion', '')} - {norma.get('sintesis', '')}"
                    textos_brutos.append(texto_completo)
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
        resumen = analyze_html_for_summary(textos_brutos, "CABA")
    except Exception as e:
        print(f"Error scraping CABA: {e}")
        resumen = ["Error al obtener resumen de CABA."]
    return nuevas, resumen

async def scrape_pba(client, db: Session):
    today_pba = datetime.now().strftime('%d/%m/%Y')
    url = f"https://boletinoficial.gba.gob.ar/buscar?search[words]=ambiente&search[date_gteq]={today_pba}&search[date_lteq]={today_pba}"
    nuevas = []
    textos_brutos = []
    try:
        response = await client.get(url)
        if response.status_code == 200:
            html = response.text
            if "No se encontraron resultados" not in html:
                soup = BeautifulSoup(html, "html.parser")
                resultados = soup.find_all("div", class_="bulletin-box")
                for res in resultados:
                    texto = res.get_text(strip=True)
                    textos_brutos.append(texto)
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
        resumen = analyze_html_for_summary(textos_brutos, "Provincia de Buenos Aires")
    except Exception as e:
        print(f"Error scraping PBA: {e}")
        resumen = ["Error al obtener resumen de PBA."]
    return nuevas, resumen

from .pdf_analyzer import analyze_pdf_for_norms
import tempfile
import os

async def scrape_pdf_jurisdiccion(client, db: Session, url: str, jurisdiccion: str):
    nuevas = []
    resumen = []
    try:
        response = await client.get(url)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            
            pdf_link = None
            for a in soup.find_all("a", href=True):
                if ".pdf" in a["href"].lower():
                    pdf_link = a["href"]
                    break
            
            if pdf_link:
                if not pdf_link.startswith("http"):
                    base = url.split("//")[0] + "//" + url.split("//")[1].split("/")[0]
                    pdf_link = base + (pdf_link if pdf_link.startswith("/") else "/" + pdf_link)
                
                pdf_resp = await client.get(pdf_link)
                if pdf_resp.status_code == 200:
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                        tmp.write(pdf_resp.content)
                        tmp_path = tmp.name
                    
                    try:
                        print(f"Analizando PDF de {jurisdiccion} con IA...")
                        resultados, resumen_ia = analyze_pdf_for_norms(tmp_path, jurisdiccion)
                        resumen = resumen_ia
                        
                        os.unlink(tmp_path)
                        
                        today_str = datetime.now().strftime('%d/%m/%Y')
                        for res in resultados:
                            tipo = res.tipo_norma if hasattr(res, 'tipo_norma') else res.get("tipo_norma", "Norma")
                            titulo = res.titulo_tema if hasattr(res, 'titulo_tema') else res.get("titulo_tema", "Norma detectada")
                            
                            titulo_con_fecha = f"{titulo} ({today_str})"
                            
                            existe = db.query(LegalRequirement).filter(LegalRequirement.jurisdiccion == jurisdiccion, LegalRequirement.titulo_tema == titulo_con_fecha).first()
                            if not existe:
                                req = LegalRequirement(
                                    ambito="Transversal", jurisdiccion=jurisdiccion,
                                    tipo_norma=tipo, titulo_tema=titulo_con_fecha,
                                    autoridad_aplicacion=jurisdiccion,
                                    estado_cumplimiento="A Revisar", estado_vigencia="Vigente"
                                )
                                db.add(req)
                                nuevas.append(req)
                    except Exception as e:
                        print(f"Error parseando PDF {jurisdiccion}: {e}")
                        resumen = ["Error en la lectura por IA del PDF."]
                        if os.path.exists(tmp_path):
                            os.unlink(tmp_path)
            else:
                resumen = ["No se encontró el enlace al PDF del día."]
    except Exception as e:
        print(f"Error scraping {jurisdiccion}: {e}")
        resumen = [f"Error de conexión al portal de {jurisdiccion}."]
    return nuevas, resumen

async def scrape_misiones(client, db: Session):
    return await scrape_pdf_jurisdiccion(client, db, "https://boletinoficial.misiones.gob.ar/", "Misiones")

async def scrape_corrientes(client, db: Session):
    return await scrape_pdf_jurisdiccion(client, db, "https://boletinoficial.corrientes.gob.ar/feed", "Corrientes")

async def scrape_paraguay(client, db: Session):
    return await scrape_pdf_jurisdiccion(client, db, "https://www.gacetaoficial.gov.py/", "Paraguay")

async def scrape_boletin_oficial(db: Session):
    print(f"[{datetime.now()}] Iniciando scraping de EBY con Heartbeat...")
    
    async with httpx.AsyncClient(timeout=30.0, verify=False, follow_redirects=True) as client:
        nuevas_nacion, res_nacion = await scrape_nacion(client, db)
        nuevas_caba, res_caba = await scrape_caba(client, db)
        nuevas_pba, res_pba = await scrape_pba(client, db)
        nuevas_misiones, res_mis = await scrape_misiones(client, db)
        nuevas_corrientes, res_cor = await scrape_corrientes(client, db)
        nuevas_paraguay, res_par = await scrape_paraguay(client, db)
        
        todas_nuevas = nuevas_nacion + nuevas_caba + nuevas_pba + nuevas_misiones + nuevas_corrientes + nuevas_paraguay
        
        if todas_nuevas:
            db.commit()
            
        # Formatear el reporte consolidado
        if todas_nuevas:
            mensaje = "🚨 *Nuevas Normativas Detectadas para la Matriz* 🚨\n\n"
        else:
            mensaje = "✅ *Matriz Legal OK* (Sin novedades EBY hoy)\n\n"
            
        mensaje += "--- 📰 PANORAMA NORMATIVO DEL DÍA ---\n\n"
        
        jurisdicciones_resumen = [
            ("🇦🇷 *Nación:*", res_nacion),
            ("🏙️ *CABA:*", res_caba),
            ("🌲 *PROV. BS AS:*", res_pba),
            ("🧉 *MISIONES:*", res_mis),
            ("🦦 *CORRIENTES:*", res_cor),
            ("🇵🇾 *PARAGUAY:*", res_par)
        ]
        
        for titulo, resumen in jurisdicciones_resumen:
            mensaje += f"{titulo}\n"
            for item in resumen:
                mensaje += f"• {item}\n"
            mensaje += "\n"
            
        await send_telegram_alert(mensaje)
        
        # HTML para el email
        mensaje_html = mensaje.replace("\n", "<br>")
        send_email_alert("Reporte Diario - Matriz Legal", mensaje_html)
        print(f"Reporte enviado. Nuevas normativas: {len(todas_nuevas)}")
