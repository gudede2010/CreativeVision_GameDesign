const form = document.querySelector('#changeForm');
const message = document.querySelector('#formMessage');
form.onsubmit = async (event) => {
  event.preventDefault();
  const response = await fetch('/api/password/change', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: document.querySelector('#currentPassword').value, password: document.querySelector('#newPassword').value, confirmPassword: document.querySelector('#confirmPassword').value }) });
  const data = await response.json();
  message.textContent = data.message || data.error;
  if (response.ok) form.reset();
};
