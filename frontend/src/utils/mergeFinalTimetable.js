export function mergeFinalTimetable(
  timetableStructure,
  labScheduleData,
  lectureScheduleData
) {
  if (!timetableStructure) return {};

  let merged = JSON.parse(JSON.stringify(timetableStructure));

  // LABS
  if (labScheduleData?.scheduledLabs?.length) {
    labScheduleData.scheduledLabs.forEach(lab => {
      const { day, division, start_slot, end_slot } = lab;
      if (!merged[day]?.[division]) return;

      merged[day][division][start_slot] = {
        type: 'lab-block',
        activity: '2-HOUR LAB BLOCK',
        start_slot,
        end_slot,
        batches: lab.batches || []
      };

      merged[day][division][end_slot] = { type: 'lab-continuation' };
    });
  }

  // LECTURES
  if (lectureScheduleData?.scheduledLectures?.length) {
    lectureScheduleData.scheduledLectures.forEach(lec => {
      const { day, division, slot_number } = lec;
      if (!merged[day]?.[division]) return;

      if (merged[day][division][slot_number]?.type !== 'free') return;

      merged[day][division][slot_number] = {
        type: 'lecture',
        activity: lec.formatted_display,
        subject: lec.subject_name,
        teacher: lec.teacher_name,
        classroom: lec.classroom_name
      };
    });
  }

  return merged;
}
