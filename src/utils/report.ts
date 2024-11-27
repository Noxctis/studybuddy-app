import type { StudySessionReport, StudySession } from '@/types';

const WEIGHT_EFFICIENCY = 0.7;
const WEIGHT_DURATION = 0.3;
const OPTIMAL_STUDY_RATIO = 5 / 6;

export function getStudySession(pomo: StudySession | undefined): StudySessionReport {
  if (!pomo) return { timeTotal: 0, timeStudy: 0, timeBreak: 0, nrBreaks: 0, points: 0 };
  const timeBreak = pomo.breaksDone.reduce((acc, curr) => acc + ((curr.end ?? curr.start) - curr.start), 0);
  const timeTotal = pomo.endActual ?? pomo.endScheduled;
  const timeStudy = timeTotal - timeBreak;

  const durataPomelli: number[] = [];
  let prevBreakEnd = 0;
  for (let i = 0; i < pomo.breaksDone.length; i++) {
    durataPomelli.push(pomo.breaksDone[i].start - prevBreakEnd);
    prevBreakEnd = pomo.breaksDone[i].end ?? 0;
  }
  durataPomelli.push(pomo.endScheduled - prevBreakEnd);

  const scorePomelli = durataPomelli
    .map(p => p / 60000)
    .map(p => p < 20 ? (p / 20) : (p > 50 ? (50 / p) : 1))
    .reduce((a, b) => a + b, 0) / durataPomelli.length;
  const score =
    (WEIGHT_EFFICIENCY * (1 - Math.abs((timeStudy / timeTotal) - (OPTIMAL_STUDY_RATIO))))
    + (WEIGHT_DURATION * scorePomelli)

  return {
    timeTotal: timeTotal,
    timeStudy: timeStudy,
    timeBreak: timeBreak,
    nrBreaks: pomo.breaksDone.length,
    points: Math.max(Math.min(score, 1), 0)
  };
}
export function parsePoints(points: number | null) {
  return points === null ? '-' : `${(points * 100).toFixed(1)}%`;
}

export function getPointsColorClass(points: number | null, deepWork: boolean = true) {
  const deepWorkClass = deepWork ? '' : ' shallow-work';
  if (points === null) return 'points bg-grey' + deepWorkClass;
  if (points < 0.6) {
    return 'points bg-error' + deepWorkClass;
  }
  if (points < 0.8) {
    return 'points bg-warning' + deepWorkClass;
  }
  return 'points bg-success' + deepWorkClass;
}