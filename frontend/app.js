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

const btnConfigWorkspace = document.getElementById('btnConfigWorkspace');
if (btnConfigWorkspace) {
    btnConfigWorkspace.addEventListener('click', async () => {
        if (!currentWorkspaceId) return;
        const driveFolderId = prompt('Pega aquí el ID de la carpeta de Google Drive para este equipo (ej. 1A2b3C4d5E...):');
        if (driveFolderId !== null) {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/workspaces/${currentWorkspaceId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ drive_folder_id: driveFolderId })
                });
                if (res.ok) {
                    alert('ID de Google Drive guardado correctamente para este equipo.');
                } else {
                    const error = await res.json();
                    alert(`Error: ${error.detail || 'No se pudo guardar.'}`);
                }
            } catch (e) {
                console.error(e);
                alert('Fallo de conexión.');
            }
        }
    });
}

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
            window.currentUserEmail = user.email;

            currentUserId = user.id;
            if (user.email === 'juan@test.com') {
                if (btnAdmin) btnAdmin.style.display = 'inline-block';
                const btnInt = document.getElementById('btnIntegrations');
                if (btnInt) btnInt.style.display = 'inline-block';
                const btnInbox = document.getElementById('btnInbox');
                if (btnInbox) btnInbox.style.display = 'inline-block';
            }
            
            let workspacesToLoad = user.workspaces || [];
            
            // Si es admin, traer TODOS los workspaces
            if (user.email === 'juan@test.com') {
                try {
                    const wsRes = await fetch('/api/workspaces', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (wsRes.ok) {
                        workspacesToLoad = await wsRes.json();
                    }
                } catch (e) {
                    console.error('Error fetching all workspaces for admin', e);
                }
            }
            
            workspaceSelect.innerHTML = '';
            workspacesToLoad.forEach(ws => {
                const opt = document.createElement('option');
                opt.value = ws.id;
                opt.textContent = ws.name;
                workspaceSelect.appendChild(opt);
            });
            
            if (workspacesToLoad.length > 0) {
                workspaceContainer.style.display = 'flex';
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
        inboxTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay novedades pendientes.</td></tr>';
        return;
    }
    
    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: center;"><input type="checkbox" class="inbox-item-checkbox" value="${item.id}"></td>
            <td>${item.fecha}</td>
            <td>${item.jurisdiccion_nacional}</td>
            <td>${item.jurisdiccion_local}</td>
            <td>${item.tipo_norma}</td>
            <td><div style="max-width:350px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.titulo}">${item.titulo}</div></td>
            <td>
                <button class="action-btn" onclick='approveInboxItem(${JSON.stringify(item).replace(/'/g, "\\'")})' style="background-color: var(--primary);">Aprobar</button>
                <button class="action-btn" onclick="discardInboxItem(${item.id})" style="background-color: #ff4d4d;">Descartar</button>
            </td>
        `;
        inboxTableBody.appendChild(tr);
    });
}

async function discardInboxItem(id) {
    if (!confirm('¿Seguro que deseas descartar esta novedad?')) return;
    try {
        const res = await fetch(`/api/inbox/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            fetchInbox();
        } else {
            alert('Error al descartar novedad');
        }
    } catch (e) {
        console.error(e);
    }
}

const selectAllInbox = document.getElementById('selectAllInbox');
if (selectAllInbox) {
    selectAllInbox.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.inbox-item-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
    });
}

const btnBulkDiscard = document.getElementById('btnBulkDiscard');
if (btnBulkDiscard) {
    btnBulkDiscard.addEventListener('click', async () => {
        const checked = document.querySelectorAll('.inbox-item-checkbox:checked');
        if (checked.length === 0) {
            alert('Por favor, selecciona al menos una novedad para descartar.');
            return;
        }
        if (!confirm(`¿Seguro que deseas descartar las ${checked.length} novedades seleccionadas?`)) return;
        
        const ids = Array.from(checked).map(cb => parseInt(cb.value));
        const btnText = btnBulkDiscard.innerHTML;
        btnBulkDiscard.innerHTML = 'Descartando...';
        btnBulkDiscard.disabled = true;
        
        try {
            const res = await fetch('/api/inbox/bulk-delete', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ item_ids: ids })
            });
            if (res.ok) {
                if (selectAllInbox) selectAllInbox.checked = false;
                fetchInbox();
            } else {
                alert('Error al descartar novedades en lote.');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión al descartar.');
        } finally {
            btnBulkDiscard.innerHTML = btnText;
            btnBulkDiscard.disabled = false;
        }
    });
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
    const isGestor = true;
    
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
                <button class="action-btn" onclick="editConsulta(${c.id})">Gestionar</button>
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
    
    const isGestor = true;
    document.querySelectorAll('.gestor-only').forEach(el => el.style.display = 'block');
    
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

