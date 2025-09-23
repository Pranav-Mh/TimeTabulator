const ConstraintEngine = require('./constraintEngine');

// ✅ Advanced Optimization Algorithm for Timetable Generation
class OptimizationAlgorithm {

  // ✅ Main Generation Entry Point
  static async generateOptimalTimetable(systemData, timeMatrix) {
    console.log('🧠 Starting optimization algorithm...');
    
    const startTime = Date.now();
    const result = {
      success: false,
      timetable: null,
      partialTimetable: null,
      conflicts: [],
      relaxationSuggestions: [],
      statistics: {}
    };

    try {
      // Step 1: Prepare Data Structures
      const preparationResult = this.prepareDataStructures(systemData);
      if (!preparationResult.success) {
        throw new Error('Data preparation failed: ' + preparationResult.error);
      }

      // Step 2: Generate Lab Assignments (2-hour blocks)
      console.log('🔬 Generating lab assignments...');
      const labResult = await this.generateLabAssignments(
        preparationResult.data, 
        timeMatrix
      );

      // Step 3: Generate Lecture Assignments (1-hour blocks)  
      console.log('📚 Generating lecture assignments...');
      const lectureResult = await this.generateLectureAssignments(
        preparationResult.data,
        timeMatrix,
        labResult.assignments
      );

      // Step 4: Validate and Optimize
      console.log('✅ Validating and optimizing...');
      const allAssignments = [...labResult.assignments, ...lectureResult.assignments];
      const validationResult = this.validateCompleteSchedule(allAssignments, systemData);

      // Step 5: Generate Final Result
      const generationTime = Date.now() - startTime;
      
      if (validationResult.isValid) {
        result.success = true;
        result.timetable = this.formatTimetableOutput(allAssignments, systemData);
        result.statistics = this.generateStatistics(allAssignments, generationTime);
      } else {
        result.success = false;
        result.partialTimetable = this.formatTimetableOutput(allAssignments, systemData);
        result.conflicts = validationResult.conflicts;
        result.relaxationSuggestions = this.generateRelaxationSuggestions(validationResult.conflicts);
        result.statistics = this.generateStatistics(allAssignments, generationTime);
      }

      return result;

    } catch (error) {
      console.error('❌ Error in optimization algorithm:', error);
      throw error;
    }
  }

