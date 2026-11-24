const loginModal = document.getElementById("loginModal");
const toast = document.getElementById("toast");

function showLogin() {
  loginModal.classList.add("active");
}

function closeLogin() {
  loginModal.classList.remove("active");
}

function showMessage(message) {
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

function selectPlan(name, price) {
  showMessage(
    `${name} selected — ₦${price.toLocaleString("en-NG")}. Payment is not connected yet.`
  );
}

document.getElementById("loginForm").addEventListener("submit", function(event) {
  event.preventDefault();

  showMessage(
    "Demo only: connect Supabase before enabling real member accounts."
  );

  this.reset();
});

loginModal.addEventListener("click", function(event) {
  if (event.target === loginModal) {
    closeLogin();
  }
});

document.addEventListener("keydown", function(event) {
  if (event.key === "Escape") {
    closeLogin();
  }
});