const btnCopyBuzonLink = document.getElementById('btnCopyBuzonLink');
if (btnCopyBuzonLink) {
    btnCopyBuzonLink.addEventListener('click', () => {
        if (!currentWorkspaceId) {
            alert('Selecciona un equipo de trabajo primero.');
            return;
        }
        const link = window.location.origin + '/buzon.html?w=' + currentWorkspaceId;
        navigator.clipboard.writeText(link).then(() => {
            alert('¡Enlace copiado al portapapeles!\n' + link);
        }).catch(() => {
            alert('Enlace del Buzón (Cópialo manualmente):\n' + link);
        });
    });
}

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
    
    document.querySelectorAll('.gestor-only').forEach(el => el.style.display = 'block');
    document.getElementById('btnConsGenActionPlan').style.display = 'inline-block';
    
    // Enable fields
    document.getElementById('cons_fecha').disabled = false;
    document.getElementById('cons_detalle').disabled = false;
    
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
    const data = {
        fecha: document.getElementById('cons_fecha').value,
        tipo: document.getElementById('cons_tipo').value,
        es_anonimo: parseInt(document.getElementById('cons_anonimo').value),
        autor: document.getElementById('cons_autor').value,
        detalle: document.getElementById('cons_detalle').value,
        archivo_adjunto: document.getElementById('cons_adjunto').value,
        analisis_gestor: document.getElementById('cons_analisis').value,
        estado: document.getElementById('cons_estado').value
    };
    
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

// ==========================================
// MÓDULO DE INVESTIGACIÓN DE INCIDENTES
// ==========================================
let incidents = [];
const btnIncidentes = document.getElementById('btnIncidentes');
const incidentsTableContainer = document.getElementById('incidentsTableContainer');
const incidentsTableBody = document.getElementById('incidentsTableBody');
const modalIncident = document.getElementById('modalIncident');
const closeIncidentModal = document.getElementById('closeIncidentModal');
const incidentForm = document.getElementById('incidentForm');
const btnNewIncident = document.getElementById('btnNewIncident');
const btnExportIncidentPDF = document.getElementById('btnExportIncidentPDF');

// Hide other sections when clicking incidentes
if (btnIncidentes) {
    btnIncidentes.addEventListener('click', () => {
        document.getElementById('btnMatrizView').style.display = 'inline-block';
        document.getElementById('btnActionPlans').style.display = 'inline-block';
        if (document.getElementById('btnParticipacion')) document.getElementById('btnParticipacion').style.display = 'inline-block';
        btnIncidentes.style.display = 'none';

        if (typeof matrizFilters !== 'undefined') matrizFilters.style.display = 'none';
        if (typeof matrizTableContainer !== 'undefined') matrizTableContainer.style.display = 'none';
        if (typeof actionPlanFilters !== 'undefined') actionPlanFilters.style.display = 'none';
        if (typeof actionPlanTableContainer !== 'undefined') actionPlanTableContainer.style.display = 'none';
        if (typeof participacionFilters !== 'undefined') participacionFilters.style.display = 'none';
        if (document.getElementById('consultasTableContainer')) document.getElementById('consultasTableContainer').style.display = 'none';
        if (document.getElementById('minutasTableContainer')) document.getElementById('minutasTableContainer').style.display = 'none';

        incidentsTableContainer.style.display = 'block';
        fetchIncidents();
    });
}

// Ensure other tabs hide the incidents container
['btnMatrizView', 'btnActionPlans', 'btnParticipacion'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
        btn.addEventListener('click', () => {
            if (incidentsTableContainer) incidentsTableContainer.style.display = 'none';
            if (btnIncidentes) btnIncidentes.style.display = 'inline-block';
        });
    }
});

