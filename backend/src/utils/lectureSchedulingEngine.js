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
    this.subjectHoursCompleted = new Map();
    this.debugLog = { scheduledLectures: [], unscheduledLectures: [] };
    this.conflictReport = [];
    this.dayRotationIndex = 0; // ✅ NEW: Track which day to start from
  }

  async scheduleLectures(inputData) {
    try {
      console.log('🎓 LECTURE SCHEDULING ENGINE STARTED');
      
      const { academicYears, divisions, scheduleId } = inputData;
      
      const timeSlotConfig = await TimeSlotConfiguration.findOne({});
      if (!timeSlotConfig || !timeSlotConfig.timeSlots) {
        throw new Error('Time slot configuration not found');
      }

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
      
      for (const year of academicYears) {
        const yearDivisions = divisions.filter(d => d.academicYear === year);
        
        for (const division of yearDivisions) {
          await this.scheduleDivisionLectures(
            division,
            lectureAssignments,
            classrooms,
            timeSlotConfig,
            scheduleId
          );
        }
      }
      
      if (this.debugLog.scheduledLectures.length > 0) {
        await LectureScheduleSession.insertMany(this.debugLog.scheduledLectures);
        console.log(`💾 Saved ${this.debugLog.scheduledLectures.length} lecture sessions to database`);
      }
      
      const statistics = this.generateStatistics();
      
      console.log('✅ LECTURE SCHEDULING COMPLETED');
      
      return {
        success: true,
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
        r.type === 'time' &&
        (r.restrictionName.toLowerCase().includes('open elective') || 
         r.restrictionName.toLowerCase().includes('oe') ||
         r.restrictionName.toLowerCase().includes('elective'))
      );
      
      console.log(`📚 Found ${oeRestrictions.length} OE restrictions for ${year}`);
      
      for (const restriction of oeRestrictions) {
        const days = restriction.days && restriction.days.length > 0 
          ? restriction.days.filter(d => d !== 'All days')
          : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        const timeSlots = restriction.timeSlots || [];
        
        for (const day of days) {
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
    
    console.log('✅ OE Teacher Bookings:', JSON.stringify(this.oeTeacherBookings, null, 2));
  }

  initializeAvailability(timeSlotConfig, labSchedules, restrictions) {
    console.log('🔄 Initializing availability matrices...');
    
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (const restriction of restrictions) {
      if (restriction.scope === 'global' && restriction.type === 'time') {
        const restrictedDays = restriction.days && restriction.days.length > 0
          ? restriction.days.filter(d => d !== 'All days')
          : days;
        
        const restrictedSlots = restriction.timeSlots || [];
        
        for (const day of restrictedDays) {
          for (const slotNumber of restrictedSlots) {
            this.scheduleMatrix.push({
              day: day,
              slotNumber: slotNumber,
              type: 'global-restriction',
              reason: restriction.restrictionName
            });
          }
        }
      }
    }
    
    console.log(`📋 Marked ${this.scheduleMatrix.length} global restriction slots`);
    
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

  /**
   * ✅ COMPLETELY FIXED: Round-robin day rotation for even distribution
   */
  async scheduleDivisionLectures(division, lectureAssignments, classrooms, timeSlotConfig, scheduleId) {
    console.log(`\n📅 ========== Scheduling lectures for ${division.name} ==========`);
    
    const divisionAssignments = lectureAssignments.filter(a => 
      a.divisionId && a.divisionId._id.toString() === division._id.toString()
    );
    
    divisionAssignments.sort((a, b) => {
      if (a.subjectId.type === 'TH' && b.subjectId.type !== 'TH') return -1;
      if (a.subjectId.type !== 'TH' && b.subjectId.type === 'TH') return 1;
      return 0;
    });
    
    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (const assignment of divisionAssignments) {
      const subject = assignment.subjectId;
      const teacher = assignment.teacherId;
      const hoursNeeded = assignment.hoursPerWeek || 2;
      
      console.log(`\n🎯 Scheduling ${subject.name} - Need: ${hoursNeeded} hours`);
      
      let hoursScheduled = 0;
      const scheduledSlots = [];
      
      // ✅ CRITICAL FIX: Rotate through days evenly, don't start from Monday every time
      let dayAttempts = 0;
      const maxDayAttempts = allDays.length * timeSlotConfig.timeSlots.length * 2;
      
      while (hoursScheduled < hoursNeeded && dayAttempts < maxDayAttempts) {
        // ✅ Round-robin: Pick day based on current rotation index
        const dayIndex = this.dayRotationIndex % allDays.length;
        const day = allDays[dayIndex];
        
        // Try all slots for this day
        for (const slotConfig of timeSlotConfig.timeSlots) {
          if (hoursScheduled >= hoursNeeded) break;
          
          const slotNumber = slotConfig.slotNumber;
          
          if (this.isSlotAvailableForLecture(
            division,
            day,
            slotNumber,
            teacher._id,
            classrooms,
            scheduledSlots
          )) {
            const classroom = this.findAvailableClassroom(classrooms, day, slotNumber);
            
            if (classroom) {
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
              hoursScheduled++;
              
              console.log(`  ✅ ${day} Slot ${slotNumber} - Progress: ${hoursScheduled}/${hoursNeeded}`);
            }
          }
        }
        
        // ✅ Move to next day in rotation
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
          reason: 'Insufficient free slots'
        });
        
        console.warn(`⚠️ INCOMPLETE: ${subject.name} (${hoursScheduled}/${hoursNeeded} hours)`);
      } else {
        console.log(`✅ COMPLETE: ${subject.name} (${hoursScheduled}/${hoursNeeded} hours)`);
      }
    }
    
    console.log(`\n📅 ========== Finished ${division.name} ==========\n`);
  }

  isSlotAvailableForLecture(division, day, slotNumber, teacherId, classrooms, scheduledSlots) {
    // 1. Check global restrictions
    const isGloballyRestricted = this.scheduleMatrix.some(s => 
      s.day === day && s.slotNumber === slotNumber && s.type === 'global-restriction'
    );
    
    if (isGloballyRestricted) return false;
    
    // 2. Check if division has lab/lecture in this slot
    const divisionSlotKey = `${division.name}-${day}-${slotNumber}`;
    if (this.divisionSchedule.has(divisionSlotKey)) return false;
    
    // 3. Check if teacher is busy
    const teacherKey = `${teacherId}-${day}-${slotNumber}`;
    if (this.teacherAvailability.has(teacherKey)) return false;
    
    // 4. Check OE restrictions
    const divisionYear = division.academicYear;
    const slotKey = `${day}-${slotNumber}`;
    if (this.oeTeacherBookings[divisionYear] && 
        this.oeTeacherBookings[divisionYear][slotKey] &&
        this.oeTeacherBookings[divisionYear][slotKey].includes(teacherId.toString())) {
      return false;
    }
    
    // 5. ✅ Avoid scheduling same subject more than once on same day (spread across week)
    const sameDay = scheduledSlots.filter(s => s.day === day);
    if (sameDay.length >= 1) return false; // ✅ Max 1 lecture per day per subject
    
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
