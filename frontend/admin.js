const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/login.html';
}

const API_USERS = '/api/users';
const API_REGISTER = '/api/register';

const usersBody = document.getElementById('usersBody');
const registerForm = document.getElementById('registerForm');
const msg = document.getElementById('msg');

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
            `;
            usersBody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error fetching users', error);
    }
}

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.style.color = '';
    msg.textContent = 'Creando usuario...';

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
