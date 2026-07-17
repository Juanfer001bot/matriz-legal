import os
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from .models import LegalRequirement

# Configurar API de Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def agregar_norma(tipo_norma: str, titulo: str, jurisdiccion: str, ambito: str) -> str:
    """Agrega una nueva norma a la base de datos de la Matriz Legal.
    Args:
        tipo_norma: El tipo y numero de norma (ej. 'Resolución 123/2026').
        titulo: El título o resumen del tema de la norma.
        jurisdiccion: 'Nacional', 'CABA', 'PBA', 'Misiones', 'Corrientes', 'Paraguay', etc.
        ambito: 'Transversal', 'Medio Ambiente', 'Seguridad e Higiene'.
    """
    pass

def eliminar_norma(id_norma: int) -> str:
    """Elimina una norma de la base de datos dado su ID numérico.
    Args:
        id_norma: El ID numérico exacto de la norma a eliminar.
    """
    pass

def editar_norma(id_norma: int, campo: str, nuevo_valor: str) -> str:
    """Edita un campo específico de una norma existente.
    Args:
        id_norma: El ID numérico exacto de la norma a editar.
        campo: El campo a editar (valores válidos: 'estado_cumplimiento', 'tipo_norma', 'titulo_tema', 'jurisdiccion', 'ambito').
        nuevo_valor: El nuevo valor para ese campo.
    """
    pass

async def get_chatbot_response(pregunta: str, db: Session) -> str:
    if not GEMINI_API_KEY:
        return "⚠️ La Inteligencia Artificial no está configurada. Falta la variable GEMINI_API_KEY en Render."
    
    # Comando secreto para forzar el escaneo
    if pregunta.strip().lower() in ["/escanear", "escanear", "buscar leyes", "buscar novedades"]:
        from .scraper import scrape_boletin_oficial
        await scrape_boletin_oficial(db)
        return "✅ ¡Orden recibida! Acabo de hacer el escaneo de toda la cuenca (Nación, CABA, Bs As, Misiones, Corrientes y Paraguay). Revisa si te llegó el reporte."
        
    # 1. Recuperar TODAS las normativas de la base de datos para darle contexto a la IA
    normativas = db.query(LegalRequirement).all()
    
    # 2. Construir el contexto
    contexto = "Eres un asistente legal experto. Tu tarea es responder preguntas y administrar la Matriz Legal de la empresa.\n\n"
    if not normativas:
        contexto += "Actualmente NO hay ninguna normativa en la base de datos.\n"
    else:
        contexto += "--- LISTA DE NORMATIVAS (Usa el ID para editar o eliminar) ---\n"
        for req in normativas:
            contexto += f"- ID: {req.id} | Norma: {req.tipo_norma} | Ámbito: {req.ambito} | Jurisdicción: {req.jurisdiccion} | Estado: {req.estado_cumplimiento}\n"
            contexto += f"  Título: {req.titulo_tema}\n\n"
        contexto += "--- FIN DE NORMATIVAS ---\n\n"
        
    contexto += "Instrucciones:\n"
    contexto += "1. Si el usuario pide AGREGAR, ELIMINAR o EDITAR una norma, DEBES llamar a la función correspondiente (agregar_norma, eliminar_norma, editar_norma). No respondas con texto, usa la herramienta.\n"
    contexto += "2. Si la pregunta es consultiva, responde usando la información de la Matriz Legal.\n"
    contexto += "3. Si usas información de tu conocimiento general externo, aclara amablemente que 'no está registrada en la Matriz Legal'.\n"
    contexto += f"La solicitud del usuario es: {pregunta}\n"
    
    # 3. Llamar a Gemini usando el SDK moderno
    client = genai.Client(api_key=GEMINI_API_KEY)
    modelos = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro', 'gemini-2.0-flash-exp', 'gemini-flash-latest']
    
    config = types.GenerateContentConfig(
        tools=[agregar_norma, eliminar_norma, editar_norma],
        temperature=0.1,
    )
    
    errores = []
    for modelo in modelos:
        try:
            response = client.models.generate_content(
                model=modelo,
                contents=contexto,
                config=config
            )
            
            # Interceptar si Gemini decidió usar una herramienta
            if response.function_calls:
                call = response.function_calls[0]
                args = call.args
                
                if call.name == "agregar_norma":
                    nueva = LegalRequirement(
                        tipo_norma=args.get("tipo_norma", "Normativa"),
                        titulo_tema=args.get("titulo", ""),
                        jurisdiccion=args.get("jurisdiccion", "Nacional"),
                        ambito=args.get("ambito", "Transversal"),
                        estado_cumplimiento="A Revisar",
                        estado_vigencia="Vigente"
                    )
                    db.add(nueva)
                    db.commit()
                    return f"✅ ¡Hecho! Agregué la norma: {nueva.tipo_norma} - {nueva.titulo_tema}."
                    
                elif call.name == "eliminar_norma":
                    id_norma = args.get("id_norma")
                    norma = db.query(LegalRequirement).filter(LegalRequirement.id == id_norma).first()
                    if norma:
                        db.delete(norma)
                        db.commit()
                        return f"🗑️ ¡Hecho! Eliminé la norma ID {id_norma} ({norma.tipo_norma})."
                    else:
                        return f"❌ No pude encontrar la norma con ID {id_norma} para eliminar."
                        
                elif call.name == "editar_norma":
                    id_norma = args.get("id_norma")
                    campo = args.get("campo")
                    nuevo_valor = args.get("nuevo_valor")
                    norma = db.query(LegalRequirement).filter(LegalRequirement.id == id_norma).first()
                    if norma and hasattr(norma, campo):
                        setattr(norma, campo, nuevo_valor)
                        db.commit()
                        return f"✏️ ¡Hecho! Actualicé la norma ID {id_norma}. Su {campo} ahora es: {nuevo_valor}."
                    else:
                        return f"❌ No pude editar. Verifica que el ID {id_norma} sea correcto y que el campo '{campo}' exista."
            
            # Si no usó herramientas, devolver su respuesta de texto normal
            return response.text
            
        except Exception as e:
            error_str = str(e)
            if "Quota exceeded" in error_str:
                errores.append(f"{modelo}: Cuota agotada o limite 0")
            elif "404" in error_str:
                errores.append(f"{modelo}: No disponible")
            else:
                errores.append(f"{modelo}: {error_str[:50]}...")
            continue
            
    return f"Lo siento, probé con múltiples cerebros y todos fallaron.\nDetalles:\n" + "\n".join(errores)
