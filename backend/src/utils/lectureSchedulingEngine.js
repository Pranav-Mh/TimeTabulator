const LectureScheduleSession = require('../models/LectureScheduleSession');
const LabScheduleSession = require('../models/LabScheduleSession');
const Division = require('../models/Division');
const LectureAssignment = require('../models/LectureAssignment');
const Subject = require('../models/Subject');
const Resource = require('../models/Resource');
const Teacher = require('../models/Teacher');
const TimeSlotConfiguration = require('../models/TimeSlotConfiguration');
const TimetableRestriction = require('../models/TimetableRestriction');
const mongoose = require('mongoose');

class LectureSchedulingEngine {
  constructor() {
    this.scheduleMatrix = [];
    this.oeTeacherBookings = {};
    this.classroomAvailability = new Map();
    this.teacherAvailability = new Map();
    this.divisionSchedule = new Map();
    this.globalRestrictions = new Set();
    this.yearRestrictions = new Map();
    this.subjectHoursCompleted = new Map();
    this.debugLog = { scheduledLectures: [], unscheduledLectures: [] };
    this.conflictReport = [];
    this.dayRotationIndex = 0;
  }

  // ✅ Calculate minimum classrooms required
  async calculateMinimumClassroomsRequired(inputData) {
    console.log('🏫 ===== MINIMUM CLASSROOM REQUIREMENT ANALYSIS =====');
    
    const { academicYears, divisions } = inputData;
    const totalDivisions = divisions.length;
    const currentClassroomCount = await Resource.countDocuments({ type: 'CR', isActive: true });
    
    console.log(`📊 Analysis Parameters:`);
    console.log(`   Total Divisions: ${totalDivisions}`);
    console.log(`   Current Classrooms Available: ${currentClassroomCount}`);
    
    const minimumClassroomsRequired = totalDivisions;
    const additionalClassroomsNeeded = Math.max(0, minimumClassroomsRequired - currentClassroomCount);
    
    const reasoning = [
      `📐 Classroom Requirement Calculation:`,
      ``,
      `🎯 Logic: Each division requires one classroom for simultaneous lectures.`,
      ``,
      `📊 Breakdown:`,
      `   - Total Divisions: ${totalDivisions}`,
      `   - Minimum Classrooms Required: ${minimumClassroomsRequired} (1 classroom per division)`,
      `   - Currently Available: ${currentClassroomCount}`,
      `   - Additional Classrooms Needed: ${additionalClassroomsNeeded}`,
      ``
    ];
    
    if (additionalClassroomsNeeded > 0) {
      reasoning.push(`❌ INSUFFICIENT CLASSROOMS: You need ${additionalClassroomsNeeded} more classroom(s).`);
      reasoning.push(``);
      reasoning.push(`💡 Solution: Add ${additionalClassroomsNeeded} more CR (Classroom) resources in "Configure Resources" page.`);
    } else {
      reasoning.push(`✅ SUFFICIENT CLASSROOMS: All divisions can be scheduled with current classrooms.`);
    }
    
    console.log(reasoning.join('\n'));
    console.log('🏫 ===== END CLASSROOM REQUIREMENT ANALYSIS =====\n');
    
    return {
      currentClassrooms: currentClassroomCount,
      minimumClassroomsRequired: minimumClassroomsRequired,
      additionalClassroomsNeeded: additionalClassroomsNeeded,
      sufficient: additionalClassroomsNeeded === 0,
      reasoning: reasoning.join('\n'),
      totalDivisions: totalDivisions
    };
  }

