document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const signupButton = document.getElementById("signup-button");
  const messageDiv = document.getElementById("message");
  const teacherStatus = document.getElementById("teacher-status");
  const userButton = document.getElementById("user-button");
  const loginModal = document.getElementById("login-modal");
  const closeLoginModalButton = document.getElementById("close-login-modal");
  const loginForm = document.getElementById("login-form");

  const state = {
    token: localStorage.getItem("teacherToken") || "",
    username: localStorage.getItem("teacherUsername") || "",
  };

  function showMessage(text, type = "info") {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  function updateTeacherAccess() {
    const isLoggedIn = Boolean(state.token);
    userButton.textContent = isLoggedIn ? `👤 ${state.username}` : "👤 Teacher Login";
    teacherStatus.textContent = isLoggedIn
      ? `Logged in as ${state.username}. You can register and unregister students.`
      : "Log in as a teacher to register or unregister students.";
    signupButton.disabled = !isLoggedIn;
    activitySelect.disabled = !isLoggedIn;
    document.getElementById("email").disabled = !isLoggedIn;
  }

  function openLoginModal() {
    loginModal.classList.remove("hidden");
    loginModal.setAttribute("aria-hidden", "false");
  }

  function closeLoginModal() {
    loginModal.classList.add("hidden");
    loginModal.setAttribute("aria-hidden", "true");
    loginForm.reset();
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const isLoggedIn = Boolean(state.token);

        const participantsMarkup = details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map((email) => {
                    if (!isLoggedIn) {
                      return `<li><span class="participant-email">${email}</span></li>`;
                    }
                    return `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}" type="button">❌</button></li>`;
                  })
                  .join("")}
              </ul>
            </div>`
          : "<p><em>No participants yet</em></p>";

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsMarkup}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target.closest("button");
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${state.token}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!state.token) {
      showMessage("Please log in as a teacher before managing registrations.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = activitySelect.value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${state.token}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        state.token = result.token;
        state.username = result.username;
        localStorage.setItem("teacherToken", state.token);
        localStorage.setItem("teacherUsername", state.username);
        updateTeacherAccess();
        fetchActivities();
        closeLoginModal();
        showMessage(`Logged in as ${state.username}.`, "success");
      } else {
        showMessage(result.detail || "Login failed", "error");
      }
    } catch (error) {
      showMessage("Login failed. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  userButton.addEventListener("click", openLoginModal);
  closeLoginModalButton.addEventListener("click", closeLoginModal);
  loginModal.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      closeLoginModal();
    }
  });

  updateTeacherAccess();
  fetchActivities();
});
