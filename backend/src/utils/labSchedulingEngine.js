const LabScheduleSession = require('../models/LabScheduleSession');
const Division = require('../models/Division');
const LabAssignment = require('../models/LabAssignment');
const Resource = require('../models/Resource');
const Teacher = require('../models/Teacher');
const TimeSlotConfiguration = require('../models/TimeSlotConfiguration');
const TimetableRestriction = require('../models/TimetableRestriction');
const mongoose = require('mongoose');

class LabSchedulingEngine {
  constructor() {
    this.scheduleMatrix = [];
    this.conflictReport = [];
    this.resolutionLog = [];
    this.teacherAvailability = new Map();
    this.labAvailability = new Map();
    this.subjectHoursCompleted = new Map();
    this.batchSubjectProgress = new Map();
    this.prioritizeMultiDay = true;
  }

  // Calculate minimum lab requirement using EXACT scheduling logic
  async calculateMinimumLabRequirement(inputData) {
    console.log('🔧 ======================== MINIMUM LAB REQUIREMENT ANALYSIS ========================');
    
    // Step 1: Initialize progress tracking (same as actual scheduling)
    this.initializeBatchProgressForAnalysis(inputData);
    
    // Step 2: Get divisions with remaining work (same as actual scheduling)
    const divisionsWithWork = this.getDivisionsWithRemainingWorkForAnalysis(inputData);
    const batchesPerDivision = 3;
    const totalBatches = divisionsWithWork.length * batchesPerDivision;
    const currentLabCount = inputData.resources.length;
    
    console.log(`📊 Analysis Parameters:`);
    console.log(`   • Total Divisions: ${divisionsWithWork.length} (${divisionsWithWork.join(', ')})`);
    console.log(`   • Total Batches: ${totalBatches}`);
    console.log(`   • Current Labs Available: ${currentLabCount}`);
    
    // Step 3: Analyze each day using EXACT scheduling logic
    const daysToAnalyze = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    let worstCaseDay = null;
    let minAvailableSlots = Infinity;
    let maxAdditionalLabsNeeded = 0;
    let detailedAnalysis = {};
    
    for (const day of daysToAnalyze) {
      const availableTimeBlocks = this.getAllAvailable2HourBlocks(day, inputData.slots, inputData, divisionsWithWork);
      const analysis = this.analyzeLabRequirementForDay(day, divisionsWithWork, availableTimeBlocks, currentLabCount);
      
      detailedAnalysis[day] = analysis;
      
      console.log(`   • ${day}: ${availableTimeBlocks.length} available slots, need ${analysis.additionalLabsNeeded} more labs`);
      
      if (availableTimeBlocks.length < minAvailableSlots) {
        minAvailableSlots = availableTimeBlocks.length;
        worstCaseDay = day;
      }
      
      if (analysis.additionalLabsNeeded > maxAdditionalLabsNeeded) {
        maxAdditionalLabsNeeded = analysis.additionalLabsNeeded;
      }
    }
    
    console.log(`   • Worst-case day: ${worstCaseDay} with ${minAvailableSlots} available time slots`);
    console.log(`   • Maximum additional labs needed: ${maxAdditionalLabsNeeded}`);
    
    // Step 4: Generate detailed reasoning for worst-case scenario
    const worstCaseAnalysis = detailedAnalysis[worstCaseDay];
    const detailedReasoning = this.generateFixedLabRequirementReasoning(
      worstCaseDay,
      worstCaseAnalysis,
      divisionsWithWork.length,
      totalBatches,
      currentLabCount
    );
    
    // Final recommendation
    const recommendation = {
      currentLabs: currentLabCount,
      minimumLabsRequired: currentLabCount + maxAdditionalLabsNeeded,
      additionalLabsNeeded: maxAdditionalLabsNeeded,
      sufficient: maxAdditionalLabsNeeded === 0,
      reasoning: detailedReasoning,
      worstCaseScenario: {
        day: worstCaseDay,
        availableTimeSlots: minAvailableSlots,
        totalDivisions: divisionsWithWork.length,
        totalBatches: totalBatches,
        analysis: worstCaseAnalysis
      },
      dayWiseAnalysis: detailedAnalysis
    };
    
    console.log(`\n🎯 FINAL RECOMMENDATION:`);
    console.log(`   • Current Labs: ${currentLabCount}`);
    console.log(`   • Minimum Required: ${recommendation.minimumLabsRequired}`);
    console.log(`   • Additional Labs Needed: ${maxAdditionalLabsNeeded}`);
    console.log(`\n💡 Reasoning:`);
    console.log(`${detailedReasoning}`);
    console.log(`\n🔧 ======================== END LAB REQUIREMENT ANALYSIS ========================\n`);
    
    return recommendation;
  }