  async scheduleLectures(inputData) {
    try {
      console.log('🎓 LECTURE SCHEDULING ENGINE STARTED');
     
      const { academicYears, divisions, scheduleId } = inputData;
     
      const timeSlotConfig = await TimeSlotConfiguration.findOne({});
      if (!timeSlotConfig || !timeSlotConfig.timeSlots) {
        throw new Error('Time slot configuration not found');
      }

      // Calculate minimum classroom requirement BEFORE scheduling
      const classroomRequirement = await this.calculateMinimumClassroomsRequired(inputData);
      
      // BLOCK scheduling if insufficient classrooms
      if (!classroomRequirement.sufficient) {
        console.log('❌ CRITICAL: Insufficient classroom capacity detected!');
        console.log(`Need ${classroomRequirement.additionalClassroomsNeeded} more classrooms`);
        console.log('🚫 BLOCKING LECTURE SCHEDULING to prevent incomplete timetables.');
        
        return {
          success: false,
          error: 'INSUFFICIENT_CLASSROOM_CAPACITY',
          classroomRequirementAnalysis: classroomRequirement,
          classroomRequirementError: {
            currentClassrooms: classroomRequirement.currentClassrooms,
            minimumRequired: classroomRequirement.minimumClassroomsRequired,
            additionalClassroomsNeeded: classroomRequirement.additionalClassroomsNeeded,
            message: `Lecture scheduling requires ${classroomRequirement.additionalClassroomsNeeded} additional classroom(s). Please add more CR resources before generating timetable.`,
            recommendation: `Add ${classroomRequirement.additionalClassroomsNeeded} more CR (Classroom) resources and try again.`,
            reasoning: classroomRequirement.reasoning
          }
        };
      }
      
      console.log('✅ Classroom capacity is sufficient for all divisions.');

      const restrictions = await TimetableRestriction.find({ isActive: true });
      await this.buildOETeacherBookings(academicYears, restrictions);
     
      console.log(`🔍 Fetching lab schedules with schedule_id: ${scheduleId}...`);
     
      let labSchedules = [];
      try {
        labSchedules = await LabScheduleSession.find({ schedule_id: scheduleId }).lean();
        if (!labSchedules || labSchedules.length === 0) {
          console.log('⚠️ No lab schedules found with schedule_id, fetching all recent sessions...');
          labSchedules = await LabScheduleSession.find().sort({ createdAt: -1 }).limit(200).lean();
        }
        console.log(`✅ Found ${labSchedules.length} lab sessions to process`);
      } catch (error) {
        console.error('❌ Error fetching lab schedules:', error);
        labSchedules = [];
      }
     
      this.initializeAvailability(timeSlotConfig, labSchedules, restrictions);
     
      const lectureAssignments = await this.fetchLectureAssignments(academicYears);
      const classrooms = await Resource.find({ type: 'CR', isActive: true });
     
      console.log(`📚 Found ${classrooms.length} classrooms available for lectures`);
     
      // ✅ FIRST PASS: Schedule with strict rule (1 lecture per subject per day)
      console.log('\n🎯 ===== FIRST PASS: Strict Scheduling (1 lecture/subject/day) =====\n');
      
      for (const year of academicYears) {
        const yearDivisions = divisions.filter(d => d.academicYear === year);
        for (const division of yearDivisions) {
          await this.scheduleDivisionLectures(
            division,
            lectureAssignments,
            classrooms,
            timeSlotConfig,
            scheduleId,
            true  // ✅ strictMode = true (enforce 1 lecture/subject/day)
          );
        }
      }
      
      const firstPassScheduled = this.debugLog.scheduledLectures.length;
      const firstPassUnscheduled = this.debugLog.unscheduledLectures.length;
      
      console.log(`\n📊 First Pass Results: ${firstPassScheduled} scheduled, ${firstPassUnscheduled} unscheduled\n`);
      
      // ✅ SECOND PASS: Relax rule for remaining unscheduled lectures
      if (this.debugLog.unscheduledLectures.length > 0) {
        console.log('🔄 ===== SECOND PASS: Relaxed Scheduling (allow multiple/day) =====\n');
        console.log(`🎯 Attempting to schedule ${this.debugLog.unscheduledLectures.length} remaining lectures...\n`);
        
        // Store unscheduled lectures for second pass
        const remainingLectures = [...this.debugLog.unscheduledLectures];
        this.debugLog.unscheduledLectures = []; // Clear for second pass
        
        for (const unscheduled of remainingLectures) {
          // Find the division and assignment
          const division = divisions.find(d => d.name === unscheduled.division);
          if (!division) continue;
          
          const assignment = lectureAssignments.find(a =>
            a.divisionId && 
            a.divisionId._id.toString() === division._id.toString() &&
            a.subjectId && 
            a.subjectId.name === unscheduled.subject
          );
          
          if (!assignment) continue;
          
          // Attempt to schedule remaining hours with relaxed rules
          await this.scheduleRemainingLectures(
            division,
            assignment,
            classrooms,
            timeSlotConfig,
            scheduleId,
            unscheduled.hoursRemaining
          );
        }
        
        const secondPassScheduled = this.debugLog.scheduledLectures.length - firstPassScheduled;
        console.log(`\n📊 Second Pass Results: ${secondPassScheduled} additional lectures scheduled\n`);
      }
      
      if (this.debugLog.scheduledLectures.length > 0) {
        await LectureScheduleSession.insertMany(this.debugLog.scheduledLectures);
        console.log(`💾 Saved ${this.debugLog.scheduledLectures.length} lecture sessions to database`);
      }
     
      const statistics = this.generateStatistics();
     
      console.log('✅ LECTURE SCHEDULING COMPLETED');
      console.log(`📊 Total Lectures: ${this.debugLog.scheduledLectures.length} scheduled, ${this.debugLog.unscheduledLectures.length} unscheduled`);
     
      return {
        success: true,
        classroomRequirementAnalysis: classroomRequirement,
        scheduledLectures: this.debugLog.scheduledLectures,
        unscheduledLectures: this.debugLog.unscheduledLectures,
        sessionsScheduled: this.debugLog.scheduledLectures.length,
        totalHoursScheduled: this.debugLog.scheduledLectures.length,
        conflicts: this.conflictReport,
        statistics
      };
     
    } catch (error) {
      console.error('❌ Lecture Scheduling Error:', error);
      throw error;
    }
  }

