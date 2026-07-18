// Check auth
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/login.html';
}

const API_URL = '/api/requirements';
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
const btnAdmin = document.getElementById('btnAdmin');
const btnChangePassword = document.getElementById('btnChangePassword');
const modalPassword = document.getElementById('modalPassword');
const closePasswordModal = document.getElementById('closePasswordModal');
const passwordForm = document.getElementById('passwordForm');
const passwordMsg = document.getElementById('passwordMsg');
let currentUserId = null;
let currentWorkspaceId = null;

const workspaceContainer = document.getElementById('workspaceContainer');
const workspaceSelect = document.getElementById('workspaceSelect');

workspaceSelect.addEventListener('change', () => {
    currentWorkspaceId = workspaceSelect.value;
    fetchRequirements();
});

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    fetchMe();
});

async function fetchMe() {
    try {
        const res = await fetch('/api/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const user = await res.json();
            currentUserId = user.id;
            if (user.email === 'juan@test.com' && btnAdmin) {
                btnAdmin.style.display = 'inline-block';
            }
            
            if (user.workspaces && user.workspaces.length > 0) {
                workspaceSelect.innerHTML = '';
                user.workspaces.forEach(ws => {
                    const opt = document.createElement('option');
                    opt.value = ws.id;
                    opt.textContent = ws.name;
                    workspaceSelect.appendChild(opt);
                });
                
                if (user.workspaces.length > 1) {
                    workspaceContainer.style.display = 'flex';
                }
                currentWorkspaceId = workspaceSelect.value;
                fetchRequirements();
            } else {
                fetchRequirements();
            }
        }
    } catch (e) {
        console.error('Error fetching user info', e);
    }
}

btnChangePassword.addEventListener('click', () => {
    document.getElementById('newPassword').value = '';
    passwordMsg.textContent = '';
    modalPassword.classList.add('active');
});

closePasswordModal.addEventListener('click', () => {
    modalPassword.classList.remove('active');
});

passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;
    passwordMsg.style.color = '';
    passwordMsg.textContent = 'Actualizando...';

    if (!currentUserId) {
        passwordMsg.textContent = 'Error: no se pudo identificar al usuario';
        return;
    }

    try {
        const response = await fetch(`/api/users/${currentUserId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ password: newPassword })
        });
        if (response.ok) {
            modalPassword.classList.remove('active');
            alert('Contraseña actualizada con éxito');
        } else {
            passwordMsg.style.color = '#ff4d4d';
            passwordMsg.textContent = 'Error al actualizar';
        }
    } catch (err) {
        passwordMsg.style.color = '#ff4d4d';
        passwordMsg.textContent = 'Error de red';
    }
});

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
        tipo_norma: document.getElementById('tipo_norma').value,
        numero: document.getElementById('numero').value,
        anio_fecha: document.getElementById('anio_fecha').value,
        jurisdiccion_nacional: document.getElementById('jurisdiccion_nacional').value,
        jurisdiccion_local: document.getElementById('jurisdiccion_local').value,
        tema: document.getElementById('tema').value,
        titulo: document.getElementById('titulo').value,
        breve_descripcion: document.getElementById('breve_descripcion').value,
        autoridad_aplicacion: document.getElementById('autoridad_aplicacion').value,
        estado_vigencia: document.getElementById('estado_vigencia').value,
        articulos_aplicables: document.getElementById('articulos_aplicables').value,
        requisito_obligacion: document.getElementById('requisito_obligacion').value,
        evidencia_cumplimiento: document.getElementById('evidencia_cumplimiento').value,
        estado_cumplimiento: document.getElementById('estado_cumplimiento').value
    };
    
    if (!id && currentWorkspaceId) {
        data.workspace_id = parseInt(currentWorkspaceId);
    }

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/${id}` : API_URL;
        
        const response = await fetch(url, {
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
            return;
        }

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
        const url = currentWorkspaceId ? `${API_URL}?workspace_id=${currentWorkspaceId}` : API_URL;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
            return;
        }

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
        const matchTerm = (req.titulo || '').toLowerCase().includes(term) ||
                          (req.tema || '').toLowerCase().includes(term) ||
                          (req.tipo_norma || '').toLowerCase().includes(term) ||
                          String(req.id).includes(term);
        // Note: The filter dropdown might need updating later since 'ambito' doesn't exist, we can map to 'tema'
        const matchAmbito = ambitoF ? (req.tema || '').includes(ambitoF) : true;
        const matchEstado = estadoF ? req.estado_cumplimiento === estadoF : true;
        return matchTerm && matchAmbito && matchEstado;
    });

    tableBody.innerHTML = '';
    
    filtered.forEach(req => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${req.id}</td>
            <td>${req.jurisdiccion_nacional}</td>
            <td>${req.jurisdiccion_local}</td>
            <td>${req.tipo_norma} ${req.numero}</td>
            <td>${req.tema}</td>
            <td><div style="max-width:300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${req.titulo}">${req.titulo}</div></td>
            <td><span class="badge ${getBadgeClass(req.estado_cumplimiento)}">${req.estado_cumplimiento}</span></td>
            <td>
                <button class="action-btn" onclick="editRequirement(${req.id})">Detalles</button>
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
