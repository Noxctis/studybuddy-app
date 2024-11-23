import axios from 'axios';
import type { ExamDBO } from '@/types';

export function getExamsAPI(endpoint: string, getOptions: () => Promise<{ headers: { Authorization: string; }; }>) {
  const API_ENDPOINT = `${endpoint}/exams`;

  function parseExam(exam: ExamDBO): ExamDBO {
    delete (exam as any)._id;
    if (exam.lastUpdated) exam.lastUpdated = new Date(exam.lastUpdated);
    return exam;
  }

  async function getExamUpdates(fromDate: Date): Promise<ExamDBO[]> {
    const exams: ExamDBO[] = (await axios.get(`${API_ENDPOINT}/updates/${fromDate.toISOString()}`, await getOptions())).data;
    return exams.map(e => parseExam(e));
  }
  return { getExamUpdates }
}