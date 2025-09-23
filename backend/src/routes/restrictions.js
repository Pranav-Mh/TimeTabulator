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
  syncSlotTableWithRestrictions  // ✅ NEW import
} = require('../controllers/restrictionsController');

// Existing routes
router.get('/', getRestrictions);
router.post('/', addRestriction);
router.delete('/:id', deleteRestriction);
router.get('/conflicts', getConflicts);
router.post('/override', overrideConflicts);

// Year-wise bookings route
router.get('/year-wise/:year', getYearWiseBookings);

// Global bookings route
router.get('/global-bookings', getGlobalBookings);

// Delete specific booking route
router.post('/delete-specific', deleteSpecificBooking);

// ✅ NEW: Manual sync route (for debugging)
router.post('/sync-slots', async (req, res) => {
  try {
    console.log('🔄 Manual sync requested...');
    await syncSlotTableWithRestrictions();
    res.json({ message: 'Slot table synced successfully' });
  } catch (error) {
    console.error('Error in manual sync:', error);
    res.status(500).json({ error: 'Failed to sync slot table' });
  }
});

module.exports = router;
