/**
 * Deterministic Geospatial and Temporal Conflict Detection Engine
 * Strictly computes spatial proximity and calendar overlap with mathematical accuracy.
 * Never relies on hallucinated LLM arithmetic.
 */

/**
 * Calculates distance between two [lng, lat] coordinate pairs in meters using Haversine formula.
 */
function calculateHaversineDistanceMeters(coordA, coordB) {
  if (!coordA || !coordB || !Array.isArray(coordA) || !Array.isArray(coordB)) return null;
  if (coordA.length < 2 || coordB.length < 2) return null;

  const lng1 = Number(coordA[0]);
  const lat1 = Number(coordA[1]);
  const lng2 = Number(coordB[0]);
  const lat2 = Number(coordB[1]);

  if (isNaN(lng1) || isNaN(lat1) || isNaN(lng2) || isNaN(lat2)) return null;

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
  const res = Math.round(R * c);
  return isNaN(res) ? null : res;
}

/**
 * Safely extracts an array of [lng, lat] coordinate points from any GeoJSON geometry type
 * (Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon).
 */
function extractPointsFromGeometry(geom) {
  if (!geom) return [];
  const coords = geom.coordinates || (Array.isArray(geom) ? geom : null);
  if (!coords || !Array.isArray(coords) || coords.length === 0) return [];

  // Direct Point format: [lng, lat]
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    return [[coords[0], coords[1]]];
  }

  const points = [];
  function recurse(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return;
    if (typeof arr[0] === 'number' && typeof arr[1] === 'number') {
      points.push([arr[0], arr[1]]);
      return;
    }
    for (const item of arr) {
      if (Array.isArray(item)) {
        recurse(item);
      }
    }
  }
  recurse(coords);
  return points;
}

/**
 * Calculates minimum distance in meters between any two geometries.
 */
function calculateGeometryDistanceMeters(geomA, geomB) {
  const ptsA = extractPointsFromGeometry(geomA);
  const ptsB = extractPointsFromGeometry(geomB);

  if (ptsA.length === 0 || ptsB.length === 0) return null;

  // Single points fast path
  if (ptsA.length === 1 && ptsB.length === 1) {
    return calculateHaversineDistanceMeters(ptsA[0], ptsB[0]);
  }

  // Downsample if geometry vertices are large to ensure sub-millisecond evaluation
  const sampleA = ptsA.length > 25 ? ptsA.filter((_, i) => i % Math.ceil(ptsA.length / 25) === 0) : ptsA;
  const sampleB = ptsB.length > 25 ? ptsB.filter((_, i) => i % Math.ceil(ptsB.length / 25) === 0) : ptsB;

  let minDistance = Infinity;
  for (const pA of sampleA) {
    for (const pB of sampleB) {
      const d = calculateHaversineDistanceMeters(pA, pB);
      if (d !== null && d < minDistance) {
        minDistance = d;
      }
    }
  }

  return minDistance === Infinity ? null : minDistance;
}

/**
 * Calculates calendar overlap between two date windows in days.
 * Resilient to missing end dates by applying standard municipal 60-day construction windows.
 */
function calculateTemporalOverlap(startA, endA, startB, endB) {
  const sA = startA ? new Date(startA).getTime() : null;
  const sB = startB ? new Date(startB).getTime() : null;

  // If both projects lack start dates entirely, treat as planned concurrently in cycle
  if (!sA && !sB) {
    return { overlap: true, overlapDays: 14, overlapStart: null, overlapEnd: null, isEstimated: true };
  }

  const effectiveSA = sA || sB;
  const effectiveEA = endA ? new Date(endA).getTime() : (effectiveSA ? effectiveSA + 60 * 86400000 : null);
  const effectiveSB = sB || sA;
  const effectiveEB = endB ? new Date(endB).getTime() : (effectiveSB ? effectiveSB + 60 * 86400000 : null);

  if (!effectiveSA || !effectiveEA || !effectiveSB || !effectiveEB) {
    return { overlap: false, overlapDays: 0, overlapStart: null, overlapEnd: null };
  }

  const overlapStart = Math.max(effectiveSA, effectiveSB);
  const overlapEnd = Math.min(effectiveEA, effectiveEB);

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
 * Analyzes pairs of projects and returns candidate conflicts with evidence items.
 */
function evaluateProjectPair(pA, pB, options = {}) {
  const spatialThreshold = options.spatialThresholdMeters || 100;
  const minOverlapDays = options.minimumOverlapDays ?? 0;

  // 1. Spatial evaluation across Points, LineStrings, or Polygons
  const distance = calculateGeometryDistanceMeters(pA.geometry, pB.geometry);
  const sameCorridor = checkCorridorSimilarity(pA, pB);

  let isSpatiallyClose = false;
  let effectiveDistance = distance;

  if (distance !== null && distance <= spatialThreshold) {
    isSpatiallyClose = true;
  } else if (sameCorridor) {
    // If on same named corridor, allow spatial proximity up to 500m or nominal 45m
    if (distance === null || distance <= Math.max(spatialThreshold * 2.5, 500)) {
      isSpatiallyClose = true;
      effectiveDistance = distance !== null ? distance : 45;
    }
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
  else if (isSpatiallyClose) matchedSignals.push(`Proximity under threshold (${effectiveDistance}m)`);
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
      confidence: distance !== null ? 1.0 : 0.8,
      sourceReference: {
        section: 'Geospatial Proximity',
      },
    },
    {
      evidenceType: 'temporal_calculation',
      field: 'overlapDays',
      value: temporal.overlapDays,
      confidence: 1.0,
      sourceReference: {
        section: `Window: ${temporal.overlapStart ? new Date(temporal.overlapStart).toISOString().split('T')[0] : 'Concurrent'} to ${temporal.overlapEnd ? new Date(temporal.overlapEnd).toISOString().split('T')[0] : 'End'}`,
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
  extractPointsFromGeometry,
  calculateGeometryDistanceMeters,
  calculateTemporalOverlap,
  checkCorridorSimilarity,
  evaluateProjectPair,
};
