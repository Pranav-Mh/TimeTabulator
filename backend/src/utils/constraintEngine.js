// ✅ Constraint Engine for Timetable Validation
class ConstraintEngine {
  
  // ✅ Check Teacher Double Booking
  static checkTeacherConflict(assignments, newAssignment) {
    return assignments.some(existing => 
      existing.teacher.id === newAssignment.teacher.id &&
      existing.day === newAssignment.day &&
      existing.slotNumber === newAssignment.slotNumber
    );
  }

  // ✅ Check Room Double Booking
  static checkRoomConflict(assignments, newAssignment) {
    return assignments.some(existing =>
      existing.room.name === newAssignment.room.name &&
      existing.day === newAssignment.day &&
      existing.slotNumber === newAssignment.slotNumber
    );
  }

  // ✅ Check Division Double Booking
  static checkDivisionConflict(assignments, newAssignment) {
    return assignments.some(existing =>
      existing.division.year === newAssignment.division.year &&
      existing.division.divisionName === newAssignment.division.divisionName &&
      existing.day === newAssignment.day &&
      existing.slotNumber === newAssignment.slotNumber
    );
  }

  // ✅ Validate Lab Consecutive Slots
  static validateLabSlots(timeMatrix, day, startSlot) {
    const nextSlot = startSlot + 1;
    
    if (!timeMatrix[day] || !timeMatrix[day][startSlot] || !timeMatrix[day][nextSlot]) {
      return false;
    }

    return timeMatrix[day][startSlot].available && timeMatrix[day][nextSlot].available;
  }

  // ✅ Check Weekly Hour Requirements
  static checkWeeklyHours(assignments, subject, requiredHours) {
    const subjectAssignments = assignments.filter(a => a.subject.name === subject.name);
    const totalHours = subjectAssignments.reduce((sum, a) => sum + a.duration, 0);
    
    return {
      current: totalHours,
      required: requiredHours,
      satisfied: totalHours >= requiredHours,
      remaining: Math.max(0, requiredHours - totalHours)
    };
  }

  // ✅ Check Teacher Workload Limits
  static checkTeacherWorkload(assignments, teacherId, maxHoursPerWeek = 24) {
    const teacherAssignments = assignments.filter(a => a.teacher.id === teacherId);
    const totalHours = teacherAssignments.reduce((sum, a) => sum + a.duration, 0);
    
    return {
      current: totalHours,
      maximum: maxHoursPerWeek,
      overloaded: totalHours > maxHoursPerWeek,
      remaining: Math.max(0, maxHoursPerWeek - totalHours)
    };
  }

  // ✅ Validate Room Type Compatibility
  static validateRoomType(subject, room) {
    if (subject.type === 'PR') { // Practical subjects need LAB rooms
      return room.type === 'LAB';
    } else { // Theory subjects can use CR rooms
      return room.type === 'CR';
    }
  }

  // ✅ Check Time Restrictions
  static checkTimeRestrictions(restrictions, day, slotNumber, division) {
    return restrictions.some(restriction => {
      if (restriction.type !== 'time') return false;
      
      // Check if restriction applies to this day
      const appliesToDay = restriction.days.includes('All days') || restriction.days.includes(day);
      if (!appliesToDay) return false;
      
      // Check if restriction applies to this slot
      const appliesToSlot = restriction.timeSlots.includes(slotNumber);
      if (!appliesToSlot) return false;
      
      // Check scope (global vs year-specific)
      if (restriction.scope === 'global') return true;
      if (restriction.scope === 'year-specific') {
        return restriction.affectedYears.includes(division.year);
      }
      
      return false;
    });
  }

  // ✅ Generate Conflict Report
  static generateConflictReport(conflicts) {
    const report = {
      totalConflicts: conflicts.length,
      severityBreakdown: {
        high: 0,
        medium: 0,
        low: 0
      },
      conflictTypes: {},
      affectedDivisions: new Set(),
      suggestions: []
    };

    conflicts.forEach(conflict => {
      // Count severity
      report.severityBreakdown[conflict.severity]++;
      
      // Count conflict types
      report.conflictTypes[conflict.type] = (report.conflictTypes[conflict.type] || 0) + 1;
      
      // Track affected divisions
      if (conflict.affectedDivisions) {
        conflict.affectedDivisions.forEach(div => report.affectedDivisions.add(div));
      }
    });

    report.affectedDivisions = Array.from(report.affectedDivisions);

    return report;
  }

}

module.exports = ConstraintEngine;
