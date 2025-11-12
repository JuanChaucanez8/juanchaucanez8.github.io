
    // Tus credenciales de Supabase - REEMPLAZA ESTOS VALORES
    const SUPABASE_URL = 'https://llvjlsgjdsdafawqpbvg.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsdmpsc2dqZHNkYWZhd3FwYnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNzE3OTQsImV4cCI6MjA3Nzk0Nzc5NH0.3hufsV-kjt0T9VLOMvRa_8bnsqqaD6gup9_vzBWa180';
    
function initializeSupabase() {
    try {
        // Verificar que la biblioteca de Supabase esté cargada
        if (typeof supabase === 'undefined') {
            console.error('La biblioteca de Supabase no está cargada');
            return null;
        }
        
        // Crear cliente de Supabase
        const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Configurar manejo de errores global
        client.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                localStorage.removeItem('supabase.auth.token');
            }
        });
        
        return client;
    } catch (error) {
        console.error('Error al inicializar Supabase:', error);
        return null;
    }
}

// Inicializar y asignar a variable global
const supabaseClient = initializeSupabase();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.supabase = supabaseClient;
    window.supabaseClient = supabaseClient;
}

// Función para verificar si Supabase está listo
function isSupabaseReady() {
    return window.supabase !== null && typeof window.supabase !== 'undefined';
}