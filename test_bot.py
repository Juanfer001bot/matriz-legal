import asyncio
from backend.database import SessionLocal
from backend.models import LegalRequirement
from backend.notifications import send_telegram_alert, send_email_alert

async def test_bot():
    db = SessionLocal()
    
    # Crear una normativa de prueba nueva para asegurar que llegue
    titulo = "Resolución 999/2026 - Prueba de Sistema de Alertas (TEST)"
    
    # Agregar a la BD si no existe
    existe = db.query(LegalRequirement).filter(LegalRequirement.titulo_tema == titulo).first()
    if not existe:
        req = LegalRequirement(
            ambito="Transversal",
            jurisdiccion="Nacional",
            tipo_norma="Resolución",
            titulo_tema=titulo,
            estado_cumplimiento="A Revisar",
            estado_vigencia="Vigente"
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        
        mensaje_html = f"<b>Nuevas Normativas Detectadas:</b><br>- {req.tipo_norma}: {req.titulo_tema} ({req.ambito})<br>"
        mensaje_telegram = f"🚨 *Nuevas Normativas Detectadas (BORA)* 🚨\n\n• {req.tipo_norma}: {req.titulo_tema} ({req.ambito})\n\nSe han agregado a la Matriz Legal con estado 'A Revisar'."
        
        await send_telegram_alert(mensaje_telegram)
        send_email_alert("Novedades Boletín Oficial - Matriz Legal", mensaje_html)
        print("Test enviado con éxito.")
    else:
        print("El test ya se ejecutó previamente.")
        
    db.close()

if __name__ == "__main__":
    asyncio.run(test_bot())