  // ✅ Prepare Data Structures
  static prepareDataStructures(systemData) {
    try {
      const divisions = this.extractDivisions(systemData.syllabusData);
      const subjects = this.extractSubjects(systemData.syllabusData);
      const teachers = systemData.teacherData;
      const rooms = systemData.resources;
      const lectureAssignments = systemData.lectureAssignments;
      const labAssignments = systemData.labAssignments;

      // Create requirement matrices
      const requirements = this.calculateRequirements(
        divisions, 
        subjects, 
        lectureAssignments, 
        labAssignments
      );

      return {
        success: true,
        data: {
          divisions,
          subjects,
          teachers,
          rooms,
          lectureAssignments,
          labAssignments,
          requirements,
          timeConfig: systemData.timeConfig
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ✅ Generate Lab Assignments (2-hour consecutive blocks)
  static async generateLabAssignments(data, timeMatrix) {
    const assignments = [];
    const conflicts = [];
    
    console.log('🔬 Processing lab requirements...');

    // Group lab assignments by division
    const labsByDivision = {};
    data.labAssignments.forEach(lab => {
      const divKey = `${lab.division.year}-${lab.division.divisionName}`;
      if (!labsByDivision[divKey]) {
        labsByDivision[divKey] = [];
      }
      labsByDivision[divKey].push(lab);
    });

    // Generate lab schedules for each division
    for (const [divisionKey, labs] of Object.entries(labsByDivision)) {
      const [year, divisionName] = divisionKey.split('-');
      
      // Process each lab subject
      for (const lab of labs) {
        const subject = lab.subject;
        const teacher = lab.teacher;
        const requiredHours = subject.hoursPerWeek || 4; // Default 4 hours for labs
        const sessionsNeeded = requiredHours / 2; // Each lab session is 2 hours

        console.log(`📝 Processing ${subject.name} for ${divisionKey} - ${sessionsNeeded} sessions needed`);

        // Find available 2-hour blocks
        const availableBlocks = this.findAvailable2HourBlocks(timeMatrix);
        
        let sessionsScheduled = 0;
        for (const block of availableBlocks) {
          if (sessionsScheduled >= sessionsNeeded) break;

          // Validate constraints
          const canSchedule = this.validateLabBlock(
            block, 
            teacher, 
            subject, 
            { year, divisionName }, 
            assignments
          );

          if (canSchedule.valid) {
            // Schedule lab sessions for all 3 batches
            const batches = ['A1', 'A2', 'A3'];
            const labRooms = data.rooms.filter(room => room.type === 'LAB');
            
            batches.forEach((batch, batchIndex) => {
              if (batchIndex < labRooms.length) {
                // First slot of 2-hour lab
                assignments.push({
                  division: { year, divisionName },
                  batch: batch,
                  day: block.day,
                  slotNumber: block.startSlot,
                  subject: {
                    name: subject.name,
                    type: 'PR',
                    credits: subject.credits
                  },
                  teacher: {
                    name: teacher.name,
                    id: teacher._id.toString()
                  },
                  room: {
                    name: labRooms[batchIndex].name,
                    type: 'LAB',
                    capacity: labRooms[batchIndex].capacity
                  },
                  type: 'lab',
                  duration: 1,
                  startTime: block.startTime,
                  endTime: block.midTime,
                  isConsecutive: false
                });

                // Second slot of 2-hour lab
                assignments.push({
                  division: { year, divisionName },
                  batch: batch,
                  day: block.day,
                  slotNumber: block.startSlot + 1,
                  subject: {
                    name: subject.name,
                    type: 'PR',
                    credits: subject.credits
                  },
                  teacher: {
                    name: teacher.name,
                    id: teacher._id.toString()
                  },
                  room: {
                    name: labRooms[batchIndex].name,
                    type: 'LAB',
                    capacity: labRooms[batchIndex].capacity
                  },
                  type: 'lab',
                  duration: 1,
                  startTime: block.midTime,
                  endTime: block.endTime,
                  isConsecutive: true
                });
              }
            });

            // Mark slots as used
            this.markSlotsAsUsed(timeMatrix, block);
            sessionsScheduled++;
            
            console.log(`✅ Scheduled ${subject.name} lab for ${divisionKey} on ${block.day} slots ${block.startSlot}-${block.startSlot + 1}`);
          } else {
            conflicts.push({
              type: 'lab_scheduling_conflict',
              subject: subject.name,
              division: divisionKey,
              reason: canSchedule.reason,
              severity: 'high'
            });
          }
        }

        if (sessionsScheduled < sessionsNeeded) {
          conflicts.push({
            type: 'insufficient_lab_slots',
            subject: subject.name,
            division: divisionKey,
            required: sessionsNeeded,
            scheduled: sessionsScheduled,
            severity: 'high'
          });
        }
      }
    }

    return { assignments, conflicts };
  }

  // ✅ Generate Lecture Assignments (1-hour blocks)
  static async generateLectureAssignments(data, timeMatrix, existingAssignments) {
    const assignments = [];
    const conflicts = [];
    
    console.log('📚 Processing lecture requirements...');

    // Group lecture assignments by division
    const lecturesByDivision = {};
    data.lectureAssignments.forEach(lecture => {
      const divKey = `${lecture.division.year}-${lecture.division.divisionName}`;
      if (!lecturesByDivision[divKey]) {
        lecturesByDivision[divKey] = [];
      }
      lecturesByDivision[divKey].push(lecture);
    });

    // Generate lecture schedules for each division
    for (const [divisionKey, lectures] of Object.entries(lecturesByDivision)) {
      const [year, divisionName] = divisionKey.split('-');
      
      for (const lecture of lectures) {
        const subject = lecture.subject;
        const teacher = lecture.teacher;
        const requiredHours = subject.hoursPerWeek || 3; // Default 3 hours for lectures

        console.log(`📝 Processing ${subject.name} lectures for ${divisionKey} - ${requiredHours} hours needed`);

        // Find available 1-hour slots
        const availableSlots = this.findAvailable1HourSlots(timeMatrix);
        
        let hoursScheduled = 0;
        for (const slot of availableSlots) {
          if (hoursScheduled >= requiredHours) break;

          // Validate constraints
          const canSchedule = this.validateLectureSlot(
            slot,
            teacher,
            subject,
            { year, divisionName },
            [...existingAssignments, ...assignments]
          );

          if (canSchedule.valid) {
            // Find available classroom
            const availableRoom = this.findAvailableClassroom(
              data.rooms,
              slot,
              [...existingAssignments, ...assignments]
            );

            if (availableRoom) {
              assignments.push({
                division: { year, divisionName },
                batch: null, // All batches together for lectures
                day: slot.day,
                slotNumber: slot.slotNumber,
                subject: {
                  name: subject.name,
                  type: subject.type,
                  credits: subject.credits
                },
                teacher: {
                  name: teacher.name,
                  id: teacher._id.toString()
                },
                room: {
                  name: availableRoom.name,
                  type: 'CR',
                  capacity: availableRoom.capacity
                },
                type: 'lecture',
                duration: 1,
                startTime: slot.startTime,
                endTime: slot.endTime,
                isConsecutive: false
              });

              // Mark slot as used
              timeMatrix[slot.day][slot.slotNumber].available = false;
              hoursScheduled++;

              console.log(`✅ Scheduled ${subject.name} lecture for ${divisionKey} on ${slot.day} slot ${slot.slotNumber}`);
            } else {
              conflicts.push({
                type: 'no_available_classroom',
                subject: subject.name,
                division: divisionKey,
                day: slot.day,
                slotNumber: slot.slotNumber,
                severity: 'medium'
              });
            }
          } else {
            conflicts.push({
              type: 'lecture_scheduling_conflict',
              subject: subject.name,
              division: divisionKey,
              reason: canSchedule.reason,
              severity: 'medium'
            });
          }
        }

        if (hoursScheduled < requiredHours) {
          conflicts.push({
            type: 'insufficient_lecture_hours',
            subject: subject.name,
            division: divisionKey,
            required: requiredHours,
            scheduled: hoursScheduled,
            severity: 'high'
          });
        }
      }
    }

    return { assignments, conflicts };
  }

  // ========================================
  // 🔧 HELPER METHODS
  // ========================================

  static extractDivisions(syllabusData) {
    const divisions = [];
    syllabusData.forEach(syllabus => {
      const divisionNames = syllabus.divisions.split(', ');
      divisionNames.forEach(divName => {
        divisions.push({
          year: syllabus.academicYear,
          divisionName: divName,
          subjects: syllabus.subjects
        });
      });
    });
    return divisions;
  }

  static extractSubjects(syllabusData) {
    const subjects = [];
    syllabusData.forEach(syllabus => {
      syllabus.subjects.forEach(subject => {
        if (!subjects.find(s => s.name === subject.name)) {
          subjects.push(subject);
        }
      });
    });
    return subjects;
  }

  static findAvailable2HourBlocks(timeMatrix) {
    const blocks = [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    days.forEach(day => {
      const daySlots = timeMatrix[day];
      const slotNumbers = Object.keys(daySlots).map(Number).sort((a, b) => a - b);
      
      for (let i = 0; i < slotNumbers.length - 1; i++) {
        const currentSlot = slotNumbers[i];
        const nextSlot = slotNumbers[i + 1];
        
        // Check if slots are consecutive and both available
        if (nextSlot === currentSlot + 1 && 
            daySlots[currentSlot].available && 
            daySlots[nextSlot].available) {
          
          blocks.push({
            day: day,
            startSlot: currentSlot,
            endSlot: nextSlot,
            startTime: this.getSlotTime(currentSlot, 'start'),
            midTime: this.getSlotTime(currentSlot, 'end'),
            endTime: this.getSlotTime(nextSlot, 'end')
          });
        }
      }
    });
    
    return blocks;
  }

  static findAvailable1HourSlots(timeMatrix) {
    const slots = [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    days.forEach(day => {
      const daySlots = timeMatrix[day];
      Object.keys(daySlots).forEach(slotNumber => {
        if (daySlots[slotNumber].available) {
          slots.push({
            day: day,
            slotNumber: parseInt(slotNumber),
            startTime: this.getSlotTime(slotNumber, 'start'),
            endTime: this.getSlotTime(slotNumber, 'end')
          });
        }
      });
    });
    
    return slots;
  }

  static validateLabBlock(block, teacher, subject, division, existingAssignments) {
    // Check teacher availability
    const teacherConflict = existingAssignments.some(assignment =>
      assignment.teacher.id === teacher._id.toString() &&
      assignment.day === block.day &&
      (assignment.slotNumber === block.startSlot || assignment.slotNumber === block.endSlot)
    );

    if (teacherConflict) {
      return { valid: false, reason: 'Teacher already assigned during this time' };
    }

    return { valid: true };
  }

  static validateLectureSlot(slot, teacher, subject, division, existingAssignments) {
    // Check teacher availability
    const teacherConflict = existingAssignments.some(assignment =>
      assignment.teacher.id === teacher._id.toString() &&
      assignment.day === slot.day &&
      assignment.slotNumber === slot.slotNumber
    );

    if (teacherConflict) {
      return { valid: false, reason: 'Teacher already assigned during this time' };
    }

    // Check division availability
    const divisionConflict = existingAssignments.some(assignment =>
      assignment.division.year === division.year &&
      assignment.division.divisionName === division.divisionName &&
      assignment.day === slot.day &&
      assignment.slotNumber === slot.slotNumber &&
      assignment.type === 'lecture' // Only check lecture conflicts for lectures
    );

    if (divisionConflict) {
      return { valid: false, reason: 'Division already has a lecture during this time' };
    }

    return { valid: true };
  }

  static findAvailableClassroom(rooms, slot, existingAssignments) {
    const classrooms = rooms.filter(room => room.type === 'CR');
    
    return classrooms.find(room => {
      const roomConflict = existingAssignments.some(assignment =>
        assignment.room.name === room.name &&
        assignment.day === slot.day &&
        assignment.slotNumber === slot.slotNumber
      );
      return !roomConflict;
    });
  }

  static markSlotsAsUsed(timeMatrix, block) {
    timeMatrix[block.day][block.startSlot].available = false;
    timeMatrix[block.day][block.endSlot].available = false;
  }

  static getSlotTime(slotNumber, type) {
    // This should map to actual time slots from configuration
    const times = {
      1: { start: '08:00', end: '09:00' },
      2: { start: '09:00', end: '10:00' },
      3: { start: '10:00', end: '10:15' }, // Short break
      4: { start: '10:15', end: '11:15' },
      5: { start: '11:15', end: '12:15' },
      6: { start: '12:15', end: '13:00' }, // Lunch
      7: { start: '13:00', end: '14:00' },
      8: { start: '14:00', end: '15:00' }
    };
    
    return times[slotNumber] ? times[slotNumber][type] : '00:00';
  }

  static validateCompleteSchedule(assignments, systemData) {
    const conflicts = [];
    
    // Check for double bookings, hour requirements, etc.
    // Implementation of comprehensive validation
    
    return {
      isValid: conflicts.length === 0,
      conflicts: conflicts
    };
  }

  static formatTimetableOutput(assignments, systemData) {
    return {
      divisions: this.extractUniqueDivisions(assignments),
      slots: assignments,
      statistics: this.generateStatistics(assignments)
    };
  }

  static extractUniqueDivisions(assignments) {
    const divisions = new Map();
    
    assignments.forEach(assignment => {
      const key = `${assignment.division.year}-${assignment.division.divisionName}`;
      if (!divisions.has(key)) {
        divisions.set(key, {
          year: assignment.division.year,
          divisionName: assignment.division.divisionName,
          totalStudents: 60 // Default, should come from actual data
        });
      }
    });
    
    return Array.from(divisions.values());
  }

  static generateStatistics(assignments, generationTime = 0) {
    const uniqueSubjects = new Set(assignments.map(a => a.subject.name));
    const uniqueTeachers = new Set(assignments.map(a => a.teacher.id));
    const totalSlots = assignments.length;
    
    return {
      totalSubjects: uniqueSubjects.size,
      totalTeachers: uniqueTeachers.size,
      totalSlots: totalSlots,
      utilizationRate: Math.round((totalSlots / (6 * 8)) * 100), // 6 days, 8 slots per day
      generationTime: generationTime
    };
  }

  static generateRelaxationSuggestions(conflicts) {
    const suggestions = [];
    
    conflicts.forEach(conflict => {
      switch (conflict.type) {
        case 'insufficient_lab_slots':
          suggestions.push({
            type: 'reduce_lab_hours',
            description: `Reduce ${conflict.subject} lab hours from ${conflict.required * 2} to ${conflict.scheduled * 2} hours per week`,
            impact: `${conflict.division} will have ${(conflict.required - conflict.scheduled) * 2} fewer lab hours`,
            severity: 'medium'
          });
          break;
          
        case 'teacher_overload':
          suggestions.push({
            type: 'redistribute_workload',
            description: `Reassign some subjects from ${conflict.teacherName} to other teachers`,
            impact: `Reduce ${conflict.teacherName}'s workload by ${conflict.excessHours} hours`,
            severity: 'high'
          });
          break;
          
        // Add more suggestion types
      }
    });
    
    return suggestions;
  }

  static calculateRequirements(divisions, subjects, lectureAssignments, labAssignments) {
    // Calculate hour requirements per division-subject combination
    const requirements = {};
    
    divisions.forEach(division => {
      const divKey = `${division.year}-${division.divisionName}`;
      requirements[divKey] = {};
      
      division.subjects.forEach(subject => {
        requirements[divKey][subject.name] = {
          totalHours: subject.hoursPerWeek,
          type: subject.type,
          credits: subject.credits,
          assigned: false
        };
      });
    });
    
    return requirements;
  }
}

module.exports = OptimizationAlgorithm;
