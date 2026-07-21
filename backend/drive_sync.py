import os
import re
from google.oauth2 import service_account
from googleapiclient.discovery import build
from models import Document
from sqlalchemy.orm import Session
from datetime import datetime

# Rutas y configuración
# Puede leerse de una variable de entorno (ideal para producción en Render con Secret Files)
CREDENTIALS_FILE = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', 'credentials.json')
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
# The ID of the folder to sync is now passed per workspace.

# Regex for "TTT-SSS-NNN Titulo Rev.nn"
# Example: PRO-HYS-001 Procedimiento de Investigaciones Rev.00
# Extensión del archivo puede estar al final, ej: .pdf, .docx
FILE_PATTERN = re.compile(r'^([A-Z]{3})-([A-Z]{3})-(\d{3})\s+(.*?)\s+Rev\.(\d{2})(?:\.\w+)?$')

def get_tipo_from_codigo(ttt: str) -> str:
    mapping = {
        'PRO': 'Procedimiento',
        'REG': 'Matriz', # Registro mapped to Matriz/Registro
        'MAN': 'Manual',
        'INS': 'Instructivo',
        'POL': 'Política',
        'FOR': 'Formulario'
    }
    return mapping.get(ttt, 'Otro')

def get_all_files_in_folder(service, folder_id):
    """
    Función recursiva para buscar archivos en una carpeta y todas sus subcarpetas.
    """
    all_files = []
    query = f"'{folder_id}' in parents and trashed = false"
    
    try:
        results = service.files().list(
            q=query,
            pageSize=1000,
            fields="nextPageToken, files(id, name, webViewLink, mimeType)"
        ).execute()
        
        items = results.get('files', [])
        for item in items:
            if item.get('mimeType') == 'application/vnd.google-apps.folder':
                # Si es una subcarpeta, entrar y buscar recursivamente
                all_files.extend(get_all_files_in_folder(service, item.get('id')))
            else:
                # Si es un archivo normal, agregarlo a la lista
                all_files.append(item)
    except Exception as e:
        print(f"Error leyendo carpeta {folder_id}: {e}")
        
    return all_files

def sync_drive_folder(db: Session, workspace_id: int, folder_id: str):
    """
    Se conecta a Google Drive, escanea la carpeta especificada (y subcarpetas),
    y por cada archivo que coincida con el patrón, crea un documento
    nuevo si no existe una versión igual o superior.
    """
    if not os.path.exists(CREDENTIALS_FILE):
        return {"status": "error", "message": f"Falta el archivo {CREDENTIALS_FILE}."}
    
    if not folder_id:
        return {"status": "error", "message": "No hay ID de carpeta de Drive configurado."}
    
    try:
        creds = service_account.Credentials.from_service_account_file(
            CREDENTIALS_FILE, scopes=SCOPES)
        service = build('drive', 'v3', credentials=creds)
        
        # Obtener los archivos de la carpeta principal Y sus subcarpetas
        items = get_all_files_in_folder(service, folder_id)
        synced_count = 0
        
        for item in items:
            name = item.get('name')
            match = FILE_PATTERN.match(name)
            if not match:
                continue
                
            ttt, sss, nnn, titulo, revision = match.groups()
            codigo = f"{ttt}-{sss}-{nnn}"
            version = int(revision)
            tipo = get_tipo_from_codigo(ttt)
            link_archivo = item.get('webViewLink')
            
            # Verificar si ya existe este documento en la base de datos (con esa misma version o superior)
            # Buscamos por codigo
            existing = db.query(Document).filter(
                Document.workspace_id == workspace_id,
                Document.codigo == codigo
            ).order_by(Document.version.desc()).first()
            
            # Si el documento no existe en absoluto, o existe pero su version máxima es menor a la que encontramos en drive
            # entonces insertamos la nueva versión en estado Borrador
            if not existing or existing.version < version:
                new_doc = Document(
                    workspace_id=workspace_id,
                    codigo=codigo,
                    titulo=titulo.strip(),
                    tipo=tipo,
                    version=version,
                    estado="Borrador",
                    link_archivo=link_archivo,
                    fecha_creacion=datetime.utcnow().isoformat() + "Z",
                    autor="Google Drive Sync",
                    motivo_cambio="Sincronizado automáticamente desde Google Drive."
                )
                db.add(new_doc)
                db.commit()
                synced_count += 1
                
        return {"status": "success", "message": f"Se sincronizaron {synced_count} documentos nuevos desde Google Drive."}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}
