// SURFER FRONTEND DEMONSTRATION
// Real authentication, wallet balances, payments and admin
// permissions must be connected to a secure backend.

const $ = id => document.getElementById(id);

let mode = "login";
let selectedPlan = "";

const plans = {
  Basic: 3000,
  Starter: 5000,
  Premium: 9000,
  VIP: 13000
};

let user = null;
let tasks = [
  {
    id: 1,
    title: "Social media engagement",
    description: "Complete the supplied social media assignment.",
    reward: 500,
    tier: "Basic"
  },
  {
    id: 2,
    title: "Online research",
    description: "Complete a short research assignment.",
    reward: 1000,
    tier: "Starter"
  },
  {
    id: 3,
    title: "Product feedback",
    description: "Submit genuine feedback on a supplied product.",
    reward: 750,
    tier: "Premium"
  }
];

let submissions = [];
let withdrawals = [];
let history = [];

// Demo accounts only. Never use localStorage for real money.

function toast(message) {
  const box = $("toast");
  box.textContent = message;
  box.classList.add("show");

  setTimeout(() => box.classList.remove("show"), 3000);
}

function money(value) {
  return "₦" + Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2
  });
}

function openAuth(tab = "login") {
  mode = tab;
  $("authModal").classList.remove("hidden");
  updateAuth();
}

function closeAuth() {
  $("authModal").classList.add("hidden");
}

function updateAuth() {
  const registering = mode === "register";

  $("authHeading").textContent = registering
    ? "Create your account"
    : "Welcome back";

  $("name").classList.toggle("hidden", !registering);
  $("name").required = registering;

  $("authSubmit").textContent = registering
    ? "Create account"
    : "Log in";

  document.querySelectorAll(".tabs button").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === mode);
  });
}

$("getStarted").onclick = () => openAuth("register");
$("navLogin").onclick = () => openAuth("login");
$("closeAuth").onclick = closeAuth;

document.querySelectorAll(".tabs button").forEach(button => {
  button.onclick = () => {
    mode = button.dataset.tab;
    updateAuth();
  };
});

$("authForm").onsubmit = event => {
  event.preventDefault();

  const email = $("email").value.trim().toLowerCase();
  const password = $("password").value;

  if (mode === "register") {
    const name = $("name").value.trim();

    if (!name) return toast("Enter your full name.");

    user = {
      name,
      email,
      plan: selectedPlan || "None",
      balance: 0,
      earnings: 0,
      referral: "SURFER-" + Math.random().toString(36).slice(2, 7).toUpperCase()
    };

    toast("Demo account created.");
  } else {
    if (!user || user.email !== email) {
      return toast("No matching demo account. Register first.");
    }

    toast("Demo login successful.");
  }

  closeAuth();
  showDashboard();
};

function showDashboard() {
  $("landing").classList.add("hidden");
  $("dashboard").classList.remove("hidden");
  $("admin").classList.add("hidden");

  $("memberName").textContent = user.name;
  $("memberPlan").textContent = user.plan;
  $("refCode").textContent = user.referral;

  updateWallet();
  renderTasks();
  renderSubmissions();
  renderWithdrawals();
}

function updateWallet() {
  $("balance").textContent = money(user.balance);
  $("earnings").textContent = money(user.earnings);
  $("walletAmount").textContent = money(user.balance);
}

$("logout").onclick = () => {
  user = null;
  $("dashboard").classList.add("hidden");
  $("landing").classList.remove("hidden");
  toast("Logged out.");
};

// MEMBERSHIP

document.addEventListener("click", event => {
  const button = event.target.closest(".choose");
  if (!button) return;

  selectedPlan = button.dataset.plan;

  if (!user) {
    openAuth("register");
    toast(selectedPlan + " selected. Complete registration first.");
    return;
  }

  toast(
    selectedPlan + " costs " +
    money(plans[selectedPlan]) +
    ". Payment verification is not connected yet."
  );
});

// MEMBER NAVIGATION

document.querySelectorAll(".dashboard-nav button").forEach(button => {
  button.onclick = () => {
    document.querySelectorAll(".dashboard-nav button")
      .forEach(item => item.classList.remove("active"));

    button.classList.add("active");

    document.querySelectorAll(".dashboard-panel[id]").forEach(panel => {
      panel.classList.add("hidden");
    });

    $(button.dataset.page).classList.remove("hidden");
  };
});

// TASKS

