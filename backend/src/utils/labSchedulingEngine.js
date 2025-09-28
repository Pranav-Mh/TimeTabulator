const LabScheduleSession = require('../models/LabScheduleSession');
const Division = require('../models/Division');
const LabAssignment = require('../models/LabAssignment');
const Resource = require('../models/Resource');
const Teacher = require('../models/Teacher');
const TimeSlotConfiguration = require('../models/TimeSlotConfiguration');
const TimetableRestriction = require('../models/TimetableRestriction');

class LabSchedulingEngine {
  constructor() {
    this.scheduleMatrix = [];
    this.conflictReport = [];
    this.resolutionLog = [];
    this.teacherAvailability = new Map();
    this.labAvailability = new Map();
    this.subjectHoursCompleted = new Map();
    this.dailyLabUsage = new Map(); // NEW: Track lab usage per day/slot
    this.prioritizeDayCompletion = true; // NEW: Complete all labs same day
  }

  // Main scheduling entry point with intelligent resource allocation
  async scheduleAllLabs() {
    try {
      console.log('🔬 Starting Intelligent Lab Scheduling Engine...');
      
      // Step 1: Gather all required data
      const inputData = await this.gatherInputData();
      
      // Step 2: NEW APPROACH - Schedule by day with intelligent allocation
      const targetDay = 'Monday'; // Primary target
      console.log(`🎯 INTELLIGENT SCHEDULING: Attempting to fit ALL divisions on ${targetDay}`);
      
      const allDivisions = Object.keys(inputData.divisions).filter(div => 
        this.hasLabAssignments(div, inputData)
      );
      
      console.log(`📋 Divisions needing labs: ${allDivisions.join(', ')}`);
      
      // Step 3: Intelligent slot allocation for all divisions
      const success = await this.scheduleAllDivisionsOnDay(targetDay, allDivisions, inputData);
      
      if (!success) {
        console.log(`⚠️ ${targetDay} full, trying alternative days...`);
        
        // Try other days
        const alternateDays = ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        for (const day of alternateDays) {
          console.log(`🔄 Trying ${day} for all divisions...`);
          this.resetAvailabilityTracking(); // Reset for new day
          
          if (await this.scheduleAllDivisionsOnDay(day, allDivisions, inputData)) {
            console.log(`✅ All divisions scheduled successfully on ${day}!`);
            break;
          }
        }
      } else {
        console.log(`✅ All divisions scheduled successfully on ${targetDay}!`);
      }
      
      // Step 4: Generate final output
      return this.generateFinalOutput();
      
    } catch (error) {
      console.error('❌ Lab scheduling failed:', error);
      throw error;
    }
  }

  // NEW: Check if division has lab assignments
  hasLabAssignments(division, inputData) {
    const batches = inputData.divisions[division];
    if (!batches || batches.length === 0) return false;
    
    return batches.some(batch => 
      inputData.lab_assignments[batch] && inputData.lab_assignments[batch].length > 0
    );
  }

  // NEW: Reset availability tracking for new day
  resetAvailabilityTracking() {
    this.teacherAvailability.clear();
    this.labAvailability.clear();
    this.dailyLabUsage.clear();
    this.scheduleMatrix = []; // Reset schedule matrix
  }

  // NEW: Intelligent scheduling for all divisions on single day
  async scheduleAllDivisionsOnDay(day, divisions, inputData) {
    console.log(`🎯 INTELLIGENT ALLOCATION: Attempting all ${divisions.length} divisions on ${day}`);
    
    // Get all available time blocks for the day
    const allTimeBlocks = this.getAllAvailable2HourBlocks(day, inputData.slots, inputData, divisions);
    
    if (allTimeBlocks.length === 0) {
      console.log(`❌ No available 2-hour blocks on ${day}`);
      return false;
    }
    
    console.log(`🕐 Available time blocks on ${day}: ${allTimeBlocks.map(b => `${b.start_slot}-${b.end_slot}`).join(', ')}`);
    
    // NEW: Intelligent allocation algorithm
    const allocation = await this.findOptimalAllocation(day, divisions, allTimeBlocks, inputData);
    
    if (allocation.success) {
      // Commit all allocations
      for (const divisionSchedule of allocation.schedule) {
        await this.commitBatchAssignments(
          divisionSchedule.division, 
          day, 
          divisionSchedule.timeBlock, 
          divisionSchedule.assignments
        );
      }
      return true;
    }
    
    return false;
  }

