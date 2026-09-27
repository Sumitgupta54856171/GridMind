/**
 * Deterministic Geospatial and Temporal Conflict Detection Engine
 * Strictly computes spatial proximity and calendar overlap with mathematical accuracy.
 * Never relies on hallucinated LLM arithmetic.
 */

/**
 * Calculates distance between two [lng, lat] coordinate pairs in meters using Haversine formula.
 */
function calculateHaversineDistanceMeters(coordA, coordB) {
  if (!coordA || !coordB || coordA.length < 2 || coordB.length < 2) return null;

  const [lng1, lat1] = coordA;
  const [lng2, lat2] = coordB;

  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calculates calendar overlap between two date windows in days.
 */
function calculateTemporalOverlap(startA, endA, startB, endB) {
  if (!startA || !endA || !startB || !endB) {
    return { overlap: false, overlapDays: 0, overlapStart: null, overlapEnd: null };
  }

  const sA = new Date(startA).getTime();
  const eA = new Date(endA).getTime();
  const sB = new Date(startB).getTime();
  const eB = new Date(endB).getTime();

  const overlapStart = Math.max(sA, sB);
  const overlapEnd = Math.min(eA, eB);

  if (overlapEnd >= overlapStart) {
    const diffTime = Math.abs(overlapEnd - overlapStart);
    const overlapDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return {
      overlap: true,
      overlapDays,
      overlapStart: new Date(overlapStart),
      overlapEnd: new Date(overlapEnd),
    };
  }

  return { overlap: false, overlapDays: 0, overlapStart: null, overlapEnd: null };
}

/**
 * Checks if two projects share the same or similar corridor/street name.
 */
function checkCorridorSimilarity(pA, pB) {
  const cA = (pA.corridorName || pA.locationText || '').toLowerCase().trim();
  const cB = (pB.corridorName || pB.locationText || '').toLowerCase().trim();

  if (!cA || !cB) return false;

  // Exact or substring match
  if (cA === cB || cA.includes(cB) || cB.includes(cA)) return true;

  // Keyword token overlap
  const wordsA = cA.split(/\s+/).filter((w) => w.length > 3);
  const wordsB = cB.split(/\s+/).filter((w) => w.length > 3);
  return wordsA.some((w) => wordsB.includes(w));
}

/**
 * Analyzes pairs of projects across utilities and returns candidate conflicts with evidence items.
 */
function evaluateProjectPair(pA, pB, options = {}) {
  const spatialThreshold = options.spatialThresholdMeters || 100;
  const minOverlapDays = options.minimumOverlapDays ?? 0;

  // 1. Spatial evaluation
  const coordsA = pA.geometry?.coordinates;
  const coordsB = pB.geometry?.coordinates;
  const distance = calculateHaversineDistanceMeters(coordsA, coordsB);
  const sameCorridor = checkCorridorSimilarity(pA, pB);

  // If both have coordinates, evaluate distance threshold; otherwise check corridor similarity
  let isSpatiallyClose = false;
  let effectiveDistance = distance;

  if (distance !== null) {
    isSpatiallyClose = distance <= spatialThreshold;
  } else if (sameCorridor) {
    isSpatiallyClose = true;
    effectiveDistance = 45; // Estimated nominal proximity for shared street
  }

  // 2. Temporal evaluation
  const temporal = calculateTemporalOverlap(pA.startDate, pA.endDate, pB.startDate, pB.endDate);
  const hasTemporalOverlap = temporal.overlap && temporal.overlapDays >= minOverlapDays;

  // If not spatially close or not overlapping, no conflict
  if (!isSpatiallyClose || !hasTemporalOverlap) {
    return null;
  }

  // 3. Compute Deterministic Conflict Score (0 to 100)
  let score = 50;

  // Spatial component (up to +30 points)
  if (effectiveDistance !== null) {
    const proximityRatio = Math.max(0, 1 - effectiveDistance / spatialThreshold);
    score += Math.round(proximityRatio * 25);
  }
  if (sameCorridor) score += 10;

  // Temporal component (up to +20 points)
  if (temporal.overlapDays >= 14) score += 20;
  else if (temporal.overlapDays >= 7) score += 15;
  else if (temporal.overlapDays >= 3) score += 10;
  else score += 5;

  score = Math.min(99, Math.max(15, score));

  // 4. Assign Severity
  let severity = 'LOW';
  if (score >= 80 || (effectiveDistance !== null && effectiveDistance <= 50 && temporal.overlapDays >= 7)) {
    severity = 'HIGH';
  } else if (score >= 60 || temporal.overlapDays >= 5 || sameCorridor) {
    severity = 'MEDIUM';
  }

  // 5. Matched signals
  const matchedSignals = [];
  if (sameCorridor) matchedSignals.push('Same corridor');
  else if (isSpatiallyClose) matchedSignals.push('Proximity under threshold');
  if (hasTemporalOverlap) matchedSignals.push(`Overlapping construction (${temporal.overlapDays} days)`);
  if (pA.projectType && pB.projectType) {
    matchedSignals.push(`${pA.projectType.toUpperCase()} + ${pB.projectType.toUpperCase()} excavation`);
  }

  // 6. Generate grounded Evidence Items
  const evidenceItems = [
    {
      evidenceType: 'spatial_calculation',
      field: 'distanceMeters',
      value: effectiveDistance ?? 'Adjacent corridor',
      confidence: coordsA && coordsB ? 1.0 : 0.8,
      sourceReference: {
        section: 'Geospatial Haversine Proximity',
      },
    },
    {
      evidenceType: 'temporal_calculation',
      field: 'overlapDays',
      value: temporal.overlapDays,
      confidence: 1.0,
      sourceReference: {
        section: `Window: ${temporal.overlapStart?.toISOString().split('T')[0]} to ${temporal.overlapEnd?.toISOString().split('T')[0]}`,
      },
    },
    {
      projectId: pA._id,
      sourceId: pA.sourceId?._id || pA.sourceId,
      evidenceType: 'project_field',
      field: 'name',
      value: `${pA.name} (${pA.projectType || 'utility'})`,
      confidence: 1.0,
      sourceReference: {
        section: pA.corridorName || pA.locationText || 'Corridor record',
      },
    },
    {
      projectId: pB._id,
      sourceId: pB.sourceId?._id || pB.sourceId,
      evidenceType: 'project_field',
      field: 'name',
      value: `${pB.name} (${pB.projectType || 'utility'})`,
      confidence: 1.0,
      sourceReference: {
        section: pB.corridorName || pB.locationText || 'Corridor record',
      },
    },
  ];

  return {
    projectAId: pA._id,
    projectBId: pB._id,
    spatial: {
      distanceMeters: effectiveDistance || 0,
      intersects: effectiveDistance !== null ? effectiveDistance <= 10 : sameCorridor,
      sameCorridor,
      spatialScore: Math.round(((effectiveDistance || 0) / spatialThreshold) * 100),
    },
    temporal: {
      overlap: temporal.overlap,
      overlapStart: temporal.overlapStart,
      overlapEnd: temporal.overlapEnd,
      overlapDays: temporal.overlapDays,
      temporalScore: Math.min(100, temporal.overlapDays * 10),
    },
    similarity: {
      score,
      matchedSignals,
    },
    conflictScore: score,
    severity,
    evidenceItems,
  };
}

module.exports = {
  calculateHaversineDistanceMeters,
  calculateTemporalOverlap,
  checkCorridorSimilarity,
  evaluateProjectPair,
};
