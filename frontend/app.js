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
    fetchRequirements(); fetchActionPlans();
});

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    fetchMe();
});

// Theme Toggle Logic
const btnThemeToggle = document.getElementById('btnThemeToggle');
if (btnThemeToggle) {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    if (currentTheme === 'light') {
        document.documentElement.classList.add('light-mode');
        btnThemeToggle.textContent = '🌙 Oscuro';
    }

    btnThemeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('light-mode');
        if (document.documentElement.classList.contains('light-mode')) {
            localStorage.setItem('theme', 'light');
            btnThemeToggle.textContent = '🌙 Oscuro';
        } else {
            localStorage.setItem('theme', 'dark');
            btnThemeToggle.textContent = '☀️ Claro';
        }
    });
}

async function fetchMe() {
    try {
        const res = await fetch('/api/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const user = await res.json();
            currentUserId = user.id;
            if (user.email === 'juan@test.com') {
                if (btnAdmin) btnAdmin.style.display = 'inline-block';
                const btnInt = document.getElementById('btnIntegrations');
                if (btnInt) btnInt.style.display = 'inline-block';
                const btnInbox = document.getElementById('btnInbox');
                if (btnInbox) btnInbox.style.display = 'inline-block';
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
                fetchRequirements(); fetchActionPlans();
            } else {
                fetchRequirements(); fetchActionPlans();
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
    const linkWebBtn = document.getElementById('linkWebBtn');
    if (linkWebBtn) linkWebBtn.style.display = 'none';
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
        estado_cumplimiento: document.getElementById('estado_cumplimiento').value,
        link_web: document.getElementById('link_web') ? document.getElementById('link_web').value : ''
    };
    
    const inbox_id_input = document.getElementById('inbox_id');
    if (inbox_id_input && inbox_id_input.value) {
        data.inbox_id = parseInt(inbox_id_input.value);
    }
    
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
            fetchRequirements(); fetchActionPlans();
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
        populateTemas();
        renderTable();
    } catch (error) {
        console.error('Error fetching data', error);
    }
}

function populateTemas() {
    // Ya no es necesario poblar dinámicamente porque los temas están predefinidos
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
        const matchAmbito = ambitoF ? (req.tema || '').trim() === ambitoF : true;
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
    
    const linkWebBtn = document.getElementById('linkWebBtn');
    if (linkWebBtn) {
        if (req.link_web) {
            linkWebBtn.href = req.link_web;
            linkWebBtn.style.display = 'inline-flex';
        } else {
            linkWebBtn.style.display = 'none';
        }
    }
    
    modal.classList.add('active');
}

// --- LOGICA DE BANDEJA DE NOVEDADES (INBOX) ---
const btnInbox = document.getElementById('btnInbox');
const modalInbox = document.getElementById('modalInbox');
const closeInboxModal = document.getElementById('closeInboxModal');
const inboxTableBody = document.getElementById('inboxTableBody');

if (btnInbox) {
    btnInbox.addEventListener('click', () => {
        fetchInbox();
        modalInbox.classList.add('active');
    });
}

if (closeInboxModal) {
    closeInboxModal.addEventListener('click', () => {
        modalInbox.classList.remove('active');
    });
}

async function fetchInbox() {
    try {
        const res = await fetch('/api/inbox', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const items = await res.json();
            renderInboxTable(items);
        }
    } catch (e) {
        console.error('Error fetching inbox', e);
    }
}

function renderInboxTable(items) {
    if (!inboxTableBody) return;
    inboxTableBody.innerHTML = '';
    if (items.length === 0) {
        inboxTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay novedades pendientes.</td></tr>';
        return;
    }
    
    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.fecha}</td>
            <td>${item.jurisdiccion_nacional}</td>
            <td>${item.jurisdiccion_local}</td>
            <td>${item.tipo_norma}</td>
            <td><div style="max-width:350px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.titulo}">${item.titulo}</div></td>
            <td>
                <button class="action-btn" onclick='approveInboxItem(${JSON.stringify(item).replace(/'/g, "\'")})' style="background-color: var(--primary);">Aprobar</button>
                <button class="action-btn" onclick="discardInboxItem(${item.id})" style="background-color: #ff4d4d;">Descartar</button>
            </td>
        `;
        inboxTableBody.appendChild(tr);
    });
}

async function discardInboxItem(id) {
    if (!confirm('¿Seguro que deseas descartar esta novedad? No se agregará a la matriz.')) return;
    try {
        const res = await fetch(`/api/inbox/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            fetchInbox();
        }
    } catch (e) {
        console.error('Error discarding inbox item', e);
    }
}

