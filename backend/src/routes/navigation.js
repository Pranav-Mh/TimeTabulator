const express = require('express'); // ✅ MISSING - Add this
const router = express.Router();    // ✅ MISSING - Add this
const NavigationStatus = require('../models/NavigationStatus');

// Get current navigation status
router.get('/status', async (req, res) => {
  try {
    let navStatus = await NavigationStatus.findOne();
    if (!navStatus) {
      navStatus = new NavigationStatus();
    }
    
    // Update permissions based on current data
    await navStatus.updatePermissions();
    
    res.json(navStatus);
  } catch (err) {
    console.error('❌ Error fetching navigation status:', err);
    res.status(500).json({ error: err.message });
  }
});

// Check if user can access a specific tab
router.get('/check/:tab', async (req, res) => {
  try {
    const { tab } = req.params;
    let navStatus = await NavigationStatus.findOne();
    if (!navStatus) {
      navStatus = new NavigationStatus();
      await navStatus.updatePermissions();
    } else {
      await navStatus.updatePermissions();
    }
    
    let canAccess = false;
    let message = '';
    
    switch(tab.toLowerCase()) {
      case 'dashboard':
        canAccess = true;
        break;
      case 'syllabus':
        canAccess = true; // Always accessible - no dependencies
        break;
      case 'teacher':
        canAccess = true; // Always accessible
        break;
      case 'lecture':
        canAccess = navStatus.canAccessLecture;
        if (!navStatus.syllabusCompleted) {
          message = 'Complete SE and TE syllabus first';
        } else if (!navStatus.hasTeachers) {
          message = 'Add teachers before assigning lectures';
        }
        break;
      case 'lab':
        canAccess = navStatus.canAccessLab;
        message = canAccess ? '' : 'Complete lecture assignments first';
        break;
      case 'resources':
        canAccess = navStatus.canAccessResources;
        message = canAccess ? '' : 'Complete lab assignments first';
        break;
      case 'generator':
        canAccess = navStatus.canAccessGenerator;
        message = canAccess ? '' : 'Configure resources first';
        break;
      default:
        return res.status(400).json({ error: 'Invalid tab name' });
    }
    
    res.json({ 
      canAccess, 
      message,
      currentStep: navStatus.currentStep,
      nextStep: getNextStep(navStatus.currentStep)
    });
  } catch (err) {
    console.error('❌ Error checking navigation access:', err);
    res.status(500).json({ error: err.message });
  }
});

function getNextStep(currentStep) {
  const steps = ['syllabus', 'teacher', 'lecture', 'lab', 'resources', 'generator'];
  const currentIndex = steps.indexOf(currentStep);
  return currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;
}

module.exports = router; // ✅ MISSING - Add this
