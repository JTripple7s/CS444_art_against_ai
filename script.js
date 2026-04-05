// API Configuration
const API_URL = "http://localhost:5000/api";

// Auth State
let currentUser = null;

// LocalStorage keys
const LS_KEY_TOKEN = "artAgainstAI_token";
const LS_KEY_ARTWORKS = "artAgainstAI_artworks";

// ---------- Auth Helpers ----------

async function fetchCurrentUser() {
    const token = localStorage.getItem(LS_KEY_TOKEN);
    if (!token) {
        updateAuthUI(null);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            updateAuthUI(data.user);
        } else {
            // Token might be invalid or expired
            localStorage.removeItem(LS_KEY_TOKEN);
            updateAuthUI(null);
        }
    } catch (error) {
        console.error("Error fetching user:", error);
        updateAuthUI(null);
    }
}

function updateAuthUI(user) {
    currentUser = user;
    if (user) {
        document.body.classList.add("logged-in");
        document.getElementById("currentUserName").textContent = `@${user.username}`;
    } else {
        document.body.classList.remove("logged-in");
        document.getElementById("currentUserName").textContent = "";
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
            showView("home");
            renderFeed();
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
            showView("home");
            renderFeed();
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
    showView("home");
    renderFeed();
}

// ---------- Data Helpers ----------

function loadArtworks() {
    const raw = localStorage.getItem(LS_KEY_ARTWORKS);
    if (!raw) {
        const seed = [
            {
                id: "1",
                title: "Sunset Dreams",
                artist: "Alex Rivera",
                owner: "alex_rivera",
                imageUrl: "https://via.placeholder.com/600x400?text=Sunset+Dreams",
                description: "A warm, hand-painted sunset inspired by late studio nights.",
                votes: 3,
                comments: [
                    { author: "@ArtFriend", text: "Love the colors!" }
                ]
            },
            {
                id: "2",
                title: "Paper Sculpture",
                artist: "Jamie Lee",
                owner: "jamie_lee",
                imageUrl: "https://via.placeholder.com/600x400?text=Paper+Sculpture",
                description: "Layered paper sculpture exploring texture and shadow.",
                votes: 5,
                comments: []
            }
        ];
        localStorage.setItem(LS_KEY_ARTWORKS, JSON.stringify(seed));
        return seed;
    }
    return JSON.parse(raw);
}

function saveArtworks(artworks) {
    localStorage.setItem(LS_KEY_ARTWORKS, JSON.stringify(artworks));
}

function getArtworkById(id) {
    const artworks = loadArtworks();
    return artworks.find(a => a.id === id);
}

// ---------- View Navigation ----------

function showView(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    const targetView = document.getElementById("view-" + viewId);
    if (targetView) targetView.classList.add("active");
}

function setupNav() {
    document.querySelectorAll("[data-view]").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const view = link.getAttribute("data-view");
            if (view) {
                showView(view);
                if (view === "home") renderFeed();
                if (view === "profile") renderProfile();
            }
        });
    });

    document.getElementById("logoutBtn").addEventListener("click", (e) => {
        e.preventDefault();
        logout();
    });
}

// ---------- Feed Rendering ----------

