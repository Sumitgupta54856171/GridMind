const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { extractProjectsWithGemini } = require('./aiExtractor');

function normalizeProjectType(val) {
  if (!val) return 'utility';
  const s = String(val).toLowerCase();
  if (s.includes('water') || s.includes('sewer') || s.includes('drain') || s.includes('storm')) return 'water';
  if (s.includes('gas') || s.includes('fuel') || s.includes('pipeline')) return 'gas';
  if (s.includes('electric') || s.includes('power') || s.includes('substation') || s.includes('grid')) return 'electric';
  if (s.includes('fiber') || s.includes('telecom') || s.includes('broadband') || s.includes('cable')) return 'telecom';
  if (s.includes('road') || s.includes('street') || s.includes('paving') || s.includes('traffic') || s.includes('transit') || s.includes('transportation')) return 'transportation';
  return 'utility';
}

function parseDates(p) {
  let start = p.EstimatedStartDate || p.ActualStartDate || p.DTAPCreatedDate || p.StartDate || p.START_DATE;
  let end = p.EstimatedCompletionDate || p.ActualCompletionDate || p.DTAPLastUpdatedDate || p.EndDate || p.END_DATE;

  if (start && typeof start === 'number') start = new Date(start);
  else if (start) start = new Date(start);

  if (end && typeof end === 'number') end = new Date(end);
  else if (end) end = new Date(end);

  if ((!start || isNaN(start.getTime())) && p.BudgetYear) {
    const yr = Number(p.BudgetYear);
    if (!isNaN(yr) && yr > 2000 && yr < 2100) {
      start = new Date(Date.UTC(yr, 0, 1));
      end = new Date(Date.UTC(yr, 11, 31));
    }
  }

  if (!start || isNaN(start.getTime())) {
    start = new Date();
  }
  if (!end || isNaN(end.getTime()) || end <= start) {
    end = new Date(start.getTime() + 90 * 86400000);
  }

  return { start, end };
}

function isArcGISUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /MapServer|FeatureServer/i.test(url);
}

/**
 * Extracts projects from an ArcGIS MapServer or FeatureServer REST endpoint.
 */
async function extractFromArcGIS({ url, utilityName, serviceArea, limit = 50 }) {
  let cleanUrl = url.trim().replace(/\/+$/, '');

  // If the URL does not point to a specific layer number (e.g. /MapServer), default to layer 27 or inspect
  if (/MapServer$|FeatureServer$/i.test(cleanUrl)) {
    try {
      const metaRes = await axios.get(`${cleanUrl}?f=json`, { timeout: 10000 });
      const layers = metaRes.data?.layers || [];
      if (layers.length > 0) {
        // Prefer layer with 'Project' or 'Utility' in its name
        const match = layers.find((l) => /utility|project|polygon|line/i.test(l.name)) || layers[0];
        cleanUrl = `${cleanUrl}/${match.id}`;
      } else {
        cleanUrl = `${cleanUrl}/0`;
      }
    } catch {
      cleanUrl = `${cleanUrl}/0`;
    }
  }

  const queryUrl = `${cleanUrl}/query`;

  // Try GeoJSON format first (modern ArcGIS servers)
  try {
    const res = await axios.get(queryUrl, {
      params: {
        where: '1=1',
        outFields: '*',
        outSR: 4326,
        f: 'geojson',
        resultRecordCount: limit,
      },
      timeout: 30000,
      headers: {
        'User-Agent': 'GridMind-Infrastructure-Intelligence/1.0',
        Accept: 'application/json, text/plain, */*',
      },
    });

    const features = res.data?.features || [];
    if (features.length > 0) {
      return features.map((f, idx) => {
        const p = f.properties || {};
        const { start, end } = parseDates(p);

        let projectName = p.ProjectName || p.Project_Name || p.NAME || p.PROJ_NAME || p.UWNSProjectIDBI;
        if (!projectName || projectName.toLowerCase() === 'training') {
          const comp = p.UtilityCompany || utilityName || 'Utility';
          const subId = p.UWNSProjectIDBI || p.ObjectID || idx + 1;
          projectName = `${comp} - ${p.WorkType || 'Project'} #${subId}`;
        }

        const corridor =
          p.Corridor ||
          p.Street ||
          p.STREET_NAME ||
          (p.Ward ? `Ward ${p.Ward} Corridor` : `${utilityName || 'Municipal'} Corridor`);

        const locText = p.Ward
          ? `Ward ${p.Ward}, ${serviceArea || 'Washington DC'}`
          : serviceArea || 'Washington DC';

        return {
          name: String(projectName).trim(),
          description: [
            p.WorkType,
            p.FacilityType,
            p.UtilityCompany,
            p.Description,
            p.ProjectPhase ? `Phase: ${p.ProjectPhase}` : null,
          ]
            .filter(Boolean)
            .join(' · '),
          projectType: normalizeProjectType(p.FacilityType || p.WorkType),
          status: String(p.ProjectStatus || p.WorkType || '').toLowerCase().includes('complete')
            ? 'completed'
            : 'active',
          startDate: start,
          endDate: end,
          locationText: locText,
          corridorName: corridor,
          geometry: f.geometry || undefined,
          locationConfidence: 0.98,
          extraction: { method: 'parser', confidence: 0.98 },
          rawFields: p,
        };
      });
    }
  } catch (err) {
    console.warn('[ArcGIS Extractor] GeoJSON query failed, falling back to ESRI JSON:', err.message);
  }

  // Fallback to standard ESRI JSON format if GeoJSON is not directly returned
  const esriRes = await axios.get(queryUrl, {
    params: {
      where: '1=1',
      outFields: '*',
      outSR: 4326,
      f: 'json',
      resultRecordCount: limit,
    },
    timeout: 30000,
    headers: {
      'User-Agent': 'GridMind-Infrastructure-Intelligence/1.0',
    },
  });

  const esriFeatures = esriRes.data?.features || [];
  return esriFeatures.map((f, idx) => {
    const p = f.attributes || {};
    const { start, end } = parseDates(p);

    let projectName = p.ProjectName || p.Project_Name || p.NAME || p.PROJ_NAME;
    if (!projectName || projectName.toLowerCase() === 'training') {
      const comp = p.UtilityCompany || utilityName || 'Utility';
      const subId = p.UWNSProjectIDBI || p.ObjectID || idx + 1;
      projectName = `${comp} - ${p.WorkType || 'Project'} #${subId}`;
    }

    let geom = undefined;
    if (f.geometry?.rings) {
      geom = { type: 'Polygon', coordinates: f.geometry.rings };
    } else if (f.geometry?.paths) {
      geom = { type: 'LineString', coordinates: f.geometry.paths[0] || [] };
    } else if (typeof f.geometry?.x === 'number' && typeof f.geometry?.y === 'number') {
      geom = { type: 'Point', coordinates: [f.geometry.x, f.geometry.y] };
    }

    return {
      name: String(projectName).trim(),
      description: [p.WorkType, p.FacilityType, p.UtilityCompany, p.Description]
        .filter(Boolean)
        .join(' · '),
      projectType: normalizeProjectType(p.FacilityType || p.WorkType),
      status: 'active',
      startDate: start,
      endDate: end,
      locationText: p.Ward ? `Ward ${p.Ward}, Washington DC` : serviceArea || 'Washington DC',
      corridorName: p.Ward ? `Ward ${p.Ward} Corridor` : `${utilityName || 'Municipal'} Corridor`,
      geometry: geom,
      locationConfidence: 0.95,
      extraction: { method: 'parser', confidence: 0.95 },
      rawFields: p,
    };
  });
}

