const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/following", authMiddleware, userController.getFollowing);
router.post("/:id/follow", authMiddleware, userController.followUser);
router.post("/:id/unfollow", authMiddleware, userController.unfollowUser);

module.exports = router;
