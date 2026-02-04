import { stateManager } from '../state.js';
import { SupabaseProvider } from '../storage/supabase_provider.js';
import { notifications } from '../utils/notifications.js';

export class CloudPanel {
    constructor() {
        this.supabase = new SupabaseProvider();
        this.panel = document.getElementById('cloud-panel');
        this.header = this.panel.querySelector('.panel-header');
        this.body = this.panel.querySelector('.panel-body');
        this.cloudList = document.getElementById('cloud-projects-list');
        this.toggleBtn = document.getElementById('toggle-panel-btn');
        this.refreshBtn = document.getElementById('refresh-cloud-btn');
        this.saveBtn = document.getElementById('save-cloud-btn');

        this.isCollapsed = false;
        this.posX = 0;
        this.posY = 0;

        this.init();
    }

    init() {
        this.initDraggable();
        this.initAuth();
        
        this.toggleBtn.onclick = () => this.toggleCollapse();
        this.refreshBtn.onclick = () => this.refreshCloudProjects();
        this.saveBtn.onclick = () => this.saveToCloud();

        this.updateUserHeader();
        this.refreshCloudProjects();
    }

    initAuth() {
        const modal = document.getElementById('auth-modal');
        const loginBtn = document.getElementById('login-submit-btn');
        const cancelBtn = document.getElementById('login-cancel-btn');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');

        if (cancelBtn) {
            cancelBtn.onclick = () => {
                modal.classList.remove('active');
            };
        }

        loginBtn.onclick = async () => {
            const username = usernameInput.value;
            const password = passwordInput.value;
            if (!username || !password) {
                notifications.show('Fill all fields', 'error');
                return;
            }

            const { error } = await this.supabase.login(username, password);
            if (error) {
                notifications.show('Login failed: ' + error.message, 'error');
            } else {
                modal.classList.remove('active');
                notifications.show('Login successful', 'success');
                this.updateUserHeader();
                this.refreshCloudProjects();
            }
        };
    }

    showPrompt(defaultValue = '') {
        return new Promise((resolve) => {
            const modal = document.getElementById('project-name-modal');
            const input = document.getElementById('new-project-name');
            const saveBtn = document.getElementById('project-name-submit-btn');
            const cancelBtn = document.getElementById('project-name-cancel-btn');

            input.value = defaultValue;
            modal.classList.add('active');
            input.focus();

            const cleanup = (value) => {
                modal.classList.remove('active');
                saveBtn.onclick = null;
                cancelBtn.onclick = null;
                input.onkeydown = null;
                resolve(value);
            };

            saveBtn.onclick = () => cleanup(input.value);
            cancelBtn.onclick = () => cleanup(null);

            input.onkeydown = (e) => {
                if (e.key === 'Enter') cleanup(input.value);
                if (e.key === 'Escape') cleanup(null);
            };
        });
    }

    showConfirm(message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-modal');
            const msgEl = document.getElementById('confirm-message');
            const yesBtn = document.getElementById('confirm-yes-btn');
            const noBtn = document.getElementById('confirm-no-btn');

            msgEl.textContent = message;
            modal.classList.add('active');

            const cleanup = (value) => {
                modal.classList.remove('active');
                yesBtn.onclick = null;
                noBtn.onclick = null;
                resolve(value);
            };

            yesBtn.onclick = () => cleanup(true);
            noBtn.onclick = () => cleanup(false);
        });
    }

    updateUserHeader() {
        const header = document.getElementById('user-info-header');
        const user = this.supabase.getCurrentUser();

        if (user) {
            header.innerHTML = `
                <span>👤 ${user.username}</span>
                <a class="logout-link" id="logout-btn">Logout</a>
            `;
            document.getElementById('logout-btn').onclick = () => {
                this.supabase.logout();
                window.dispatchEvent(new CustomEvent('cloud-logout'));
                notifications.show('Logged out successfully', 'success');
                this.updateUserHeader();
                this.refreshCloudProjects();
            };
        } else {
            header.innerHTML = `
                <button class="primary-btn" id="show-login-btn">Login</button>
            `;
            document.getElementById('show-login-btn').onclick = () => {
                document.getElementById('auth-modal').classList.add('active');
            };
        }
    }

    initDraggable() {
        interact(this.panel).draggable({
            allowFrom: '.panel-header',
            listeners: {
                move: (event) => {
                    this.posX += event.dx;
                    this.posY += event.dy;
                    event.target.style.transform = `translate(${this.posX}px, ${this.posY}px)`;
                }
            }
        });
    }

    toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
        this.panel.classList.toggle('collapsed', this.isCollapsed);
        this.toggleBtn.textContent = this.isCollapsed ? '+' : '−';
    }

    async saveToCloud() {
        if (!this.supabase.getCurrentUser()) {
            notifications.show('Please login to save projects to the cloud', 'error');
            document.getElementById('auth-modal').classList.add('active');
            return;
        }

        const name = await this.showPrompt('My Database');
        if (!name) return;

        const data = stateManager.getState();
        const { error } = await this.supabase.saveProject(name, data);
        
        if (error) {
            notifications.show('Error saving to cloud: ' + error.message, 'error');
        } else {
            notifications.show('Project saved successfully!', 'success');
            this.refreshCloudProjects();
        }
    }

    async refreshCloudProjects() {
        if (!this.cloudList) return;
        this.cloudList.innerHTML = '<p class="empty-msg">Refreshing...</p>';
        
        const { data, error } = await this.supabase.listProjects();
        if (error) {
            this.cloudList.innerHTML = `<p class="empty-msg" style="color: var(--danger-color)">Error loading: ${error.message}</p>`;
            return;
        }

        if (!data || data.length === 0) {
            this.cloudList.innerHTML = '<p class="empty-msg">No cloud projects found.</p>';
            return;
        }

        this.cloudList.innerHTML = '';
        data.forEach(project => {
            const item = document.createElement('div');
            item.className = 'cloud-item';
            const date = new Date(project.updated_at || project.created_at).toLocaleDateString();
            
            item.innerHTML = `
                <div class="project-name" title="${project.name}">${project.name}</div>
                <div class="project-date">${date}</div>
            `;
            
            item.onclick = () => this.loadFromCloud(project.id);
            this.cloudList.appendChild(item);
        });
    }

    async loadFromCloud(projectId) {
        if (!(await this.showConfirm('Load this project? Current unsaved changes might be lost.'))) return;
        
        const { data, error } = await this.supabase.getProject(projectId);
        if (error) {
            notifications.show('Error loading project: ' + error.message, 'error');
            return;
        }

        if (data && data.data) {
            window.dispatchEvent(new CustomEvent('cloud-load', { detail: { state: data.data } }));
            notifications.show('Project loaded successfully', 'success');
        }
    }
}
