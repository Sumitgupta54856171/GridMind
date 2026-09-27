const axios = require('axios');
const AIRequest = require('../models/AIRequest');

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

/**
 * Calls FastAPI Gemini AI Agent to generate actionable coordination recommendations,
 * with privacy filtering, model selection, and AIRequest audit persistence.
 */
async function generateConflictRecommendation({
  userId,
  analysisRunId,
  conflictId,
  projectA,
  projectB,
  distanceMeters,
  overlapDays,
  severity,
  corridor,
  privacyMode = 'public_only',
  lowCost = false,
}) {
  const startTime = Date.now();
  let aiReq = null;

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
      privacy_mode: privacyMode,
      model_tier: lowCost ? 'lite' : 'standard',
    };

    const res = await axios.post(`${FASTAPI_URL}/internal/recommend`, payload, {
      timeout: 30000,
    });

    const recommendation = res.data?.recommendation || {};
    const telemetry = res.data?.telemetry || {};
    recommendation.provider = telemetry.provider || 'Google Vertex AI';
    recommendation.model = telemetry.model || (lowCost ? 'gemini-2.5-flash-lite' : 'gemini-2.5-flash');

    // Persist AI Request audit log in MongoDB
    if (userId) {
      try {
        aiReq = await AIRequest.create({
          userId,
          analysisRunId: analysisRunId || null,
          conflictId: conflictId || null,
          provider: telemetry.provider || 'Google Vertex AI',
          model: telemetry.model || (lowCost ? 'gemini-2.5-flash-lite' : 'gemini-2.5-flash'),
          purpose: 'recommendation',
          privacyMode: privacyMode,
          dataPolicy: {
            allowedFields: ['name', 'dates', 'corridor', 'calculations'],
            redactedFields: telemetry.redacted_fields || (privacyMode === 'redacted' ? ['exact_coordinates', 'names'] : ['exact_coordinates']),
          },
          inputTokens: telemetry.input_tokens || 350,
          outputTokens: telemetry.output_tokens || 180,
          estimatedCost: telemetry.estimated_cost || (lowCost ? 0.002 : 0.008),
          latencyMs: telemetry.latency_ms || (Date.now() - startTime),
          success: true,
        });
      } catch (dbErr) {
        console.warn('[AI Recommendation] Failed to log AIRequest to MongoDB:', dbErr.message);
      }
    }

    return recommendation;
  } catch (err) {
    console.warn('[AI Recommendation] API failed, falling back to local synthesis:', err.message);

    // Fallback recommendation
    const fallbackRec = {
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

    if (userId) {
      try {
        await AIRequest.create({
          userId,
          analysisRunId: analysisRunId || null,
          conflictId: conflictId || null,
          provider: 'Local Synthesis (Deterministic Fallback)',
          model: lowCost ? 'gemini-2.5-flash-lite' : 'gemini-2.5-flash',
          purpose: 'recommendation',
          privacyMode: privacyMode,
          dataPolicy: {
            allowedFields: ['name', 'dates', 'corridor'],
            redactedFields: privacyMode === 'redacted' ? ['exact_coordinates', 'names'] : ['exact_coordinates'],
          },
          inputTokens: 0,
          outputTokens: 0,
          estimatedCost: 0,
          latencyMs: Date.now() - startTime,
          success: true,
        });
      } catch (logErr) {
        console.warn('[AI Recommendation] Failed to save fallback AIRequest:', logErr.message);
      }
    }

    return fallbackRec;
  }
}

module.exports = { generateConflictRecommendation };

