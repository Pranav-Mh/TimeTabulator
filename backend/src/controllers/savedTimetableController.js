const SavedTimetable = require('../models/SavedTimetable');
const mongoose = require('mongoose');

/**
 * SAVE A GENERATED TIMETABLE
 * Stores FINAL resolved timetable grid (labs already expanded)
 */
exports.saveTimetable = async (req, res) => {
  try {
    const {
      name,
      schedule_id,
      academicYears,
      divisions,
      metadata,
      statistics,
      finalTimetableGrid
    } = req.body;

    console.log('💾 Saving timetable:', { name, schedule_id });

    // Basic validation
    if (!name || !schedule_id || !finalTimetableGrid) {
      return res.status(400).json({
        success: false,
        error: 'name, schedule_id and finalTimetableGrid are required'
      });
    }

    // Prevent duplicate active timetable names
    const existingTimetable = await SavedTimetable.findOne({
      name,
      status: 'active'
    });

    if (existingTimetable) {
      return res.status(400).json({
        success: false,
        error: `A timetable with name "${name}" already exists.`
      });
    }

    // Create saved timetable
    const savedTimetable = new SavedTimetable({
      name,
      schedule_id,
      academicYears: academicYears || [],
      divisions: divisions || [],
      metadata: metadata || {},
      statistics: statistics || {},
      finalTimetableGrid, // ✅ MAIN FIX
      savedAt: new Date()
    });

    await savedTimetable.save();

    console.log(`✅ Timetable "${name}" saved successfully`);

    res.json({
      success: true,
      message: `Timetable "${name}" saved successfully`,
      savedTimetable
    });

  } catch (error) {
    console.error('❌ Error saving timetable:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET ALL SAVED TIMETABLES (Dashboard list)
 */
exports.getAllSavedTimetables = async (req, res) => {
  try {
    console.log('📂 Fetching all saved timetables...');

    const savedTimetables = await SavedTimetable.find({ status: 'active' })
      .sort({ savedAt: -1 })
      .select('-finalTimetableGrid'); // do not send heavy grid in list

    res.json({
      success: true,
      savedTimetables,
      count: savedTimetables.length
    });

  } catch (error) {
    console.error('❌ Error fetching saved timetables:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET A SINGLE SAVED TIMETABLE (VIEW MODE)
 * Uses FINAL GRID — no reconstruction
 */
exports.getSavedTimetableById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🔍 Fetching saved timetable: ${id}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timetable ID'
      });
    }

    const savedTimetable = await SavedTimetable.findById(id);

    if (!savedTimetable) {
      return res.status(404).json({
        success: false,
        error: 'Saved timetable not found'
      });
    }

    console.log(`✅ Loaded timetable "${savedTimetable.name}"`);

    // ✅ SEND FINAL GRID DIRECTLY
    res.json({
      success: true,
      savedTimetable,
      finalTimetableGrid: savedTimetable.finalTimetableGrid
    });

  } catch (error) {
    console.error('❌ Error fetching saved timetable:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * DELETE (ARCHIVE) SAVED TIMETABLE
 */
exports.deleteSavedTimetable = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Archiving timetable: ${id}`);

    const savedTimetable = await SavedTimetable.findByIdAndUpdate(
      id,
      { status: 'archived' },
      { new: true }
    );

    if (!savedTimetable) {
      return res.status(404).json({
        success: false,
        error: 'Saved timetable not found'
      });
    }

    res.json({
      success: true,
      message: `Timetable "${savedTimetable.name}" archived successfully`
    });

  } catch (error) {
    console.error('❌ Error deleting saved timetable:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
