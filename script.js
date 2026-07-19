// API Configuration
const IS_LOCAL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const BASE_URL = IS_LOCAL ? "http://localhost:5000" : "";
const API_URL = `${BASE_URL}/api`;

// Auth State
let currentUser = null;
let followingList = []; 

// LocalStorage keys
const LS_KEY_TOKEN = "artAgainstAI_token";
const LS_KEY_VIEW = "artAgainstAI_currentView";
const LS_KEY_DETAIL_ID = "artAgainstAI_currentDetailId";

let feedPage = 1;
const FEED_PAGE_SIZE = 12;
let isLoadingMore = false;
let currentDetailId = null;

// ---------- Auth Helpers ----------

async function fetchCurrentUser() {
    try {
        const token = localStorage.getItem(LS_KEY_TOKEN);
        if (!token) { updateAuthUI(null); return; }

        const response = await fetch(`${API_URL}/auth/me?t=${Date.now()}`, {
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
        console.error("fetchCurrentUser error:", error);
        updateAuthUI(null);
    }
}

async function fetchFollowingList() {
    try {
        const token = localStorage.getItem(LS_KEY_TOKEN);
        if (!token) { followingList = []; return; }

        const response = await fetch(`${API_URL}/users/following?t=${Date.now()}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            const ids = await response.json();
            followingList = ids.map(id => parseInt(id));
        }
    } catch (error) {
        console.error("fetchFollowingList error:", error);
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
    }
}

function logout() {
    localStorage.removeItem(LS_KEY_TOKEN);
    localStorage.removeItem(LS_KEY_VIEW);
    localStorage.removeItem(LS_KEY_DETAIL_ID);
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
    const targetView = document.getElementById("view-" + viewId);
    if (!targetView) return;

    localStorage.setItem(LS_KEY_VIEW, viewId);

    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    targetView.classList.add("active");
    
    // Highlight active navigation tab
    document.querySelectorAll(".nav-links li").forEach(li => {
        const link = li.querySelector("a");
        if (link && link.getAttribute("data-view") === viewId) {
            li.classList.add("active");
        } else {
            li.classList.remove("active");
        }
    });
    
    window.scrollTo(0, 0);
}

// ---------- Core Rendering ----------

async function renderFeed(reset = false) {
    try {
        const grid = document.getElementById("feedGrid");
        if (!grid) return;

        if (reset) {
            grid.innerHTML = "";
            feedPage = 1;
        }

        const artworks = await loadArtworks();
        const pageItems = reset ? artworks : artworks.slice((feedPage - 1) * FEED_PAGE_SIZE, feedPage * FEED_PAGE_SIZE);

        pageItems.forEach(art => {
            if (grid.querySelector(`.card[data-id="${art.id}"]`)) return;

            const card = document.createElement("div");
            card.className = "card";
            card.dataset.id = art.id;

            const fullImageUrl = art.image_url.startsWith("/") ? `${BASE_URL}${art.image_url}` : art.image_url;

            card.innerHTML = `
                <img src="${fullImageUrl}" alt="${art.title}">
                <div class="overlay-actions">
                    <div class="top-actions">
                        ${(currentUser && parseInt(currentUser.id) === parseInt(art.user_id)) ? 
                            `<button type="button" class="action-delete" data-id="${art.id}">🗑</button>` : 
                            `<button type="button" class="mini-follow-btn action-follow" data-artist-id="${art.user_id}">Follow</button>`
                        }
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
            observer.observe(card);
        });

        if (!reset) feedPage++;
        isLoadingMore = false;
    } catch (e) {
        console.error("renderFeed error:", e);
    }
}

async function renderProfile() {
    try {
        if (!currentUser) return;

        const grid = document.getElementById("profileGrid");
        if (!grid) return;

        await updateProfileStatsUI();

        const artworks = await loadArtworks();
        const myArtworks = artworks.filter(a => parseInt(a.user_id) === parseInt(currentUser.id));
        
        grid.innerHTML = "";
        let totalVotes = 0;

        myArtworks.forEach(art => {
            totalVotes += (art.votes || 0);
            const card = document.createElement("div");
            card.className = "card card-profile";
            card.dataset.id = art.id;
            const fullImageUrl = art.image_url.startsWith("/") ? `${BASE_URL}${art.image_url}` : art.image_url;
            card.innerHTML = `
                <img src="${fullImageUrl}" alt="${art.title}">
                <div class="overlay-actions">
                    <div class="top-actions">
                        <button type="button" class="action-delete" data-id="${art.id}">🗑</button>
                    </div>
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

        const totalUpvotesEl = document.getElementById("profileTotalUpvotes");
        if (totalUpvotesEl) totalUpvotesEl.textContent = totalVotes;
    } catch (e) {
        console.error("renderProfile error:", e);
    }
}

async function openDetail(id) {
    if (!id) return;
    try {
        const token = localStorage.getItem(LS_KEY_TOKEN);
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`${API_URL}/artworks/${id}?t=${Date.now()}`, { headers });
        if (!response.ok) throw new Error("Artwork not found");
        const art = await response.json();

        currentDetailId = parseInt(id);
        localStorage.setItem(LS_KEY_DETAIL_ID, id);

        const container = document.getElementById("detailContainer");
        const fullImageUrl = art.image_url.startsWith("/") ? `${BASE_URL}${art.image_url}` : art.image_url;
        const artistPic = art.artist_pic ? `${BASE_URL}${art.artist_pic}` : null;

        container.innerHTML = `
            <div class="detail-image">
                <img src="${fullImageUrl}" alt="${art.title}">
            </div>
            <div class="detail-meta">
                <h2>${art.title}</h2>
                <div class="artist-row">
                    ${artistPic ? `<img src="${artistPic}" class="artist-pic-small">` : `<div class="avatar-small">${art.artist.substring(0, 2).toUpperCase()}</div>`}
                    <p class="artist">by ${art.artist}</p>
                    <button type="button" class="follow-btn action-follow" data-artist-id="${art.user_id}">Follow</button>
                    ${(currentUser && parseInt(currentUser.id) === parseInt(art.user_id)) ? 
                        `<button type="button" class="delete-btn-detail action-delete" data-id="${art.id}">Delete Post</button>` : ''
                    }
                </div>
                <p class="artist-bio-small">${art.artist_bio || ""}</p>
                <p>${art.description || "No description provided."}</p>
                <div class="detail-upvote-row-visible">
                    <button type="button" class="upvote-btn action-upvote" id="detailUpvoteBtn" data-id="${art.id}">▲ Upvote</button>
                    <span class="votes" id="detailVotes">${art.votes || 0} votes</span>
                </div>
                <div class="comments">
                    <h3>Comments</h3>
                    <div id="commentsList"></div>
                    <form id="commentForm">
                        <textarea id="commentText" placeholder="Add a comment..." required></textarea>
                        <button type="submit">Post</button>
                    </form>
                </div>
            </div>
        `;

        updateDetailUI(art);
        await loadComments(id);
        showView("detail");
    } catch (error) {
        console.error("openDetail error:", error);
    }
}

// ---------- Surgical UI Helpers ----------

function updateCardUI(card, art) {
    if (!card || !art) return;
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
        if (!currentUser || parseInt(currentUser.id) === parseInt(art.user_id)) {
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
    if (!art) return;
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
        if (!currentUser || parseInt(currentUser.id) === parseInt(art.user_id)) {
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
    try {
        if (!currentUser) return;
        const usernameEl = document.getElementById("profileUsername");
        const followersEl = document.getElementById("profileFollowersCount");
        const followingEl = document.getElementById("profileFollowingCount");
        const bioEl = document.getElementById("profileBio");
        const avatarEl = document.getElementById("profileAvatar");

        if (usernameEl) usernameEl.textContent = `@${currentUser.username}`;
        if (followersEl) followersEl.textContent = currentUser.followers_count || 0;
        if (followingEl) followingEl.textContent = currentUser.following_count || 0;
        if (bioEl) bioEl.textContent = currentUser.bio || "No bio yet.";

        if (avatarEl) {
            if (currentUser.profile_pic_url) {
                avatarEl.innerHTML = `<img src="${BASE_URL}${currentUser.profile_pic_url}?t=${Date.now()}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                avatarEl.textContent = currentUser.username.substring(0, 2).toUpperCase();
            }
        }
    } catch (e) {}
}

async function updateSurgical(artworkId) {
    try {
        const token = localStorage.getItem(LS_KEY_TOKEN);
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`${API_URL}/artworks/${artworkId}?t=${Date.now()}`, { headers });
        if (response.ok) {
            const art = await response.json();
            const cards = document.querySelectorAll(`.card[data-id="${artworkId}"]`);
            cards.forEach(card => updateCardUI(card, art));
            if (getActiveView() === "detail" && parseInt(currentDetailId) === parseInt(artworkId)) {
                updateDetailUI(art);
            }
        }
    } catch (e) {}
}