  // ✅ NEW: Schedule remaining lectures with relaxed rules
  async scheduleRemainingLectures(division, assignment, classrooms, timeSlotConfig, scheduleId, hoursRemaining) {
    const subject = assignment.subjectId;
    const teacher = assignment.teacherId;
    
    console.log(`\n🔄 Second Pass: Scheduling ${subject.name} for ${division.name} - Need: ${hoursRemaining} hours (relaxed mode)`);
    
    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const scheduledSlots = [];
    let hoursScheduled = 0;
    
    // Try all days and all slots without the "1 per day" restriction
    for (const day of allDays) {
      if (hoursScheduled >= hoursRemaining) break;
      
      for (const slotConfig of timeSlotConfig.timeSlots) {
        if (hoursScheduled >= hoursRemaining) break;
        
        const slotNumber = slotConfig.slotNumber;
        
        // ✅ Use relaxed availability check (no "1 per day" rule)
        if (this.isSlotAvailableForLecture(
          division,
          day,
          slotNumber,
          teacher._id,
          classrooms,
          scheduledSlots,
          false  // ✅ strictMode = false (allow multiple lectures per day)
        )) {
          const classroom = this.findAvailableClassroom(classrooms, day, slotNumber);
          
          if (classroom) {
            this.scheduleOneLecture(division, day, slotNumber, subject, teacher, classroom, scheduleId, scheduledSlots);
            hoursScheduled++;
            console.log(`  ✅ ${day} Slot ${slotNumber} - Progress: ${hoursScheduled}/${hoursRemaining} (relaxed mode)`);
          }
        }
      }
    }
    
    if (hoursScheduled < hoursRemaining) {
      this.debugLog.unscheduledLectures.push({
        division: division.name,
        subject: subject.name,
        teacher: teacher.name,
        hoursNeeded: hoursRemaining,
        hoursScheduled: hoursScheduled,
        hoursRemaining: hoursRemaining - hoursScheduled,
        reason: 'Insufficient free slots even with relaxed constraints'
      });
      console.warn(`⚠️ STILL INCOMPLETE: ${subject.name} (${hoursScheduled}/${hoursRemaining} hours scheduled in second pass)`);
    } else {
      console.log(`✅ COMPLETE (Second Pass): ${subject.name} (${hoursScheduled}/${hoursRemaining} hours)`);
    }
  }

