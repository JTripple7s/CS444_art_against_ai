// Mock "current user"
const CURRENT_USER = {
    username: "@DesignStudent",
    displayName: "Design Student"
};

// LocalStorage keys
const LS_KEY_ARTWORKS = "artAgainstAI_artworks";

// ---------- Data Helpers ----------

function loadArtworks() {
    const raw = localStorage.getItem(LS_KEY_ARTWORKS);
    if (!raw) {
        const seed = [
            {
                id: "1",
                title: "Sunset Dreams",
                artist: "Alex Rivera",
                owner: CURRENT_USER.username,
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
                owner: CURRENT_USER.username,
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
    document.getElementById("view-" + viewId).classList.add("active");
}

function setupNav() {
    document.querySelectorAll(".nav-links a, .back-btn").forEach(link => {
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
}

// ---------- Feed Rendering ----------

function renderFeed() {
    const grid = document.getElementById("feedGrid");
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
            // Avoid triggering detail when clicking upvote
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

function setupUploadForm() {
    const form = document.getElementById("uploadForm");
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = document.getElementById("artTitle").value.trim();
        const imageUrl = document.getElementById("artImageUrl").value.trim();
        const description = document.getElementById("artDescription").value.trim();

        if (!title || !imageUrl || !description) return;

        const artworks = loadArtworks();
        const newArt = {
            id: Date.now().toString(),
            title,
            artist: CURRENT_USER.displayName,
            owner: CURRENT_USER.username,
            imageUrl,
            description,
            votes: 0,
            comments: []
        };
        artworks.push(newArt);
        saveArtworks(artworks);

        form.reset();
        renderFeed();
        showView("home");
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
    if (currentView) openDetail(id); // refresh detail if open
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

    // Render comments
    const commentsList = container.querySelector("#commentsList");
    commentsList.innerHTML = "";
    art.comments.forEach(c => {
        const div = document.createElement("div");
        div.className = "comment";
        div.innerHTML = `<strong>${c.author}</strong> ${c.text}`;
        commentsList.appendChild(div);
    });

    // Upvote button
    container.querySelector("#detailUpvoteBtn").addEventListener("click", () => {
        upvoteArtwork(art.id);
    });

    // Comment form
    const commentForm = container.querySelector("#commentForm");
    commentForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = container.querySelector("#commentText").value.trim();
        if (!text) return;

        const artworks = loadArtworks();
        const target = artworks.find(a => a.id === art.id);
        if (!target) return;
        target.comments.push({
            author: CURRENT_USER.username,
            text
        });
        saveArtworks(artworks);
        openDetail(art.id); // re-render
    });

    showView("detail");
}

// ---------- Profile Page ----------

function renderProfile() {
    const grid = document.getElementById("profileGrid");
    const totalUpvotesEl = document.getElementById("profileTotalUpvotes");
    grid.innerHTML = "";

    const artworks = loadArtworks().filter(a => a.owner === CURRENT_USER.username);
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
    document.getElementById("currentUserName").textContent = CURRENT_USER.username;
    setupNav();
    setupUploadForm();
    renderFeed();
    renderProfile();
});