function approveInboxItem(item) {
    // Cerrar modal inbox y abrir el de nueva normativa
    if (modalInbox) modalInbox.classList.remove('active');
    
    reqForm.reset();
    document.getElementById('reqId').value = '';
    
    // Create hidden input if not exists
    let inboxInput = document.getElementById('inbox_id');
    if (!inboxInput) {
        inboxInput = document.createElement('input');
        inboxInput.type = 'hidden';
        inboxInput.id = 'inbox_id';
        reqForm.appendChild(inboxInput);
    }
    inboxInput.value = item.id;
    
    document.getElementById('modalTitle').innerText = 'Aprobar Novedad';
    
    document.getElementById('tipo_norma').value = item.tipo_norma || '';
    document.getElementById('anio_fecha').value = item.fecha || '';
    document.getElementById('jurisdiccion_nacional').value = item.jurisdiccion_nacional || '';
    document.getElementById('jurisdiccion_local').value = item.jurisdiccion_local || '';
    document.getElementById('titulo').value = item.titulo || '';
    document.getElementById('autoridad_aplicacion').value = item.autoridad_aplicacion || '';
    document.getElementById('estado_cumplimiento').value = 'A Revisar';
    document.getElementById('estado_vigencia').value = 'Vigente';
    
    modal.classList.add('active');
}

// --- LOGICA DE PLANES DE ACCION ---
let actionPlans = [];
const API_ACTION_URL = '/api/action-plans';

const btnMatrizView = document.getElementById('btnMatrizView');
const btnActionPlans = document.getElementById('btnActionPlans');
const matrizFilters = document.getElementById('matrizFilters');
const matrizTableContainer = document.getElementById('matrizTableContainer');
const actionPlanFilters = document.getElementById('actionPlanFilters');
const actionPlanTableContainer = document.getElementById('actionPlanTableContainer');
const actionPlanTableBody = document.getElementById('actionPlanTableBody');
const searchActionBox = document.getElementById('searchActionBox');

const modalActionPlan = document.getElementById('modalActionPlan');
const closeActionPlanModal = document.getElementById('closeActionPlanModal');
const btnNewActionPlan = document.getElementById('btnNewActionPlan');
const actionPlanForm = document.getElementById('actionPlanForm');
const btnDeleteActionPlan = document.getElementById('btnDeleteActionPlan');

btnMatrizView.addEventListener('click', () => {
    btnMatrizView.style.display = 'none';
    btnActionPlans.style.display = 'inline-block';
    
    matrizFilters.style.display = 'flex';
    matrizTableContainer.style.display = 'block';
    
    actionPlanFilters.style.display = 'none';
    actionPlanTableContainer.style.display = 'none';
});

btnActionPlans.addEventListener('click', () => {
    btnActionPlans.style.display = 'none';
    btnMatrizView.style.display = 'inline-block';
    
    matrizFilters.style.display = 'none';
    matrizTableContainer.style.display = 'none';
    
    actionPlanFilters.style.display = 'flex';
    actionPlanTableContainer.style.display = 'block';
    
    fetchActionPlans();
});

btnNewActionPlan.addEventListener('click', () => {
    actionPlanForm.reset();
    document.getElementById('ap_id').value = '';
    document.getElementById('modalActionTitle').innerText = 'Nuevo Plan de Acción';
    populateActionPlanRequirements();
    btnDeleteActionPlan.style.display = 'none';
    modalActionPlan.classList.add('active');
});

closeActionPlanModal.addEventListener('click', () => {
    modalActionPlan.classList.remove('active');
});

searchActionBox.addEventListener('input', renderActionPlanTable);

async function fetchActionPlans() {
    try {
        const url = currentWorkspaceId ? `${API_ACTION_URL}?workspace_id=${currentWorkspaceId}` : API_ACTION_URL;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            actionPlans = await response.json();
            renderActionPlanTable();
        }
    } catch (e) {
        console.error('Error fetching action plans', e);
    }
}