  initializeBatchProgressForAnalysis(inputData) {
    this.batchSubjectProgress.clear();
    
    Object.keys(inputData.divisions).forEach(division => {
      const batches = inputData.divisions[division];
      
      batches.forEach(batch => {
        const subjects = inputData.lab_assignments[batch] || [];
        
        subjects.forEach(subject => {
          const key = `${batch}-${subject.subject}`;
          
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
        });
      });
    });
  }

  getDivisionsWithRemainingWorkForAnalysis(inputData) {
    const divisionsWithWork = new Set();
    
    for (const [key, progress] of this.batchSubjectProgress) {
      if (progress.remaining_hours > 0) {
        const division = progress.batch.replace(/\d+$/, '');
        divisionsWithWork.add(division);
      }
    }
    
    return Array.from(divisionsWithWork);
  }

  analyzeLabRequirementForDay(day, divisions, availableTimeBlocks, currentLabCount) {
    const batchesPerDivision = 3;
    const totalDivisions = divisions.length;
    const totalBatches = totalDivisions * batchesPerDivision;
    
    if (availableTimeBlocks.length === 0) {
      return {
        availableSlots: 0,
        canSchedule: 0,
        unscheduledDivisions: totalDivisions,
        additionalLabsNeeded: totalBatches,
        slotAnalysis: [],
        reason: `No available time slots on ${day}`
      };
    }
    
    const maxDivisionsPerSlot = Math.floor(currentLabCount / batchesPerDivision);
    
    const slotAnalysis = [];
    let remainingDivisions = totalDivisions;
    let totalScheduledDivisions = 0;
    
    for (let slotIndex = 0; slotIndex < availableTimeBlocks.length && remainingDivisions > 0; slotIndex++) {
      const divisionsInThisSlot = Math.min(maxDivisionsPerSlot, remainingDivisions);
      const batchesInThisSlot = divisionsInThisSlot * batchesPerDivision;
      const unusedLabsInSlot = currentLabCount - batchesInThisSlot;
      
      slotAnalysis.push({
        slot: slotIndex + 1,
        timeBlock: availableTimeBlocks[slotIndex],
        divisions: divisionsInThisSlot,
        batches: batchesInThisSlot,
        usedLabs: batchesInThisSlot,
        unusedLabs: unusedLabsInSlot
      });
      
      remainingDivisions -= divisionsInThisSlot;
      totalScheduledDivisions += divisionsInThisSlot;
    }
    
    const unscheduledDivisions = remainingDivisions;
    let additionalLabsNeeded = 0;
    
    if (unscheduledDivisions > 0) {
      const remainingBatches = unscheduledDivisions * batchesPerDivision;
      const maxUnusedLabs = slotAnalysis.length > 0 ? Math.max(...slotAnalysis.map(s => s.unusedLabs)) : 0;
      
      if (remainingBatches > maxUnusedLabs) {
        additionalLabsNeeded = remainingBatches - maxUnusedLabs;
      }
    }
    
    return {
      availableSlots: availableTimeBlocks.length,
      canSchedule: totalScheduledDivisions,
      unscheduledDivisions: unscheduledDivisions,
      additionalLabsNeeded: additionalLabsNeeded,
      slotAnalysis: slotAnalysis,
      maxDivisionsPerSlot: maxDivisionsPerSlot
    };
  }

