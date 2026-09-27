import api from '@/lib/api';

export interface TransportationImpactData {
  _id: string;
  conflictId: string;
  corridor: {
    name: string;
    geometry?: any;
  };
  disruptionWindow: {
    startDate: string;
    endDate: string;
  };
  transportationData: {
    source?: string;
    corridorType?: string;
    trafficSensitivity?: string;
    busRoutesAffected?: string[];
    detourFeasibility?: string;
    estimatedPavementImpact?: string;
  };
  impactSummary: string;
  confidence: number;
  createdAt: string;
}

export async function getConflictImpact(conflictId: string): Promise<{ status: string; impact: TransportationImpactData }> {
  const res = await api.get<{ status: string; impact: TransportationImpactData }>(`/transportation/conflict/${conflictId}`);
  return res.data;
}

export async function getAllImpacts(): Promise<{ status: string; count: number; impacts: TransportationImpactData[] }> {
  const res = await api.get<{ status: string; count: number; impacts: TransportationImpactData[] }>('/transportation');
  return res.data;
}