function renderActionPlanTable() {
    const term = searchActionBox.value.toLowerCase();
    
    const filtered = actionPlans.filter(ap => {
        return (ap.nc_id || '').toLowerCase().includes(term) ||
               (ap.origen_nc || '').toLowerCase().includes(term) ||
               (ap.responsable || '').toLowerCase().includes(term) ||
               (ap.accion_implementar || '').toLowerCase().includes(term);
    });
    
    actionPlanTableBody.innerHTML = '';
    
    filtered.forEach(ap => {
        let reqText = "-";
        if (ap.requirement_id) {
            const req = requirements.find(r => r.id === ap.requirement_id);
            if (req) {
                reqText = `#${req.id} - ${req.tipo_norma} ${req.numero}`;
            }
        }
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${ap.nc_id}</td>
            <td><span class="badge" style="background-color: var(--card-bg); color: var(--text-color); border: 1px solid var(--border-color);">${reqText}</span></td>
            <td>${ap.origen_nc}</td>
            <td>${ap.responsable}</td>
            <td><div style="max-width:250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${ap.accion_implementar}">${ap.accion_implementar}</div></td>
            <td><span class="badge ${ap.estado_avance === 'Cerrado' ? 'cumple' : (ap.estado_avance === 'En Proceso' ? 'en-proceso' : 'no-evaluado')}">${ap.estado_avance}</span></td>
            <td>${ap.fecha_cierre || '-'}</td>
            <td>
                <button class="action-btn" onclick="editActionPlan(${ap.id})">Detalles</button>
            </td>
        `;
        actionPlanTableBody.appendChild(tr);
    });
}

function editActionPlan(id) {
    const ap = actionPlans.find(a => a.id === id);
    if (!ap) return;
    
    document.getElementById('ap_id').value = ap.id;
    document.getElementById('modalActionTitle').innerText = 'Editar Plan de Acción';
    
    document.getElementById('ap_nc_id').value = ap.nc_id || '';
    document.getElementById('ap_origen_nc').value = ap.origen_nc || '';
    populateActionPlanRequirements(ap.requirement_id);
    document.getElementById('ap_responsable').value = ap.responsable || '';
    document.getElementById('ap_fecha_compromiso').value = ap.fecha_compromiso || '';
    document.getElementById('ap_accion_implementar').value = ap.accion_implementar || '';
    document.getElementById('ap_estado_avance').value = ap.estado_avance || 'Pendiente';
    document.getElementById('ap_fecha_cierre').value = ap.fecha_cierre || '';
    
    btnDeleteActionPlan.style.display = 'inline-block';
    modalActionPlan.classList.add('active');
}

actionPlanForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('ap_id').value;
    
    const data = {
        nc_id: document.getElementById('ap_nc_id').value,
        requirement_id: document.getElementById('ap_requirement_id').value ? parseInt(document.getElementById('ap_requirement_id').value) : null,
        origen_nc: document.getElementById('ap_origen_nc').value,
        responsable: document.getElementById('ap_responsable').value,
        fecha_compromiso: document.getElementById('ap_fecha_compromiso').value,
        accion_implementar: document.getElementById('ap_accion_implementar').value,
        estado_avance: document.getElementById('ap_estado_avance').value,
        fecha_cierre: document.getElementById('ap_fecha_cierre').value
    };
    
    if (!id && currentWorkspaceId) {
        data.workspace_id = parseInt(currentWorkspaceId);
    }
    
    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_ACTION_URL}/${id}` : API_ACTION_URL;
        
        const response = await fetch(url, {
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            modalActionPlan.classList.remove('active');
            fetchActionPlans();
        }
    } catch (e) {
        console.error(e);
    }
});

btnDeleteActionPlan.addEventListener('click', async () => {
    const id = document.getElementById('ap_id').value;
    if (!id) return;
    if (!confirm('¿Seguro que deseas eliminar este Plan de Acción?')) return;
    
    try {
        const res = await fetch(`${API_ACTION_URL}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            modalActionPlan.classList.remove('active');
            fetchActionPlans();
        }
    } catch (e) {
        console.error(e);
    }
});


function populateActionPlanRequirements(selectedValue = "") {
    const select = document.getElementById('ap_requirement_id');
    select.innerHTML = '<option value="">-- Ninguna (Libre) --</option>';
    
    // Filter requirements that are not "Cumple"
    const problematicReqs = requirements.filter(r => 
        r.estado_cumplimiento && 
        (r.estado_cumplimiento.toLowerCase().includes('no cumple') || 
         r.estado_cumplimiento.toLowerCase().includes('proceso') ||
         r.estado_cumplimiento.toLowerCase().includes('revisar'))
    );
    
    problematicReqs.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = `#${r.id} - ${r.tipo_norma} ${r.numero} (${r.estado_cumplimiento})`;
        select.appendChild(opt);
    });
    
    if (selectedValue) {
        select.value = selectedValue;
    }
}


// --- LOGICA DE INTEGRACIONES ---
const btnIntegrations = document.getElementById('btnIntegrations');
const modalIntegrations = document.getElementById('modalIntegrations');
const closeIntegrationsModal = document.getElementById('closeIntegrationsModal');
const koboWebhookUrl = document.getElementById('koboWebhookUrl');

if (btnIntegrations) {
    btnIntegrations.addEventListener('click', async () => {
        if (!currentWorkspaceId) {
            alert('Selecciona un equipo activo primero');
            return;
        }
        
        try {
            const res = await fetch(`/api/integrations/kobo?workspace_id=${currentWorkspaceId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const currentUrl = window.location.origin;
                koboWebhookUrl.value = `${currentUrl}/api/kobo/webhook/${data.workspace_id}/${data.webhook_secret}`;
                modalIntegrations.classList.add('active');
            } else {
                alert('No autorizado');
            }
        } catch (e) {
            console.error(e);
        }
    });
}

if (closeIntegrationsModal) {
    closeIntegrationsModal.addEventListener('click', () => {
        modalIntegrations.classList.remove('active');
    });
}

// --- LOGICA DE CONSULTA Y PARTICIPACION ---
const btnParticipacion = document.getElementById('btnParticipacion');
const participacionFilters = document.getElementById('participacionFilters');
const consultasTableContainer = document.getElementById('consultasTableContainer');
const minutasTableContainer = document.getElementById('minutasTableContainer');

const btnTabConsultas = document.getElementById('btnTabConsultas');
const btnTabMinutas = document.getElementById('btnTabMinutas');
const consultasTableBody = document.getElementById('consultasTableBody');
const minutasTableBody = document.getElementById('minutasTableBody');

const modalConsulta = document.getElementById('modalConsulta');
const modalMinuta = document.getElementById('modalMinuta');
const closeConsultaModal = document.getElementById('closeConsultaModal');
const closeMinutaModal = document.getElementById('closeMinutaModal');

const consultaForm = document.getElementById('consultaForm');
const minutaForm = document.getElementById('minutaForm');

let consultas = [];
let minutas = [];

if (btnParticipacion) {
    btnParticipacion.addEventListener('click', () => {
        // Hide others
        btnMatrizView.style.display = window.currentUserEmail && window.currentUserEmail.startsWith('consultas@') ? 'none' : 'inline-block';
        if (window.currentUserEmail && !window.currentUserEmail.startsWith('consultas@')) {
            btnActionPlans.style.display = 'inline-block';
        }
        btnParticipacion.style.display = 'none';
        
        matrizFilters.style.display = 'none';
        matrizTableContainer.style.display = 'none';
        actionPlanFilters.style.display = 'none';
        actionPlanTableContainer.style.display = 'none';
        
        // Show Participacion
        participacionFilters.style.display = 'flex';
        btnTabConsultas.click(); // Default tab
    });
}

btnTabConsultas.addEventListener('click', () => {
    btnTabConsultas.style.backgroundColor = 'var(--primary)';
    btnTabConsultas.style.color = 'white';
    btnTabMinutas.style.backgroundColor = 'var(--card-bg)';
    btnTabMinutas.style.color = 'var(--text-color)';
    
    consultasTableContainer.style.display = 'block';
    minutasTableContainer.style.display = 'none';
    fetchConsultas();
});

btnTabMinutas.addEventListener('click', () => {
    btnTabMinutas.style.backgroundColor = 'var(--primary)';
    btnTabMinutas.style.color = 'white';
    btnTabConsultas.style.backgroundColor = 'var(--card-bg)';
    btnTabConsultas.style.color = 'var(--text-color)';
    
    minutasTableContainer.style.display = 'block';
    consultasTableContainer.style.display = 'none';
    fetchMinutas();
});

// APIs
async function fetchConsultas() {
    if (!currentWorkspaceId) return;
    try {
        const res = await fetch(`/api/consultations?workspace_id=${currentWorkspaceId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            consultas = await res.json();
            renderConsultasTable();
        }
    } catch (e) { console.error(e); }
}

async function fetchMinutas() {
    if (!currentWorkspaceId) return;
    try {
        const res = await fetch(`/api/meeting-minutes?workspace_id=${currentWorkspaceId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            minutas = await res.json();
            renderMinutasTable();
        }
    } catch (e) { console.error(e); }
}

function renderConsultasTable() {
    consultasTableBody.innerHTML = '';
    const isGestor = !(window.currentUserEmail && window.currentUserEmail.startsWith('consultas@'));
    
    consultas.forEach(c => {
        let adjuntoHtml = c.archivo_adjunto ? `<a href="${c.archivo_adjunto}" target="_blank" style="color: var(--primary);">Ver Adjunto</a>` : '-';
        let badgeClass = c.estado === 'Resuelto' ? 'cumple' : (c.estado === 'En Análisis' ? 'en-proceso' : 'no-evaluado');
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.fecha}</td>
            <td><strong>${c.tipo}</strong></td>
            <td>${c.es_anonimo === 1 ? 'Anónimo' : (c.autor || 'Anónimo')}</td>
            <td><div style="max-width:250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${c.detalle}">${c.detalle}</div></td>
            <td><span class="badge ${badgeClass}">${c.estado}</span></td>
            <td>
                <button class="action-btn" onclick="editConsulta(${c.id})">${isGestor ? 'Gestionar' : 'Ver'}</button>
            </td>
        `;
        consultasTableBody.appendChild(tr);
    });
}

function renderMinutasTable() {
    minutasTableBody.innerHTML = '';
    minutas.forEach(m => {
        let adjuntoHtml = m.archivo_adjunto ? `<a href="${m.archivo_adjunto}" target="_blank" style="color: var(--primary);">Ver Adjunto</a>` : '-';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${m.fecha}</td>
            <td><div style="max-width:200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${m.participantes}">${m.participantes}</div></td>
            <td><div style="max-width:250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${m.temas_tratados}">${m.temas_tratados}</div></td>
            <td>${adjuntoHtml}</td>
            <td>
                <button class="action-btn" onclick="editMinuta(${m.id})">Detalles</button>
            </td>
        `;
        minutasTableBody.appendChild(tr);
    });
}

document.getElementById('btnNewConsulta').addEventListener('click', () => {
    consultaForm.reset();
    document.getElementById('cons_id').value = '';
    document.getElementById('modalConsultaTitle').innerText = 'Nueva Consulta / Sugerencia';
    document.getElementById('btnConsGenActionPlan').style.display = 'none';
    
    const isGestor = !(window.currentUserEmail && window.currentUserEmail.startsWith('consultas@'));
    document.querySelectorAll('.gestor-only').forEach(el => el.style.display = isGestor ? 'block' : 'none');
    
    modalConsulta.classList.add('active');
});

document.getElementById('btnNewMinuta').addEventListener('click', () => {
    minutaForm.reset();
    document.getElementById('min_id').value = '';
    document.getElementById('modalMinutaTitle').innerText = 'Nueva Minuta de Reunión';
    document.getElementById('btnMinutaGenActionPlan').style.display = 'none';
    document.getElementById('btnMinutaPdf').style.display = 'none';
    modalMinuta.classList.add('active');
});

closeConsultaModal.addEventListener('click', () => modalConsulta.classList.remove('active'));
closeMinutaModal.addEventListener('click', () => modalMinuta.classList.remove('active'));

window.editConsulta = (id) => {
    const c = consultas.find(x => x.id === id);
    if (!c) return;
    document.getElementById('cons_id').value = c.id;
    document.getElementById('modalConsultaTitle').innerText = 'Detalle de ' + c.tipo;
    
    document.getElementById('cons_fecha').value = c.fecha || '';
    document.getElementById('cons_tipo').value = c.tipo || 'Consulta';
    document.getElementById('cons_anonimo').value = c.es_anonimo || 0;
    document.getElementById('cons_autor').value = c.autor || '';
    document.getElementById('cons_detalle').value = c.detalle || '';
    document.getElementById('cons_adjunto').value = c.archivo_adjunto || '';
    document.getElementById('cons_analisis').value = c.analisis_gestor || '';
    document.getElementById('cons_estado').value = c.estado || 'Pendiente';
    
    const isGestor = !(window.currentUserEmail && window.currentUserEmail.startsWith('consultas@'));
    document.querySelectorAll('.gestor-only').forEach(el => el.style.display = isGestor ? 'block' : 'none');
    
    if (isGestor) {
        document.getElementById('btnConsGenActionPlan').style.display = 'inline-block';
    } else {
        // Disable fields for generic user if editing
        document.getElementById('cons_fecha').disabled = true;
        document.getElementById('cons_detalle').disabled = true;
    }
    
    modalConsulta.classList.add('active');
};

window.editMinuta = (id) => {
    const m = minutas.find(x => x.id === id);
    if (!m) return;
    document.getElementById('min_id').value = m.id;
    document.getElementById('modalMinutaTitle').innerText = 'Editar Minuta de Reunión';
    
    document.getElementById('min_fecha').value = m.fecha || '';
    document.getElementById('min_participantes').value = m.participantes || '';
    document.getElementById('min_temas').value = m.temas_tratados || '';
    document.getElementById('min_adjunto').value = m.archivo_adjunto || '';
    
    document.getElementById('btnMinutaGenActionPlan').style.display = 'inline-block';
    document.getElementById('btnMinutaPdf').style.display = 'inline-block';
    
    modalMinuta.classList.add('active');
};

// Generar Plan desde Consulta
document.getElementById('btnConsGenActionPlan').addEventListener('click', () => {
    modalConsulta.classList.remove('active');
    btnActionPlans.click();
    btnNewActionPlan.click();
    const tipo = document.getElementById('cons_tipo').value;
    const autor = document.getElementById('cons_autor').value;
    const detalle = document.getElementById('cons_detalle').value;
    document.getElementById('ap_origen_nc').value = tipo + " (Participación)";
    document.getElementById('ap_accion_implementar').value = detalle;
});

// Generar Plan desde Minuta
document.getElementById('btnMinutaGenActionPlan').addEventListener('click', () => {
    modalMinuta.classList.remove('active');
    btnActionPlans.click();
    btnNewActionPlan.click();
    const fecha = document.getElementById('min_fecha').value;
    const temas = document.getElementById('min_temas').value;
    document.getElementById('ap_origen_nc').value = "Minuta de Reunión " + fecha;
    document.getElementById('ap_accion_implementar').value = temas;
});

// Descargar PDF de Minuta
document.getElementById('btnMinutaPdf').addEventListener('click', () => {
    const fecha = document.getElementById('min_fecha').value;
    const participantes = document.getElementById('min_participantes').value;
    const temas = document.getElementById('min_temas').value;
    
    const element = document.createElement('div');
    element.innerHTML = `
        <div style="padding: 40px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #005f73; padding-bottom: 10px;">
                <h1 style="color: #005f73;">MINUTA DE REUNIÓN</h1>
                <p>Sistema de Gestión HSEQ</p>
            </div>
            <p><strong>Fecha de la Reunión:</strong> ${fecha}</p>
            <p><strong>Participantes:</strong> ${participantes}</p>
            <div style="margin-top: 20px;">
                <h3 style="color: #005f73;">Temas Tratados y Acuerdos:</h3>
                <p style="white-space: pre-wrap; line-height: 1.6;">${temas}</p>
            </div>
        </div>
    `;
    
    html2pdf().set({
        margin: 1,
        filename: 'Minuta_' + fecha + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }).from(element).save();
});

// Submits
consultaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('cons_id').value;
    const isGestor = !(window.currentUserEmail && window.currentUserEmail.startsWith('consultas@'));
    
    const data = {
        fecha: document.getElementById('cons_fecha').value,
        tipo: document.getElementById('cons_tipo').value,
        es_anonimo: parseInt(document.getElementById('cons_anonimo').value),
        autor: document.getElementById('cons_autor').value,
        detalle: document.getElementById('cons_detalle').value,
        archivo_adjunto: document.getElementById('cons_adjunto').value,
    };
    
    if (isGestor) {
        data.analisis_gestor = document.getElementById('cons_analisis').value;
        data.estado = document.getElementById('cons_estado').value;
    }
    
    if (!id && currentWorkspaceId) data.workspace_id = parseInt(currentWorkspaceId);
    
    try {
        const res = await fetch(id ? `/api/consultations/${id}` : '/api/consultations', {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            modalConsulta.classList.remove('active');
            fetchConsultas();
        }
    } catch(err) { console.error(err); }
});

minutaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('min_id').value;
    
    const data = {
        fecha: document.getElementById('min_fecha').value,
        participantes: document.getElementById('min_participantes').value,
        temas_tratados: document.getElementById('min_temas').value,
        archivo_adjunto: document.getElementById('min_adjunto').value
    };
    if (!id && currentWorkspaceId) data.workspace_id = parseInt(currentWorkspaceId);
    
    try {
        const res = await fetch(id ? `/api/meeting-minutes/${id}` : '/api/meeting-minutes', {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            modalMinuta.classList.remove('active');
            fetchMinutas();
        }
    } catch(err) { console.error(err); }
});

