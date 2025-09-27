const express = require('express');
const router = express.Router();
const {
  getRestrictions,
  addRestriction,
  deleteRestriction,
  getConflicts,
  overrideConflicts,
  getYearWiseBookings,
  getGlobalBookings,
  deleteSpecificBooking,
  syncSlotTableWithRestrictions
} = require('../controllers/restrictionsController');

// Basic restriction routes
router.get('/', getRestrictions);
router.post('/', addRestriction);
router.delete('/:id', deleteRestriction);
router.get('/conflicts', getConflicts);
router.post('/override', overrideConflicts);

// ✅ FIXED: Specific booking routes
router.get('/global-bookings', getGlobalBookings);
router.get('/year-wise/:year', getYearWiseBookings);
router.post('/delete-specific', deleteSpecificBooking);

// Manual sync route for debugging
router.post('/sync-slots', async (req, res) => {
  try {
    await syncSlotTableWithRestrictions();
    res.json({ message: 'Slot table synced successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync slot table' });
  }
});

module.exports = router;
