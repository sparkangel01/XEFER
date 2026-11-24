// ======================================
// SURFER - SUPABASE CONNECTED FRONTEND
// ======================================

const SUPABASE_URL = "https://wdrngxgensrqpuitoepi.supabase.co";

const SUPABASE_KEY = "sb_publishable_mpnKfMVLxpuw_55Aj0DMrQ_OlGSZc35";

const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);

let user = null;
let profile = null;
let wallet = null;
let selectedPlan = null;
let tasks = [];
let submissions = [];
let withdrawals = [];
let transactions = [];

function toast(message) {
    const box = $("toast");
    box.textContent = message;
    box.classList.add("show");
    setTimeout(() => box.classList.remove("show"), 3500);
}

function money(value) {
    return "₦" + Number(value || 0).toLocaleString("en-NG", {
        minimumFractionDigits: 2
    });
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

// ======================================
// AUTHENTICATION
// ======================================

let mode = "login";

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
        button.classList.toggle(
            "active",
            button.dataset.tab === mode
        );
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

$("authForm").onsubmit = async event => {
    event.preventDefault();

    const email = $("email").value.trim().toLowerCase();
    const password = $("password").value;

    $("authSubmit").disabled = true;

    try {
        if (mode === "register") {

            const fullName = $("name").value.trim();

            if (!fullName) {
                throw new Error("Enter your full name.");
            }

            const { data, error } = await db.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (error) throw error;

            if (!data.session) {
                toast("Registration successful. Check your email to confirm your account.");
                closeAuth();
                return;
            }

            user = data.user;

        } else {

            const { data, error } = await db.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            user = data.user;
        }

        closeAuth();
        await showDashboard();

    } catch (error) {
        toast(error.message);
    } finally {
        $("authSubmit").disabled = false;
    }
};

// ======================================
// SESSION RESTORATION
// ======================================

db.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session) {
        user = session.user;

        setTimeout(() => {
            showDashboard();
        }, 0);
    }

    if (event === "SIGNED_OUT") {
        user = null;
        profile = null;
        wallet = null;

        $("dashboard").classList.add("hidden");
        $("admin").classList.add("hidden");
        $("landing").classList.remove("hidden");
    }
});

async function initialize() {
    const { data, error } = await db.auth.getSession();

    if (error) {
        console.error(error);
        return;
    }

    if (data.session) {
        user = data.session.user;
        await showDashboard();
    }
}

initialize();

// ======================================
// MEMBER DASHBOARD
// ======================================

async function showDashboard() {

    if (!user) return;

    $("landing").classList.add("hidden");
    $("admin").classList.add("hidden");
    $("dashboard").classList.remove("hidden");

    try {
        await Promise.all([
            loadProfile(),
            loadWallet(),
            loadTasks(),
            loadSubmissions(),
            loadWithdrawals(),
            loadTransactions(),
            loadMembership(),
            loadReferrals()
        ]);

    } catch (error) {
        console.error(error);
        toast("Some dashboard information could not load.");
    }
}

// ======================================
// PROFILE - UPDATED MEMBER NAME
// ======================================

async function loadProfile() {

    const { data, error } = await db
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Profile loading error:", error);
    }

    profile = data || {};

    const fullName =
        profile.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Member";

    $("memberName").textContent = fullName;

    $("refCode").textContent =
        profile.referral_code || "Not available";
}

// ======================================
// WALLET
// ======================================

async function loadWallet() {

    const { data, error } = await db
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) throw error;

    wallet = data;

    const balance = Number(wallet?.balance || 0);

    $("balance").textContent = money(balance);
    $("walletAmount").textContent = money(balance);
}

// ======================================
// MEMBERSHIP
// ======================================

async function loadMembership() {

    const { data, error } = await db
        .from("memberships")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

    if (error) throw error;

    if (!data.length) {
        $("memberPlan").textContent = "None";
        return;
    }

    const membership = data[0];

    const { data: plan, error: planError } = await db
        .from("membership_plans")
        .select("name")
        .eq("id", membership.plan_id)
        .maybeSingle();

    if (planError) throw planError;

    $("memberPlan").textContent = plan?.name || "Active";
}

// ======================================
// TASKS
// ======================================

async function loadTasks() {

    const { data, error } = await db
        .from("tasks")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });

    if (error) throw error;

    tasks = data || [];

    renderTasks();
}

function renderTasks() {

    const list = $("taskList");
    list.innerHTML = "";

    if (!tasks.length) {
        list.textContent = "No active tasks available.";
        return;
    }

    tasks.forEach(task => {

        const row = document.createElement("div");
        row.className = "task-row";

        const details = document.createElement("div");

        const title = document.createElement("strong");
        title.textContent = task.title;

        const description = document.createElement("p");
        description.textContent =
            `${task.description || ""} | Reward: ${money(task.reward)}`;

        details.append(title, description);

        const button = document.createElement("button");
        button.className = "primary-btn";
        button.textContent = "Submit task";

        button.onclick = () => submitTask(task);

        row.append(details, button);

        list.appendChild(row);
    });
}

// ======================================
// TASK SUBMISSIONS
// ======================================

