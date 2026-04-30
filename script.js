// API Configuration
const API_URL = "http://localhost:5000/api";

// Auth State
let currentUser = null;
let followingList = []; // Array of integers

// LocalStorage keys
const LS_KEY_TOKEN = "artAgainstAI_token";
const LS_KEY_VIEW = "artAgainstAI_currentView";

let feedPage = 1;
const FEED_PAGE_SIZE = 12;
let isLoadingMore = false;
let currentDetailId = null;

// ---------- Auth Helpers ----------

async function fetchCurrentUser() {
    const token = localStorage.getItem(LS_KEY_TOKEN);
    if (!token) {
        updateAuthUI(null);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            updateAuthUI(data.user);
            await fetchFollowingList(); 
        } else {
            localStorage.removeItem(LS_KEY_TOKEN);
            updateAuthUI(null);
        }
    } catch (error) {
        console.error("Error fetching user:", error);
        updateAuthUI(null);
    }
}

async function fetchFollowingList() {
    const token = localStorage.getItem(LS_KEY_TOKEN);
    if (!token) {
        followingList = [];
        return;
    }

    try {
        const response = await fetch(`${API_URL}/users/following`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            followingList = await response.json(); // Array of integers
        }
    } catch (error) {
        console.error("Error fetching following list:", error);
    }
}

function updateAuthUI(user) {
    currentUser = user;
    if (user) {
        document.body.classList.add("logged-in");
        const nameEl = document.getElementById("currentUserName");
        if (nameEl) nameEl.textContent = `@${user.username}`;
    } else {
        document.body.classList.remove("logged-in");
        const nameEl = document.getElementById("currentUserName");
        if (nameEl) nameEl.textContent = "";
    }
}

async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem(LS_KEY_TOKEN, data.token);
            updateAuthUI(data.user);
            await fetchFollowingList();
            showView("home");
            await renderFeed(true);
        } else {
            alert(data.message || "Login failed");
        }
    } catch (error) {
        console.error("Login error:", error);
        alert("An error occurred during login.");
    }
}

async function signup(username, email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem(LS_KEY_TOKEN, data.token);
            updateAuthUI(data.user);
            await fetchFollowingList();
            showView("home");
            await renderFeed(true);
        } else {
            alert(data.message || "Signup failed");
        }
    } catch (error) {
        console.error("Signup error:", error);
        alert(`An error occurred during signup: ${error.message}`);
    }
}

function logout() {
    localStorage.removeItem(LS_KEY_TOKEN);
    updateAuthUI(null);
    followingList = [];
    showView("home");
    renderFeed(true);
}

// ---------- View Management ----------

function getActiveView() {
    const active = document.querySelector(".view.active");
    return active ? active.id.replace("view-", "") : "home";
}

function showView(viewId) {
    // Save to local storage for persistence on refresh
    localStorage.setItem(LS_KEY_VIEW, viewId);

    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    const targetView = document.getElementById("view-" + viewId);
    if (targetView) targetView.classList.add("active");
    
    window.scrollTo(0, 0);
}

// ---------- Core Rendering ----------

async function renderFeed(reset = false) {
    const grid = document.getElementById("feedGrid");
    if (!grid) return;

    if (reset) {
        grid.innerHTML = "";
        feedPage = 1;
    }

    const artworks = await loadArtworks();
    const start = (feedPage - 1) * FEED_PAGE_SIZE;
    const end = start + FEED_PAGE_SIZE;
    const pageItems = artworks.slice(start, end);

    pageItems.forEach(art => {
        const card = document.createElement("div");
        card.className = "card";
        card.dataset.id = art.id;

        const fullImageUrl = art.image_url.startsWith("/") ? `http://localhost:5000${art.image_url}` : art.image_url;

        card.innerHTML = `
            <img src="${fullImageUrl}" alt="${art.title}">
            <div class="overlay-actions">
                <div class="top-actions">
                    <button type="button" class="mini-follow-btn action-follow" data-artist-id="${art.user_id}">Follow</button>
                </div>
                <div class="bottom-actions">
                    <button type="button" class="upvote-btn action-upvote" data-id="${art.id}">▲</button>
                    <span class="votes-count" style="color: white; text-shadow: 0 1px 4px rgba(0,0,0,0.8); font-weight: bold;">${art.votes || 0}</span>
                </div>
            </div>
            <h3>${art.title}</h3>
            <div class="card-meta-row">
                <p class="artist">by ${art.artist}</p>
            </div>
        `;

        updateCardUI(card, art);
        grid.appendChild(card);
    });

    feedPage++;
    isLoadingMore = false;
}

