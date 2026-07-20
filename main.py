import os
from google import genai
from sqlalchemy.orm import Session
from .models import LegalRequirement

# Configurar API de Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

async def get_chatbot_response(pregunta: str, db: Session) -> str:
    if not GEMINI_API_KEY:
        return "⚠️ La Inteligencia Artificial no está configurada. Falta la variable GEMINI_API_KEY en Render."
    
    p = pregunta.strip()
    p_lower = p.lower()
    
    # ---------------- COMANDOS MANUALES (Sin usar IA) ----------------
    if p_lower in ["/escanear", "escanear", "buscar leyes", "buscar novedades"]:
        from .scraper import scrape_boletin_oficial
        await scrape_boletin_oficial(db)
        return "✅ ¡Orden recibida! Acabo de hacer el escaneo de toda la cuenca. Revisa si te llegó el reporte."
        
    if p_lower.startswith("/agregar "):
        # Ejemplo: /agregar Resolución 123 | Medio Ambiente | Nacional
        partes = p[9:].split("|")
        tipo_norma = partes[0].strip() if len(partes) > 0 else "Normativa"
        titulo = partes[1].strip() if len(partes) > 1 else "Añadida manualmente"
        juris = partes[2].strip() if len(partes) > 2 else "Nacional"
        
        nueva = LegalRequirement(
            tipo_norma=tipo_norma,
            titulo_tema=titulo,
            jurisdiccion=juris,
            ambito="Transversal",
            estado_cumplimiento="A Revisar",
            estado_vigencia="Vigente"
        )
        db.add(nueva)
        db.commit()
        return f"✅ ¡Hecho! Agregué la norma: {tipo_norma} - {titulo}."
        
    if p_lower.startswith("/eliminar "):
        # Ejemplo: /eliminar 37
        try:
            id_norma = int(p[10:].strip())
            norma = db.query(LegalRequirement).filter(LegalRequirement.id == id_norma).first()
            if norma:
                db.delete(norma)
                db.commit()
                return f"🗑️ ¡Hecho! Eliminé la norma ID {id_norma} ({norma.tipo_norma})."
            else:
                return f"❌ No pude encontrar la norma con ID {id_norma} para eliminar."
        except ValueError:
            return "❌ Formato incorrecto. Usa: /eliminar [ID] (ejemplo: /eliminar 37)"
            
    if p_lower.startswith("/editar "):
        # Ejemplo: /editar 37 estado_cumplimiento=Cumple
        try:
            partes = p[8:].strip().split(" ", 1)
            id_norma = int(partes[0])
            campo, valor = partes[1].split("=", 1)
            campo = campo.strip()
            valor = valor.strip()
            
            norma = db.query(LegalRequirement).filter(LegalRequirement.id == id_norma).first()
            if norma and hasattr(norma, campo):
                setattr(norma, campo, valor)
                db.commit()
                return f"✏️ ¡Hecho! Actualicé la norma ID {id_norma}. Su {campo} ahora es: {valor}."
            else:
                return f"❌ No pude editar. Verifica que el ID {id_norma} y el campo existan."
        except Exception:
            return "❌ Formato incorrecto. Usa: /editar [ID] campo=valor (ejemplo: /editar 37 estado_cumplimiento=Cumple)"
    # -----------------------------------------------------------------
    
    # 1. Recuperar TODAS las normativas de la base de datos para darle contexto a la IA
    normativas = db.query(LegalRequirement).all()
    
    if not normativas:
        return "Actualmente no tengo ninguna normativa guardada en la base de datos de la Matriz Legal."
        
    # 2. Construir el contexto clásico
    contexto = "Eres un asistente legal experto. Tu tarea es responder preguntas BASÁNDOTE ÚNICAMENTE en la siguiente lista de normativas de la Matriz Legal de la empresa.\n\n"
    contexto += "--- LISTA DE NORMATIVAS ---\n"
    
    for req in normativas:
        contexto += f"- ID: {req.id} | Norma: {req.tipo_norma}\n"
        contexto += f"  Título: {req.titulo_tema}\n"
        contexto += f"  Ámbito: {req.ambito}\n"
        contexto += f"  Estado: {req.estado_cumplimiento}\n\n"
        
    contexto += "--- FIN DE NORMATIVAS ---\n\n"
    contexto += "Instrucciones:\n"
    contexto += "1. Si la pregunta se relaciona con normativas de la lista, prioriza y responde usando esa información de la Matriz Legal.\n"
    contexto += "2. Si el usuario hace una pregunta general o sobre algo que no está en la lista, puedes responder usando tu amplio conocimiento como Inteligencia Artificial experta en leyes.\n"
    contexto += "3. Si usas información de tu conocimiento general, aclara amablemente al final que esa normativa 'no está registrada actualmente en la Matriz Legal de la empresa'.\n"
    contexto += f"3. La pregunta del usuario es: {pregunta}\n"
    
    # 3. Llamar a Gemini usando el SDK moderno y modelos robustos
    client = genai.Client(api_key=GEMINI_API_KEY)
    modelos = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemma-4-26b-a4b-it', 'gemini-2.5-flash']
    
    errores = []
    for modelo in modelos:
        try:
            response = client.models.generate_content(
                model=modelo,
                contents=contexto,
            )
            # Limpiar asteriscos y guiones bajos por las dudas
            texto_respuesta = response.text.replace("**", "*").replace("_", "")
            return texto_respuesta
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
