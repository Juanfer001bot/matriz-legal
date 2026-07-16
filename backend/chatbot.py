import os
from google import genai
from sqlalchemy.orm import Session
from .models import LegalRequirement

# Configurar API de Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

async def get_chatbot_response(pregunta: str, db: Session) -> str:
    if not GEMINI_API_KEY:
        return "⚠️ La Inteligencia Artificial no está configurada. Falta la variable GEMINI_API_KEY en Render."
    
    # 1. Recuperar TODAS las normativas de la base de datos para darle contexto a la IA
    normativas = db.query(LegalRequirement).all()
    
    if not normativas:
        return "Actualmente no tengo ninguna normativa guardada en la base de datos de la Matriz Legal."
    
    # 2. Construir el contexto
    contexto = "Eres un asistente legal experto. Tu tarea es responder preguntas BASÁNDOTE ÚNICAMENTE en la siguiente lista de normativas de la Matriz Legal de la empresa.\n\n"
    contexto += "--- LISTA DE NORMATIVAS ---\n"
    
    for req in normativas:
        contexto += f"- Norma: {req.tipo_norma}\n"
        contexto += f"  Título: {req.titulo_tema}\n"
        contexto += f"  Ámbito: {req.ambito}\n"
        contexto += f"  Estado: {req.estado_cumplimiento}\n\n"
        
    contexto += "--- FIN DE NORMATIVAS ---\n\n"
    contexto += "Instrucciones:\n"
    contexto += "1. Si la pregunta se relaciona con normativas de la lista, prioriza y responde usando esa información de la Matriz Legal.\n"
    contexto += "2. Si el usuario hace una pregunta general o sobre algo que no está en la lista, puedes responder usando tu amplio conocimiento como Inteligencia Artificial experta en leyes.\n"
    contexto += "3. Si usas información de tu conocimiento general, aclara amablemente al final que esa normativa 'no está registrada actualmente en la Matriz Legal de la empresa'.\n"
    contexto += f"3. La pregunta del usuario es: {pregunta}\n"
    
    # 3. Llamar a Gemini usando el SDK moderno y probar varios modelos por problemas de cuota
    client = genai.Client(api_key=GEMINI_API_KEY)
    modelos = ['gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-pro-latest']
    
    ultimo_error = ""
    for modelo in modelos:
        try:
            response = client.models.generate_content(
                model=modelo,
                contents=contexto,
            )
            return response.text
        except Exception as e:
            ultimo_error = str(e)
            # Si hay error (como limite 0 o cuota agotada), intentamos con el siguiente modelo
            continue
            
    return f"Lo siento, probé con múltiples cerebros y todos fallaron. Detalle del último error: {ultimo_error}"