async function submitTask(task) {

    const proof = prompt("Enter your task completion evidence:");

    if (!proof || !proof.trim()) return;

    try {

        const { error } = await db
            .from("task_submissions")
            .insert({
                user_id: user.id,
                task_id: task.id,
                proof: proof.trim(),
                status: "pending"
            });

        if (error) throw error;

        toast("Task submitted successfully.");

        await loadSubmissions();

    } catch (error) {
        toast(error.message);
    }
}

async function loadSubmissions() {

    const { data, error } = await db
        .from("task_submissions")
        .select("*, tasks(title, reward)")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false });

    if (error) throw error;

    submissions = data || [];

    renderSubmissions();
}

function renderSubmissions() {

    const list = $("activityList");

    if (!submissions.length) {
        list.textContent = "No submissions yet.";
        return;
    }

    list.innerHTML = "";

    submissions.forEach(item => {

        const row = document.createElement("div");
        row.className = "history-row";

        row.textContent =
            `${item.tasks?.title || "Task"} — ${item.status}`;

        list.appendChild(row);
    });
}

// ======================================
// REFERRALS
// ======================================

async function loadReferrals() {

    const { data, error } = await db
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id);

    if (error) throw error;

    $("referralList").textContent =
        `${(data || []).length} recorded referrals`;
}

$("copyReferral").onclick = async () => {

    const code = profile?.referral_code;

    if (!code) {
        return toast("Referral code unavailable.");
    }

    try {
        await navigator.clipboard.writeText(code);
        toast("Referral code copied.");
    } catch {
        toast("Your referral code: " + code);
    }
};

// ======================================
// WITHDRAWALS
// ======================================

$("withdrawForm").onsubmit = async event => {

    event.preventDefault();

    const amount = Number($("withdrawAmount").value);

    if (!Number.isFinite(amount) || amount <= 0) {
        return toast("Enter a valid withdrawal amount.");
    }

    if (amount > Number(wallet?.balance || 0)) {
        return toast("Insufficient wallet balance.");
    }

    try {

        const { error } = await db
            .from("withdrawal_requests")
            .insert({
                user_id: user.id,
                amount,
                bank_name: $("bankName").value.trim(),
                account_number: $("accountNumber").value.trim(),
                account_name: $("accountName").value.trim(),
                status: "pending"
            });

        if (error) throw error;

        $("withdrawForm").reset();

        toast("Withdrawal request submitted for review.");

        await loadWithdrawals();

    } catch (error) {
        toast(error.message);
    }
};

async function loadWithdrawals() {

    const { data, error } = await db
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) throw error;

    withdrawals = data || [];

    $("withdrawHistory").innerHTML = "";

    if (!withdrawals.length) {
        $("withdrawHistory").textContent =
            "No withdrawal requests yet.";
        return;
    }

    withdrawals.forEach(item => {

        const row = document.createElement("div");
        row.className = "history-row";

        row.textContent =
            `${money(item.amount)} — ${item.status}`;

        $("withdrawHistory").appendChild(row);
    });
}

// ======================================
// TRANSACTION HISTORY
// ======================================

async function loadTransactions() {

    const { data, error } = await db
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) throw error;

    transactions = data || [];

    const earnings = transactions
        .filter(item =>
            item.status === "completed" &&
            Number(item.amount) > 0
        )
        .reduce((sum, item) => sum + Number(item.amount), 0);

    $("earnings").textContent = money(earnings);
}

// ======================================
// MEMBERSHIP PLAN SELECTION
// ======================================

document.addEventListener("click", async event => {

    const button = event.target.closest(".choose");

    if (!button) return;

    selectedPlan = button.dataset.plan;

    try {

        const { data, error } = await db
            .from("membership_plans")
            .select("*")
            .eq("name", selectedPlan)
            .eq("active", true)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return toast("This membership plan is not available.");
        }

        toast(
            `${data.name} costs ${money(data.price)}. Payment verification is not yet connected.`
        );

    } catch (error) {
        toast(error.message);
    }
});

// ======================================
// MEMBER NAVIGATION
// ======================================

document.querySelectorAll(".dashboard-nav button")
.forEach(button => {

    button.onclick = () => {

        document.querySelectorAll(".dashboard-nav button")
            .forEach(item => item.classList.remove("active"));

        button.classList.add("active");

        document.querySelectorAll(".dashboard-panel[id]")
            .forEach(panel => panel.classList.add("hidden"));

        $(button.dataset.page).classList.remove("hidden");
    };
});

// ======================================
// LOGOUT
// ======================================

$("logout").onclick = async () => {

    const { error } = await db.auth.signOut();

    if (error) {
        toast(error.message);
        return;
    }

    toast("Logged out successfully.");
};

// ======================================
// ADMIN SECURITY
// ======================================

$("admin").classList.add("hidden");

if ($("taskForm")) {
    $("taskForm").onsubmit = event => {
        event.preventDefault();
        toast("Admin task creation is not enabled.");
    };
}

if ($("adminLogout")) {
    $("adminLogout").onclick = async () => {
        await db.auth.signOut();
    };
            }
