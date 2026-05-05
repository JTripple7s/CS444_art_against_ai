const express = require("express");
const router = express.Router();
const artworkController = require("../controllers/artworkController");
const { authMiddleware, optionalAuth } = require("../middleware/authMiddleware");

router.get("/", optionalAuth, artworkController.getArtworks);
router.get("/:id", optionalAuth, artworkController.getArtworkById);
router.post("/", authMiddleware, artworkController.uploadArtwork);
router.delete("/:id", authMiddleware, artworkController.deleteArtwork);
router.post("/:id/upvote", authMiddleware, artworkController.upvoteArtwork);
router.delete("/:id/upvote", authMiddleware, artworkController.removeUpvoteArtwork);

// Comment routes
router.get("/:id/comments", optionalAuth, artworkController.getComments);
router.post("/:id/comments", authMiddleware, artworkController.addComment);

module.exports = router;