async function renderProfile() {
    if (!currentUser) return;

    const grid = document.getElementById("profileGrid");
    const totalUpvotesEl = document.getElementById("profileTotalUpvotes");
    if (!grid || !totalUpvotesEl) return;

    grid.innerHTML = "";
    await updateProfileStatsUI();

    const artworks = await loadArtworks();
    const myArtworks = artworks.filter(a => a.user_id === currentUser.id);
    let totalVotes = 0;

    myArtworks.forEach(art => {
        totalVotes += (art.votes || 0);
        const card = document.createElement("div");
        card.className = "card card-profile";
        card.dataset.id = art.id;
        const fullImageUrl = art.image_url.startsWith("/") ? `http://localhost:5000${art.image_url}` : art.image_url;
        card.innerHTML = `
            <img src="${fullImageUrl}" alt="${art.title}">
            <div class="overlay-actions">
                <div class="bottom-actions">
                    <button type="button" class="upvote-btn action-upvote" data-id="${art.id}">▲</button>
                    <span class="votes-count" style="color: white; text-shadow: 0 1px 4px rgba(0,0,0,0.8); font-weight: bold;">${art.votes || 0}</span>
                </div>
            </div>
            <h3>${art.title}</h3>
            <p class="artist">${art.votes || 0} votes</p>
        `;
        updateCardUI(card, art);
        grid.appendChild(card);
    });

    totalUpvotesEl.textContent = totalVotes;
}

async function openDetail(id) {
    const token = localStorage.getItem(LS_KEY_TOKEN);
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
        const response = await fetch(`${API_URL}/artworks/${id}`, { headers });
        if (!response.ok) throw new Error("Artwork not found");
        const art = await response.json();

        currentDetailId = id;
        const container = document.getElementById("detailContainer");
        const fullImageUrl = art.image_url.startsWith("/") ? `http://localhost:5000${art.image_url}` : art.image_url;

        container.innerHTML = `
            <div class="detail-image">
                <img src="${fullImageUrl}" alt="${art.title}">
            </div>
            <div class="detail-meta">
                <h2>${art.title}</h2>
                <div class="artist-row">
                    <p class="artist">by ${art.artist}</p>
                    <button type="button" class="follow-btn action-follow" data-artist-id="${art.user_id}">Follow</button>
                </div>
                <p>${art.description || "No description provided."}</p>
                <div class="detail-upvote-row-visible">
                    <button type="button" class="upvote-btn action-upvote" id="detailUpvoteBtn" data-id="${art.id}">▲ Upvote</button>
                    <span class="votes" id="detailVotes">${art.votes || 0} votes</span>
                </div>
                <div class="comments">
                    <h3>Comments</h3>
                    <div id="commentsList"><p class="muted">Comments are coming soon!</p></div>
                </div>
            </div>
        `;

        updateDetailUI(art);
        showView("detail");
    } catch (error) {
        console.error("Detail load error:", error);
    }
}

// ---------- Surgical UI Helpers ----------

function updateCardUI(card, art) {
    const upvoteBtn = card.querySelector(".upvote-btn");
    const votesCount = card.querySelector(".votes-count");
    const followBtn = card.querySelector(".mini-follow-btn");

    if (upvoteBtn && votesCount) {
        if (art.is_upvoted) {
            upvoteBtn.classList.add("upvoted");
            upvoteBtn.textContent = "✓";
        } else {
            upvoteBtn.classList.remove("upvoted");
            upvoteBtn.textContent = "▲";
        }
        votesCount.textContent = art.votes || 0;
    }

    if (followBtn) {
        if (!currentUser || currentUser.id === art.user_id) {
            followBtn.style.display = "none";
        } else {
            followBtn.style.display = "block";
            if (isFollowing(art.user_id)) {
                followBtn.classList.add("following");
                followBtn.textContent = "Following";
            } else {
                followBtn.classList.remove("following");
                followBtn.textContent = "Follow";
            }
        }
    }
}

