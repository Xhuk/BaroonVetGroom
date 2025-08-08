
// Clear all auth cache in browser
localStorage.removeItem('auth_user_cache');
localStorage.removeItem('auth_cache_time');
localStorage.removeItem('tenant_cache');
localStorage.removeItem('tenant_cache_time');
localStorage.setItem('auth_logged_out', 'true');
// Refresh page to show landing page
window.location.reload();

