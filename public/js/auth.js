// client-side Supabase auth script
const statusEl = document.getElementById('status');
const sessionEl = document.getElementById('session');

async function init() {
  // fetch public config from server
  const cfgRes = await fetch('/supabase-config');
  const cfg = await cfgRes.json();
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    statusEl.textContent = 'Supabase not configured on server. Set SUPABASE_URL and SUPABASE_ANON_KEY in your .env.';
    return;
  }

  // import supabase client from CDN (ESM)
  const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
  const { createClient } = mod;
  const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  // UI bindings
  const emailInput = document.getElementById('email');
  const passInput = document.getElementById('password');
  const signupBtn = document.getElementById('signup');
  const signinBtn = document.getElementById('signin');
  const magicBtn = document.getElementById('magic');
  const signoutBtn = document.getElementById('signout');
  const googleBtn = document.getElementById('google');
  const githubBtn = document.getElementById('github');

  signupBtn.onclick = async () => {
    statusEl.textContent = 'Creating account...';
    const email = emailInput.value;
    const password = passInput.value;
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) statusEl.textContent = 'Error: ' + error.message;
    else statusEl.textContent = 'Check your email to confirm registration.';
    updateSession();
  };

  signinBtn.onclick = async () => {
    statusEl.textContent = 'Signing in...';
    const email = emailInput.value;
    const password = passInput.value;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) statusEl.textContent = 'Error: ' + error.message;
    else statusEl.textContent = 'Signed in successfully.';
    updateSession();
  };

  magicBtn.onclick = async () => {
    statusEl.textContent = 'Sending magic link...';
    const email = emailInput.value;
    const { data, error } = await supabase.auth.signInWithOtp({ email });
    if (error) statusEl.textContent = 'Error: ' + error.message;
    else statusEl.textContent = 'Magic link sent. Check your inbox.';
  };

  googleBtn.onclick = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };
  githubBtn.onclick = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'github' });
  };

  signoutBtn.onclick = async () => {
    await supabase.auth.signOut();
    statusEl.textContent = 'Signed out.';
    updateSession();
  };

  // show current session
  async function updateSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      sessionEl.style.display = 'block';
      sessionEl.textContent = `access_token: ${session.access_token}`;
      statusEl.textContent = `Logged in as ${session.user.email}`;
      // store token for later calls
      sessionStorage.setItem('supabase_access_token', session.access_token);
    } else {
      sessionEl.style.display = 'none';
      sessionEl.textContent = '';
      sessionStorage.removeItem('supabase_access_token');
    }
  }

  // auto update on auth state changes
  supabase.auth.onAuthStateChange((_event, session) => {
    updateSession();
  });

  // initial check
  updateSession();
}

init().catch(err => { console.error(err); try { document.getElementById('status').textContent = err.message } catch(e){} });
