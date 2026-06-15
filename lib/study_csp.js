/**
 * lib/study_csp.js — Study scheduling with CSP (Constraint Satisfaction)
 * Generates optimal study schedules given constraints.
 * @module lib/study_csp
 */

export const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export const TIME_SLOTS = ['morning', 'afternoon', 'evening', 'night'];

/**
 * Generate a study schedule using simple CSP.
 * @param {Array} subjects — [{ name, priority, hoursPerWeek }]
 * @param {Object} constraints — { maxHoursPerDay, preferredSlots, blockedDays }
 * @returns {Object} — { schedule: { day: [subject, ...] }, totalHours }
 */
export function generateSchedule(subjects, constraints = {}) {
  const { maxHoursPerDay = 4, preferredSlots = ['evening'], blockedDays = [] } = constraints;
  const schedule = {};
  let totalHours = 0;

  for (const day of DAYS) {
    if (blockedDays.includes(day)) { schedule[day] = []; continue; }
    schedule[day] = [];
    let dayHours = 0;

    // Sort by priority (high first)
    const sorted = [...subjects].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const subject of sorted) {
      if (dayHours >= maxHoursPerDay) break;
      const hours = Math.min(subject.hoursPerWeek || 1, maxHoursPerDay - dayHours);
      if (hours > 0) {
        schedule[day].push({ subject: subject.name, hours });
        dayHours += hours;
        totalHours += hours;
      }
    }
  }

  return { schedule, totalHours, days: DAYS.filter(d => schedule[d]?.length > 0) };
}

export class StudyCSP {
  constructor(subjects, constraints) {
    this.subjects = subjects;
    this.constraints = constraints;
  }

  solve() {
    return generateSchedule(this.subjects, this.constraints);
  }

  formatDiscord(result) {
    const lines = ['📅 **Lịch học tối ưu:**\n'];
    for (const day of DAYS) {
      const items = result.schedule[day];
      if (items.length === 0) continue;
      const itemStr = items.map(i => `${i.subject} (${i.h})`).join(', ');
      lines.push(`**${day}:** ${itemStr}`);
    }
    lines.push(`\n📊 Tổng: ${result.totalHours}h/tuần`);
    return lines.join('\n');
  }
}

export default { generateSchedule, StudyCSP, DAYS, TIME_SLOTS };
