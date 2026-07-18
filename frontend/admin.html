<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Administrar Usuarios - Matriz Legal</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
    <script>
        if (localStorage.getItem('theme') === 'light') {
            document.documentElement.classList.add('light-mode');
        }
    </script>
</head>
<body>
    <div class="background-glow"></div>
    <header class="header">
        <div class="header-content" style="max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h1 style="margin: 0; font-size: 1.8rem; background: linear-gradient(to right, #60a5fa, #34d399); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Gestión de Usuarios</h1>
                <p style="color: var(--text-secondary); margin-top: 5px; font-size: 0.95rem;">Crea y gestiona cuentas de usuario</p>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn-secondary" id="btnThemeToggle">☀️ Claro</button>
                <button class="btn-secondary" onclick="window.location.href='/';">Volver a la Matriz</button>
                <button class="btn-secondary" onclick="localStorage.removeItem('token'); window.location.href='/login.html';">Cerrar Sesión</button>
            </div>
        </div>
    </header>

    <div class="container" style="display: flex; gap: 30px; align-items: flex-start; margin-top: 20px;">
        <div class="glass" style="flex: 1; padding: 25px;">
            <h2>Crear Nuevo Equipo (Workspace)</h2>
            <form id="workspaceForm" style="display: flex; flex-direction: column; gap: 15px; margin-top: 20px;">
                <div class="form-group">
                    <label>Nombre del Equipo</label>
                    <input type="text" id="newWorkspaceName" required placeholder="Ej. Proyecto Aña Cuá">
                </div>
                <button type="submit" class="btn">Crear Equipo</button>
                <p id="wsMsg" style="margin-top: 10px; font-weight: 500;"></p>
            </form>

            <h3 style="margin-top: 30px;">Equipos Existentes</h3>
            <ul id="workspaceList" style="list-style: none; padding: 0; margin-top: 15px; max-height: 200px; overflow-y: auto;">
                <!-- Workspaces injected here -->
            </ul>
        </div>

        <div class="glass" style="flex: 1; padding: 25px;">
            <h2>Crear Nuevo Usuario</h2>
            <form id="registerForm" style="display: flex; flex-direction: column; gap: 15px; margin-top: 20px;">
                <div class="form-group">
                    <label>Correo Electrónico</label>
                    <input type="email" id="newEmail" required placeholder="cliente@ejemplo.com">
                </div>
                <div class="form-group">
                    <label>Contraseña Temporal</label>
                    <input type="text" id="newPassword" required placeholder="Contraseña segura">
                </div>
                <div class="form-group">
                    <label>Asignar a Equipos</label>
                    <div id="userWorkspacesContainer" style="display: flex; flex-direction: column; gap: 5px; max-height: 150px; overflow-y: auto; background: rgba(15,23,42,0.6); padding: 10px; border-radius: 8px;">
                        <!-- Checkboxes injected here -->
                    </div>
                </div>
                <div class="form-group">
                    <label>Jurisdicciones (Ctrl+Click)</label>
                    <select id="newJurisdictions" multiple style="height: 80px;"></select>
                </div>
                <button type="submit" class="btn">Crear Usuario</button>
                <p id="msg" style="margin-top: 10px; font-weight: 500;"></p>
            </form>
        </div>

        <div class="glass" style="flex: 2; padding: 25px;">
            <h2>Usuarios Registrados</h2>
            <table class="table" style="margin-top: 20px;">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Email</th>
                        <th>Equipos</th>
                        <th>Jurisdicciones</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="usersBody">
                    <!-- Users will be injected here -->
                </tbody>
            </table>
        </div>
    </div>

    <!-- Edit User Modal -->
    <div class="modal" id="modalEditUser">
        <div class="modal-content glass" style="max-width: 400px;">
            <span class="close-btn" id="closeEditModal">&times;</span>
            <h2 style="margin-top:0">Modificar Contraseña</h2>
            <form id="editUserForm" style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">
                <input type="hidden" id="editUserId">
                <div class="form-group">
                    <label>Nueva Contraseña (dejar en blanco para no cambiar)</label>
                    <input type="text" id="editPassword" placeholder="Nueva contraseña">
                </div>
                <div class="form-group">
                    <label>Equipos Asignados</label>
                    <div id="editWorkspacesContainer" style="display: flex; flex-direction: column; gap: 5px; max-height: 150px; overflow-y: auto; background: rgba(15,23,42,0.6); padding: 10px; border-radius: 8px;">
                        <!-- Checkboxes injected here -->
                    </div>
                </div>
                <div class="form-group">
                    <label>Jurisdicciones (Ctrl+Click)</label>
                    <select id="editJurisdictions" multiple style="height: 80px;"></select>
                </div>
                <button type="submit" class="btn">Guardar Cambios</button>
                <p id="editMsg" style="margin-top: 10px; font-weight: 500;"></p>
            </form>
        </div>
    </div>

    <script src="admin.js"></script>
</body>
</html>