// Modal Logic
if (btnNewIncident) {
    btnNewIncident.addEventListener('click', () => {
        incidentForm.reset();
        document.getElementById('inc_id').value = '';
        btnExportIncidentPDF.style.display = 'none';
        
        // Hide all conditional modules
        document.querySelectorAll('.inc-module').forEach(el => el.style.display = 'none');
        
        modalIncident.classList.add('active');
    });
}
if (closeIncidentModal) closeIncidentModal.addEventListener('click', () => modalIncident.classList.remove('active'));

// ISO Modules Toggle Logic
document.querySelectorAll('.inc-class-cb').forEach(cb => {
    cb.addEventListener('change', () => {
        const val = cb.value;
        const checked = cb.checked;
        if (val === 'Seguridad y Salud') document.getElementById('mod_45001').style.display = checked ? 'block' : 'none';
        if (val === 'Seguridad Vial') document.getElementById('mod_39001').style.display = checked ? 'block' : 'none';
        if (val === 'Medio Ambiente') document.getElementById('mod_14001').style.display = checked ? 'block' : 'none';
        if (val === 'Energía') document.getElementById('mod_50001').style.display = checked ? 'block' : 'none';
        if (val === 'Calidad') document.getElementById('mod_9001').style.display = checked ? 'block' : 'none';
        if (val === 'Gestión de Activos') document.getElementById('mod_55001').style.display = checked ? 'block' : 'none';
    });
});

async function fetchIncidents() {
    try {
        const url = currentWorkspaceId ? `/api/incidents?workspace_id=${currentWorkspaceId}` : '/api/incidents';
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            incidents = await res.json();
            renderIncidentsTable();
        }
    } catch (err) { console.error(err); }
}

function renderIncidentsTable() {
    if (!incidentsTableBody) return;
    incidentsTableBody.innerHTML = '';
    
    if (incidents.length === 0) {
        incidentsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay incidentes registrados.</td></tr>';
        return;
    }
    
    incidents.forEach(inc => {
        const tr = document.createElement('tr');
        
        let clasesList = '';
        try {
            const arr = JSON.parse(inc.clasificacion || '[]');
            clasesList = arr.join(', ');
        } catch(e) {}
        
        tr.innerHTML = `
            <td>#${inc.id}</td>
            <td>${inc.fecha_evento.replace('T', ' ')}</td>
            <td>${inc.sector}</td>
            <td>${clasesList}</td>
            <td>${inc.reportador}</td>
            <td>
                <button class="action-btn" onclick="editIncident(${inc.id})" style="background-color: var(--primary);">Ver / Editar</button>
                <button class="action-btn" onclick="deleteIncident(${inc.id})" style="background-color: #ff4d4d;">Eliminar</button>
            </td>
        `;
        incidentsTableBody.appendChild(tr);
    });
}

window.editIncident = (id) => {
    const inc = incidents.find(x => x.id === id);
    if (!inc) return;
    
    incidentForm.reset();
    document.querySelectorAll('.inc-module').forEach(el => el.style.display = 'none');
    
    document.getElementById('inc_id').value = inc.id;
    document.getElementById('inc_fecha_reporte').value = inc.fecha_reporte;
    document.getElementById('inc_fecha_evento').value = inc.fecha_evento;
    document.getElementById('inc_ubicacion').value = inc.ubicacion;
    document.getElementById('inc_sector').value = inc.sector;
    document.getElementById('inc_reportador').value = inc.reportador;
    document.getElementById('inc_condiciones_entorno').value = inc.condiciones_entorno;
    
    document.getElementById('inc_relato').value = inc.relato;
    document.getElementById('inc_testigos').value = inc.testigos;
    document.getElementById('inc_evidencia').value = inc.evidencia;
    
    document.getElementById('inc_contencion').value = inc.medida_contencion;
    document.getElementById('inc_cont_resp').value = inc.responsable_contencion;
    document.getElementById('inc_cont_fecha').value = inc.fecha_contencion;
    
    document.getElementById('inc_acr_metodologia').value = inc.metodologia_acr || '5 Porqués';
    document.getElementById('inc_acr_detalle').value = inc.detalle_acr;
    
    try {
        const classArr = JSON.parse(inc.clasificacion || '[]');
        document.querySelectorAll('.inc-class-cb').forEach(cb => {
            if (classArr.includes(cb.value)) {
                cb.checked = true;
                cb.dispatchEvent(new Event('change'));
            }
        });
    } catch(e) {}
    
    try {
        const datos = JSON.parse(inc.datos_especificos || '{}');
        Object.keys(datos).forEach(key => {
            const el = document.getElementById(key);
            if (el) el.value = datos[key];
        });
    } catch(e) {}
    
    try {
        const causas = JSON.parse(inc.causas_raiz || '{}');
        document.getElementById('inc_causa_personal').value = causas.personal || '';
        document.getElementById('inc_causa_trabajo').value = causas.trabajo || '';
        document.getElementById('inc_causa_equipos').value = causas.equipos || '';
        document.getElementById('inc_causa_entorno').value = causas.entorno || '';
        document.getElementById('inc_causa_gestion').value = causas.gestion || '';
    } catch(e) {}
    
    try {
        const reqUpdate = JSON.parse(inc.requiere_actualizacion || '{}');
        document.querySelectorAll('.inc-update-cb').forEach(cb => {
            if (reqUpdate.matrices && reqUpdate.matrices.includes(cb.value)) cb.checked = true;
        });
        document.getElementById('inc_req_procedimientos').checked = !!reqUpdate.procedimientos;
        document.getElementById('inc_req_entrenamiento').checked = !!reqUpdate.entrenamiento;
    } catch(e) {}
    
    btnExportIncidentPDF.style.display = 'inline-block';
    modalIncident.classList.add('active');
};

