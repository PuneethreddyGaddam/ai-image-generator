// client-side Supabase auth script
const statusEl = document.getElementById('status');
const sessionEl = document.getElementById('session');

function showStatus(msg, type = 'error') {
  console.log(`[AuthStatus] ${type.toUpperCase()}:`, msg);

  if (typeof msg === 'object' && msg !== null) {
    statusEl.textContent = msg.message || JSON.stringify(msg);
  } else {
    statusEl.textContent = msg;
  }

  statusEl.className = 'active';
  if (type === 'success') statusEl.classList.add('success');
  statusEl.style.display = 'block';
}

function setButtonsDisabled(disabled) {
  const buttons = document.querySelectorAll('button');
  buttons.forEach(btn => {
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.5' : '1';
    btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
  });
}

async function init() {
  try {
    // 1. fetch public config from server (with cache busting)
    const cfgRes = await fetch(`/supabase-config?t=${Date.now()}`).catch(err => {
      throw new Error('Connection error: Could not reach the server.');
    });

    if (!cfgRes.ok) throw new Error(`Server error: ${cfgRes.status}`);

    const cfg = await cfgRes.json();
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
      throw new Error('Configuration missing on server.');
    }

    console.log('[AuthInit] Config loaded:', cfg.SUPABASE_URL);

    // 2. import supabase client from CDN
    let mod;
    try {
      mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    } catch (e) {
      throw new Error('Could not load auth library. Check your connection.');
    }

    const { createClient } = mod;
    const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

    // 3. UI bindings
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const signinBtn = document.getElementById('signin');

    const signupEmailInput = document.getElementById('signup-email');
    const signupPassInput = document.getElementById('signup-password');
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const signupBtn = document.getElementById('signup');

    const guestBtn = document.getElementById('guest-btn');
    const googleBtn = document.getElementById('google');

    // View Toggles
    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');
    const authSubtitle = document.getElementById('auth-subtitle');

    showSignup.onclick = (e) => {
      e.preventDefault();
      loginView.style.display = 'none';
      signupView.style.display = 'block';
      authSubtitle.textContent = 'Create your account to start generating';
    };

    showLogin.onclick = (e) => {
      e.preventDefault();
      signupView.style.display = 'none';
      loginView.style.display = 'block';
      authSubtitle.textContent = 'Join the elite creators using our AI engine';
    };

    signinBtn.onclick = async () => {
      const email = emailInput.value;
      const password = passInput.value;
      if (!email || !password) return showStatus('Enter both email and password.');

      setButtonsDisabled(true);
      showStatus('Signing in...', 'success');

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error('[SignInError]', error);
        if (error.status === 400 || error.message.toLowerCase().includes('invalid login credentials')) {
          showStatus('Account not found. Would you like to Sign Up?');
          // Highlight signup link or offer to switch
        } else if (error.status === 429) {
          showStatus('Rate limited. Please wait a moment.');
        } else {
          showStatus(error.message || 'Login failed');
        }
        setButtonsDisabled(false);
      } else {
        showStatus('Welcome back! Redirecting...', 'success');
        sessionStorage.removeItem('guest_mode');
        await updateSession();
        setTimeout(() => window.location.href = 'index.html', 1000);
      }
    };

    signupBtn.onclick = async () => {
      const email = signupEmailInput.value;
      const password = signupPassInput.value;
      const firstName = firstNameInput.value;
      const lastName = lastNameInput.value;

      if (!email || !password) return showStatus('Enter both email and password.');
      if (!firstName || !lastName) return showStatus('Please enter your full name.');

      setButtonsDisabled(true);
      showStatus('Creating your account...', 'success');

      try {
        const res = await fetch('/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, firstName, lastName })
        });

        const result = await res.json();

        if (!result.success) {
          showStatus(result.error || 'Signup failed');
          setButtonsDisabled(false);
          return;
        }

        // Auto-signin after successful admin creation
        showStatus('Account ready! Signing you in...', 'success');
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          showStatus('Login failed: ' + error.message);
          setButtonsDisabled(false);
        } else {
          showStatus('Welcome, ' + firstName + '! Redirecting...', 'success');
          sessionStorage.removeItem('guest_mode');
          await updateSession();
          setTimeout(() => window.location.href = 'index.html', 1000);
        }
      } catch (err) {
        showStatus('Network error during signup');
        setButtonsDisabled(false);
      }
    };

    guestBtn.onclick = () => {
      showStatus('Entering as guest...', 'success');
      sessionStorage.setItem('guest_mode', 'true');
      sessionStorage.removeItem('supabase_access_token');
      setTimeout(() => window.location.href = 'index.html', 800);
    };

    googleBtn.onclick = async () => {
      sessionStorage.removeItem('guest_mode');
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/login.html' }
      });
    };

    async function updateSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          sessionEl.style.display = 'block';
          sessionEl.textContent = `Active User: ${session.user.email}`;
          sessionStorage.setItem('supabase_access_token', session.access_token);

          // Auto-redirect if on login page and NOT just logging out
          const path = window.location.pathname;
          const isLoginPage = path.endsWith('login.html') || path.endsWith('/') || path === '';
          const isLoggingOut = new URLSearchParams(window.location.search).get('logout') === 'true';

          if (isLoginPage && !isLoggingOut) {
            console.log('[Auth] Session found, redirecting to generator...');
            window.location.href = 'index.html';
          }
        } else {
          sessionEl.style.display = 'none';
          sessionStorage.removeItem('supabase_access_token');
        }
      } catch (e) {
        console.warn('Session update failed', e);
      }
    }

    // Check for logout parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logout') === 'true') {
      console.log('[Auth] Logout requested, signing out...');
      await supabase.auth.signOut();
      sessionStorage.removeItem('supabase_access_token');
      sessionStorage.removeItem('guest_mode');
      // Clear URL to avoid re-triggering logout
      window.history.replaceState({}, document.title, window.location.pathname);
      showStatus('Logged out safely.', 'success');
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      updateSession();
    });

    updateSession();

  } catch (err) {
    console.error('Auth initialization failed:', err);
    showStatus(err.message || 'System error');
  }
}

init();
