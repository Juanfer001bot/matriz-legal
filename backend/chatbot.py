import os
import google.generativeai as genai
from sqlalchemy.orm import Session
from .models import LegalRequirement

# Configurar API de Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    
# Usamos el modelo más rápido y eficiente para texto
model = genai.GenerativeModel('gemini-1.5-flash-latest')

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
    contexto += "Instrucciones estrictas:\n"
    contexto += "1. Responde solo con información que esté en la lista anterior.\n"
    contexto += "2. Si la pregunta no se puede responder con la lista, di: 'No encontré información sobre eso en la Matriz Legal actual.'\n"
    contexto += f"3. La pregunta del usuario es: {pregunta}\n"
    
    # 3. Llamar a Gemini
    try:
        response = model.generate_content(contexto)
        return response.text
    except Exception as e:
        print(f"Error con Gemini API: {e}")
        return "Lo siento, hubo un error al conectar con mi cerebro artificial. Intenta de nuevo más tarde."
