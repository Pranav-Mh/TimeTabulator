const express = require("express");
const router = express.Router();
const configController = require("../controllers/configController");

router.get("/working-days-periods", configController.getWorkingDaysPeriods);
router.post("/working-days-periods", configController.saveWorkingDaysPeriods);

router.get("/time-slots", configController.getTimeSlots);
router.post("/time-slots", configController.addTimeSlot);
router.delete("/time-slots/:index", configController.deleteTimeSlot);

module.exports = router;
