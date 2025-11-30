// ===================================================
// SUPABASE CONFIGURATION
// ===================================================

const SUPABASE_URL = 'https://pheupnmnisguenfqaphs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZXVwbm1uaXNndWVuZnFhcGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMzY2ODcsImV4cCI6MjA3OTgxMjY4N30.CYN8o3ilyeRY1aYLy7Vut47pLskF6gIcBv4zE3kOUqM';

// Initialize Supabase client
// The Supabase CDN exposes the global 'supabase' object with createClient method
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===================================================
// HELPER FUNCTIONS
// ===================================================

// Handle Supabase errors
function handleSupabaseError(error, context) {
  console.error(`Supabase Error (${context}):`, error);
  return null;
}

// Show loading state
function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = '<tr><td colspan="10" class="empty">Loading...</td></tr>';
  }
}

// Export for use in other files
window.supabaseClient = supabaseClient;
window.handleSupabaseError = handleSupabaseError;
window.showLoading = showLoading;