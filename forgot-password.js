const forgotForm = document.getElementById('forgotPasswordForm');
const forgotUsernameInput = document.getElementById('forgotUsername');
const securityQuestionsContainer = document.getElementById('securityQuestionsContainer');
const labelQuestion1 = document.getElementById('labelQuestion1');
const labelQuestion2 = document.getElementById('labelQuestion2');
const labelQuestion3 = document.getElementById('labelQuestion3');
const answerQuestion1 = document.getElementById('answerQuestion1');
const answerQuestion2 = document.getElementById('answerQuestion2');
const answerQuestion3 = document.getElementById('answerQuestion3');
const fetchQuestionsBtn = document.getElementById('fetchQuestionsBtn');
const submitAnswersBtn = document.getElementById('submitAnswersBtn');
const forgotPasswordResult = document.getElementById('forgotPasswordResult');

let currentUsername = null;
let currentSecurityQuestions = [];

fetchQuestionsBtn.addEventListener('click', async () => {
  const username = forgotUsernameInput.value.trim();
  forgotPasswordResult.textContent = '';
  if (!username) {
    forgotPasswordResult.textContent = 'Please enter username.';
    return;
  }

  try {
    const res = await fetch(`/api/admin/security-questions/${encodeURIComponent(username)}`);
    const data = await res.json();

    if (res.ok) {
      currentUsername = username;
      currentSecurityQuestions = data.securityQuestions;
      labelQuestion1.textContent = currentSecurityQuestions[0].question;
      labelQuestion2.textContent = currentSecurityQuestions[1].question;
      labelQuestion3.textContent = currentSecurityQuestions[2].question;
      securityQuestionsContainer.style.display = 'block';
      fetchQuestionsBtn.style.display = 'none';
      forgotUsernameInput.disabled = true;
      forgotPasswordResult.textContent = 'Answer the security questions below.';
      forgotPasswordResult.className = 'result-message';
    } else {
      forgotPasswordResult.textContent = data.message || 'User not found.';
      forgotPasswordResult.className = 'result-message';
    }
  } catch (err) {
    forgotPasswordResult.textContent = 'Error fetching security questions.';
    forgotPasswordResult.className = 'result-message';
  }
});

forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  forgotPasswordResult.textContent = '';

  if (!currentUsername) {
    forgotPasswordResult.textContent = 'Please fetch security questions first.';
    return;
  }

  const a1 = answerQuestion1.value.trim();
  const a2 = answerQuestion2.value.trim();
  const a3 = answerQuestion3.value.trim();

  if (!a1 || !a2 || !a3) {
    forgotPasswordResult.textContent = 'Please answer all security questions.';
    return;
  }

  try {
    const res = await fetch('/api/admin/verify-security-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: currentUsername,
        answers: [a1, a2, a3],
      }),
    });
    const data = await res.json();

    if (res.ok) {
      forgotPasswordResult.textContent = `Password reset successful. Your password is: ${data.password}`;
      forgotPasswordResult.className = 'result-message success';
      // Reset form
      forgotForm.reset();
      securityQuestionsContainer.style.display = 'none';
      fetchQuestionsBtn.style.display = 'inline-block';
      forgotUsernameInput.disabled = false;
      currentUsername = null;
      currentSecurityQuestions = [];
    } else {
      forgotPasswordResult.textContent = data.message || 'Verification failed.';
      forgotPasswordResult.className = 'result-message';
    }
  } catch (err) {
    forgotPasswordResult.textContent = 'Error verifying answers.';
    forgotPasswordResult.className = 'result-message';
  }
});