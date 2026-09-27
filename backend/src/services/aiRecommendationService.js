const axios = require('axios');

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

/**
 * Calls FastAPI Gemini AI Agent to generate actionable coordination recommendations.
 */
async function generateConflictRecommendation({ projectA, projectB, distanceMeters, overlapDays, severity, corridor }) {
  try {
    const payload = {
      project_a: {
        name: projectA.name,
        utilityName: projectA.utilityId?.name || 'Utility A',
        projectType: projectA.projectType || 'utility',
        startDate: projectA.startDate ? new Date(projectA.startDate).toISOString().split('T')[0] : 'N/A',
        endDate: projectA.endDate ? new Date(projectA.endDate).toISOString().split('T')[0] : 'N/A',
        description: projectA.description || '',
      },
      project_b: {
        name: projectB.name,
        utilityName: projectB.utilityId?.name || 'Utility B',
        projectType: projectB.projectType || 'utility',
        startDate: projectB.startDate ? new Date(projectB.startDate).toISOString().split('T')[0] : 'N/A',
        endDate: projectB.endDate ? new Date(projectB.endDate).toISOString().split('T')[0] : 'N/A',
        description: projectB.description || '',
      },
      distance_meters: distanceMeters || 50,
      overlap_days: overlapDays || 7,
      severity: severity || 'HIGH',
      corridor: corridor || projectA.corridorName || projectB.corridorName || 'Shared Corridor',
    };

    const res = await axios.post(`${FASTAPI_URL}/internal/recommend`, payload, {
      timeout: 30000,
    });

    return res.data?.recommendation;
  } catch (err) {
    console.warn('[AI Recommendation] API failed, falling back to local synthesis:', err.message);
    // Safe deterministic fallback
    return {
      summary: `Spatial proximity (${distanceMeters || 50}m) and temporal overlap (${overlapDays || 7} days) detected along ${corridor || 'corridor'}.`,
      whyItMatters: `${projectA.name} and ${projectB.name} are concurrently active in the same area. Uncoordinated excavation risks cutting freshly paved roads and doubling traffic disruption.`,
      recommendedActions: [
        {
          action: 'Joint Trenching & Co-Location Review',
          rationale: 'Combine subsurface excavations to cut pavement once and share construction traffic control costs.',
          priority: severity === 'HIGH' ? 'high' : 'medium',
        },
        {
          action: 'Harmonize Work Sequencing',
          rationale: 'Ensure deep underground pipe or conduit installation finishes before surface roadwork begins.',
          priority: 'high',
        },
        {
          action: 'Establish Joint Traffic Management Plan',
          rationale: 'Coordinate lane closures across both utility contractors to maintain safe transit flow.',
          priority: 'medium',
        },
      ],
      confidence: 0.88,
      limitations: ['Burial depths and right-of-way easement bounds require engineering verification.'],
    };
  }
}

module.exports = { generateConflictRecommendation };
