const loginForm = document.getElementById('adminLoginForm');
const loginResult = document.getElementById('loginResult');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginResult.textContent = '';

    const username = loginForm.adminUsername.value.trim();
    const password = loginForm.adminPassword.value;

    if (!username || !password) {
      loginResult.textContent = 'Please enter username and password.';
      return;
    }

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (res.ok) {
        // Save session info in sessionStorage (simple)
        sessionStorage.setItem('adminUser', username);
        loginResult.textContent = 'Login successful! Redirecting to admin panel...';
        loginResult.className = 'result-message success';

        setTimeout(() => {
          window.location.href = 'admin-panel.html';
        }, 1500);
      } else {
        loginResult.textContent = data.message || 'Login failed.';
        loginResult.className = 'result-message';
      }
    } catch (err) {
      loginResult.textContent = 'Error during login.';
      loginResult.className = 'result-message';
    }
  });
}