// ---------- Social Actions ----------

async function deleteArtwork(id) {
    if (!confirm("Are you sure you want to delete this artwork? This cannot be undone.")) return;
    const token = localStorage.getItem(LS_KEY_TOKEN);
    try {
        const response = await fetch(`${API_URL}/artworks/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            if (getActiveView() === "detail" && parseInt(currentDetailId) === parseInt(id)) {
                localStorage.removeItem(LS_KEY_DETAIL_ID);
                showView("home");
                await renderFeed(true);
            } else {
                document.querySelectorAll(`.card[data-id="${id}"]`).forEach(c => c.remove());
                if (getActiveView() === "profile") await renderProfile();
            }
        }
    } catch (e) { console.error("Delete error:", e); }
}

async function postComment(artworkId, text) {
    const token = localStorage.getItem(LS_KEY_TOKEN);
    if (!token) { alert("Please log in to comment."); showView("login"); return; }
    try {
        const response = await fetch(`${API_URL}/artworks/${artworkId}/comments`, {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text })
        });
        if (response.ok) {
            const data = await response.json();
            renderSingleComment(data.comment);
            const input = document.getElementById("commentText");
            if (input) input.value = "";
        }
    } catch (e) { console.error("Comment error:", e); }
}

async function loadComments(artworkId) {
    const list = document.getElementById("commentsList");
    if (!list) return;
    list.innerHTML = "<p class='muted'>Loading comments...</p>";
    try {
        const response = await fetch(`${API_URL}/artworks/${artworkId}/comments?t=${Date.now()}`);
        if (response.ok) {
            const comments = await response.json();
            list.innerHTML = comments.length === 0 ? "<p class='muted'>No comments yet.</p>" : "";
            comments.forEach(c => renderSingleComment(c));
        }
    } catch (e) { console.error("Load comments error:", e); }
}

function renderSingleComment(c) {
    const list = document.getElementById("commentsList");
    if (!list) return;
    const placeholder = list.querySelector(".muted");
    if (placeholder) placeholder.remove();
    const div = document.createElement("div");
    div.className = "comment-item";
    const authorPic = c.author_pic ? `${BASE_URL}${c.author_pic}` : null;
    div.innerHTML = `
        <div class="comment-author-pic">
            ${authorPic ? `<img src="${authorPic}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : c.author.substring(0,2).toUpperCase()}
        </div>
        <div class="comment-content">
            <span class="comment-author-name">@${c.author}</span>
            <p class="comment-text">${c.text}</p>
            <span class="comment-date">${new Date(c.created_at).toLocaleDateString()}</span>
        </div>
    `;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
}

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
            if (getActiveView() === "profile") await renderProfile();
        }
    } catch (e) {}
}