  // NEW: Find optimal allocation of divisions to time blocks
  async findOptimalAllocation(day, divisions, timeBlocks, inputData) {
    console.log(`🧠 OPTIMAL ALLOCATION: ${divisions.length} divisions across ${timeBlocks.length} time blocks`);
    
    // Try all possible combinations of divisions to time blocks
    const allocations = this.generateAllocationCombinations(divisions, timeBlocks);
    
    for (const allocation of allocations) {
      console.log(`🔍 Testing allocation: ${allocation.map(a => `${a.division}@${a.timeBlock.start_slot}-${a.timeBlock.end_slot}`).join(', ')}`);
      
      // Test this allocation
      const testResult = await this.testAllocation(day, allocation, inputData);
      
      if (testResult.success) {
        console.log(`✅ OPTIMAL ALLOCATION FOUND!`);
        return testResult;
      } else {
        console.log(`❌ Allocation failed: ${testResult.reason}`);
      }
    }
    
    console.log(`❌ No valid allocation found for ${day}`);
    return { success: false };
  }

  // NEW: Generate all possible allocation combinations
  generateAllocationCombinations(divisions, timeBlocks) {
    const combinations = [];
    
    // For simplicity, try sequential allocation first, then permutations
    // Sequential allocation: assign divisions to time blocks in order
    if (timeBlocks.length >= divisions.length) {
      const sequential = divisions.map((division, index) => ({
        division,
        timeBlock: timeBlocks[index]
      }));
      combinations.push(sequential);
    }
    
    // If sequential doesn't work, try reverse order allocation
    if (timeBlocks.length >= divisions.length) {
      const reverse = divisions.map((division, index) => ({
        division,
        timeBlock: timeBlocks[timeBlocks.length - 1 - index]
      }));
      combinations.push(reverse);
    }
    
    // Try mixing SE and TE divisions across different time blocks
    const mixed = [];
    let blockIndex = 0;
    for (const division of divisions) {
      mixed.push({
        division,
        timeBlock: timeBlocks[blockIndex % timeBlocks.length]
      });
      blockIndex++;
    }
    if (mixed.length > 0) combinations.push(mixed);
    
    return combinations;
  }

  // NEW: Test if allocation is valid
  async testAllocation(day, allocation, inputData) {
    // Create temporary tracking
    const tempTeacherAvailability = new Map();
    const tempLabAvailability = new Map();
    const scheduleDetails = [];
    
    for (const alloc of allocation) {
      const { division, timeBlock } = alloc;
      const batches = inputData.divisions[division];
      
      // Test if this division can be scheduled at this time block
      const testResult = await this.testBatchSynchronization(
        division, 
        batches, 
        day, 
        timeBlock, 
        inputData, 
        tempTeacherAvailability, 
        tempLabAvailability
      );
      
      if (!testResult.success) {
        return { 
          success: false, 
          reason: `${division} failed at ${timeBlock.start_slot}-${timeBlock.end_slot}: ${testResult.reason}` 
        };
      }
      
      scheduleDetails.push({
        division,
        timeBlock,
        assignments: testResult.assignments
      });
    }
    
    return {
      success: true,
      schedule: scheduleDetails
    };
  }