/**
 * Master source project extraction coordinator.
 */
async function extractSourceProjects({ source, utility }) {
  const utilityName = utility?.name || '';
  const serviceArea = utility?.serviceAreaText || '';

  // 1. Local file upload
  if (source.storagePath && fs.existsSync(source.storagePath)) {
    return await extractProjectsWithGemini({
      filePath: source.storagePath,
      sourceType: source.sourceType,
      utilityName,
      serviceArea,
    });
  }

  // 2. Public URL
  if (source.sourceUrl && typeof source.sourceUrl === 'string') {
    const url = source.sourceUrl.trim();

    // Check if it's an ArcGIS REST endpoint
    if (isArcGISUrl(url)) {
      return await extractFromArcGIS({
        url,
        utilityName,
        serviceArea,
        limit: 50,
      });
    }

    // Check if it's a direct web URL (HTML, JSON, PDF)
    try {
      const headRes = await axios.get(url, {
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        responseType: 'arraybuffer',
      });

      const contentType = (headRes.headers['content-type'] || '').toLowerCase();

      // If PDF document downloaded from web URL
      if (contentType.includes('pdf') || url.toLowerCase().endsWith('.pdf')) {
        const tmpDir = path.join(__dirname, '../../uploads/temp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const tmpFile = path.join(tmpDir, `web_${Date.now()}.pdf`);
        fs.writeFileSync(tmpFile, headRes.data);

        try {
          const res = await extractProjectsWithGemini({
            filePath: tmpFile,
            sourceType: 'pdf',
            utilityName,
            serviceArea,
          });
          return res;
        } finally {
          if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
        }
      }

      // If JSON / GeoJSON
      if (contentType.includes('json') || url.toLowerCase().endsWith('.geojson') || url.toLowerCase().endsWith('.json')) {
        const text = headRes.data.toString('utf-8');
        const parsed = JSON.parse(text);
        if (parsed.features && Array.isArray(parsed.features)) {
          return parsed.features.map((f, i) => {
            const p = f.properties || {};
            const { start, end } = parseDates(p);
            return {
              name: p.name || p.ProjectName || `Project #${i + 1}`,
              description: p.description || p.WorkType || '',
              projectType: normalizeProjectType(p.projectType || p.FacilityType),
              status: 'active',
              startDate: start,
              endDate: end,
              locationText: p.location || serviceArea || '',
              corridorName: p.corridor || `${utilityName} Corridor`,
              geometry: f.geometry,
              locationConfidence: 0.95,
              extraction: { method: 'parser', confidence: 0.95 },
              rawFields: p,
            };
          });
        }
      }

      // If HTML web page, strip tags and send text content to Gemini AI Agent
      const htmlText = headRes.data.toString('utf-8');
      const cleanText = htmlText
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 15000); // Pass first 15k chars to Gemini

      return await extractProjectsWithGemini({
        textContent: cleanText,
        sourceType: 'webpage',
        utilityName,
        serviceArea,
      });
    } catch (urlErr) {
      console.error('[Web Extractor] Error fetching web URL:', urlErr.message);
      throw new Error(`Failed to read web source URL: ${urlErr.message}`);
    }
  }

  throw new Error('DataSource has neither an uploaded file nor an accessible source URL.');
}

module.exports = {
  isArcGISUrl,
  extractFromArcGIS,
  extractSourceProjects,
};
