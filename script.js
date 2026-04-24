// API Configuration
const API_URL = "http://localhost:5000/api";

// Auth State
let currentUser = null;

// LocalStorage keys
const LS_KEY_TOKEN = "artAgainstAI_token";
const LS_KEY_ARTWORKS = "artAgainstAI_artworks";
const LS_KEY_UPVOTED = "artAgainstAI_upvoted";
const LS_KEY_FOLLOWERS = "artAgainstAI_followers";

let feedPage = 1;
const FEED_PAGE_SIZE = 10;
let isLoadingMore = false;

// Track current detail id for refreshing detail view after follow/unfollow
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
            showView("home");
            renderFeed(true);
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
            renderFeed(true);
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
    renderFeed(true);
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
                if (view === "home") renderFeed(true);
                if (view === "profile") renderProfile();
            }
        });
    });

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            logout();
        });
    }
}

// ---------- Feed Rendering ----------

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
        }
    });
}, { threshold: 0.2 });

function renderFeed(reset = false) {
    const grid = document.getElementById("feedGrid");
    if (!grid) return;

    if (reset) {
        grid.innerHTML = "";
        feedPage = 1;
    }

    const artworks = loadArtworks()
        .sort((a, b) => b.votes - a.votes);

    const start = (feedPage - 1) * FEED_PAGE_SIZE;
    const end = start + FEED_PAGE_SIZE;
    const pageItems = artworks.slice(start, end);

    pageItems.forEach(art => {
        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
            <img src="${art.imageUrl}" alt="${art.title}">
            <h3>${art.title}</h3>
            <div class="card-meta-row">
                <p class="artist">by ${art.artist}</p>
                <button class="mini-follow-btn">Follow</button>
            </div>
            <div class="detail-upvote-row">
                <button class="upvote-btn">▲ Upvote</button>
                <span class="votes">${art.votes} votes</span>
            </div>
        `;

        // Clicking card opens detail — unless clicking upvote or follow
        card.addEventListener("click", (e) => {
            if (e.target.classList.contains("upvote-btn") || e.target.classList.contains("mini-follow-btn")) return;
            openDetail(art.id);
        });

        // Upvote wiring
        const upvoteBtn = card.querySelector(".upvote-btn");
        if (upvoteBtn) {
            const upvoted = loadUpvoted();
            if (upvoted.includes(art.id)) {
                upvoteBtn.classList.add("disabled");
                upvoteBtn.textContent = "Upvoted";
                upvoteBtn.disabled = true;
            } else {
                upvoteBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    upvoteArtwork(art.id);

                    upvoteBtn.classList.add("clicked");
                    setTimeout(() => upvoteBtn.classList.remove("clicked"), 300);
                });
            }
        }

        // Mini follow button wiring
        const miniFollowBtn = card.querySelector(".mini-follow-btn");
        if (miniFollowBtn) {
            if (!currentUser || currentUser.username === art.owner) {
                miniFollowBtn.classList.add("disabled");
                miniFollowBtn.textContent = "You";
                miniFollowBtn.disabled = true;
            } else {
                if (isFollowing(art.owner)) {
                    miniFollowBtn.classList.add("following");
                    miniFollowBtn.textContent = "Following";
                } else {
                    miniFollowBtn.textContent = "Follow";
                }

                miniFollowBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (isFollowing(art.owner)) {
                        unfollowUser(art.owner);
                        miniFollowBtn.classList.remove("following");
                        miniFollowBtn.textContent = "Follow";
                    } else {
                        followUser(art.owner);
                        miniFollowBtn.classList.add("following");
                        miniFollowBtn.textContent = "Following";
                    }
                });
            }
        }

        grid.appendChild(card);

        // Observe only this new card
        observer.observe(card);
    });

    feedPage++;
    isLoadingMore = false;
}

// ---------- Upload Handling ----------

function setupForms() {
    const uploadForm = document.getElementById("uploadForm");
    const preview = document.getElementById("uploadPreview");

    if (uploadForm) {
        uploadForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!currentUser) {
                alert("You must be logged in to upload.");
                showView("login");
                return;
            }

            const title = document.getElementById("artTitle").value.trim();
            const description = document.getElementById("artDescription").value.trim();
            const fileInput = document.getElementById("artImageFile");
            const file = fileInput.files[0];

            if (!title || !description || !file) return;

            const imageUrl = URL.createObjectURL(file);

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
            if (preview) preview.style.display = "none";

            renderFeed(true);
            showView("home");
        });
    }

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPassword").value;
            login(email, password);
        });
    }

    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
        signupForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const username = document.getElementById("signupUsername").value.trim();
            const email = document.getElementById("signupEmail").value.trim();
            const password = document.getElementById("signupPassword").value;
            signup(username, email, password);
        });
    }

    const guestLoginBtn = document.getElementById("guestLoginBtn");
    if (guestLoginBtn) {
        guestLoginBtn.addEventListener("click", () => {
            const guestUser = {
                id: 0,
                username: "Guest",
                email: "guest@dev.local",
                created_at: new Date().toISOString()
            };
            // We don't need a real token for guest mode
            localStorage.removeItem(LS_KEY_TOKEN);
            updateAuthUI(guestUser);
            showView("home");
            renderFeed(true);
        });
    }
}

// ---------- Upvotes ----------

function loadUpvoted() {
    return JSON.parse(localStorage.getItem(LS_KEY_UPVOTED) || "[]");
}

function saveUpvoted(list) {
    localStorage.setItem(LS_KEY_UPVOTED, JSON.stringify(list));
}

function upvoteArtwork(id) {
    const upvoted = loadUpvoted();

    if (upvoted.includes(id)) {
        return; // already upvoted, do nothing
    }

    upvoted.push(id);
    saveUpvoted(upvoted);

    const artworks = loadArtworks();
    const art = artworks.find(a => a.id === id);
    if (!art) return;

    art.votes += 1;
    saveArtworks(artworks);

    // Refresh UI properly
    renderFeed(true);

    const currentView = document.querySelector("#view-detail.view.active");
    if (currentView) openDetail(id);

    renderProfile();
}

// ---------- Followers (helpers + actions) ----------

function loadFollowersMap() {
    return JSON.parse(localStorage.getItem(LS_KEY_FOLLOWERS) || "{}");
}

function saveFollowersMap(map) {
    localStorage.setItem(LS_KEY_FOLLOWERS, JSON.stringify(map));
}

function getFollowersFor(username) {
    const map = loadFollowersMap();
    return map[username] ? Array.from(new Set(map[username])) : [];
}

function setFollowersFor(username, followersArray) {
    const map = loadFollowersMap();
    map[username] = Array.from(new Set(followersArray));
    saveFollowersMap(map);
}

function getFollowingFor(username) {
    const map = loadFollowersMap();
    return Object.keys(map).filter(user => (map[user] || []).includes(username));
}

function isFollowing(targetUsername) {
    if (!currentUser) return false;
    const followers = getFollowersFor(targetUsername);
    return followers.includes(currentUser.username);
}

function followUser(targetUsername) {
    if (!currentUser) {
        alert("You must be logged in to follow users.");
        showView("login");
        return;
    }
    if (currentUser.username === targetUsername) return;

    const followers = getFollowersFor(targetUsername);
    if (!followers.includes(currentUser.username)) {
        followers.push(currentUser.username);
        setFollowersFor(targetUsername, followers);
    }

    // Refresh UI
    renderFeed(true);
    renderProfile();
    if (currentDetailId) openDetail(currentDetailId);
}

function unfollowUser(targetUsername) {
    if (!currentUser) {
        alert("You must be logged in to unfollow users.");
        showView("login");
        return;
    }
    if (currentUser.username === targetUsername) return;

    let followers = getFollowersFor(targetUsername);
    followers = followers.filter(u => u !== currentUser.username);
    setFollowersFor(targetUsername, followers);

    renderFeed(true);
    renderProfile();
    if (currentDetailId) openDetail(currentDetailId);
}

// ---------- Detail Page ----------

function openDetail(id) {
    const art = getArtworkById(id);
    if (!art) return;

    // set current detail id so follow/unfollow can refresh this view
    currentDetailId = id;

    const container = document.getElementById("detailContainer");
    container.innerHTML = `
        <div class="detail-image">
            <img src="${art.imageUrl}" alt="${art.title}">
        </div>
        <div class="detail-meta">
            <h2>${art.title}</h2>
            <div class="artist-row">
                <p class="artist">by ${art.artist}</p>
                <button class="follow-btn" id="detailFollowBtn">Follow</button>
            </div>
            <p>${art.description}</p>
            <p class="tags">#human-made #${art.title.replace(/\s+/g, '').toLowerCase()}</p>
            <div class="detail-upvote-row">
                <button class="upvote-btn" id="detailUpvoteBtn">▲ Upvote</button>
                <span class="votes" id="detailVotes">${art.votes} votes</span>
            </div>

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

    // Comments
    const commentsList = container.querySelector("#commentsList");
    commentsList.innerHTML = "";
    art.comments.forEach(c => {
        const div = document.createElement("div");
        div.className = "comment";
        div.innerHTML = `<strong>${c.author}</strong> ${c.text}`;
        commentsList.appendChild(div);
    });

    // Detail upvote button
    const detailUpvoteBtn = container.querySelector("#detailUpvoteBtn");
    const upvoted = loadUpvoted();

    if (detailUpvoteBtn) {
        if (upvoted.includes(art.id)) {
            detailUpvoteBtn.classList.add("disabled");
            detailUpvoteBtn.textContent = "Upvoted";
            detailUpvoteBtn.disabled = true;
        } else {
            detailUpvoteBtn.addEventListener("click", () => {
                upvoteArtwork(art.id);
            });
        }
    }

    // Detail follow button wiring
    const detailFollowBtn = container.querySelector("#detailFollowBtn");
    if (detailFollowBtn) {
        if (!currentUser || currentUser.username === art.owner) {
            detailFollowBtn.classList.add("disabled");
            detailFollowBtn.textContent = "You";
            detailFollowBtn.disabled = true;
        } else {
            if (isFollowing(art.owner)) {
                detailFollowBtn.classList.add("following");
                detailFollowBtn.textContent = "Following";
            } else {
                detailFollowBtn.classList.remove("following");
                detailFollowBtn.textContent = "Follow";
            }

            detailFollowBtn.addEventListener("click", () => {
                if (isFollowing(art.owner)) {
                    unfollowUser(art.owner);
                    detailFollowBtn.classList.remove("following");
                    detailFollowBtn.textContent = "Follow";
                } else {
                    followUser(art.owner);
                    detailFollowBtn.classList.add("following");
                    detailFollowBtn.textContent = "Following";
                }
            });
        }
    }

    // Comment form
    const commentForm = container.querySelector("#commentForm");
    if (commentForm) {
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
    }

    showView("detail");
}

// ---------- Profile Page ----------

function renderProfile() {
    if (!currentUser) return;

    const grid = document.getElementById("profileGrid");
    const totalUpvotesEl = document.getElementById("profileTotalUpvotes");
    if (!grid || !totalUpvotesEl) return;

    grid.innerHTML = "";

    // Update profile header
    const profileHeader = document.querySelector("#view-profile .profile-header");
    if (profileHeader) {
        profileHeader.querySelector(".avatar").textContent = currentUser.username.substring(0, 2).toUpperCase();
        profileHeader.querySelector("h3").textContent = `@${currentUser.username}`;
        // Followers block
        const followers = getFollowersFor(currentUser.username);
        let followersContainer = profileHeader.querySelector(".followers-container");
        if (!followersContainer) {
            followersContainer = document.createElement("div");
            followersContainer.className = "followers-container";
            profileHeader.appendChild(followersContainer);
        }
        followersContainer.innerHTML = `
            <p class="followers-count"><strong>Followers:</strong> ${followers.length}</p>
            <div class="followers-list">
                ${followers.length ? followers.map(u => `<div class="follower-item">@${u}</div>`).join("") : `<p class="muted">No followers yet</p>`}
            </div>
            <p class="following-count"><strong>Following:</strong> ${getFollowingFor(currentUser.username).length}</p>
        `;
    }

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
}

// ---------- Init ----------

document.addEventListener("DOMContentLoaded", () => {
    fetchCurrentUser();
    setupNav();
    setupForms();
    renderFeed(true);

    const darkToggle = document.getElementById("darkModeToggle");
    if (darkToggle) {
        darkToggle.addEventListener("click", () => {
            document.body.classList.toggle("dark");
            localStorage.setItem("darkMode", document.body.classList.contains("dark"));
        });
    }

    if (localStorage.getItem("darkMode") === "true") {
        document.body.classList.add("dark");
    }
    window.addEventListener("scroll", () => {
        if (isLoadingMore) return;

        const scrollPos = window.innerHeight + window.scrollY;
        const bottom = document.body.offsetHeight - 300;

        if (scrollPos >= bottom) {
            isLoadingMore = true;
            renderFeed();
        }
    });
});

function showLoading() {
    const el = document.getElementById("loadingOverlay");
    if (el) el.style.display = "flex";
}
function hideLoading() {
    const el = document.getElementById("loadingOverlay");
    if (el) el.style.display = "none";
}