  async buildOETeacherBookings(academicYears, restrictions) {
    console.log('📚 Building OE teacher booking map...');
    this.oeTeacherBookings = {};
   
    for (const year of academicYears) {
      this.oeTeacherBookings[year] = {};
     
      const oeSubjects = await Subject.find({
        academicYear: year,
        type: 'OE'
      });
     
      if (oeSubjects.length === 0) {
        console.log(`📚 No OE subjects found for ${year}`);
        continue;
      }
     
      const oeTeacherAssignments = await LectureAssignment.find({
        subjectId: { $in: oeSubjects.map(s => s._id) }
      }).populate('teacherId');
     
      const oeTeacherIds = oeTeacherAssignments
        .filter(a => a.teacherId)
        .map(a => a.teacherId._id.toString());
     
      console.log(`📚 Found ${oeTeacherIds.length} OE teachers for ${year}`);
     
      const yearMapping = { 'SE': '2nd Year', 'TE': '3rd Year', 'BE': '4th Year' };
      const yearLabel = yearMapping[year];
     
      const oeRestrictions = restrictions.filter(r =>
        r.scope === 'year-specific' &&
        r.affectedYears &&
        r.affectedYears.includes(yearLabel) &&
        (r.restrictionName.toLowerCase().includes('open elective') ||
         r.restrictionName.toLowerCase().includes('oe') ||
         r.restrictionName.toLowerCase().includes('elective'))
      );
     
      console.log(`📚 Found ${oeRestrictions.length} OE restrictions for ${year}`);
     
      for (const restriction of oeRestrictions) {
        const days = restriction.days && restriction.days.length > 0
          ? restriction.days
          : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
       
        const timeSlots = restriction.timeSlots || [];
       
        for (const day of days) {
          if (days.includes('All days') || days.includes(day)) {
            for (const slotNumber of timeSlots) {
              const key = `${day}-${slotNumber}`;
             
              if (!this.oeTeacherBookings[year][key]) {
                this.oeTeacherBookings[year][key] = [];
              }
             
              this.oeTeacherBookings[year][key].push(...oeTeacherIds);
            }
          }
        }
      }
    }
   
    console.log('✅ OE Teacher Bookings:', JSON.stringify(this.oeTeacherBookings, null, 2));
  }

