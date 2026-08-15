import { useEffect, useState } from 'react';
import { fetchCourts, type CourtBasic } from './courts';

export function useCourts(): { courts: CourtBasic[]; loadingCourts: boolean } {
  const [courts, setCourts] = useState<CourtBasic[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(true);

  useEffect(() => {
    fetchCourts()
      .then(setCourts)
      .catch(() => {})
      .finally(() => setLoadingCourts(false));
  }, []);

  return { courts, loadingCourts };
}