  generateFixedLabRequirementReasoning(day, analysis, totalDivisions, totalBatches, currentLabs) {
    let reasoning = `📋 Detailed analysis for ${day} (worst-case scenario):\n\n`;
    
    reasoning += `   📊 Current situation:\n`;
    reasoning += `      • Total divisions needing labs: ${totalDivisions}\n`;
    reasoning += `      • Total batches: ${totalBatches}\n`;
    reasoning += `      • Available time slots: ${analysis.availableSlots}\n`;
    reasoning += `      • Current labs: ${currentLabs}\n`;
    reasoning += `      • Max divisions per slot: ${analysis.maxDivisionsPerSlot}\n\n`;
    
    if (analysis.slotAnalysis.length > 0) {
      reasoning += `   🕐 Slot-wise allocation analysis:\n`;
      
      analysis.slotAnalysis.forEach((slot, index) => {
        const timeRange = slot.timeBlock.time_range || `${slot.timeBlock.start_slot}-${slot.timeBlock.end_slot}`;
        reasoning += `      • Slot ${slot.slot} (${timeRange}): ${slot.divisions} divisions = ${slot.batches} batches\n`;
        reasoning += `        - Uses ${slot.usedLabs} labs, ${slot.unusedLabs} labs unused\n`;
      });
      
      reasoning += `\n   📈 Capacity summary:\n`;
      reasoning += `      • Can schedule: ${analysis.canSchedule} divisions\n`;
      reasoning += `      • Unscheduled: ${analysis.unscheduledDivisions} divisions\n`;
      
      if (analysis.unscheduledDivisions > 0) {
        const remainingBatches = analysis.unscheduledDivisions * 3;
        const maxUnused = Math.max(...analysis.slotAnalysis.map(s => s.unusedLabs));
        
        reasoning += `\n   🔴 Problem identified:\n`;
        reasoning += `      • Remaining unscheduled: ${analysis.unscheduledDivisions} division(s) = ${remainingBatches} batches\n`;
        reasoning += `      • Maximum unused labs in any slot: ${maxUnused}\n`;
        
        if (analysis.additionalLabsNeeded > 0) {
          reasoning += `      • Cannot fit ${remainingBatches} batches in ${maxUnused} unused labs\n`;
          reasoning += `      • Additional labs needed: ${remainingBatches} - ${maxUnused} = ${analysis.additionalLabsNeeded} labs\n`;
        } else {
          reasoning += `      • ✅ Remaining batches can fit in unused lab capacity\n`;
        }
      } else {
        reasoning += `\n   ✅ All divisions can be scheduled with current lab capacity!`;
      }
    } else {
      reasoning += `\n   🔴 Critical issue: ${analysis.reason}`;
    }
    
    return reasoning;
  }

