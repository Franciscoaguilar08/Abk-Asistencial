import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function areShiftsOverlapping(s1: { date: string, start_time: string, end_time: string }, s2: { date: string, start_time: string, end_time: string }): boolean {
  const getDates = (s: { date: string, start_time: string, end_time: string }) => {
    const start = new Date(`${s.date}T${s.start_time}`);
    let end = new Date(`${s.date}T${s.end_time}`);
    
    // Si la hora de fin es menor o igual a la de inicio, asumimos que termina el día siguiente
    if (s.end_time <= s.start_time) {
      end.setDate(end.getDate() + 1);
    }
    return { start, end };
  };

  const d1 = getDates(s1);
  const d2 = getDates(s2);

  return d1.start < d2.end && d2.start < d1.end;
}