  // NEW: Test batch synchronization without committing
  async testBatchSynchronization(division, batches, day, timeBlock, inputData, tempTeacherAvailability, tempLabAvailability) {
    const tentativeAssignments = [];
    const usedTeachers = new Set();
    const usedLabs = new Set();
    
    for (const batch of batches) {
      const batchSubjects = inputData.lab_assignments[batch] || [];
      
      if (batchSubjects.length === 0) continue;
      
      // Priority 1: Subjects with most remaining hours
      const prioritizedSubjects = batchSubjects
        .filter(s => (s.hours_completed || 0) < s.hours_per_week)
        .sort((a, b) => (b.hours_per_week - (b.hours_completed || 0)) - (a.hours_per_week - (a.hours_completed || 0)));
      
      let assignmentFound = false;
      
      for (const subject of prioritizedSubjects) {
        // Check teacher availability (both permanent and temporary)
        const teacherKey1 = `${subject.teacher_id}-${day}-${timeBlock.start_slot}`;
        const teacherKey2 = `${subject.teacher_id}-${day}-${timeBlock.end_slot}`;
        
        const teacherBusy = this.teacherAvailability.has(teacherKey1) || 
                           this.teacherAvailability.has(teacherKey2) ||
                           tempTeacherAvailability.has(teacherKey1) ||
                           tempTeacherAvailability.has(teacherKey2) ||
                           usedTeachers.has(subject.teacher_id);
        
        if (!teacherBusy) {
          // Find available lab room
          const availableLab = inputData.resources.find(lab => {
            const labKey1 = `${lab.roomName}-${day}-${timeBlock.start_slot}`;
            const labKey2 = `${lab.roomName}-${day}-${timeBlock.end_slot}`;
            
            return !usedLabs.has(lab.roomName) && 
                   !this.labAvailability.has(labKey1) && 
                   !this.labAvailability.has(labKey2) &&
                   !tempLabAvailability.has(labKey1) &&
                   !tempLabAvailability.has(labKey2);
          });
          
          if (availableLab) {
            tentativeAssignments.push({
              batch,
              subject: subject.subject,
              teacher_id: subject.teacher_id,
              teacher_name: subject.teacher_name,
              teacher_display_id: subject.teacher_display_id,
              lab_id: availableLab.roomName
            });
            
            // Mark as temporarily used
            usedTeachers.add(subject.teacher_id);
            usedLabs.add(availableLab.roomName);
            
            tempTeacherAvailability.set(teacherKey1, true);
            tempTeacherAvailability.set(teacherKey2, true);
            tempLabAvailability.set(`${availableLab.roomName}-${day}-${timeBlock.start_slot}`, true);
            tempLabAvailability.set(`${availableLab.roomName}-${day}-${timeBlock.end_slot}`, true);
            
            assignmentFound = true;
            break;
          }
        }
      }
      
      if (!assignmentFound) {
        return { 
          success: false, 
          reason: `Cannot assign subject to batch ${batch}` 
        };
      }
    }
    
    return {
      success: true,
      assignments: tentativeAssignments
    };
  }

  // ENHANCED: Get all available time blocks considering restrictions for ALL divisions
  getAllAvailable2HourBlocks(day, slots, inputData, divisions) {
    const blocks = [];
    
    // Valid 2-hour consecutive pairs
    for (let i = 0; i < slots.length - 1; i++) {
      const startSlot = slots[i];
      const endSlot = slots[i + 1];
      
      // Check if these slots are consecutive
      if (endSlot.slotNumber === startSlot.slotNumber + 1) {
        // Check global restrictions (apply to all divisions)
        const globalBlocked = this.isSlotBlocked(day, startSlot.slotNumber, inputData.global_restrictions) ||
                             this.isSlotBlocked(day, endSlot.slotNumber, inputData.global_restrictions);
        
        if (!globalBlocked) {
          // Check if this slot is viable for at least one division
          const viableForAnyDivision = divisions.some(division => {
            const divisionYear = this.getDivisionAcademicYear(division);
            const yearBlocked = this.isSlotBlockedForYear(day, startSlot.slotNumber, inputData.year_restrictions, divisionYear) ||
                               this.isSlotBlockedForYear(day, endSlot.slotNumber, inputData.year_restrictions, divisionYear);
            return !yearBlocked;
          });
          
          if (viableForAnyDivision) {
            blocks.push({
              start_slot: startSlot.slotNumber,
              end_slot: endSlot.slotNumber,
              time_range: `${startSlot.startTime}-${endSlot.endTime}`
            });
          }
        }
      }
    }
    
    console.log(`📊 Found ${blocks.length} potentially available 2-hour blocks on ${day}`);
    return blocks;
  }

