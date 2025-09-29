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
    this.teacherAvailability = new Map(); // Per day availability
    this.labAvailability = new Map(); // Per day availability
    this.subjectHoursCompleted = new Map(); // Persistent across days
    this.batchSubjectProgress = new Map(); // Track progress per batch per subject
    this.prioritizeMultiDay = true; // NEW: Multi-day scheduling
  }

  // ENHANCED: Main scheduling entry point with multi-day support
  async scheduleAllLabs() {
    try {
      console.log('🔬 Starting Multi-Day Intelligent Lab Scheduling Engine...');
      
      // Step 1: Gather all required data
      const inputData = await this.gatherInputData();
      
      // Step 2: Initialize progress tracking
      this.initializeBatchProgress(inputData);
      
      // Step 3: Multi-day scheduling (Monday to Friday)
      const daysToSchedule = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      
      for (const day of daysToSchedule) {
        console.log(`\n📅 ======================== SCHEDULING ${day.toUpperCase()} ========================`);
        
        // Reset daily availability (fresh start each day)
        this.resetDailyAvailability();
        
        // Find divisions with remaining work for this day
        const divisionsWithWork = this.getDivisionsWithRemainingWork(inputData);
        
        if (divisionsWithWork.length > 0) {
          console.log(`🎯 Divisions with remaining work: ${divisionsWithWork.join(', ')}`);
          
          // Schedule all divisions with work on this day
          await this.scheduleAllDivisionsOnDay(day, divisionsWithWork, inputData);
        } else {
          console.log(`✅ No remaining work for ${day}`);
        }
        
        // Log progress after each day
        this.logDailyProgress(day);
      }
      
      // Step 4: Generate final output
      return this.generateFinalOutput();
      
    } catch (error) {
      console.error('❌ Multi-day lab scheduling failed:', error);
      throw error;
    }
  }

  // NEW: Initialize progress tracking for all batches and subjects
  initializeBatchProgress(inputData) {
    console.log('🔄 Initializing batch progress tracking...');
    
    Object.keys(inputData.divisions).forEach(division => {
      const batches = inputData.divisions[division];
      
      batches.forEach(batch => {
        const subjects = inputData.lab_assignments[batch] || [];
        
        subjects.forEach(subject => {
          const key = `${batch}-${subject.subject}`;
          
          // Initialize if not exists
          if (!this.batchSubjectProgress.has(key)) {
            this.batchSubjectProgress.set(key, {
              batch,
              subject: subject.subject,
              teacher_id: subject.teacher_id,
              teacher_name: subject.teacher_name,
              teacher_display_id: subject.teacher_display_id,
              total_hours: subject.hours_per_week,
              completed_hours: 0,
              remaining_hours: subject.hours_per_week,
              status: 'pending'
            });
          }
        });
      });
    });
    
    console.log(`✅ Initialized progress for ${this.batchSubjectProgress.size} batch-subject combinations`);
  }

  // NEW: Reset daily teacher/lab availability (fresh start each day)
  resetDailyAvailability() {
    this.teacherAvailability.clear();
    this.labAvailability.clear();
    console.log('🔄 Daily availability reset - fresh start');
  }

  // NEW: Find divisions that still have work remaining
  getDivisionsWithRemainingWork(inputData) {
    const divisionsWithWork = new Set();
    
    for (const [key, progress] of this.batchSubjectProgress) {
      if (progress.remaining_hours > 0) {
        // Extract division from batch name (e.g., "SE-A1" → "SE-A")
        const division = progress.batch.replace(/\d+$/, '');
        divisionsWithWork.add(division);
      }
    }
    
    return Array.from(divisionsWithWork);
  }

  // ENHANCED: Schedule all divisions with work on a specific day
  async scheduleAllDivisionsOnDay(day, divisions, inputData) {
    console.log(`🎯 INTELLIGENT ALLOCATION: Attempting ${divisions.length} divisions on ${day}`);
    
    // Get all available time blocks for the day
    const allTimeBlocks = this.getAllAvailable2HourBlocks(day, inputData.slots, inputData, divisions);
    
    if (allTimeBlocks.length === 0) {
      console.log(`❌ No available 2-hour blocks on ${day}`);
      return false;
    }
    
    console.log(`🕐 Available time blocks on ${day}: ${allTimeBlocks.map(b => `${b.start_slot}-${b.end_slot}`).join(', ')}`);
    
    // NEW: Enhanced allocation with remaining work priority
    const allocation = await this.findOptimalAllocationWithProgress(day, divisions, allTimeBlocks, inputData);
    
    if (allocation.success) {
      // Commit all allocations and update progress
      for (const divisionSchedule of allocation.schedule) {
        await this.commitBatchAssignmentsWithProgress(
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

  // NEW: Enhanced allocation considering progress and dynamic subject selection
  async findOptimalAllocationWithProgress(day, divisions, timeBlocks, inputData) {
    console.log(`🧠 OPTIMAL ALLOCATION WITH PROGRESS: ${divisions.length} divisions across ${timeBlocks.length} time blocks`);
    
    // Try all possible combinations
    const allocations = this.generateAllocationCombinations(divisions, timeBlocks);
    
    for (const allocation of allocations) {
      console.log(`🔍 Testing allocation: ${allocation.map(a => `${a.division}@${a.timeBlock.start_slot}-${a.timeBlock.end_slot}`).join(', ')}`);
      
      // Test this allocation with progress consideration
      const testResult = await this.testAllocationWithProgress(day, allocation, inputData);
      
      if (testResult.success) {
        console.log(`✅ OPTIMAL ALLOCATION WITH PROGRESS FOUND!`);
        return testResult;
      } else {
        console.log(`❌ Allocation failed: ${testResult.reason}`);
      }
    }
    
    console.log(`❌ No valid allocation found for ${day}`);
    return { success: false };
  }

  // NEW: Test allocation considering progress and dynamic subject selection
  async testAllocationWithProgress(day, allocation, inputData) {
    const tempTeacherAvailability = new Map();
    const tempLabAvailability = new Map();
    const scheduleDetails = [];
    
    for (const alloc of allocation) {
      const { division, timeBlock } = alloc;
      const batches = inputData.divisions[division];
      
      // Test with dynamic subject selection
      const testResult = await this.testBatchSynchronizationWithProgress(
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

  // NEW: Enhanced batch synchronization with dynamic subject selection
  async testBatchSynchronizationWithProgress(division, batches, day, timeBlock, inputData, tempTeacherAvailability, tempLabAvailability) {
    const tentativeAssignments = [];
    const usedTeachers = new Set();
    const usedLabs = new Set();
    
    for (const batch of batches) {
      // NEW: Get subjects with remaining hours using dynamic priority
      const availableSubjects = this.getBatchAvailableSubjects(batch);
      
      if (availableSubjects.length === 0) {
        console.log(`ℹ️ Batch ${batch} has no remaining subjects - skipping`);
        continue;
      }
      
      // NEW: Dynamic subject selection (hours + teacher availability)
      const prioritizedSubjects = this.prioritizeSubjectsByHoursAndTeacher(availableSubjects, usedTeachers, tempTeacherAvailability, day, timeBlock);
      
      let assignmentFound = false;
      
      for (const subjectProgress of prioritizedSubjects) {
        // Check teacher availability
        const teacherKey1 = `${subjectProgress.teacher_id}-${day}-${timeBlock.start_slot}`;
        const teacherKey2 = `${subjectProgress.teacher_id}-${day}-${timeBlock.end_slot}`;
        
        const teacherBusy = this.teacherAvailability.has(teacherKey1) || 
                           this.teacherAvailability.has(teacherKey2) ||
                           tempTeacherAvailability.has(teacherKey1) ||
                           tempTeacherAvailability.has(teacherKey2) ||
                           usedTeachers.has(subjectProgress.teacher_id);
        
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
              subject: subjectProgress.subject,
              teacher_id: subjectProgress.teacher_id,
              teacher_name: subjectProgress.teacher_name,
              teacher_display_id: subjectProgress.teacher_display_id,
              lab_id: availableLab.roomName,
              progress_key: `${batch}-${subjectProgress.subject}`,
              hours_to_complete: Math.min(2, subjectProgress.remaining_hours)
            });
            
            // Mark as temporarily used
            usedTeachers.add(subjectProgress.teacher_id);
            usedLabs.add(availableLab.roomName);
            
            tempTeacherAvailability.set(teacherKey1, true);
            tempTeacherAvailability.set(teacherKey2, true);
            tempLabAvailability.set(`${availableLab.roomName}-${day}-${timeBlock.start_slot}`, true);
            tempLabAvailability.set(`${availableLab.roomName}-${day}-${timeBlock.end_slot}`, true);
            
            assignmentFound = true;
            console.log(`✅ ${batch}: ${subjectProgress.subject} (${subjectProgress.teacher_display_id}) - ${subjectProgress.remaining_hours}hrs remaining`);
            break;
          }
        }
      }
      
      if (!assignmentFound) {
        console.log(`⚠️ No assignment found for batch ${batch} with remaining subjects`);
        // Don't fail the entire division if one batch can't be scheduled
        // return { success: false, reason: `Cannot assign subject to batch ${batch}` };
      }
    }
    
    return {
      success: tentativeAssignments.length > 0,
      assignments: tentativeAssignments
    };
  }

  // NEW: Get available subjects for a batch (subjects with remaining hours)
  getBatchAvailableSubjects(batch) {
    const availableSubjects = [];
    
    for (const [key, progress] of this.batchSubjectProgress) {
      if (progress.batch === batch && progress.remaining_hours > 0) {
        availableSubjects.push(progress);
      }
    }
    
    return availableSubjects;
  }

  // NEW: Dynamic subject prioritization (hours + teacher availability)
  prioritizeSubjectsByHoursAndTeacher(subjects, usedTeachers, tempTeacherAvailability, day, timeBlock) {
    return subjects
      .filter(subject => !usedTeachers.has(subject.teacher_id)) // Filter out already used teachers
      .sort((a, b) => {
        // Priority 1: Teacher availability (prefer available teacher)
        const teacherKeyA1 = `${a.teacher_id}-${day}-${timeBlock.start_slot}`;
        const teacherKeyA2 = `${a.teacher_id}-${day}-${timeBlock.end_slot}`;
        const teacherKeyB1 = `${b.teacher_id}-${day}-${timeBlock.start_slot}`;
        const teacherKeyB2 = `${b.teacher_id}-${day}-${timeBlock.end_slot}`;
        
        const teacherABusy = this.teacherAvailability.has(teacherKeyA1) || 
                           this.teacherAvailability.has(teacherKeyA2) ||
                           tempTeacherAvailability.has(teacherKeyA1) ||
                           tempTeacherAvailability.has(teacherKeyA2);
        
        const teacherBBusy = this.teacherAvailability.has(teacherKeyB1) || 
                           this.teacherAvailability.has(teacherKeyB2) ||
                           tempTeacherAvailability.has(teacherKeyB1) ||
                           tempTeacherAvailability.has(teacherKeyB2);
        
        if (teacherABusy && !teacherBBusy) return 1;
        if (!teacherABusy && teacherBBusy) return -1;
        
        // Priority 2: Most remaining hours
        return b.remaining_hours - a.remaining_hours;
      });
  }

  // ENHANCED: Commit assignments and update progress
  commitBatchAssignmentsWithProgress(division, day, timeBlock, assignments) {
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
        lab_id: assignment.lab_id,
        formatted: `${assignment.subject}/${assignment.teacher_display_id}/${assignment.batch}/${assignment.lab_id}`,
        is_2_hour_block: true,
        hours_completed: assignment.hours_to_complete
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
      
      // NEW: Update progress tracking
      this.updateBatchProgress(assignment.progress_key, assignment.hours_to_complete);
      
      // Update legacy tracking for compatibility
      const subjectKey = `${assignment.batch}-${assignment.subject}`;
      const currentHours = this.subjectHoursCompleted.get(subjectKey) || 0;
      this.subjectHoursCompleted.set(subjectKey, currentHours + assignment.hours_to_complete);
    }
    
    // Log successful scheduling
    this.resolutionLog.push({
      action: "multi_day_scheduled",
      division,
      day,
      time_block: `${timeBlock.start_slot}-${timeBlock.end_slot}`,
      time_range: timeBlock.time_range,
      assignments: assignments.map(a => `${a.batch}:${a.subject}(${a.hours_to_complete}hrs)`)
    });
    
    console.log(`📝 MULTI-DAY COMMITTED: ${assignments.length} assignments for ${division} on ${day} at ${timeBlock.start_slot}-${timeBlock.end_slot}`);
  }

  // NEW: Update batch progress after scheduling
  updateBatchProgress(progressKey, hoursCompleted) {
    const progress = this.batchSubjectProgress.get(progressKey);
    if (progress) {
      progress.completed_hours += hoursCompleted;
      progress.remaining_hours = Math.max(0, progress.total_hours - progress.completed_hours);
      progress.status = progress.remaining_hours === 0 ? 'completed' : 'in_progress';
      
      console.log(`📊 Progress updated: ${progressKey} → ${progress.completed_hours}/${progress.total_hours} hours (${progress.remaining_hours} remaining)`);
    }
  }

  // NEW: Log progress after each day
  logDailyProgress(day) {
    console.log(`\n📊 ================ ${day.toUpperCase()} PROGRESS SUMMARY ================`);
    
    const completed = [];
    const inProgress = [];
    const pending = [];
    
    for (const [key, progress] of this.batchSubjectProgress) {
      if (progress.status === 'completed') {
        completed.push(key);
      } else if (progress.status === 'in_progress') {
        inProgress.push(`${key} (${progress.remaining_hours}h left)`);
      } else {
        pending.push(key);
      }
    }
    
    console.log(`✅ Completed: ${completed.length} assignments`);
    console.log(`🔄 In Progress: ${inProgress.length} assignments`);
    console.log(`⏳ Pending: ${pending.length} assignments`);
    
    if (inProgress.length > 0) {
      console.log(`🔄 In Progress Details: ${inProgress.slice(0, 5).join(', ')}${inProgress.length > 5 ? '...' : ''}`);
    }
  }

  // Keep existing methods for compatibility...
  generateAllocationCombinations(divisions, timeBlocks) {
    const combinations = [];
    
    // Sequential allocation
    if (timeBlocks.length >= divisions.length) {
      const sequential = divisions.map((division, index) => ({
        division,
        timeBlock: timeBlocks[index]
      }));
      combinations.push(sequential);
    }
    
    // Reverse allocation
    if (timeBlocks.length >= divisions.length) {
      const reverse = divisions.map((division, index) => ({
        division,
        timeBlock: timeBlocks[timeBlocks.length - 1 - index]
      }));
      combinations.push(reverse);
    }
    
    // Mixed allocation
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

  // Keep existing utility methods...
  getAllAvailable2HourBlocks(day, slots, inputData, divisions) {
    const blocks = [];
    
    for (let i = 0; i < slots.length - 1; i++) {
      const startSlot = slots[i];
      const endSlot = slots[i + 1];
      
      if (endSlot.slotNumber === startSlot.slotNumber + 1) {
        const globalBlocked = this.isSlotBlocked(day, startSlot.slotNumber, inputData.global_restrictions) ||
                             this.isSlotBlocked(day, endSlot.slotNumber, inputData.global_restrictions);
        
        if (!globalBlocked) {
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

  // Keep existing data gathering with enhancements
  async gatherInputData() {
    console.log('📥 Gathering input data from database...');
    
    // [Keep existing implementation but enhanced]
    const divisions = {};
    const divisionsData = await Division.find()
      .populate('syllabusId')
      .lean();
    
    divisionsData.forEach(div => {
      const batches = div.batches.map(b => b.name);
      divisions[div.name] = batches;
    });
    
    const teachers = await Teacher.find().lean();
    const teacherMap = {};
    const teacherIdMap = {};
    
    teachers.forEach(teacher => {
      teacherMap[teacher._id.toString()] = {
        name: teacher.name,
        teacherId: teacher.teacherId,
        displayId: teacher.teacherId || teacher.name
      };
      
      if (teacher.teacherId) {
        teacherIdMap[teacher.teacherId.toString()] = {
          name: teacher.name,
          teacherId: teacher.teacherId,
          displayId: teacher.name
        };
      }
    });
    
    const labAssignments = {};
    const assignmentsData = await LabAssignment.find()
      .populate('subjectId teacherId divisionId')
      .lean();
    
    assignmentsData.forEach(assignment => {
      const batchName = `${assignment.divisionId.name}${assignment.batchNumber}`;
      
      if (!labAssignments[batchName]) {
        labAssignments[batchName] = [];
      }
      
      const teacherMongoId = assignment.teacherId._id.toString();
      const teacherDbId = assignment.teacherId.teacherId;
      
      let teacherInfo = {
        name: 'Unknown Teacher',
        teacherId: 'Unknown',
        displayId: 'Unknown'
      };
      
      if (teacherDbId && teacherIdMap[teacherDbId.toString()]) {
        teacherInfo = teacherIdMap[teacherDbId.toString()];
      } else if (teacherMap[teacherMongoId]) {
        teacherInfo = teacherMap[teacherMongoId];
      } else {
        teacherInfo = {
          name: assignment.teacherId.name || 'Unknown Teacher',
          teacherId: assignment.teacherId.teacherId || 'Unknown',
          displayId: assignment.teacherId.name || assignment.teacherId.teacherId || 'Unknown'
        };
      }
      
      labAssignments[batchName].push({
        subject: assignment.subjectId.name,
        teacher_id: teacherMongoId,
        teacher_name: teacherInfo.name,
        teacher_display_id: teacherInfo.displayId,
        teacher_db_id: teacherDbId,
        hours_per_week: assignment.hoursPerWeek,
        hours_completed: 0
      });
    });
    
    const resources = await Resource.find({ type: 'LAB', isActive: true }).lean();
    
    const timeConfig = await TimeSlotConfiguration.findOne().lean();
    const slots = timeConfig?.timeSlots || [];
    
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

  // Keep existing utility methods
  getDivisionAcademicYear(division) {
    if (division.startsWith('SE-')) return 'SE';
    if (division.startsWith('TE-')) return 'TE';
    if (division.startsWith('BE-')) return 'BE';
    return null;
  }

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

  isSlotBlockedForYear(day, slotNumber, yearRestrictions, academicYear) {
    for (const restriction of yearRestrictions) {
      if (restriction.days && restriction.timeSlots && restriction.affectedYears) {
        const affectsThisYear = restriction.affectedYears.some(year => {
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

  formatRestrictions(restrictions) {
    return restrictions.map(r => ({
      restrictionName: r.restrictionName,
      days: r.days || [],
      timeSlots: r.timeSlots || [],
      affectedYears: r.affectedYears || []
    }));
  }

  // ENHANCED: Generate final output with multi-day metrics
  generateFinalOutput() {
    const totalBatches = this.scheduleMatrix.length;
    const scheduledDivisions = [...new Set(this.scheduleMatrix.map(s => s.division))].length;
    const dayDistribution = {};
    
    this.scheduleMatrix.forEach(session => {
      dayDistribution[session.day] = (dayDistribution[session.day] || 0) + 1;
    });
    
    const completedSubjects = Array.from(this.batchSubjectProgress.values())
      .filter(p => p.status === 'completed').length;
    
    const totalSubjects = this.batchSubjectProgress.size;
    
    return {
      success: true,
      schedule_matrix: this.scheduleMatrix,
      conflict_report: this.conflictReport,
      resolution_log: this.resolutionLog,
      metrics: {
        total_sessions_scheduled: totalBatches,
        divisions_scheduled: scheduledDivisions,
        conflicts_found: this.conflictReport.length,
        multi_day_distribution: dayDistribution,
        completed_subjects: completedSubjects,
        total_subjects: totalSubjects,
        completion_rate: ((completedSubjects / totalSubjects) * 100).toFixed(2),
        success_rate: this.conflictReport.length === 0 ? 100 : 
          ((scheduledDivisions / (scheduledDivisions + this.conflictReport.length)) * 100).toFixed(2)
      }
    };
  }
}

module.exports = LabSchedulingEngine;
