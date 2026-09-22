const form = document.querySelector('#changeForm');
const message = document.querySelector('#formMessage');
form.onsubmit = async (event) => {
  event.preventDefault();
  const currentPassword = document.querySelector('#currentPassword').value;
  const password = document.querySelector('#newPassword').value;
  const confirmPassword = document.querySelector('#confirmPassword').value;
  if (password.length < 8 || password !== confirmPassword) {
    message.textContent = 'Passwords must match and be at least 8 characters.';
    return;
  }
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const email = sessionData.session?.user?.email;
  const { error: loginError } = await supabaseClient.auth.signInWithPassword({ email, password: currentPassword });
  if (loginError) {
    message.textContent = 'Current password is incorrect.';
    return;
  }
  const { error } = await supabaseClient.auth.updateUser({ password });
  message.textContent = error ? error.message : 'Password changed.';
  if (!error) form.reset();
};