window.deleteIncident = async (id) => {
    if(!confirm('¿Seguro que deseas eliminar esta investigación?')) return;
    try {
        const res = await fetch('/api/incidents/' + id, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(res.ok) fetchIncidents();
    } catch(err) { console.error(err); }
};

if (incidentForm) {
    incidentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const classArr = Array.from(document.querySelectorAll('.inc-class-cb:checked')).map(cb => cb.value);
        
        const datos_especificos = {};
        document.querySelectorAll('.inc-module').forEach(mod => {
            if (mod.style.display === 'block') {
                mod.querySelectorAll('input, select, textarea').forEach(el => {
                    if (el.id) datos_especificos[el.id] = el.value;
                });
            }
        });
        
        const causas_raiz = {
            personal: document.getElementById('inc_causa_personal').value,
            trabajo: document.getElementById('inc_causa_trabajo').value,
            equipos: document.getElementById('inc_causa_equipos').value,
            entorno: document.getElementById('inc_causa_entorno').value,
            gestion: document.getElementById('inc_causa_gestion').value
        };
        
        const reqUpdate = {
            matrices: Array.from(document.querySelectorAll('.inc-update-cb:checked')).map(cb => cb.value),
            procedimientos: document.getElementById('inc_req_procedimientos').checked,
            entrenamiento: document.getElementById('inc_req_entrenamiento').checked
        };
        
        const data = {
            fecha_reporte: document.getElementById('inc_fecha_reporte').value,
            fecha_evento: document.getElementById('inc_fecha_evento').value,
            ubicacion: document.getElementById('inc_ubicacion').value,
            sector: document.getElementById('inc_sector').value,
            reportador: document.getElementById('inc_reportador').value,
            condiciones_entorno: document.getElementById('inc_condiciones_entorno').value,
            clasificacion: JSON.stringify(classArr),
            
            relato: document.getElementById('inc_relato').value,
            testigos: document.getElementById('inc_testigos').value,
            evidencia: document.getElementById('inc_evidencia').value,
            
            datos_especificos: JSON.stringify(datos_especificos),
            
            medida_contencion: document.getElementById('inc_contencion').value,
            responsable_contencion: document.getElementById('inc_cont_resp').value,
            fecha_contencion: document.getElementById('inc_cont_fecha').value,
            
            metodologia_acr: document.getElementById('inc_acr_metodologia').value,
            detalle_acr: document.getElementById('inc_acr_detalle').value,
            causas_raiz: JSON.stringify(causas_raiz),
            requiere_actualizacion: JSON.stringify(reqUpdate)
        };
        
        const id = document.getElementById('inc_id').value;
        if (!id && currentWorkspaceId) data.workspace_id = parseInt(currentWorkspaceId);
        
        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? '/api/incidents/' + id : '/api/incidents';
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                modalIncident.classList.remove('active');
                fetchIncidents();
                if (!id) {
                    alert('Investigación guardada. Recuerda ir a "Planes de Acción" para registrar las acciones correctivas con el origen "Incidente".');
                }
            } else {
                alert('Error al guardar investigación');
            }
        } catch(err) { console.error(err); }
    });
}

