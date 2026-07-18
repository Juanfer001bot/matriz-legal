const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/login.html';
}

const API_USERS = '/api/users';
const API_REGISTER = '/api/register';
const API_WORKSPACES = '/api/workspaces';

let globalWorkspaces = [];

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

const usersBody = document.getElementById('usersBody');
const registerForm = document.getElementById('registerForm');
const msg = document.getElementById('msg');
const workspaceForm = document.getElementById('workspaceForm');
const wsMsg = document.getElementById('wsMsg');

const modalEditUser = document.getElementById('modalEditUser');
const editUserForm = document.getElementById('editUserForm');
const editMsg = document.getElementById('editMsg');
document.getElementById('closeEditModal').onclick = () => modalEditUser.classList.remove('active');

document.addEventListener('DOMContentLoaded', async () => {
    await fetchWorkspaces();
    fetchUsers();
});

async function fetchWorkspaces() {
    try {
        const response = await fetch(API_WORKSPACES, { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
            globalWorkspaces = await response.json();
            renderWorkspaces();
        }
    } catch (e) { console.error('Error fetching workspaces', e); }
}

function renderWorkspaces() {
    const list = document.getElementById('workspaceList');
    list.innerHTML = '';
    
    const containerUser = document.getElementById('userWorkspacesContainer');
    containerUser.innerHTML = '';
    const containerEdit = document.getElementById('editWorkspacesContainer');
    containerEdit.innerHTML = '';

    globalWorkspaces.forEach(ws => {
        // List
        const li = document.createElement('li');
        li.style.marginBottom = '10px';
        li.innerHTML = `<strong>ID: ${ws.id}</strong> - ${ws.name} <button class="action-btn" style="padding: 2px 5px; font-size: 0.7rem; background:#ff4d4d; margin-left: 10px;" onclick="deleteWorkspace(${ws.id})">Borrar</button>`;
        list.appendChild(li);

        // Checkboxes new user
        containerUser.innerHTML += `<label style="display:flex; align-items:center; gap:5px; margin:0;"><input type="checkbox" name="ws_new" value="${ws.id}"> ${ws.name}</label>`;
        // Checkboxes edit user
        containerEdit.innerHTML += `<label style="display:flex; align-items:center; gap:5px; margin:0;"><input type="checkbox" name="ws_edit" value="${ws.id}" id="ws_edit_${ws.id}"> ${ws.name}</label>`;
    });
}

workspaceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    wsMsg.style.color = '';
    wsMsg.textContent = 'Creando equipo y clonando matriz...';
    const name = document.getElementById('newWorkspaceName').value;
    try {
        const res = await fetch(API_WORKSPACES, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name })
        });
        if (res.ok) {
            wsMsg.style.color = '#00ff88';
            wsMsg.textContent = 'Equipo creado con éxito.';
            workspaceForm.reset();
            fetchWorkspaces();
        } else {
            wsMsg.style.color = '#ff4d4d';
            wsMsg.textContent = 'Error al crear equipo.';
        }
    } catch (e) {
        wsMsg.style.color = '#ff4d4d';
        wsMsg.textContent = 'Error de red';
    }
});

async function deleteWorkspace(id) {
    if (!confirm('¿Seguro de borrar este equipo y TODA su matriz legal?')) return;
    try {
        const res = await fetch(`${API_WORKSPACES}/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) fetchWorkspaces();
        else alert('No se puede borrar este equipo (quizás es el Principal)');
    } catch (e) { alert('Error de red'); }
}

async function fetchUsers() {
    try {
        const response = await fetch(API_USERS, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
            return;
        }

        const users = await response.json();
        usersBody.innerHTML = '';
        
        users.forEach(u => {
            const tr = document.createElement('tr');
            const equipos = u.workspaces.map(w => w.name).join(', ') || 'Ninguno';
            tr.innerHTML = `
                <td>${u.id}</td>
                <td>${u.email}</td>
                <td>${equipos}</td>
                <td><span class="badge cumple">Activo</span></td>
                <td>
                    <button class="action-btn" onclick='openEditModal(${u.id}, ${JSON.stringify(u.workspaces.map(w => w.id))})'>Editar</button>
                    ${u.id !== 1 ? `<button class="action-btn" style="background:#ff4d4d;" onclick="deleteUser(${u.id})">Eliminar</button>` : ''}
                </td>
            `;
            usersBody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error fetching users', error);
    }
}

function openEditModal(id, workspaceIds) {
    document.getElementById('editUserId').value = id;
    document.getElementById('editPassword').value = '';
    editMsg.textContent = '';
    
    document.querySelectorAll('input[name="ws_edit"]').forEach(cb => cb.checked = false);
    workspaceIds.forEach(ws_id => {
        const cb = document.getElementById(`ws_edit_${ws_id}`);
        if(cb) cb.checked = true;
    });

    modalEditUser.classList.add('active');
}

editUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editUserId').value;
    const password = document.getElementById('editPassword').value;
    
    const workspace_ids = Array.from(document.querySelectorAll('input[name="ws_edit"]:checked')).map(cb => parseInt(cb.value));

    editMsg.style.color = '';
    editMsg.textContent = 'Actualizando...';

    const payload = { workspace_ids };
    if (password) payload.password = password;

    try {
        const response = await fetch(`/api/users/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            modalEditUser.classList.remove('active');
            fetchUsers();
            alert('Usuario actualizado con éxito');
        } else {
            editMsg.style.color = '#ff4d4d';
            editMsg.textContent = 'Error al actualizar';
        }
    } catch (e) {
        editMsg.style.color = '#ff4d4d';
        editMsg.textContent = 'Error de red';
    }
});

async function deleteUser(id) {
    if (!confirm('¿Seguro que deseas eliminar este usuario?')) return;
    try {
        const response = await fetch(`/api/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) fetchUsers();
        else alert('Error al eliminar usuario');
    } catch (e) {
        alert('Error de red');
    }
}

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.style.color = '';
    msg.textContent = 'Creando usuario...';

    const email = document.getElementById('newEmail').value;
    const password = document.getElementById('newPassword').value;
    const workspace_ids = Array.from(document.querySelectorAll('input[name="ws_new"]:checked')).map(cb => parseInt(cb.value));

    try {
        const response = await fetch(API_REGISTER, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ email, password, workspace_ids })
        });

        if (response.ok) {
            msg.style.color = '#00ff88';
            msg.textContent = 'Usuario creado con éxito.';
            registerForm.reset();
            fetchUsers();
        } else {
            const data = await response.json();
            msg.style.color = '#ff4d4d';
            msg.textContent = data.detail || 'Error al crear usuario';
        }
    } catch (error) {
        msg.style.color = '#ff4d4d';
        msg.textContent = 'Error de conexión';
    }
});