async function handleFollowAction(targetUserId) {
    const token = localStorage.getItem(LS_KEY_TOKEN);
    if (!token) { alert("Please log in to follow."); showView("login"); return; }
    const path = isFollowing(targetUserId) ? "unfollow" : "follow";
    try {
        const response = await fetch(`${API_URL}/users/${targetUserId}/${path}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            await fetchFollowingList();
            await fetchCurrentUser();
            document.querySelectorAll(`[data-artist-id="${targetUserId}"]`).forEach(btn => {
                const card = btn.closest(".card");
                if (card) updateSurgical(card.dataset.id);
                else if (getActiveView() === "detail" && currentDetailId) updateSurgical(currentDetailId);
            });
            if (getActiveView() === "profile") await updateProfileStatsUI();
        }
    } catch (e) {}
}

function isFollowing(targetUserId) {
    return followingList.includes(parseInt(targetUserId));
}

// ---------- Data Loading ----------

async function loadArtworks() {
    try {
        const token = localStorage.getItem(LS_KEY_TOKEN);
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        // Add cache buster to ensure we get the latest data from the DB
        const response = await fetch(`${API_URL}/artworks?t=${Date.now()}`, { headers });
        return response.ok ? await response.json() : [];
    } catch (e) { return []; }
}

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add("visible"); }
    });
}, { threshold: 0.1 });

// ---------- Main Event Delegator ----------

document.addEventListener("DOMContentLoaded", async () => {
    await fetchCurrentUser();
    setupForms();

    const savedView = localStorage.getItem(LS_KEY_VIEW) || "home";
    const savedDetailId = localStorage.getItem(LS_KEY_DETAIL_ID);
    
    if (savedView === "home") await renderFeed(true);
    if (savedView === "profile") await renderProfile();
    if (savedView === "detail" && savedDetailId) await openDetail(savedDetailId);
    
    showView(savedView);

    // CLICK DELEGATION
    document.addEventListener("click", async (e) => {
        const target = e.target;

        // 1. Social: Upvote
        const upvoteBtn = target.closest(".action-upvote");
        if (upvoteBtn) {
            e.preventDefault();
            e.stopPropagation();
            const id = upvoteBtn.getAttribute("data-id");
            const isUpvoted = upvoteBtn.classList.contains("upvoted") || upvoteBtn.classList.contains("upvoted-active");
            
            // Add pop animation effect
            upvoteBtn.classList.add("upvoted-pop");
            setTimeout(() => upvoteBtn.classList.remove("upvoted-pop"), 350);

            await upvoteArtwork(id, isUpvoted);
            return;
        }

        // 2. Social: Follow
        const followBtn = target.closest(".action-follow");
        if (followBtn) {
            e.preventDefault();
            e.stopPropagation();
            const artistId = followBtn.getAttribute("data-artist-id");
            await handleFollowAction(artistId);
            return;
        }

        // 3. Social: Delete
        const deleteBtn = target.closest(".action-delete");
        if (deleteBtn) {
            e.preventDefault();
            e.stopPropagation();
            const id = deleteBtn.getAttribute("data-id");
            await deleteArtwork(id);
            return;
        }

        // 4. Navigation: View Links
        const viewLink = target.closest("[data-view]");
        if (viewLink) {
            if (target.closest(".action-upvote") || target.closest(".action-follow")) return;
            
            e.preventDefault();
            e.stopPropagation();
            const view = viewLink.getAttribute("data-view");
            if (view === "edit-profile" && currentUser) {
                const bioArea = document.getElementById("editProfileBio");
                if (bioArea) bioArea.value = currentUser.bio || "";
            }
            if (view === "home") await renderFeed(true);
            if (view === "profile") await renderProfile();
            showView(view);
            return;
        }

        // 5. Navigation: Card Detail
        const card = target.closest(".card");
        if (card && !target.closest("button")) {
            e.preventDefault();
            e.stopPropagation();
            await openDetail(card.dataset.id);
            return;
        }

        // 6. Action: Logout
        if (target.id === "logoutBtn" || target.closest("#logoutBtn")) {
            e.preventDefault();
            logout();
        }

        // 7. Action: Guest Login
        if (target.id === "guestLoginBtn") {
            e.preventDefault();
            const guestUser = { id: 0, username: "Guest", email: "guest@dev.local", created_at: new Date().toISOString() };
            localStorage.removeItem(LS_KEY_TOKEN);
            updateAuthUI(guestUser);
            showView("home");
            await renderFeed(true);
        }
    });

    // SUBMIT DELEGATION
    document.addEventListener("submit", async (e) => {
        const target = e.target;

        // Comment Posting
        if (target.id === "commentForm") {
            e.preventDefault();
            const text = document.getElementById("commentText").value.trim();
            if (text && currentDetailId) {
                await postComment(currentDetailId, text);
            }
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
        if (scrollPos >= document.body.offsetHeight - 400) {
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
                const preview = document.getElementById("uploadPreview");
                if (preview) preview.style.display = "none";
                showView("home");
                await renderFeed(true);
            }
        });
    }

    const editProfileForm = document.getElementById("editProfileForm");
    if (editProfileForm) {
        editProfileForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const bio = document.getElementById("editProfileBio").value;
            const fileInput = document.getElementById("editProfilePicFile");
            const file = fileInput.files[0];
            const token = localStorage.getItem(LS_KEY_TOKEN);

            const formData = new FormData();
            formData.append("bio", bio);
            if (file) formData.append("profilePic", file);

            showLoading();
            const response = await fetch(`${API_URL}/users/profile`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });
            hideLoading();

            if (response.ok) {
                const data = await response.json();
                updateAuthUI(data.user);
                
                // Cleanup form
                editProfileForm.reset();
                const preview = document.getElementById("editProfilePicPreview");
                if (preview) preview.style.display = "none";

                showView("profile");
                await renderProfile();
            } else {
                alert("Failed to update profile.");
            }
        });

        const picInput = document.getElementById("editProfilePicFile");
        const picPreview = document.getElementById("editProfilePicPreview");
        if (picInput && picPreview) {
            picInput.addEventListener("change", () => {
                const file = picInput.files[0];
                if (file) {
                    picPreview.src = URL.createObjectURL(file);
                    picPreview.style.display = "block";
                }
            });
        }
    }

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => { e.preventDefault(); login(document.getElementById("loginEmail").value, document.getElementById("loginPassword").value); });
    }
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
        signupForm.addEventListener("submit", (e) => { e.preventDefault(); signup(document.getElementById("signupUsername").value, document.getElementById("signupEmail").value, document.getElementById("signupPassword").value); });
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
