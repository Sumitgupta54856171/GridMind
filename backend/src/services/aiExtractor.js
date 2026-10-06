const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const FASTAPI_URL = (process.env.FASTAPI_URL || 'http://localhost:8000').replace(/\/+$/, '');

/**
 * Calls FastAPI Gemini AI Agent to extract structured projects from document/data.
 */
async function extractProjectsWithGemini({ filePath, textContent, sourceType, utilityName, serviceArea }) {
  try {
    const form = new FormData();

    if (filePath && fs.existsSync(filePath)) {
      form.append('file', fs.createReadStream(filePath));
    }
    if (textContent) {
      form.append('text_content', textContent);
    }
    form.append('source_type', sourceType || 'pdf');
    form.append('utility_name', utilityName || '');
    form.append('service_area', serviceArea || '');

    const response = await axios.post(`${FASTAPI_URL}/internal/extract`, form, {
      headers: form.getHeaders(),
      timeout: 120000, // 2 minutes for multimodal Gemini document extraction
    });

    return response.data?.projects || [];
  } catch (err) {
    console.error('[AI Extractor] Extraction error:', err.response?.data || err.message);
    throw new Error(err.response?.data?.detail || err.message);
  }
}

module.exports = { extractProjectsWithGemini };