function renderFeed() {
    const grid = document.getElementById("feedGrid");
    if (!grid) return;
    grid.innerHTML = "";
    const artworks = loadArtworks().sort((a, b) => b.votes - a.votes);

    artworks.forEach(art => {
        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
            <img src="${art.imageUrl}" alt="${art.title}">
            <h3>${art.title}</h3>
            <p class="artist">by ${art.artist}</p>
            <div class="card-footer">
                <button class="upvote-btn">▲ Upvote</button>
                <p class="votes">${art.votes} votes</p>
            </div>
        `;

        card.addEventListener("click", (e) => {
            if (e.target.classList.contains("upvote-btn")) return;
            openDetail(art.id);
        });

        const upvoteBtn = card.querySelector(".upvote-btn");
        upvoteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            upvoteArtwork(art.id);
        });

        grid.appendChild(card);
    });
}

// ---------- Upload Handling ----------

function setupForms() {
    const uploadForm = document.getElementById("uploadForm");
    uploadForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert("You must be logged in to upload.");
            showView("login");
            return;
        }

        const title = document.getElementById("artTitle").value.trim();
        const imageUrl = document.getElementById("artImageUrl").value.trim();
        const description = document.getElementById("artDescription").value.trim();

        if (!title || !imageUrl || !description) return;

        const artworks = loadArtworks();
        const newArt = {
            id: Date.now().toString(),
            title,
            artist: currentUser.username,
            owner: currentUser.username,
            imageUrl,
            description,
            votes: 0,
            comments: []
        };
        artworks.push(newArt);
        saveArtworks(artworks);

        uploadForm.reset();
        renderFeed();
        showView("home");
    });

    const loginForm = document.getElementById("loginForm");
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;
        login(email, password);
    });

    const signupForm = document.getElementById("signupForm");
    signupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = document.getElementById("signupUsername").value.trim();
        const email = document.getElementById("signupEmail").value.trim();
        const password = document.getElementById("signupPassword").value;
        signup(username, email, password);
    });
}

// ---------- Upvotes ----------

function upvoteArtwork(id) {
    const artworks = loadArtworks();
    const art = artworks.find(a => a.id === id);
    if (!art) return;
    art.votes += 1;
    saveArtworks(artworks);
    renderFeed();
    const currentView = document.querySelector("#view-detail.view.active");
    if (currentView) openDetail(id);
    renderProfile();
}

// ---------- Detail Page ----------

function openDetail(id) {
    const art = getArtworkById(id);
    if (!art) return;

    const container = document.getElementById("detailContainer");
    container.innerHTML = `
        <div class="detail-image">
            <img src="${art.imageUrl}" alt="${art.title}">
        </div>
        <div class="detail-meta">
            <h2>${art.title}</h2>
            <p class="artist">by ${art.artist}</p>
            <p>${art.description}</p>
            <p class="tags">#human-made #${art.title.replace(/\s+/g, '').toLowerCase()}</p>
            <button class="upvote-btn" id="detailUpvoteBtn">▲ Upvote</button>
            <span class="votes" id="detailVotes">${art.votes} votes</span>

            <div class="comments">
                <h3>Comments</h3>
                <div id="commentsList"></div>
                <form id="commentForm">
                    <label>
                        Add a comment
                        <textarea id="commentText" rows="3" required></textarea>
                    </label>
                    <button type="submit">Post Comment</button>
                </form>
            </div>
        </div>
    `;

    const commentsList = container.querySelector("#commentsList");
    commentsList.innerHTML = "";
    art.comments.forEach(c => {
        const div = document.createElement("div");
        div.className = "comment";
        div.innerHTML = `<strong>${c.author}</strong> ${c.text}`;
        commentsList.appendChild(div);
    });

    container.querySelector("#detailUpvoteBtn").addEventListener("click", () => {
        upvoteArtwork(art.id);
    });

    const commentForm = container.querySelector("#commentForm");
    commentForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert("You must be logged in to comment.");
            showView("login");
            return;
        }

        const text = container.querySelector("#commentText").value.trim();
        if (!text) return;

        const artworks = loadArtworks();
        const target = artworks.find(a => a.id === art.id);
        if (!target) return;
        target.comments.push({
            author: `@${currentUser.username}`,
            text
        });
        saveArtworks(artworks);
        openDetail(art.id);
    });

    showView("detail");
}

// ---------- Profile Page ----------

function renderProfile() {
    if (!currentUser) return;

    const grid = document.getElementById("profileGrid");
    const totalUpvotesEl = document.getElementById("profileTotalUpvotes");
    if (!grid || !totalUpvotesEl) return;

    grid.innerHTML = "";

    const artworks = loadArtworks().filter(a => a.owner === currentUser.username);
    let totalVotes = 0;

    artworks.forEach(art => {
        totalVotes += art.votes;
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <img src="${art.imageUrl}" alt="${art.title}">
            <h3>${art.title}</h3>
            <p class="artist">${art.votes} votes</p>
        `;
        card.addEventListener("click", () => openDetail(art.id));
        grid.appendChild(card);
    });

    totalUpvotesEl.textContent = totalVotes;
    
    // Update profile header
    const profileHeader = document.querySelector("#view-profile .profile-header");
    if (profileHeader) {
        profileHeader.querySelector(".avatar").textContent = currentUser.username.substring(0, 2).toUpperCase();
        profileHeader.querySelector("h3").textContent = `@${currentUser.username}`;
    }
}

// ---------- Init ----------

document.addEventListener("DOMContentLoaded", () => {
    fetchCurrentUser();
    setupNav();
    setupForms();
    renderFeed();
});