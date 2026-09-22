const form = document.querySelector("#changeForm");
const message = document.querySelector("#formMessage");

function showMessage(text) {
  message.textContent = text;
}

async function requireSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session) {
    window.location.href = "login.html?next=change-password.html";
    return false;
  }
  return true;
}

form.onsubmit = async (event) => {
  event.preventDefault();
  const currentPassword = document.querySelector("#currentPassword").value;
  const password = document.querySelector("#newPassword").value;
  const confirmPassword = document.querySelector("#confirmPassword").value;
  if (password.length < 8 || password !== confirmPassword) {
    showMessage("Passwords must match and be at least 8 characters.");
    return;
  }
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError || !sessionData.session) {
    window.location.href = "login.html?next=change-password.html";
    return;
  }
  const email = sessionData.session.user.email;
  const { error: loginError } = await supabaseClient.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (loginError) {
    showMessage("Current password is incorrect.");
    return;
  }
  const { error } = await supabaseClient.auth.updateUser({ password });
  if (error) {
    showMessage(error.message);
    return;
  }
  showMessage("Password changed successfully.");
  form.reset();
};

requireSession();