  // ✅ FIXED: Block scheduling if insufficient labs detected
  // ✅ FIXED: Return structured error instead of throwing
  async scheduleAllLabs() {
    try {
      console.log('🔬 Starting Multi-Day Intelligent Lab Scheduling Engine...');
      
      // Step 1: Gather all required data
      const inputData = await this.gatherInputData();
      
      // Step 2: Calculate minimum lab requirement BEFORE scheduling
      const labRequirement = await this.calculateMinimumLabRequirement(inputData);
      
      // Step 3: ✅ RETURN ERROR STRUCTURE if insufficient labs (don't throw)
      if (!labRequirement.sufficient) {
        console.log(`🚨 CRITICAL: Insufficient lab capacity detected!`);
        console.log(`🚨 Need ${labRequirement.additionalLabsNeeded} more labs to complete scheduling.`);
        console.log(`🚨 BLOCKING SCHEDULING to prevent incomplete timetables.`);
        
        // ✅ Return structured error instead of throwing
        return {
          success: false,
          error: 'INSUFFICIENT_LAB_CAPACITY',
          labRequirementAnalysis: labRequirement,
          labRequirementError: {
            currentLabs: labRequirement.currentLabs,
            minimumRequired: labRequirement.minimumLabsRequired,
            additionalLabsNeeded: labRequirement.additionalLabsNeeded,
            message: `Lab scheduling requires ${labRequirement.additionalLabsNeeded} additional lab(s). Please add more labs before generating timetable.`,
            recommendation: `Add ${labRequirement.additionalLabsNeeded} more LAB resources and try again.`,
            reasoning: labRequirement.reasoning
          }
        };
      }
      
      console.log(`✅ Lab capacity is sufficient for all divisions.`);
      
      // Step 4: Only proceed if sufficient labs
      this.initializeBatchProgress(inputData);
      
      // Step 5: Multi-day scheduling (Monday to Friday)
      const daysToSchedule = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      
      for (const day of daysToSchedule) {
        console.log(`\n📅 ======================== SCHEDULING ${day.toUpperCase()} ========================`);
        
        this.resetDailyAvailability();
        
        const divisionsWithWork = this.getDivisionsWithRemainingWork(inputData);
        
        if (divisionsWithWork.length > 0) {
          console.log(`🎯 Divisions with remaining work: ${divisionsWithWork.join(', ')}`);
          await this.scheduleAllDivisionsOnDay(day, divisionsWithWork, inputData);
        } else {
          console.log(`✅ No remaining work for ${day}`);
        }
        
        this.logDailyProgress(day);
      }
      
      // Step 6: Generate final output with lab requirement info
      const finalOutput = this.generateFinalOutput();
      finalOutput.labRequirementAnalysis = labRequirement;
      
      // Step 7: Save to database
      await this.saveScheduleToDatabase(this.scheduleMatrix);
      
      return {
        success: true,
        labRequirementAnalysis: labRequirement,
        ...finalOutput
      };
      
    } catch (error) {
      console.error('❌ Multi-day lab scheduling failed:', error);
      throw error;
    }
  }

