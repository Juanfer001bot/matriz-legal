import os
import time
import json
from google import genai
from google.genai import types
from pydantic import BaseModel
from typing import List, Optional

KEYWORDS = ["ambiente", "ambiental", "energía", "energética", "seguridad", "higiene", "residuos", "emisiones", "presas", "represas", "hidroeléctrica", "cuenca", "agua", "rio paraná", "pesca", "reservas"]

class NormaEncontrada(BaseModel):
    tipo_norma: str
    titulo_tema: str

class ResultadoBoletin(BaseModel):
    normas: list[NormaEncontrada]
    resumen_general: list[str]

class ResumenTextual(BaseModel):
    resumen_general: list[str]

def analyze_html_for_summary(textos: list[str], jurisdiccion: str) -> list[str]:
    """
    Toma una lista de textos (títulos del boletín HTML) y usa Gemini para seleccionar
    los 3 a 5 más relevantes (ej. leyes importantes, decretos de interés público).
    """
    if not textos:
        return ["No hubo publicaciones el día de hoy."]
        
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return textos[:3] # Fallback sin IA

    client = genai.Client(api_key=api_key)
    
    prompt = (
        f"Aquí tienes una lista de publicaciones del boletín oficial de {jurisdiccion} de hoy.\n"
        f"Selecciona las 3 a 5 normativas MÁS RELEVANTES a nivel general (leyes importantes, decretos de gran impacto público o económico, resoluciones clave, etc.). Ignora edictos, quiebras o nombramientos menores.\n"
        f"Redacta un breve resumen para cada una (máximo 1 línea por resumen, incluyendo tipo de norma y tema).\n\n"
        f"Textos:\n" + "\n".join(textos[:100]) # Limitar a 100 para no exceder tokens innecesariamente si hay miles
    )

    config = types.GenerateContentConfig(
        temperature=0.2,
        response_mime_type="application/json",
        response_schema=ResumenTextual,
    )

    try:
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=prompt,
            config=config
        )
        data = json.loads(response.text)
        return data.get("resumen_general", ["No se pudo extraer resumen."])
    except Exception as e:
        print(f"Error en analyze_html_for_summary: {e}")
        return textos[:3] # Fallback en caso de error

def analyze_pdf_for_norms(pdf_path: str, jurisdiccion: str) -> tuple[list[dict], list[str]]:
    """
    Sube un PDF a Gemini, busca normas relacionadas con Yacyretá y extrae un resumen general.
    Devuelve (resultados, resumen_general)
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Falta GEMINI_API_KEY")
        return [], []

    client = genai.Client(api_key=api_key)
    uploaded_file = None
    resultados = []
    resumen = []

    try:
        # 1. Upload to Gemini
        print(f"Subiendo {pdf_path} a Gemini...")
        uploaded_file = client.files.upload(file=pdf_path)
        
        while uploaded_file.state.name == "PROCESSING":
            print("Esperando que Gemini procese el PDF...")
            time.sleep(2)
            uploaded_file = client.files.get(name=uploaded_file.name)
            
        if uploaded_file.state.name == "FAILED":
            print(f"Error procesando PDF: {uploaded_file.state}")
            return [], []

        # 2. Prompting
        prompt = (
            f"Lee cuidadosamente este boletín oficial de la jurisdicción de {jurisdiccion}.\n\n"
            f"TAREA 1: Busca si hay alguna norma (Ley, Decreto, Resolución, etc.) "
            f"relacionada fuertemente con estas palabras clave: {', '.join(KEYWORDS)}. "
            f"Si encuentras, ponlas en 'normas'. Si no, devuelve lista vacía.\n\n"
            f"TAREA 2: Independientemente de la tarea 1, redacta 3 a 5 'bullet points' en 'resumen_general' "
            f"destacando las normas más importantes publicadas en este boletín a nivel general (las de mayor impacto público)."
        )

        config = types.GenerateContentConfig(
            temperature=0.1,
            response_mime_type="application/json",
            response_schema=ResultadoBoletin,
        )

        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=[uploaded_file, prompt],
            config=config
        )

        # 3. Parse JSON response
        try:
            data = json.loads(response.text)
            resultados = data.get("normas", [])
            resumen = data.get("resumen_general", [])
        except json.JSONDecodeError:
            print("Error decodificando el JSON de Gemini")
            
    except Exception as e:
        print(f"Error en analyze_pdf_for_norms: {e}")
        
    finally:
        if uploaded_file:
            try:
                print("Borrando PDF de los servidores de Google...")
                client.files.delete(name=uploaded_file.name)
            except Exception as e:
                print(f"No se pudo borrar el archivo de Gemini: {e}")
                
    return resultados, resumen
