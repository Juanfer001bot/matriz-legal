const API_URL = 'http://localhost:8000/api/requirements';
let requirements = [];

// DOM Elements
const tableBody = document.getElementById('tableBody');
const searchBox = document.getElementById('searchBox');
const filterAmbito = document.getElementById('filterAmbito');
const filterEstado = document.getElementById('filterEstado');

const modal = document.getElementById('modalForm');
const closeBtn = document.querySelector('.close-btn');
const btnNewReq = document.getElementById('btnNewReq');
const reqForm = document.getElementById('reqForm');

// Event Listeners
document.addEventListener('DOMContentLoaded', fetchRequirements);
searchBox.addEventListener('input', renderTable);
filterAmbito.addEventListener('change', renderTable);
filterEstado.addEventListener('change', renderTable);

btnNewReq.addEventListener('click', () => {
    reqForm.reset();
    document.getElementById('reqId').value = '';
    document.getElementById('modalTitle').innerText = 'Nueva Normativa';
    modal.classList.add('active');
});

closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
    }
});

reqForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('reqId').value;
    
    // Recolectar datos
    const data = {
        ambito: document.getElementById('ambito').value,
        jurisdiccion: document.getElementById('jurisdiccion').value,
        tipo_norma: document.getElementById('tipo_norma').value,
        numero_anio: document.getElementById('numero_anio').value,
        titulo_tema: document.getElementById('titulo_tema').value,
        autoridad_aplicacion: document.getElementById('autoridad_aplicacion').value,
        estado_vigencia: document.getElementById('estado_vigencia').value,
        
        articulos_aplicables: document.getElementById('articulos_aplicables').value,
        obligacion_requisito: document.getElementById('obligacion_requisito').value,
        justificacion_aplicabilidad: document.getElementById('justificacion_aplicabilidad').value,
        frecuencia_cumplimiento: document.getElementById('frecuencia_cumplimiento').value,
        vinculacion_tecnica: document.getElementById('vinculacion_tecnica').value,
        
        estado_cumplimiento: document.getElementById('estado_cumplimiento').value,
        evidencia_objetiva: document.getElementById('evidencia_objetiva').value,
        fecha_ultima_evaluacion: document.getElementById('fecha_ultima_evaluacion').value,
        proxima_fecha_evaluacion: document.getElementById('proxima_fecha_evaluacion').value,
        responsable_evaluacion: document.getElementById('responsable_evaluacion').value,
        
        accion_correctiva: document.getElementById('accion_correctiva').value,
        numero_nc: document.getElementById('numero_nc').value,
        responsable_accion: document.getElementById('responsable_accion').value,
        fecha_limite: document.getElementById('fecha_limite').value
    };

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/${id}` : API_URL;
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            modal.classList.remove('active');
            fetchRequirements();
        } else {
            console.error('Error al guardar');
        }
    } catch (error) {
        console.error('Network error', error);
    }
});

async function fetchRequirements() {
    try {
        const response = await fetch(API_URL);
        requirements = await response.json();
        renderTable();
    } catch (error) {
        console.error('Error fetching data', error);
    }
}

function getBadgeClass(estado) {
    if (!estado) return 'no-evaluado';
    const str = estado.toLowerCase().trim();
    if (str.includes('no cumple')) return 'no-cumple';
    if (str.includes('cumple')) return 'cumple';
    if (str.includes('proceso')) return 'en-proceso';
    if (str.includes('revisar')) return 'a-revisar';
    return 'no-evaluado';
}

function renderTable() {
    const term = searchBox.value.toLowerCase();
    const ambitoF = filterAmbito.value;
    const estadoF = filterEstado.value;

    const filtered = requirements.filter(req => {
        const matchTerm = (req.titulo_tema || '').toLowerCase().includes(term) ||
                          (req.tipo_norma || '').toLowerCase().includes(term) ||
                          (req.numero_anio || '').toLowerCase().includes(term) ||
                          String(req.id).includes(term);
        const matchAmbito = ambitoF ? req.ambito === ambitoF : true;
        const matchEstado = estadoF ? req.estado_cumplimiento === estadoF : true;
        return matchTerm && matchAmbito && matchEstado;
    });

    tableBody.innerHTML = '';
    
    filtered.forEach(req => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${req.id}</td>
            <td>${req.tipo_norma} ${req.numero_anio}</td>
            <td>${req.ambito}</td>
            <td>${req.jurisdiccion}</td>
            <td><div style="max-width:300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${req.titulo_tema}">${req.titulo_tema}</div></td>
            <td><span class="badge ${getBadgeClass(req.estado_cumplimiento)}">${req.estado_cumplimiento}</span></td>
            <td>
                <button class="action-btn" onclick="editRequirement(${req.id})">Editar</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function editRequirement(id) {
    const req = requirements.find(r => r.id === id);
    if (!req) return;

    document.getElementById('reqId').value = req.id;
    document.getElementById('modalTitle').innerText = 'Editar Normativa #' + req.id;
    
    Object.keys(req).forEach(key => {
        const el = document.getElementById(key);
        if (el) el.value = req[key] || '';
    });
    
    modal.classList.add('active');
}