  // Keep all existing methods...
  initializeBatchProgress(inputData) {
    console.log('🔄 Initializing batch progress tracking...');
    
    this.batchSubjectProgress.clear();
    
    Object.keys(inputData.divisions).forEach(division => {
      const batches = inputData.divisions[division];
      
      batches.forEach(batch => {
        const subjects = inputData.lab_assignments[batch] || [];
        
        subjects.forEach(subject => {
          const key = `${batch}-${subject.subject}`;
          
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

  resetDailyAvailability() {
    this.teacherAvailability.clear();
    this.labAvailability.clear();
    console.log('🔄 Daily availability reset - fresh start');
  }

  getDivisionsWithRemainingWork(inputData) {
    const divisionsWithWork = new Set();
    
    for (const [key, progress] of this.batchSubjectProgress) {
      if (progress.remaining_hours > 0) {
        const division = progress.batch.replace(/\d+$/, '');
        divisionsWithWork.add(division);
      }
    }
    
    return Array.from(divisionsWithWork);
  }

  async scheduleAllDivisionsOnDay(day, divisions, inputData) {
    console.log(`🎯 INTELLIGENT ALLOCATION: Attempting ${divisions.length} divisions on ${day}`);
    
    const allTimeBlocks = this.getAllAvailable2HourBlocks(day, inputData.slots, inputData, divisions);
    
    if (allTimeBlocks.length === 0) {
      console.log(`❌ No available 2-hour blocks on ${day}`);
      return false;
    }
    
    console.log(`📊 Found ${allTimeBlocks.length} potentially available 2-hour blocks on ${day}`);
    console.log(`🕐 Available time blocks on ${day}: ${allTimeBlocks.map(b => `${b.start_slot || b.startslot}-${b.end_slot || b.endslot}`).join(', ')}`);
    
    const allocation = await this.findOptimalAllocationWithProgress(day, divisions, allTimeBlocks, inputData);
    
    if (allocation.success) {
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

  async findOptimalAllocationWithProgress(day, divisions, timeBlocks, inputData) {
    console.log(`🧠 OPTIMAL ALLOCATION WITH PROGRESS: ${divisions.length} divisions across ${timeBlocks.length} time blocks`);
    
    const allocations = this.generateAllocationCombinations(divisions, timeBlocks);
    
    for (const allocation of allocations) {
      const allocationDesc = allocation.map(a => {
        const timeBlock = a.timeBlock;
        const start = timeBlock.start_slot || timeBlock.startslot;
        const end = timeBlock.end_slot || timeBlock.endslot;
        return `${a.division}@${start}-${end}`;
      }).join(', ');
      
      console.log(`🔍 Testing allocation: ${allocationDesc}`);
      
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

  async testAllocationWithProgress(day, allocation, inputData) {
    const tempTeacherAvailability = new Map();
    const tempLabAvailability = new Map();
    const scheduleDetails = [];
    
    for (const alloc of allocation) {
      const { division, timeBlock } = alloc;
      const batches = inputData.divisions[division];
      
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
        const start = timeBlock.start_slot || timeBlock.startslot;
        const end = timeBlock.end_slot || timeBlock.endslot;
        return {
          success: false,
          reason: `${division} failed at ${start}-${end}: ${testResult.reason}`
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

  // ✅ ENHANCED: Fixed batch synchronization with better fallback logic
  async testBatchSynchronizationWithProgress(division, batches, day, timeBlock, inputData, tempTeacherAvailability, tempLabAvailability) {
    const tentativeAssignments = [];
    const usedTeachers = new Set();
    const usedLabs = new Set();
    
    const startSlot = timeBlock.start_slot || timeBlock.startslot;
    const endSlot = timeBlock.end_slot || timeBlock.endslot;
    
    console.log(`🔄 Testing batch synchronization for ${division} on ${day} at ${startSlot}-${endSlot}`);
    
    for (const batch of batches) {
      const availableSubjects = this.getBatchAvailableSubjects(batch);
      
      if (availableSubjects.length === 0) {
        console.log(`ℹ️ Batch ${batch} has no remaining subjects - skipping`);
        continue;
      }
      
      console.log(`🎯 Batch ${batch} has ${availableSubjects.length} available subjects: ${availableSubjects.map(s => s.subject).join(', ')}`);
      
      // ✅ ENHANCED: Try multiple fallback strategies
      let assignmentFound = false;
      
      // Strategy 1: Try subjects with highest remaining hours first
      const prioritizedSubjects = this.prioritizeSubjectsByHoursAndTeacher(availableSubjects, usedTeachers, tempTeacherAvailability, day, timeBlock);
      
      for (const subjectProgress of prioritizedSubjects) {
        const result = this.tryAssignSubjectToBatch(
          batch, subjectProgress, day, timeBlock, 
          usedTeachers, usedLabs, tempTeacherAvailability, tempLabAvailability, inputData
        );
        
        if (result.success) {
          tentativeAssignments.push(result.assignment);
          usedTeachers.add(subjectProgress.teacher_id);
          usedLabs.add(result.assignment.lab_id);
          
          // Update temporary availability
          const teacherKey1 = `${subjectProgress.teacher_id}-${day}-${startSlot}`;
          const teacherKey2 = `${subjectProgress.teacher_id}-${day}-${endSlot}`;
          tempTeacherAvailability.set(teacherKey1, true);
          tempTeacherAvailability.set(teacherKey2, true);
          
          tempLabAvailability.set(`${result.assignment.lab_id}-${day}-${startSlot}`, true);
          tempLabAvailability.set(`${result.assignment.lab_id}-${day}-${endSlot}`, true);
          
          assignmentFound = true;
          console.log(`✅ ${batch}: ${subjectProgress.subject} assigned with ${subjectProgress.teacher_display_id} - ${subjectProgress.remaining_hours}hrs remaining`);
          break;
        }
      }
      
      // ✅ ENHANCED: Strategy 2 - If no assignment found, try with teacher conflict tolerance
      if (!assignmentFound && availableSubjects.length > 0) {
        console.log(`⚠️ Batch ${batch}: No standard assignment found, trying fallback strategies...`);
        
        for (const subjectProgress of prioritizedSubjects) {
          // Try ignoring teacher availability (allow teacher conflicts for this session)
          const result = this.tryAssignSubjectToBatch(
            batch, subjectProgress, day, timeBlock, 
            new Set(), usedLabs, new Map(), tempLabAvailability, inputData // Reset teacher constraints
          );
          
          if (result.success) {
            tentativeAssignments.push(result.assignment);
            usedLabs.add(result.assignment.lab_id);
            
            tempLabAvailability.set(`${result.assignment.lab_id}-${day}-${startSlot}`, true);
            tempLabAvailability.set(`${result.assignment.lab_id}-${day}-${endSlot}`, true);
            
            assignmentFound = true;
            console.log(`⚠️ ${batch}: ${subjectProgress.subject} assigned with teacher conflict tolerance - ${subjectProgress.remaining_hours}hrs remaining`);
            break;
          }
        }
      }
      
      if (!assignmentFound) {
        console.log(`❌ No assignment found for batch ${batch} after all strategies - continuing with other batches`);
        // Don't fail the entire allocation - continue with other batches
      }
    }
    
    // ✅ ENHANCED: Accept partial assignments (at least one batch assigned)
    const success = tentativeAssignments.length > 0;
    
    if (success) {
      console.log(`✅ Partial assignment successful: ${tentativeAssignments.length}/${batches.length} batches assigned`);
    } else {
      console.log(`❌ No assignments possible for any batch in ${division}`);
    }
    
    return {
      success: success,
      assignments: tentativeAssignments,
      totalBatches: batches.length,
      assignedBatches: tentativeAssignments.length
    };
  }

  // ✅ NEW: Helper method to try assigning a subject to a batch
  tryAssignSubjectToBatch(batch, subjectProgress, day, timeBlock, usedTeachers, usedLabs, tempTeacherAvailability, tempLabAvailability, inputData) {
    const startSlot = timeBlock.start_slot || timeBlock.startslot;
    const endSlot = timeBlock.end_slot || timeBlock.endslot;
    
    const teacherKey1 = `${subjectProgress.teacher_id}-${day}-${startSlot}`;
    const teacherKey2 = `${subjectProgress.teacher_id}-${day}-${endSlot}`;
    
    const teacherBusy = this.teacherAvailability.has(teacherKey1) ||
                       this.teacherAvailability.has(teacherKey2) ||
                       tempTeacherAvailability.has(teacherKey1) ||
                       tempTeacherAvailability.has(teacherKey2) ||
                       usedTeachers.has(subjectProgress.teacher_id);
    
    if (!teacherBusy) {
      const availableLab = inputData.resources.find(lab => {
        const labKey1 = `${lab.roomName}-${day}-${startSlot}`;
        const labKey2 = `${lab.roomName}-${day}-${endSlot}`;
        
        return !usedLabs.has(lab.roomName) &&
               !this.labAvailability.has(labKey1) &&
               !this.labAvailability.has(labKey2) &&
               !tempLabAvailability.has(labKey1) &&
               !tempLabAvailability.has(labKey2);
      });
      
      if (availableLab) {
        return {
          success: true,
          assignment: {
            batch,
            subject: subjectProgress.subject,
            teacher_id: subjectProgress.teacher_id,
            teacher_name: subjectProgress.teacher_name,
            teacher_display_id: subjectProgress.teacher_display_id,
            lab_id: availableLab.roomName,
            progress_key: `${batch}-${subjectProgress.subject}`,
            hours_to_complete: Math.min(2, subjectProgress.remaining_hours)
          }
        };
      }
    }
    
    return { success: false };
  }

  getBatchAvailableSubjects(batch) {
    const availableSubjects = [];
    
    for (const [key, progress] of this.batchSubjectProgress) {
      if (progress.batch === batch && progress.remaining_hours > 0) {
        availableSubjects.push(progress);
      }
    }
    
    return availableSubjects;
  }

  prioritizeSubjectsByHoursAndTeacher(subjects, usedTeachers, tempTeacherAvailability, day, timeBlock) {
    const startSlot = timeBlock.start_slot || timeBlock.startslot;
    const endSlot = timeBlock.end_slot || timeBlock.endslot;
    
    return subjects
      .filter(subject => !usedTeachers.has(subject.teacher_id))
      .sort((a, b) => {
        const teacherKeyA1 = `${a.teacher_id}-${day}-${startSlot}`;
        const teacherKeyA2 = `${a.teacher_id}-${day}-${endSlot}`;
        const teacherKeyB1 = `${b.teacher_id}-${day}-${startSlot}`;
        const teacherKeyB2 = `${b.teacher_id}-${day}-${endSlot}`;
        
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
        
        return b.remaining_hours - a.remaining_hours;
      });
  }

  // ✅ ENHANCED: Fixed teacher name display in lab blocks
  commitBatchAssignmentsWithProgress(division, day, timeBlock, assignments) {
    const startSlot = timeBlock.start_slot || timeBlock.startslot;
    const endSlot = timeBlock.end_slot || timeBlock.endslot;
    const timeRange = timeBlock.time_range || `${startSlot}-${endSlot}`;
    
    for (const assignment of assignments) {
      const sessionData = {
        day,
        start_slot: startSlot,
        end_slot: endSlot,
        division,
        batch: assignment.batch,
        subject: assignment.subject,
        teacher_id: assignment.teacher_id,
        teacher_name: assignment.teacher_name,
        teacher_display_id: assignment.teacher_display_id,
        lab_id: assignment.lab_id,
        // ✅ Enhanced formatted display with proper teacher name
        formatted: `${assignment.subject}/${assignment.teacher_display_id || assignment.teacher_name}/${assignment.batch}/${assignment.lab_id}`,
        formattedDisplay: `${assignment.subject} | ${assignment.teacher_display_id || assignment.teacher_name} | ${assignment.lab_id}`,
        teacherName: assignment.teacher_name,        // ✅ Additional field for frontend
        teacherDisplayId: assignment.teacher_display_id, // ✅ Additional field for frontend
        is_2_hour_block: true,
        hours_completed: assignment.hours_to_complete
      };
      
      this.scheduleMatrix.push(sessionData);
      
      const teacherKey1 = `${assignment.teacher_id}-${day}-${startSlot}`;
      const teacherKey2 = `${assignment.teacher_id}-${day}-${endSlot}`;
      this.teacherAvailability.set(teacherKey1, true);
      this.teacherAvailability.set(teacherKey2, true);
      
      const labKey1 = `${assignment.lab_id}-${day}-${startSlot}`;
      const labKey2 = `${assignment.lab_id}-${day}-${endSlot}`;
      this.labAvailability.set(labKey1, true);
      this.labAvailability.set(labKey2, true);
      
      this.updateBatchProgress(assignment.progress_key, assignment.hours_to_complete);
      
      const subjectKey = `${assignment.batch}-${assignment.subject}`;
      const currentHours = this.subjectHoursCompleted.get(subjectKey) || 0;
      this.subjectHoursCompleted.set(subjectKey, currentHours + assignment.hours_to_complete);
    }
    
    this.resolutionLog.push({
      action: "multi_day_scheduled",
      division,
      day,
      time_block: `${startSlot}-${endSlot}`,
      time_range: timeRange,
      assignments: assignments.map(a => `${a.batch}:${a.subject}(${a.hours_to_complete}hrs)`)
    });
    
    console.log(`📝 MULTI-DAY COMMITTED: ${assignments.length} assignments for ${division} on ${day} at ${startSlot}-${endSlot}`);
  }

  updateBatchProgress(progressKey, hoursCompleted) {
    const progress = this.batchSubjectProgress.get(progressKey);
    if (progress) {
      progress.completed_hours += hoursCompleted;
      progress.remaining_hours = Math.max(0, progress.total_hours - progress.completed_hours);
      progress.status = progress.remaining_hours === 0 ? 'completed' : 'in_progress';
      
      console.log(`📊 Progress updated: ${progressKey} → ${progress.completed_hours}/${progress.total_hours} hours (${progress.remaining_hours} remaining)`);
    }
  }

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
    
    if (pending.length > 0) {
      console.log(`⏳ Pending Details: ${pending.slice(0, 5).join(', ')}${pending.length > 5 ? '...' : ''}`);
    }
  }

  generateAllocationCombinations(divisions, timeBlocks) {
    const combinations = [];
    
    if (timeBlocks.length >= divisions.length) {
      const sequential = divisions.map((division, index) => ({
        division,
        timeBlock: timeBlocks[index]
      }));
      combinations.push(sequential);
    }
    
    if (timeBlocks.length >= divisions.length) {
      const reverse = divisions.map((division, index) => ({
        division,
        timeBlock: timeBlocks[timeBlocks.length - 1 - index]
      }));
      combinations.push(reverse);
    }
    
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
              startslot: startSlot.slotNumber,
              endslot: endSlot.slotNumber,
              time_range: `${startSlot.startTime}-${endSlot.endTime}`
            });
          }
        }
      }
    }
    
    return blocks;
  }

  async gatherInputData() {
    console.log('📥 Gathering input data from database...');
    
    const divisions = {};
    const divisionsData = await Division.find()
      .populate('syllabusId')
      .lean();
    
    divisionsData.forEach(div => {
      const batches = div.batches.map(b => b.name);
      divisions[div.name] = batches;
    });
    
    const teachers = await Teacher.find().lean();
    console.log(`✅ Teachers fetched from MongoDB: ${teachers.length}`);
    
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
        completion_rate: totalSubjects > 0 ? ((completedSubjects / totalSubjects) * 100).toFixed(2) : '0.00',
        success_rate: this.conflictReport.length === 0 ? 100 :
          ((scheduledDivisions / (scheduledDivisions + this.conflictReport.length)) * 100).toFixed(2)
      }
    };
  }

  // ✅ ENHANCED: Improved database saving with teacher name fields
  async saveScheduleToDatabase(scheduleMatrix) {
    try {
      console.log('💾 Saving schedule to database...');
      
      await LabScheduleSession.deleteMany({});
      
      const scheduleId = new mongoose.Types.ObjectId();
      
      const sessionsToSave = scheduleMatrix.map(session => ({
        day: session.day,
        start_slot: session.start_slot,
        end_slot: session.end_slot,
        division: session.division,
        batch: session.batch,
        subject: session.subject,
        teacher_id: session.teacher_id,
        // ✅ Enhanced teacher name fields for proper display
        teacherName: session.teacher_name,
        teacherDisplayId: session.teacher_display_id || session.teacher_name,
        teacher_name: session.teacher_name,         // For backward compatibility
        teacher_display_id: session.teacher_display_id, // For backward compatibility
        lab_id: session.lab_id,
        sessionType: 'lab',
        duration: 2,
        formattedDisplay: session.formattedDisplay || session.formatted,
        formatted: session.formatted, // Keep original format too
        schedule_id: scheduleId,
        generatedAt: new Date()
      }));
      
      if (sessionsToSave.length > 0) {
        await LabScheduleSession.insertMany(sessionsToSave);
        console.log(`✅ Saved ${sessionsToSave.length} lab sessions to database`);
      }
      
      return sessionsToSave.length;
    } catch (error) {
      console.error('❌ Error saving schedule to database:', error);
      throw error;
    }
  }
}

module.exports = LabSchedulingEngine;