// PDF Export Logic
if (btnExportIncidentPDF) {
    btnExportIncidentPDF.addEventListener('click', () => {
        const id = document.getElementById('inc_id').value;
        const element = document.querySelector('#modalIncident .modal-content');
        
        // Clone for PDF to avoid messing up the UI
        const clone = element.cloneNode(true);
        clone.querySelector('.close-btn').remove();
        clone.querySelector('#btnExportIncidentPDF').remove();
        clone.querySelector('button[type="submit"]').remove();
        
        const opt = {
            margin:       10,
            filename:     `Investigacion_Incidente_${id || 'Nuevo'}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        html2pdf().set(opt).from(clone).save();
    });
}

// Logic to create an Action Plan directly from the Incident Modal
const btnCreateActionFromIncident = document.getElementById('btnCreateActionFromIncident');
if (btnCreateActionFromIncident) {
    btnCreateActionFromIncident.addEventListener('click', () => {
        const incId = document.getElementById('inc_id').value;
        if (!incId) {
            alert("Primero debes GUARDAR este incidente para que se le asigne un número de ID.");
            return;
        }
        
        // Cierra el modal de incidentes
        if (modalIncident) modalIncident.classList.remove('active');
        
        // Abre la sección de planes de acción programáticamente
        const tabBtn = document.getElementById('btnActionPlans');
        if (tabBtn) tabBtn.click();
        
        // Abre el modal de nuevo plan de acción
        const addBtn = document.getElementById('btnNewActionPlan');
        if (addBtn) addBtn.click();
        
        // Pre-carga el ID del incidente en el campo origen de la NC
        setTimeout(() => {
            const origenInput = document.getElementById('ap_origen_nc');
            if (origenInput) origenInput.value = `Incidente #${incId}`;
        }, 300);
    });
}

// ==========================================
// MÓDULO DE INFORMACIÓN DOCUMENTADA (ISO 7.5)
// ==========================================
let allDocuments = [];

const btnDocuments = document.getElementById('btnDocuments');
const documentsTableContainer = document.getElementById('documentsTableContainer');
const documentsTableBody = document.getElementById('documentsTableBody');
const modalDocument = document.getElementById('modalDocument');
const closeDocModal = document.getElementById('closeDocModal');
const docForm = document.getElementById('docForm');
const btnNewDocument = document.getElementById('btnNewDocument');
const chkShowObsoleteDocs = document.getElementById('chkShowObsoleteDocs');

// Navigation
if (btnDocuments) {
    btnDocuments.addEventListener('click', () => {
        // Show other buttons
        ['btnMatrizView', 'btnActionPlans', 'btnParticipacion', 'btnIncidentes'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.style.display = 'inline-block';
        });
        btnDocuments.style.display = 'none';

        // Hide other containers
        const containersToHide = [
            'matrizFilters', 'matrizTableContainer', 'actionPlanFilters', 'actionPlanTableContainer',
            'participacionFilters', 'consultasTableContainer', 'minutasTableContainer', 'incidentsTableContainer'
        ];
        containersToHide.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        documentsTableContainer.style.display = 'block';
        fetchDocuments();
    });
}

// Hook other navigation buttons to hide documents container
['btnMatrizView', 'btnActionPlans', 'btnParticipacion', 'btnIncidentes'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
        btn.addEventListener('click', () => {
            if (documentsTableContainer) documentsTableContainer.style.display = 'none';
            if (btnDocuments) btnDocuments.style.display = 'inline-block';
        });
    }
});

if (chkShowObsoleteDocs) {
    chkShowObsoleteDocs.addEventListener('change', () => {
        renderDocuments(allDocuments);
    });
}

async function fetchDocuments() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/documents?workspace_id=${currentWorkspaceId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allDocuments = await response.json();
        renderDocuments(allDocuments);
    } catch (e) {
        console.error(e);
    }
}

