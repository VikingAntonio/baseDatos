/**
 * Supabase Storage Provider
 * Handles cloud persistence for database projects.
 * Required Table: projects (id uuid PK, name text, data jsonb, created_at timestamptz)
 */
export class SupabaseProvider {
    constructor() {
        const supabaseUrl = 'https://ehszvqwftqgxjggnbcmt.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoc3p2cXdmdHFneGpnZ25iY210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDI5MjAsImV4cCI6MjA4NTMxODkyMH0.wh8_Xy4_w9roFxMgbJ-J9A3r5V7duUjnStl4ZsZ0804';
        
        if (window.supabase) {
            this.client = window.supabase.createClient(supabaseUrl, supabaseKey);
        } else {
            console.error('Supabase library not loaded');
        }
        this.currentUser = JSON.parse(localStorage.getItem('vdb_user')) || null;
    }

    async login(username, password) {
        if (!this.client) return { error: 'Supabase client not initialized' };

        const { data, error } = await this.client
            .from('bdd_users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .maybeSingle();

        if (error) {
            return { data: null, error };
        }

        if (data) {
            this.currentUser = data;
            localStorage.setItem('vdb_user', JSON.stringify(data));
            return { data, error: null };
        } else {
            return { data: null, error: { message: 'Invalid username or password' } };
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('vdb_user');
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async saveProject(name, data) {
        if (!this.client) return { error: { message: 'Supabase client not initialized' } };
        if (!this.currentUser) return { error: { message: 'User not logged in' } };

        const { data: result, error } = await this.client
            .from('projects')
            .upsert({ 
                user_id: this.currentUser.id,
                name: name, 
                data: data,
                updated_at: new Date()
            }, { onConflict: 'user_id, name' })
            .select();

        return { data: result, error };
    }

    async listProjects() {
        if (!this.client) return { error: { message: 'Supabase client not initialized' } };
        if (!this.currentUser) return { data: [], error: null };

        const { data, error } = await this.client
            .from('projects')
            .select('id, name, created_at, updated_at')
            .eq('user_id', this.currentUser.id)
            .order('updated_at', { ascending: false });

        return { data, error };
    }

    async getProject(id) {
        if (!this.client) return { error: { message: 'Supabase client not initialized' } };
        if (!this.currentUser) return { error: { message: 'User not logged in' } };

        const { data, error } = await this.client
            .from('projects')
            .select('*')
            .eq('id', id)
            .eq('user_id', this.currentUser.id)
            .single();

        return { data, error };
    }
}