  initializeAvailability(timeSlotConfig, labSchedules, restrictions) {
    console.log('🔄 Initializing availability matrices...');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
   
    // Load global restrictions
    let globalCount = 0;
    for (const restriction of restrictions) {
      if (restriction.scope === 'global') {
        const restrictedDays = restriction.days && restriction.days.length > 0
          ? restriction.days
          : days;
        const restrictedSlots = restriction.timeSlots || [];
       
        console.log(`🌐 Loading global restriction: "${restriction.restrictionName}" on days [${restrictedDays.join(', ')}] slots [${restrictedSlots.join(', ')}]`);
       
        for (const day of days) {
          if (restrictedDays.includes('All days') || restrictedDays.includes(day)) {
            for (const slotNumber of restrictedSlots) {
              const key = `${day}-${slotNumber}`;
              this.globalRestrictions.add(key);
              this.scheduleMatrix.push({
                day: day,
                slotNumber: slotNumber,
                type: 'global-restriction',
                reason: restriction.restrictionName
              });
              globalCount++;
            }
          }
        }
      }
    }
   
    console.log(`📋 Marked ${this.globalRestrictions.size} unique global restriction slots (${globalCount} total day-slot combinations)`);
   
    // Load year-specific restrictions
    const yearMapping = { '2nd Year': 'SE', '3rd Year': 'TE', '4th Year': 'BE' };
   
    for (const restriction of restrictions) {
      if (restriction.scope === 'year-specific') {
        const restrictedDays = restriction.days && restriction.days.length > 0
          ? restriction.days
          : days;
        const restrictedSlots = restriction.timeSlots || [];
        const affectedYears = restriction.affectedYears || [];
       
        console.log(`🎓 Loading year-specific restriction: "${restriction.restrictionName}" for [${affectedYears.join(', ')}] on days [${restrictedDays.join(', ')}] slots [${restrictedSlots.join(', ')}]`);
       
        for (const yearLabel of affectedYears) {
          const academicYear = yearMapping[yearLabel];
          if (!academicYear) continue;
         
          if (!this.yearRestrictions.has(academicYear)) {
            this.yearRestrictions.set(academicYear, new Set());
          }
         
          for (const day of days) {
            if (restrictedDays.includes('All days') || restrictedDays.includes(day)) {
              for (const slotNumber of restrictedSlots) {
                const key = `${day}-${slotNumber}`;
                this.yearRestrictions.get(academicYear).add(key);
              }
            }
          }
        }
      }
    }
   
    console.log(`📋 Year-specific restrictions loaded:`,
      Array.from(this.yearRestrictions.entries()).map(([year, slots]) =>
        `${year}: ${slots.size} slots`
      ).join(', ')
    );
   
    // Lab blocking
    let blockedCount = 0;
    let teachersBlocked = new Set();
   
    for (const labSession of labSchedules) {
      try {
        const division = labSession.division;
        const day = labSession.day;
        const startSlot = labSession.start_slot || labSession.startSlot;
        const endSlot = labSession.end_slot || labSession.endSlot;
        const teacherId = labSession.teacher_id || labSession.teacherId;
        const subject = labSession.subject || labSession.subject_name || 'Lab';
       
        if (!division || !day || !startSlot || !endSlot || !teacherId) {
          console.warn('⚠️ Skipping invalid lab session:', {
            division, day, startSlot, endSlot, teacherId
          });
          continue;
        }
       
        for (let slot = startSlot; slot <= endSlot; slot++) {
          const divisionKey = `${division}-${day}-${slot}`;
          this.divisionSchedule.set(divisionKey, `lab-${subject}`);
         
          const teacherKey = `${teacherId}-${day}-${slot}`;
          this.teacherAvailability.set(teacherKey, `busy-lab-${subject}`);
          blockedCount++;
        }
       
        teachersBlocked.add(teacherId.toString());
      } catch (error) {
        console.error('❌ Error processing lab session:', error, labSession);
        continue;
      }
    }
   
    console.log(`📋 Marked ${labSchedules.length} lab sessions (${blockedCount} total slot blocks, ${teachersBlocked.size} unique teachers blocked)`);
    console.log('✅ Availability matrices initialized');
    console.log(`📊 Total restrictions: ${this.globalRestrictions.size} global + ${Array.from(this.yearRestrictions.values()).reduce((sum, set) => sum + set.size, 0)} year-specific`);
  }

  async fetchLectureAssignments(academicYears) {
    console.log('📖 Fetching lecture assignments...');
   
    const assignments = await LectureAssignment.find({
      academicYear: { $in: academicYears }
    })
    .populate('subjectId')
    .populate('teacherId')
    .populate('divisionId');
   
    const filteredAssignments = assignments.filter(a =>
      a.subjectId &&
      (a.subjectId.type === 'TH' || a.subjectId.type === 'VAP')
    );
   
    console.log(`✅ Fetched ${filteredAssignments.length} lecture assignments (TH + VAP)`);
    return filteredAssignments;
  }

