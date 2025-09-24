const TimetableSlot = require('../models/TimetableSlot');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const Division = require('../models/Division');
const LectureAssignment = require('../models/LectureAssignment');
const LabAssignment = require('../models/LabAssignment');

const TIME_SLOTS = [
  '9:00-10:00',
  '10:00-11:00', 
  '11:15-12:15',
  '12:15-1:15',
  '2:15-3:15',
  '3:15-4:15',
  '4:30-5:30',
  '5:30-6:30'
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SATURDAY_SLOTS = ['9:00-10:00', '10:00-11:00', '11:15-12:15', '12:15-1:15'];

async function generateTimetable(timetableId) {
  try {
    console.log(`🔄 Generating timetable for ID: ${timetableId}`);
    
    // Get all required data
    const subjects = await Subject.find();
    const teachers = await Teacher.find();
    const lectureAssignments = await LectureAssignment.find().populate('subjectId teacherId divisionId');
    const labAssignments = await LabAssignment.find().populate('subjectId teacherId divisionId');
    
    const generatedSlots = [];
    const conflicts = [];
    
    // Generate slots for lecture assignments
    for (const assignment of lectureAssignments) {
      const subject = assignment.subjectId;
      const teacher = assignment.teacherId;
      const division = assignment.divisionId;
      
      if (!subject || !teacher || !division) continue;
      
      const slotsNeeded = subject.hoursPerWeek;
      
      for (let i = 0; i < slotsNeeded; i++) {
        const slot = await findAvailableSlot(
          division.academicYear,
          division.name,
          teacher._id,
          subject._id,
          false,
          null,
          generatedSlots
        );
        
        if (slot) {
          const newSlot = new TimetableSlot({
            academicYear: division.academicYear,
            division: division.name,
            day: slot.day,
            timeSlot: slot.timeSlot,
            subject: subject._id,
            teacher: teacher._id,
            room: `Room-${Math.floor(Math.random() * 100)}`, // Generate room number
            isLab: false
          });
          
          await newSlot.save();
          generatedSlots.push(newSlot);
        } else {
          conflicts.push({
            type: 'scheduling_conflict',
            description: `Cannot schedule ${subject.name} for ${division.name}`,
            suggestion: 'Consider reducing hours or adding more time slots'
          });
        }
      }
    }
    
    // Generate slots for lab assignments
    for (const assignment of labAssignments) {
      const subject = assignment.subjectId;
      const teacher = assignment.teacherId;
      const division = assignment.divisionId;
      
      if (!subject || !teacher || !division) continue;
      
      const slotsNeeded = subject.hoursPerWeek;
      
      for (let i = 0; i < slotsNeeded; i++) {
        const slot = await findAvailableSlot(
          division.academicYear,
          division.name,
          teacher._id,
          subject._id,
          true,
          assignment.batchNumber,
          generatedSlots
        );
        
        if (slot) {
          const newSlot = new TimetableSlot({
            academicYear: division.academicYear,
            division: `${division.name}${assignment.batchNumber}`,
            day: slot.day,
            timeSlot: slot.timeSlot,
            subject: subject._id,
            teacher: teacher._id,
            room: `Lab-${Math.floor(Math.random() * 20)}`, // Generate lab room
            batchNumber: assignment.batchNumber,
            isLab: true
          });
          
          await newSlot.save();
          generatedSlots.push(newSlot);
        } else {
          conflicts.push({
            type: 'lab_scheduling_conflict',
            description: `Cannot schedule ${subject.name} lab for ${division.name} batch ${assignment.batchNumber}`,
            suggestion: 'Consider using Saturday slots for labs'
          });
        }
      }
    }
    
    console.log(`✅ Generated ${generatedSlots.length} slots with ${conflicts.length} conflicts`);
    
    return {
      slots: generatedSlots.map(slot => slot._id),
      conflicts
    };
    
  } catch (error) {
    console.error('❌ Error in timetable generation:', error);
    throw error;
  }
}

async function findAvailableSlot(academicYear, divisionName, teacherId, subjectId, isLab, batchNumber, existingSlots) {
  const daysToCheck = isLab ? [...DAYS, 'Saturday'] : DAYS;
  
  for (const day of daysToCheck) {
    const slotsToCheck = day === 'Saturday' ? SATURDAY_SLOTS : TIME_SLOTS;
    
    for (const timeSlot of slotsToCheck) {
      const divisionToCheck = isLab ? `${divisionName}${batchNumber}` : divisionName;
      
      // Check if slot is available for this division
      const divisionConflict = existingSlots.find(slot => 
        slot.academicYear === academicYear &&
        slot.division === divisionToCheck &&
        slot.day === day &&
        slot.timeSlot === timeSlot
      );
      
      // Check if teacher is available
      const teacherConflict = existingSlots.find(slot =>
        slot.teacher.toString() === teacherId.toString() &&
        slot.day === day &&
        slot.timeSlot === timeSlot
      );
      
      if (!divisionConflict && !teacherConflict) {
        return { day, timeSlot };
      }
    }
  }
  
  return null; // No available slot found
}

module.exports = { generateTimetable };