  // ENHANCED: Gather all input data with FIXED teacher name resolution
  async gatherInputData() {
    console.log('📥 Gathering input data from database...');
    
    // Get all divisions with batches
    const divisions = {};
    const divisionsData = await Division.find()
      .populate('syllabusId')
      .lean();
    
    divisionsData.forEach(div => {
      const batches = div.batches.map(b => b.name);
      divisions[div.name] = batches;
    });
    
    // FIXED: Get all teachers for name resolution using teacherId field
    const teachers = await Teacher.find().lean();
    const teacherMap = {};
    const teacherIdMap = {}; // NEW: Map by teacherId instead of _id
    
    teachers.forEach(teacher => {
      // Map by MongoDB _id (for database lookups)
      teacherMap[teacher._id.toString()] = {
        name: teacher.name,
        teacherId: teacher.teacherId,
        displayId: teacher.teacherId || teacher.name
      };
      
      // NEW: Map by teacherId (for frontend display)
      if (teacher.teacherId) {
        teacherIdMap[teacher.teacherId.toString()] = {
          name: teacher.name,
          teacherId: teacher.teacherId,
          displayId: teacher.name // Use name for display
        };
      }
    });
    
    console.log('👥 Teacher mapping created:', {
      totalTeachers: teachers.length,
      teacherMapSize: Object.keys(teacherMap).length,
      teacherIdMapSize: Object.keys(teacherIdMap).length
    });
    
    // Get lab assignments by batch with ENHANCED teacher info
    const labAssignments = {};
    const assignmentsData = await LabAssignment.find()
      .populate('subjectId teacherId divisionId')
      .lean();
    
    assignmentsData.forEach(assignment => {
      const batchName = `${assignment.divisionId.name}${assignment.batchNumber}`;
      
      if (!labAssignments[batchName]) {
        labAssignments[batchName] = [];
      }
      
      // ENHANCED: Get teacher info from both maps
      const teacherMongoId = assignment.teacherId._id.toString();
      const teacherDbId = assignment.teacherId.teacherId;
      
      let teacherInfo = {
        name: 'Unknown Teacher',
        teacherId: 'Unknown',
        displayId: 'Unknown'
      };
      
      // Try to get teacher info from teacherId first (more reliable)
      if (teacherDbId && teacherIdMap[teacherDbId.toString()]) {
        teacherInfo = teacherIdMap[teacherDbId.toString()];
        console.log(`✅ Found teacher by ID ${teacherDbId}: ${teacherInfo.name}`);
      } 
      // Fallback to MongoDB _id mapping
      else if (teacherMap[teacherMongoId]) {
        teacherInfo = teacherMap[teacherMongoId];
        console.log(`✅ Found teacher by MongoDB ID: ${teacherInfo.name}`);
      }
      // Final fallback
      else {
        teacherInfo = {
          name: assignment.teacherId.name || 'Unknown Teacher',
          teacherId: assignment.teacherId.teacherId || 'Unknown',
          displayId: assignment.teacherId.name || assignment.teacherId.teacherId || 'Unknown'
        };
        console.log(`⚠️ Using fallback teacher info: ${teacherInfo.displayId}`);
      }
      
      labAssignments[batchName].push({
        subject: assignment.subjectId.name,
        teacher_id: teacherMongoId, // Keep MongoDB ID for internal tracking
        teacher_name: teacherInfo.name,
        teacher_display_id: teacherInfo.displayId, // Use name for display
        teacher_db_id: teacherDbId, // Store original teacherId
        hours_per_week: assignment.hoursPerWeek,
        hours_completed: 0 // Reset for new scheduling
      });
    });
    
    // Get lab resources
    const resources = await Resource.find({ type: 'LAB', isActive: true }).lean();
    
    // Get time slot configuration
    const timeConfig = await TimeSlotConfiguration.findOne().lean();
    const slots = timeConfig?.timeSlots || [];
    
    // Get restrictions
    const globalRestrictions = await TimetableRestriction.find({
      scope: 'global',
      isActive: true
    }).lean();
    
    const yearRestrictions = await TimetableRestriction.find({
      scope: 'year-specific',
      isActive: true
    }).lean();
    
    console.log(`✅ Data gathered: ${Object.keys(divisions).length} divisions, ${Object.keys(labAssignments).length} batch assignments, ${resources.length} labs`);
    
    return {
      divisions,
      lab_assignments: labAssignments,
      resources,
      slots,
      global_restrictions: this.formatRestrictions(globalRestrictions),
      year_restrictions: this.formatRestrictions(yearRestrictions),
      teacher_map: teacherMap,
      teacher_id_map: teacherIdMap
    };
  }