const btnSyncDrive = document.getElementById('btnSyncDrive');
if (btnSyncDrive) {
    btnSyncDrive.addEventListener('click', async () => {
        if (!currentWorkspaceId) {
            alert('Debes seleccionar un espacio de trabajo primero.');
            return;
        }
        if (!confirm('¿Deseas iniciar una sincronización manual con Google Drive? Esto puede tardar unos segundos.')) return;
        
        btnSyncDrive.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;"></span> Sincronizando...';
        btnSyncDrive.disabled = true;
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/documents/sync-drive?workspace_id=${currentWorkspaceId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (res.ok) {
                alert(data.message || 'Sincronización completada.');
                fetchDocuments();
            } else {
                alert(`Error en sincronización: ${data.detail || data.message || 'Error desconocido'}`);
            }
        } catch(e) {
            console.error(e);
            alert('Fallo al conectar con el servidor.');
        } finally {
            btnSyncDrive.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"></path><path d="M21 13a9 9 0 1 1-3-7.7L21 8"></path></svg> Sincronizar Drive';
            btnSyncDrive.disabled = false;
        }
    });
}

function getStatusBadge(status) {
    switch(status) {
        case 'Borrador': return '<span class="badge" style="background-color:#ccc; color:#333;">Borrador</span>';
        case 'Pendiente Revisión': return '<span class="badge" style="background-color:#fca311; color:#fff;">En Revisión</span>';
        case 'Pendiente Aprobación': return '<span class="badge" style="background-color:#e63946; color:#fff;">Por Aprobar</span>';
        case 'Vigente': return '<span class="badge" style="background-color:#2a9d8f; color:#fff;">Vigente</span>';
        case 'Obsoleto': return '<span class="badge" style="background-color:#333; color:#fff;">Obsoleto</span>';
        default: return status;
    }
}