function renderTasks() {
  const list = $("taskList");
  list.innerHTML = "";

  const levels = ["None", "Basic", "Starter", "Premium", "VIP"];
  const userLevel = levels.indexOf(user.plan);

  tasks.forEach(task => {
    const eligible = levels.indexOf(task.tier) <= userLevel;

    const row = document.createElement("div");
    row.className = "task-row";

    const details = document.createElement("div");
    const title = document.createElement("strong");
    const description = document.createElement("p");

    title.textContent = task.title;
    description.textContent =
      task.description + " | " + task.tier + " access";

    details.append(title, description);

    const action = document.createElement("button");
    action.className = "primary-btn";
    action.textContent = eligible ? "Submit task" : "Upgrade required";
    action.disabled = !eligible;

    action.onclick = () => submitTask(task);

    row.append(details, action);
    list.appendChild(row);
  });
}

function submitTask(task) {
  const proof = prompt("Enter your task completion evidence:");

  if (!proof || !proof.trim()) return;

  submissions.push({
    id: Date.now(),
    email: user.email,
    task: task.title,
    reward: task.reward,
    proof: proof.trim(),
    status: "Pending review"
  });

  history.push("Submitted: " + task.title);

  renderSubmissions();
  renderAdmin();

  toast("Submission received for review.");
}

function renderSubmissions() {
  const own = submissions.filter(item => item.email === user.email);

  $("activityList").textContent = own.length
    ? own.map(item => item.task + " — " + item.status).join(" | ")
    : "No submissions yet.";
}

// REFERRALS

$("copyReferral").onclick = async () => {
  try {
    await navigator.clipboard.writeText(user.referral);
    toast("Referral code copied.");
  } catch {
    toast("Your referral code is " + user.referral);
  }
};

// WITHDRAWALS

$("withdrawForm").onsubmit = event => {
  event.preventDefault();

  const amount = Number($("withdrawAmount").value);

  if (amount <= 0 || amount > user.balance) {
    return toast("Insufficient verified balance.");
  }

  withdrawals.push({
    id: Date.now(),
    email: user.email,
    amount,
    bank: $("bankName").value,
    account: $("accountNumber").value,
    accountName: $("accountName").value,
    status: "Pending verification"
  });

  // No balance is deducted until the backend verifies the request.

  renderWithdrawals();
  renderAdmin();

  $("withdrawForm").reset();
  toast("Withdrawal request submitted for review.");
};

function renderWithdrawals() {
  const own = withdrawals.filter(item => item.email === user.email);

  $("withdrawHistory").innerHTML = own.length
    ? own.map(item =>
        `<div class="history-row">${money(item.amount)} — ${item.status}</div>`
      ).join("")
    : "<p class='muted'>No withdrawal requests yet.</p>";
}

// ADMIN DEMONSTRATION

$("taskForm").onsubmit = event => {
  event.preventDefault();

  const task = {
    id: Date.now(),
    title: $("taskTitle").value.trim(),
    description: $("taskDescription").value.trim(),
    reward: Number($("taskReward").value),
    tier: $("taskTier").value
  };

  tasks.push(task);

  $("taskForm").reset();
  renderTasks();
  renderAdmin();

  toast("Demo task added.");
};

function renderAdmin() {
  $("adminSubmissions").innerHTML = "";
  $("adminWithdrawals").innerHTML = "";

  if (!submissions.length) {
    $("adminSubmissions").textContent = "No submissions yet.";
  }

  submissions.forEach(item => {
    const row = document.createElement("div");
    row.className = "history-row";

    const details = document.createElement("span");
    details.textContent = `${item.task} — ${item.email} — ${money(item.reward)} — ${item.status}`;

    row.appendChild(details);

    if (item.status === "Pending review") {
      const approve = document.createElement("button");
      approve.className = "primary-btn";
      approve.textContent = "Approve demo";

      approve.onclick = () => {
        item.status = "Approved (demo only)";
        renderAdmin();
        renderSubmissions();
        toast("Demo approval recorded. No money credited.");
      };

      row.appendChild(approve);
    }

    $("adminSubmissions").appendChild(row);
  });

  if (!withdrawals.length) {
    $("adminWithdrawals").textContent = "No requests yet.";
  }

  withdrawals.forEach(item => {
    const row = document.createElement("div");
    row.className = "history-row";
    row.textContent =
      `${item.email} — ${money(item.amount)} — ${item.status}`;

    $("adminWithdrawals").appendChild(row);
  });
}

// ADMIN PREVIEW
// This is not secure authentication and must not be used
// as a real administrator login.

function showAdminPreview() {
  $("landing").classList.add("hidden");
  $("dashboard").classList.add("hidden");
  $("admin").classList.remove("hidden");
  renderAdmin();
}

$("adminLogout").onclick = () => {
  $("admin").classList.add("hidden");
  $("landing").classList.remove("hidden");
};

// Optional development shortcut:
// Remove before deployment.
if (location.search === "?admin-preview") {
  showAdminPreview();
    }