  // ✅ UPDATED: Added strictMode parameter
  async scheduleDivisionLectures(division, lectureAssignments, classrooms, timeSlotConfig, scheduleId, strictMode = true) {
    console.log(`\n📅 ========== Scheduling lectures for ${division.name} (${strictMode ? 'STRICT' : 'RELAXED'} mode) ==========`);
   
    const divisionAssignments = lectureAssignments.filter(a =>
      a.divisionId && a.divisionId._id.toString() === division._id.toString()
    );
   
    divisionAssignments.sort((a, b) => {
      if (a.subjectId.type === 'TH' && b.subjectId.type !== 'TH') return -1;
      if (a.subjectId.type !== 'TH' && b.subjectId.type === 'TH') return 1;
      return 0;
    });
   
    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
   
    for (const assignment of divisionAssignments) {
      const subject = assignment.subjectId;
      const teacher = assignment.teacherId;
      const hoursNeeded = assignment.hoursPerWeek || 2;
     
      console.log(`\n🎯 Scheduling ${subject.name} - Need: ${hoursNeeded} hours`);
     
      let hoursScheduled = 0;
      const scheduledSlots = [];
     
      let dayAttempts = 0;
      const maxDayAttempts = allDays.length * timeSlotConfig.timeSlots.length * 3;
     
      while (hoursScheduled < hoursNeeded && dayAttempts < maxDayAttempts) {
        const dayIndex = this.dayRotationIndex % allDays.length;
        const day = allDays[dayIndex];
       
        for (const slotConfig of timeSlotConfig.timeSlots) {
          if (hoursScheduled >= hoursNeeded) break;
         
          const slotNumber = slotConfig.slotNumber;
         
          // ✅ Pass strictMode to availability check
          if (this.isSlotAvailableForLecture(
            division,
            day,
            slotNumber,
            teacher._id,
            classrooms,
            scheduledSlots,
            strictMode  // ✅ Pass strict mode flag
          )) {
            const classroom = this.findAvailableClassroom(classrooms, day, slotNumber);
           
            if (classroom) {
              this.scheduleOneLecture(division, day, slotNumber, subject, teacher, classroom, scheduleId, scheduledSlots);
              hoursScheduled++;
              console.log(`  ✅ ${day} Slot ${slotNumber} - Progress: ${hoursScheduled}/${hoursNeeded}`);
            }
          }
        }
       
        this.dayRotationIndex++;
        dayAttempts++;
      }
     
      if (hoursScheduled < hoursNeeded) {
        this.debugLog.unscheduledLectures.push({
          division: division.name,
          subject: subject.name,
          teacher: teacher.name,
          hoursNeeded: hoursNeeded,
          hoursScheduled: hoursScheduled,
          hoursRemaining: hoursNeeded - hoursScheduled,
          reason: strictMode 
            ? 'Insufficient free slots with 1-lecture-per-day constraint' 
            : 'Insufficient free slots even with relaxed constraints'
        });
       
        console.warn(`⚠️ INCOMPLETE: ${subject.name} (${hoursScheduled}/${hoursNeeded} hours)`);
      } else {
        console.log(`✅ COMPLETE: ${subject.name} (${hoursScheduled}/${hoursNeeded} hours)`);
      }
    }
   
    console.log(`\n📅 ========== Finished ${division.name} ==========\n`);
  }

