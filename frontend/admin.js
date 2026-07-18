const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/login.html';
}

const API_USERS = '/api/users';
const API_REGISTER = '/api/register';

const usersBody = document.getElementById('usersBody');
const registerForm = document.getElementById('registerForm');
const msg = document.getElementById('msg');

const modalEditUser = document.getElementById('modalEditUser');
const editUserForm = document.getElementById('editUserForm');
const editMsg = document.getElementById('editMsg');
document.getElementById('closeEditModal').onclick = () => modalEditUser.classList.remove('active');

document.addEventListener('DOMContentLoaded', fetchUsers);

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
            tr.innerHTML = `
                <td>${u.id}</td>
                <td>${u.email}</td>
                <td><span class="badge cumple">Activo</span></td>
                <td>
                    <button class="action-btn" onclick="openEditModal(${u.id})">Editar</button>
                    ${u.id !== 1 ? `<button class="action-btn" style="background:#ff4d4d;" onclick="deleteUser(${u.id})">Eliminar</button>` : ''}
                </td>
            `;
            usersBody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error fetching users', error);
    }
}

function openEditModal(id) {
    document.getElementById('editUserId').value = id;
    document.getElementById('editPassword').value = '';
    editMsg.textContent = '';
    modalEditUser.classList.add('active');
}

editUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editUserId').value;
    const password = document.getElementById('editPassword').value;
    editMsg.style.color = '';
    editMsg.textContent = 'Actualizando...';

    try {
        const response = await fetch(`/api/users/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ password })
        });
        if (response.ok) {
            modalEditUser.classList.remove('active');
            alert('Contraseña actualizada con éxito');
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
    if (!confirm('¿Seguro que deseas eliminar este usuario y toda su matriz legal?')) return;
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
    msg.textContent = 'Creando usuario y clonando matriz original...';

    const email = document.getElementById('newEmail').value;
    const password = document.getElementById('newPassword').value;

    try {
        const response = await fetch(API_REGISTER, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            msg.style.color = '#00ff88';
            msg.textContent = 'Usuario creado con éxito y matriz lista.';
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