function updateDetailUI(art) {
    const upvoteBtn = document.getElementById("detailUpvoteBtn");
    const votesText = document.getElementById("detailVotes");
    const followBtn = document.querySelector("#view-detail .follow-btn");

    if (upvoteBtn) {
        if (art.is_upvoted) {
            upvoteBtn.classList.add("upvoted-active");
            upvoteBtn.textContent = "✓ Upvoted";
        } else {
            upvoteBtn.classList.remove("upvoted-active");
            upvoteBtn.textContent = "▲ Upvote";
        }
    }
    if (votesText) votesText.textContent = `${art.votes || 0} votes`;

    if (followBtn) {
        if (!currentUser || currentUser.id === art.user_id) {
            followBtn.style.display = "none";
        } else {
            followBtn.style.display = "inline-block";
            if (isFollowing(art.user_id)) {
                followBtn.classList.add("following");
                followBtn.textContent = "Following";
            } else {
                followBtn.classList.remove("following");
                followBtn.textContent = "Follow";
            }
        }
    }
}

async function updateProfileStatsUI() {
    if (!currentUser) return;
    
    const usernameEl = document.getElementById("profileUsername");
    const avatarEl = document.querySelector("#view-profile .avatar");
    const followersEl = document.getElementById("profileFollowersCount");
    const followingEl = document.getElementById("profileFollowingCount");

    if (usernameEl) usernameEl.textContent = `@${currentUser.username}`;
    if (avatarEl) avatarEl.textContent = currentUser.username.substring(0, 2).toUpperCase();
    if (followersEl) followersEl.textContent = currentUser.followers_count || 0;
    if (followingEl) followingEl.textContent = currentUser.following_count || 0;
}

async function updateSurgical(artworkId) {
    const token = localStorage.getItem(LS_KEY_TOKEN);
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
        const response = await fetch(`${API_URL}/artworks/${artworkId}`, { headers });
        if (response.ok) {
            const art = await response.json();
            
            // 1. Update all matching cards
            const cards = document.querySelectorAll(`.card[data-id="${artworkId}"]`);
            cards.forEach(card => updateCardUI(card, art));

            // 2. Update detail view
            if (getActiveView() === "detail" && currentDetailId == artworkId) {
                updateDetailUI(art);
            }
            
            // 3. Update profile totals if needed (optional optimization)
        }
    } catch (e) { console.error("Surgical update failed", e); }
}

// ---------- Social Actions ----------

