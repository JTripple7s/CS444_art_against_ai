# Presentation Preparation Guide: Art Against AI

## 1. Project Overview & Origin Story (Slide 1-2)
*   **Problem:** Artists are feeling overshadowed by AI-generated content on mainstream platforms. There is a lack of "human-only" spaces that feel modern and premium.
*   **Solution:** "Art Against AI" is a Pinterest-style clone that exclusively hosts human-made art. It provides a community feel through persistent follows, upvotes, and real-time feedback.
*   **Target Audience:** Traditional and digital artists, art collectors, and creative enthusiasts.

## 2. Technology Stack (Slide 3)
*   **Frontend:** Vanilla HTML5, CSS3 (Custom Masonry Grid), JavaScript (ES6+).
*   **Backend:** Node.js, Express.js.
*   **Database:** SQLite (Relational SQL engine).
*   **Major Libraries:**
    *   `Multer`: Middleware for handling multipart/form-data (image uploads).
    *   `Bcryptjs`: Industry-standard password hashing.
    *   `JSON Web Token (JWT)`: Stateless authentication and secure data transmission.
    *   `Cors`: Cross-Origin Resource Sharing for API security.

## 3. Architecture Deep Dive (Slide 4)
*   **Design Pattern:** 3-Tier Architecture (Presentation -> Application -> Data).
*   **Justification:** Separation of concerns. The frontend manages the UI state, the backend manages business logic and security, and the data layer ensures persistence.
*   **Flow:** 
    1.  `Browser/Client` (Presentation)
    2.  `Express API` (Application/Logic)
    3.  `SQLite DB & File System` (Data)

## 4. Key Technical Concepts (For Slides & Q&A)

### Image Uploads (Multer)
*   **Concept:** Express cannot natively read binary image data. 
*   **Function:** Multer intercepts the upload request, validates the file type (JPEG/PNG/WebP), renames it with a unique timestamp to prevent overwriting, and saves it to the `uploads/` folder.
*   **Metadata:** The *file path* is saved in SQL, while the *actual file* stays on the disk for speed.

### Authentication (JWT)
*   **Concept:** Stateless security.
*   **Function:** Upon login, the server issues a cryptographically signed "token."
*   **Storage:** The token is stored in the browser's `localStorage`.
*   **Verification:** For every social action (Like/Follow), the token is sent in the header. The server verifies the signature to identify the user without needing a session database.

### UI Stability (Event Delegation & Surgical Updates)
*   **Challenge:** Standard page refreshes feel clunky and reset user scroll position.
*   **Solution:** 
    1.  **Event Delegation:** One master click listener on the `document` catches all button presses. This is more efficient and survives DOM updates.
    2.  **Surgical DOM Updates:** Instead of re-rendering the page, the code targets specific element IDs (e.g., `vote-count-123`) to update only the changed data.

## 5. Data Flow Example: The Upvote Toggle (Slide 5)
1.  **UI:** User clicks the ▲ button.
2.  **JS:** Master Delegator stops the default browser action and checks if the post is already liked.
3.  **Request:** 
    *   If liked: Sends `DELETE /api/artworks/:id/upvote`
    *   If not liked: Sends `POST /api/artworks/:id/upvote`
4.  **Backend:** Validates JWT, updates the `artwork_votes` join-table, and increments/decrements the global count.
5.  **Response:** Server returns the updated artwork JSON.
6.  **Surgical Update:** JS finds the specific button and updates the icon and number instantly.

## 6. Security Features (Slide 6)
*   **Password Protection:** Passwords are never stored as text. `Bcrypt` is used to create a 60-character salted hash.
*   **SQL Injection:** We use **Parameterized Queries** (`?` placeholders). This prevents attackers from injecting malicious SQL code through input fields.
*   **Authorization:** Middleware ensures that only the *owner* of a post can see the "Delete" button or call the delete API.

## 7. Presentation Checklist
*   ✅ **Live URL:** Ensure the app is deployed (Render/Railway).
*   ✅ **Localhost check:** Do not present from localhost.
*   ✅ **Mobile Check:** Resize the browser during the demo to show the responsive CSS columns.
*   ✅ **Database Check:** Run `node view-db.js` before the presentation to ensure you have a few test accounts and posts ready.
