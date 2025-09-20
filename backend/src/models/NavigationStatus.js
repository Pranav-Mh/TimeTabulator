const mongoose = require('mongoose');

const NavigationStatusSchema = new mongoose.Schema({
  // Completion tracking
  hasTeachers: { type: Boolean, default: false },
  syllabusCompleted: { type: Boolean, default: false }, // SE + TE
  lectureAssignmentsCompleted: { type: Boolean, default: false },
  labAssignmentsCompleted: { type: Boolean, default: false },
  resourcesConfigured: { type: Boolean, default: false },
  
  // Access permissions
  canAccessSyllabus: { type: Boolean, default: true },   // Always accessible
  canAccessTeacher: { type: Boolean, default: true },    // Always accessible  
  canAccessLecture: { type: Boolean, default: false },   // Needs syllabus + teachers
  canAccessLab: { type: Boolean, default: false },
  canAccessResources: { type: Boolean, default: false },
  canAccessGenerator: { type: Boolean, default: false },
  
  // Progress tracking
  currentStep: { 
    type: String, 
    enum: ['syllabus', 'teacher', 'lecture', 'lab', 'resources', 'generator'],
    default: 'syllabus'
  }
}, {
  timestamps: true
});

// Method to update navigation permissions
NavigationStatusSchema.methods.updatePermissions = async function() {
  const Teacher = require('./Teacher');
  const SyllabusStatus = require('./SyllabusStatus');
  const LectureAssignment = require('./LectureAssignment');
  const LabAssignment = require('./LabAssignment');
  
  // Check if teachers exist
  const teacherCount = await Teacher.countDocuments();
  this.hasTeachers = teacherCount > 0;
  
  // Syllabus and Teacher are always accessible
  this.canAccessSyllabus = true;
  this.canAccessTeacher = true;
  
  // Check syllabus completion (SE + TE)
  const syllabusStatus = await SyllabusStatus.findOne();
  this.syllabusCompleted = syllabusStatus?.lectureAccessAllowed || false;
  
  // Lecture needs BOTH syllabus completion AND teachers to exist
  this.canAccessLecture = this.syllabusCompleted && this.hasTeachers;
  
  // Check lecture assignments completion
  const lectureCount = await LectureAssignment.countDocuments();
  this.lectureAssignmentsCompleted = lectureCount >= 6;
  this.canAccessLab = this.lectureAssignmentsCompleted && this.canAccessLecture;
  
  // Check lab assignments completion  
  const labCount = await LabAssignment.countDocuments();
  this.labAssignmentsCompleted = labCount >= 3;
  this.canAccessResources = this.labAssignmentsCompleted && this.canAccessLab;
  
  // Resources check (placeholder for now)
  this.canAccessGenerator = this.canAccessResources;
  
  // Update current step based on what's missing
  if (!this.syllabusCompleted) {
    this.currentStep = 'syllabus';
  } else if (!this.hasTeachers) {
    this.currentStep = 'teacher';
  } else if (!this.lectureAssignmentsCompleted) {
    this.currentStep = 'lecture';
  } else if (!this.labAssignmentsCompleted) {
    this.currentStep = 'lab';
  } else if (!this.resourcesConfigured) {
    this.currentStep = 'resources';
  } else {
    this.currentStep = 'generator';
  }
  
  return this.save();
};

module.exports = mongoose.model('NavigationStatus', NavigationStatusSchema);
