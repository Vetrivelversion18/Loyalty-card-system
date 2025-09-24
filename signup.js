const signupForm = document.getElementById('adminSignupForm');
const signupResult = document.getElementById('signupResult');

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupResult.textContent = '';

    // Collect values
    const username = signupForm.newUsername.value.trim();
    const password = signupForm.newPassword.value;

    const sq1 = signupForm.securityQuestion1.value;
    const sa1 = signupForm.securityAnswer1.value.trim();

    const sq2 = signupForm.securityQuestion2.value;
    const sa2 = signupForm.securityAnswer2.value.trim();

    const sq3 = signupForm.securityQuestion3.value;
    const sa3 = signupForm.securityAnswer3.value.trim();

    if (!username || !password || !sq1 || !sa1 || !sq2 || !sa2 || !sq3 || !sa3) {
      signupResult.textContent = 'Please fill all fields and security questions.';
      return;
    }

    if (sq1 === sq2 || sq2 === sq3 || sq1 === sq3) {
      signupResult.textContent = 'Please select three different security questions.';
      return;
    }

    try {
      const res = await fetch('/api/admin/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          securityQuestions: [
            { question: sq1, answer: sa1 },
            { question: sq2, answer: sa2 },
            { question: sq3, answer: sa3 },
          ],
        }),
      });
      const data = await res.json();

      if (res.ok) {
        signupResult.textContent = 'Sign up successful! You can now log in.';
        signupResult.className = 'result-message success';
        signupForm.reset();
      } else {
        signupResult.textContent = data.message || 'Sign up failed.';
        signupResult.className = 'result-message';
      }
    } catch (err) {
      signupResult.textContent = 'Error during sign up.';
      signupResult.className = 'result-message';
    }
  });
}