  // ENHANCED: Commit batch assignments with teacher name display
  commitBatchAssignments(division, day, timeBlock, assignments) {
    for (const assignment of assignments) {
      const sessionData = {
        day,
        start_slot: timeBlock.start_slot,
        end_slot: timeBlock.end_slot,
        division,
        batch: assignment.batch,
        subject: assignment.subject,
        teacher_id: assignment.teacher_id,
        teacher_name: assignment.teacher_name,
        teacher_display_id: assignment.teacher_display_id,
        teacher_db_id: assignment.teacher_db_id,
        lab_id: assignment.lab_id,
        formatted: `${assignment.subject}/${assignment.teacher_display_id}/${assignment.batch}/${assignment.lab_id}`,
        is_2_hour_block: true
      };
      
      this.scheduleMatrix.push(sessionData);
      
      // Mark teacher as busy for BOTH slots
      const teacherKey1 = `${assignment.teacher_id}-${day}-${timeBlock.start_slot}`;
      const teacherKey2 = `${assignment.teacher_id}-${day}-${timeBlock.end_slot}`;
      this.teacherAvailability.set(teacherKey1, true);
      this.teacherAvailability.set(teacherKey2, true);
      
      // Mark lab as busy for BOTH slots
      const labKey1 = `${assignment.lab_id}-${day}-${timeBlock.start_slot}`;
      const labKey2 = `${assignment.lab_id}-${day}-${timeBlock.end_slot}`;
      this.labAvailability.set(labKey1, true);
      this.labAvailability.set(labKey2, true);
      
      // Update hours completed
      const subjectKey = `${assignment.batch}-${assignment.subject}`;
      const currentHours = this.subjectHoursCompleted.get(subjectKey) || 0;
      this.subjectHoursCompleted.set(subjectKey, currentHours + 2);
    }
    
    // Log successful scheduling
    this.resolutionLog.push({
      action: "intelligent_scheduled",
      division,
      day,
      time_block: `${timeBlock.start_slot}-${timeBlock.end_slot}`,
      time_range: timeBlock.time_range,
      assignments: assignments.map(a => a.formatted)
    });
    
    console.log(`📝 INTELLIGENTLY COMMITTED: ${assignments.length} assignments for ${division} on ${day} at ${timeBlock.start_slot}-${timeBlock.end_slot}`);
  }

  // Get division academic year mapping
  getDivisionAcademicYear(division) {
    if (division.startsWith('SE-')) return 'SE';
    if (division.startsWith('TE-')) return 'TE';
    if (division.startsWith('BE-')) return 'BE';
    return null;
  }

  // Check if slot is blocked by restrictions
  isSlotBlocked(day, slotNumber, restrictions) {
    for (const restriction of restrictions) {
      if (restriction.days && restriction.timeSlots) {
        if ((restriction.days.includes('All days') || restriction.days.includes(day)) &&
            restriction.timeSlots.includes(slotNumber)) {
          return true;
        }
      }
    }
    return false;
  }

  // Check if slot is blocked by year-specific restrictions for a specific academic year
  isSlotBlockedForYear(day, slotNumber, yearRestrictions, academicYear) {
    for (const restriction of yearRestrictions) {
      if (restriction.days && restriction.timeSlots && restriction.affectedYears) {
        // Check if this restriction affects the given academic year
        const affectsThisYear = restriction.affectedYears.some(year => {
          // Map year descriptions to academic years
          if (year === '2nd Year' && academicYear === 'SE') return true;
          if (year === '3rd Year' && academicYear === 'TE') return true;
          if (year === '4th Year' && academicYear === 'BE') return true;
          return false;
        });
        
        if (affectsThisYear && 
            (restriction.days.includes('All days') || restriction.days.includes(day)) &&
            restriction.timeSlots.includes(slotNumber)) {
          return true;
        }
      }
    }
    return false;
  }

  // Format restrictions from database
  formatRestrictions(restrictions) {
    return restrictions.map(r => ({
      restrictionName: r.restrictionName,
      days: r.days || [],
      timeSlots: r.timeSlots || [],
      affectedYears: r.affectedYears || []
    }));
  }

  // Generate final output
  generateFinalOutput() {
    const totalBatches = this.scheduleMatrix.length;
    const scheduledDivisions = [...new Set(this.scheduleMatrix.map(s => s.division))].length;
    const mondayScheduled = this.scheduleMatrix.filter(s => s.day === 'Monday').length;
    
    return {
      success: true,
      schedule_matrix: this.scheduleMatrix,
      conflict_report: this.conflictReport,
      resolution_log: this.resolutionLog,
      metrics: {
        total_sessions_scheduled: totalBatches,
        divisions_scheduled: scheduledDivisions,
        conflicts_found: this.conflictReport.length,
        monday_success: mondayScheduled,
        intelligent_allocation_used: true,
        same_day_completion: this.scheduleMatrix.length > 0 ? 
          [...new Set(this.scheduleMatrix.map(s => s.day))].length === 1 : false,
        success_rate: this.conflictReport.length === 0 ? 100 : 
          ((scheduledDivisions / (scheduledDivisions + this.conflictReport.length)) * 100).toFixed(2)
      }
    };
  }
}

module.exports = LabSchedulingEngine;