function renderDocuments(docs) {
    if (!documentsTableBody) return;
    documentsTableBody.innerHTML = '';
    
    const showObsolete = chkShowObsoleteDocs ? chkShowObsoleteDocs.checked : false;

    docs.forEach(doc => {
        if (!showObsolete && doc.estado === 'Obsoleto') return;

        // Si no soy admin y el doc no es Vigente, y no soy ni revisor ni aprobador, no debería verlo en teoría, pero por ahora lo mostramos para testear.
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${doc.codigo}</strong></td>
            <td>${doc.titulo}</td>
            <td>v${doc.version.toString().padStart(2, '0')}</td>
            <td>${getStatusBadge(doc.estado)}</td>
            <td>${doc.revisor}</td>
            <td>${doc.aprobador}</td>
            <td>${doc.fecha_proxima_rev ? new Date(doc.fecha_proxima_rev).toLocaleDateString() : '-'}</td>
            <td>
                <button class="btn-secondary btn-sm" onclick="editDocument(${doc.id})">Abrir</button>
            </td>
        `;
        documentsTableBody.appendChild(tr);
    });
}

if (btnNewDocument) {
    btnNewDocument.addEventListener('click', () => {
        docForm.reset();
        document.getElementById('doc_id').value = '';
        document.getElementById('doc_estado').value = 'Borrador';
        document.getElementById('doc_estado_display').innerText = 'Borrador';
        document.getElementById('doc_version').value = '0';
        document.getElementById('doc_workflow_buttons').innerHTML = '';
        
        document.getElementById('btnCreateNewVersion').style.display = 'none';
        document.getElementById('btnAcknowledge').style.display = 'none';
        document.getElementById('btnViewAudit').style.display = 'none';
        document.getElementById('btnSaveDoc').style.display = 'inline-block';
        
        modalDocument.classList.add('active');
    });
}

if (closeDocModal) {
    closeDocModal.addEventListener('click', () => {
        modalDocument.classList.remove('active');
    });
}

// Global func to edit doc
window.editDocument = async function(id) {
    const doc = allDocuments.find(d => d.id === id);
    if (!doc) return;

    document.getElementById('doc_id').value = doc.id;
    document.getElementById('doc_estado').value = doc.estado;
    document.getElementById('doc_codigo').value = doc.codigo;
    document.getElementById('doc_tipo').value = doc.tipo;
    document.getElementById('doc_titulo').value = doc.titulo;
    document.getElementById('doc_version').value = doc.version;
    document.getElementById('doc_link').value = doc.link_archivo;
    document.getElementById('doc_proxima_rev').value = doc.fecha_proxima_rev;
    document.getElementById('doc_motivo').value = doc.motivo_cambio;
    document.getElementById('doc_revisor').value = doc.revisor;
    document.getElementById('doc_aprobador').value = doc.aprobador;

    document.getElementById('doc_estado_display').innerHTML = getStatusBadge(doc.estado);
    
    setupWorkflowButtons(doc);
    
    modalDocument.classList.add('active');
};

function setupWorkflowButtons(doc) {
    const container = document.getElementById('doc_workflow_buttons');
    container.innerHTML = '';
    const btnSave = document.getElementById('btnSaveDoc');
    const btnNewVersion = document.getElementById('btnCreateNewVersion');
    const btnAcknowledge = document.getElementById('btnAcknowledge');
    const btnViewAudit = document.getElementById('btnViewAudit');
    
    // Always show view audit
    btnViewAudit.style.display = 'inline-block';

    const isAdmin = currentUserEmail === 'juan@test.com';
    const isRevisor = currentUserEmail === doc.revisor;
    const isAprobador = currentUserEmail === doc.aprobador;

    if (doc.estado === 'Borrador') {
        btnSave.style.display = 'inline-block';
        btnNewVersion.style.display = 'none';
        btnAcknowledge.style.display = 'none';
        
        const btnReqRev = document.createElement('button');
        btnReqRev.type = 'button';
        btnReqRev.className = 'btn';
        btnReqRev.style.backgroundColor = '#fca311';
        btnReqRev.innerText = 'Solicitar Revisión';
        btnReqRev.onclick = () => changeDocumentStatus(doc.id, 'Pendiente Revisión');
        container.appendChild(btnReqRev);
    } 
    else if (doc.estado === 'Pendiente Revisión') {
        btnSave.style.display = (isAdmin || isRevisor) ? 'inline-block' : 'none';
        btnNewVersion.style.display = 'none';
        btnAcknowledge.style.display = 'none';
        
        if (isAdmin || isRevisor) {
            const btnReqApr = document.createElement('button');
            btnReqApr.type = 'button';
            btnReqApr.className = 'btn';
            btnReqApr.style.backgroundColor = '#e63946';
            btnReqApr.innerText = 'Revisado -> Solicitar Aprobación';
            btnReqApr.onclick = () => changeDocumentStatus(doc.id, 'Pendiente Aprobación');
            container.appendChild(btnReqApr);
        }
    }
    else if (doc.estado === 'Pendiente Aprobación') {
        btnSave.style.display = (isAdmin || isAprobador) ? 'inline-block' : 'none';
        btnNewVersion.style.display = 'none';
        btnAcknowledge.style.display = 'none';
        
        if (isAdmin || isAprobador) {
            const btnApprove = document.createElement('button');
            btnApprove.type = 'button';
            btnApprove.className = 'btn';
            btnApprove.style.backgroundColor = '#2a9d8f';
            btnApprove.innerText = 'Aprobar y Publicar';
            btnApprove.onclick = () => changeDocumentStatus(doc.id, 'Vigente');
            container.appendChild(btnApprove);
        }
    }
    else if (doc.estado === 'Vigente') {
        btnSave.style.display = isAdmin ? 'inline-block' : 'none';
        btnNewVersion.style.display = 'inline-block';
        btnAcknowledge.style.display = 'inline-block';
    }
    else if (doc.estado === 'Obsoleto') {
        btnSave.style.display = 'none';
        btnNewVersion.style.display = 'none';
        btnAcknowledge.style.display = 'none';
    }
}

async function changeDocumentStatus(id, newStatus) {
    if (!confirm(`¿Estás seguro de cambiar el estado a ${newStatus}?`)) return;
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/documents/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nuevo_estado: newStatus, comentario: "Cambio de flujo" })
        });
        if (response.ok) {
            fetchDocuments();
            modalDocument.classList.remove('active');
        } else {
            const err = await response.json();
            alert(`Error: ${err.detail}`);
        }
    } catch(e) { console.error(e); }
}

if (docForm) {
    docForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentWorkspaceId) {
            alert('Debes seleccionar un espacio de trabajo primero.');
            return;
        }

        const payload = {
            workspace_id: currentWorkspaceId,
            codigo: document.getElementById('doc_codigo').value,
            tipo: document.getElementById('doc_tipo').value,
            titulo: document.getElementById('doc_titulo').value,
            version: parseInt(document.getElementById('doc_version').value || "0"),
            estado: document.getElementById('doc_estado').value || 'Borrador',
            link_archivo: document.getElementById('doc_link').value,
            fecha_proxima_rev: document.getElementById('doc_proxima_rev').value,
            motivo_cambio: document.getElementById('doc_motivo').value,
            revisor: document.getElementById('doc_revisor').value,
            aprobador: document.getElementById('doc_aprobador').value,
            autor: currentUserEmail
        };

        const id = document.getElementById('doc_id').value;
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/documents/${id}` : '/api/documents';
        
        if (id) {
            alert("No hay endpoint de edición de metadatos programado. Para cambiar contenido crea una Nueva Versión.");
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                modalDocument.classList.remove('active');
                fetchDocuments();
            } else {
                alert("Error al guardar el documento.");
            }
        } catch(e) {
            console.error(e);
        }
    });
}