  scheduleOneLecture(division, day, slotNumber, subject, teacher, classroom, scheduleId, scheduledSlots) {
    const lectureSession = {
      schedule_id: scheduleId,
      division: division.name,
      academicYear: division.academicYear,
      day: day,
      slot_number: slotNumber,
      subject_id: subject._id,
      subject_name: subject.name,
      subject_type: subject.type,
      teacher_id: teacher._id,
      teacher_name: teacher.name,
      classroom_id: classroom._id,
      classroom_name: classroom.roomName,
      session_type: 'lecture',
      duration: 1,
      formatted_display: `${subject.name} / ${teacher.name} / ${classroom.roomName}`
    };
   
    this.debugLog.scheduledLectures.push(lectureSession);
    this.markResourcesAsUsed(division.name, day, slotNumber, teacher._id, classroom._id);
    scheduledSlots.push({ day, slotNumber });
  }

  // ✅ UPDATED: Added strictMode parameter
  isSlotAvailableForLecture(division, day, slotNumber, teacherId, classrooms, scheduledSlots, strictMode = true) {
    const slotKey = `${day}-${slotNumber}`;
   
    // 1. Check global restrictions
    if (this.globalRestrictions.has(slotKey)) {
      return false;
    }
   
    // 2. Check year-specific restrictions
    const divisionYear = division.academicYear;
    if (this.yearRestrictions.has(divisionYear) && this.yearRestrictions.get(divisionYear).has(slotKey)) {
      return false;
    }
   
    // 3. Check if division has lab/lecture in this slot
    const divisionSlotKey = `${division.name}-${day}-${slotNumber}`;
    if (this.divisionSchedule.has(divisionSlotKey)) {
      return false;
    }
   
    // 4. Check if teacher is busy
    const teacherKey = `${teacherId}-${day}-${slotNumber}`;
    if (this.teacherAvailability.has(teacherKey)) {
      return false;
    }
   
    // 5. Check OE restrictions
    if (this.oeTeacherBookings[divisionYear] &&
        this.oeTeacherBookings[divisionYear][slotKey] &&
        this.oeTeacherBookings[divisionYear][slotKey].includes(teacherId.toString())) {
      return false;
    }
   
    // ✅ 6. CONDITIONAL: Apply 1-lecture-per-day rule only in strict mode
    if (strictMode) {
      const sameDay = scheduledSlots.filter(s => s.day === day);
      if (sameDay.length >= 1) return false;
    }
   
    return true;
  }

  findAvailableClassroom(classrooms, day, slotNumber) {
    for (const classroom of classrooms) {
      const classroomKey = `${classroom._id}-${day}-${slotNumber}`;
     
      if (!this.classroomAvailability.has(classroomKey)) {
        return classroom;
      }
    }
    return null;
  }

  markResourcesAsUsed(divisionName, day, slotNumber, teacherId, classroomId) {
    const divisionKey = `${divisionName}-${day}-${slotNumber}`;
    this.divisionSchedule.set(divisionKey, 'lecture');
   
    const teacherKey = `${teacherId}-${day}-${slotNumber}`;
    this.teacherAvailability.set(teacherKey, 'busy-lecture');
   
    const classroomKey = `${classroomId}-${day}-${slotNumber}`;
    this.classroomAvailability.set(classroomKey, 'busy');
  }

  generateStatistics() {
    const byDivision = {};
    const byTeacher = {};
   
    for (const lecture of this.debugLog.scheduledLectures) {
      if (!byDivision[lecture.division]) {
        byDivision[lecture.division] = 0;
      }
      byDivision[lecture.division]++;
     
      if (!byTeacher[lecture.teacher_name]) {
        byTeacher[lecture.teacher_name] = 0;
      }
      byTeacher[lecture.teacher_name]++;
    }
   
    const totalPossible = this.debugLog.scheduledLectures.length +
      this.debugLog.unscheduledLectures.reduce((sum, u) => sum + u.hoursRemaining, 0);
    const utilizationRate = totalPossible > 0
      ? ((this.debugLog.scheduledLectures.length / totalPossible) * 100).toFixed(2) + '%'
      : '0%';
   
    return {
      byDivision,
      byTeacher,
      utilizationRate
    };
  }
}

module.exports = LectureSchedulingEngine;