async function upvoteArtwork(id, isCurrentlyUpvoted) {
    const token = localStorage.getItem(LS_KEY_TOKEN);
    if (!token) { alert("Please log in to upvote."); showView("login"); return; }

    try {
        const response = await fetch(`${API_URL}/artworks/${id}/upvote`, {
            method: isCurrentlyUpvoted ? "DELETE" : "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            await updateSurgical(id);
        }
    } catch (error) { console.error("Upvote error:", error); }
}

async function handleFollowAction(targetUserId) {
    const token = localStorage.getItem(LS_KEY_TOKEN);
    if (!token) { alert("Please log in to follow."); showView("login"); return; }

    const currentlyFollowing = isFollowing(targetUserId);
    const method = currentlyFollowing ? "POST" : "POST"; // Backend uses specific paths
    const path = currentlyFollowing ? "unfollow" : "follow";

    try {
        const response = await fetch(`${API_URL}/users/${targetUserId}/${path}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            await fetchFollowingList();
            await fetchCurrentUser(); // Get new counts
            
            // Refresh visible elements
            const artistCards = document.querySelectorAll(`.mini-follow-btn[data-artist-id="${targetUserId}"]`);
            for (const btn of artistCards) {
                const card = btn.closest(".card");
                if (card) await updateSurgical(card.dataset.id);
            }
            if (getActiveView() === "detail" && currentDetailId) await updateSurgical(currentDetailId);
            if (getActiveView() === "profile") await updateProfileStatsUI();
        }
    } catch (error) { console.error("Follow error:", error); }
}

function isFollowing(targetUserId) {
    return followingList.includes(parseInt(targetUserId));
}

// ---------- Data Loading ----------

async function loadArtworks() {
    const token = localStorage.getItem(LS_KEY_TOKEN);
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
        const response = await fetch(`${API_URL}/artworks`, { headers });
        return response.ok ? await response.json() : [];
    } catch (e) { return []; }
}

// ---------- Initialization ----------

document.addEventListener("DOMContentLoaded", async () => {
    await fetchCurrentUser();
    setupForms();

    // Restore View
    const savedView = localStorage.getItem(LS_KEY_VIEW) || "home";
    if (savedView === "home") await renderFeed(true);
    if (savedView === "profile") await renderProfile();
    showView(savedView);

    // MASTER DELEGATOR
    document.addEventListener("click", async (e) => {
        const target = e.target;

        // 1. Navigation / View Switches
        const viewLink = target.closest("[data-view]");
        if (viewLink) {
            e.preventDefault();
            const view = viewLink.getAttribute("data-view");
            if (view === "home") await renderFeed(true);
            if (view === "profile") await renderProfile();
            showView(view);
            return;
        }

        // 2. Upvote
        const upvoteBtn = target.closest(".action-upvote");
        if (upvoteBtn) {
            e.preventDefault();
            e.stopPropagation();
            const id = upvoteBtn.getAttribute("data-id");
            const isUpvoted = upvoteBtn.classList.contains("upvoted") || upvoteBtn.classList.contains("upvoted-active");
            await upvoteArtwork(id, isUpvoted);
            return;
        }

        // 3. Follow
        const followBtn = target.closest(".action-follow");
        if (followBtn) {
            e.preventDefault();
            e.stopPropagation();
            const artistId = followBtn.getAttribute("data-artist-id");
            await handleFollowAction(artistId);
            return;
        }

        // 4. Card click (Detail)
        const card = target.closest(".card");
        if (card && !target.closest("button")) {
            e.preventDefault();
            await openDetail(card.dataset.id);
            return;
        }

        // 5. Logout
        if (target.id === "logoutBtn" || target.closest("#logoutBtn")) {
            e.preventDefault();
            logout();
        }

        // 6. Guest Login
        if (target.id === "guestLoginBtn") {
            e.preventDefault();
            const guestUser = { id: 0, username: "Guest", email: "guest@dev.local", created_at: new Date().toISOString() };
            localStorage.removeItem(LS_KEY_TOKEN);
            updateAuthUI(guestUser);
            showView("home");
            await renderFeed(true);
        }
    });

    // Dark Mode
    const darkToggle = document.getElementById("darkModeToggle");
    if (darkToggle) {
        darkToggle.addEventListener("click", (e) => {
            e.preventDefault();
            document.body.classList.toggle("dark");
            localStorage.setItem("darkMode", document.body.classList.contains("dark"));
        });
    }
    if (localStorage.getItem("darkMode") === "true") document.body.classList.add("dark");

    // Infinite Scroll
    window.addEventListener("scroll", async () => {
        if (isLoadingMore || getActiveView() !== "home") return;
        const scrollPos = window.innerHeight + window.scrollY;
        if (scrollPos >= document.body.offsetHeight - 300) {
            isLoadingMore = true;
            await renderFeed();
        }
    });
});

function setupForms() {
    const uploadForm = document.getElementById("uploadForm");
    if (uploadForm) {
        uploadForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const title = document.getElementById("artTitle").value;
            const description = document.getElementById("artDescription").value;
            const file = document.getElementById("artImageFile").files[0];
            const token = localStorage.getItem(LS_KEY_TOKEN);

            const formData = new FormData();
            formData.append("title", title);
            formData.append("description", description);
            formData.append("image", file);

            showLoading();
            const response = await fetch(`${API_URL}/artworks`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });
            hideLoading();
            if (response.ok) {
                uploadForm.reset();
                showView("home");
                await renderFeed(true);
            }
        });
    }
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            login(document.getElementById("loginEmail").value, document.getElementById("loginPassword").value);
        });
    }
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
        signupForm.addEventListener("submit", (e) => {
            e.preventDefault();
            signup(document.getElementById("signupUsername").value, document.getElementById("signupEmail").value, document.getElementById("signupPassword").value);
        });
    }
    const fileInput = document.getElementById("artImageFile");
    const preview = document.getElementById("uploadPreview");
    if (fileInput && preview) {
        fileInput.addEventListener("change", () => {
            const file = fileInput.files[0];
            if (file) { preview.src = URL.createObjectURL(file); preview.style.display = "block"; }
        });
    }
}

function showLoading() { const el = document.getElementById("loadingOverlay"); if (el) el.style.display = "flex"; }
function hideLoading() { const el = document.getElementById("loadingOverlay"); if (el) el.style.display = "none"; }