// Logic for New Version
const btnCreateNewVersion = document.getElementById('btnCreateNewVersion');
if (btnCreateNewVersion) {
    btnCreateNewVersion.addEventListener('click', () => {
        if(!confirm('Esto creará un nuevo Borrador (v+1) conservando los metadatos. ¿Continuar?')) return;
        
        const currentVersion = parseInt(document.getElementById('doc_version').value);
        document.getElementById('doc_id').value = '';
        document.getElementById('doc_estado').value = 'Borrador';
        document.getElementById('doc_estado_display').innerText = 'Borrador';
        document.getElementById('doc_version').value = currentVersion + 1;
        document.getElementById('doc_motivo').value = ''; // Reset motivo
        
        setupWorkflowButtons({estado: 'Borrador', revisor: document.getElementById('doc_revisor').value, aprobador: document.getElementById('doc_aprobador').value});
        
        alert("Modifica los datos que necesites e ingresa el Motivo del Cambio, luego haz clic en Guardar Borrador.");
    });
}

// Acknowledge logic
const btnAcknowledge = document.getElementById('btnAcknowledge');
if (btnAcknowledge) {
    btnAcknowledge.addEventListener('click', async () => {
        const id = document.getElementById('doc_id').value;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/documents/${id}/acknowledge`, { 
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'already_acknowledged') {
                    alert('Ya habías confirmado la lectura de este documento.');
                } else {
                    alert('Acuse de recibo registrado correctamente. ¡Gracias!');
                }
            }
        } catch(e) { console.error(e); }
    });
}

// Audit & Receipts logic
const modalDocumentAudit = document.getElementById('modalDocumentAudit');
const closeDocAuditModal = document.getElementById('closeDocAuditModal');
const btnViewAudit = document.getElementById('btnViewAudit');

if (closeDocAuditModal) {
    closeDocAuditModal.addEventListener('click', () => {
        modalDocumentAudit.classList.remove('active');
    });
}

if (btnViewAudit) {
    btnViewAudit.addEventListener('click', async () => {
        const id = document.getElementById('doc_id').value;
        if (!id) return;
        
        // Fetch audit
        try {
            const token = localStorage.getItem('token');
            const resAudit = await fetch(`/api/documents/${id}/audit`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const auditData = await resAudit.json();
            const auditBody = document.getElementById('docAuditLogBody');
            auditBody.innerHTML = '';
            auditData.forEach(a => {
                auditBody.innerHTML += `<tr>
                    <td>${new Date(a.fecha).toLocaleString()}</td>
                    <td>${a.usuario}</td>
                    <td>${a.accion}</td>
                    <td>${a.comentario || ''}</td>
                </tr>`;
            });
            
            // Fetch receipts
            const resReceipts = await fetch(`/api/documents/${id}/receipts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const receiptData = await resReceipts.json();
            const recBody = document.getElementById('docReceiptsBody');
            recBody.innerHTML = '';
            receiptData.forEach(r => {
                recBody.innerHTML += `<tr>
                    <td>${r.usuario_email}</td>
                    <td>${new Date(r.fecha_lectura).toLocaleString()}</td>
                </tr>`;
            });
            
            modalDocumentAudit.classList.add('active');
        } catch (e) { console.error(e); }
    });
}


