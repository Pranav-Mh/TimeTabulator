const express = require("express");
const router = express.Router();
const resourcesController = require("../controllers/resourcesController");

router.get("/", resourcesController.listResources);
router.post("/", resourcesController.addResource);
router.put("/:id", resourcesController.updateResource);
router.delete("/:id", resourcesController.deleteResource);

module.exports = router;
