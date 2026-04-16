const axios = require('axios');
const { getLLMAccessToken } = require('./llmAuth');
const llmConfig = require('../utils/llmConfig.json');

// LLM Task Prompts
const PROMPTS = {
    BADGE_NAME_EXTRACTION: "You'll be given an image of a badge or name tag. Extract only the person's name from this badge or name tag image. If there are two names then First name and then last name. Return just the name clearly visible on the badge, or respond with 'NOT_FOUND' if no clear name is visible. Do not allow any other type of interaction."
};

function getPrompt(taskType) {
    const prompt = PROMPTS[taskType];
    if (!prompt) {
        throw new Error(`Unknown task type: ${taskType}`);
    }
    return prompt;
}

function isValidTaskType(taskType) {
    return taskType in PROMPTS;
}

/**
 * Generic LLM service for processing text and image requests
 * @param {string} taskType - The type of task (e.g., 'BADGE_NAME_EXTRACTION')
 * @param {string} imageBase64 - Base64 encoded image data
 * @param {object} options - Optional parameters
 * @returns {Promise<object>} - Result object with success, result, and error fields
 */
async function processWithLLM(taskType, imageBase64, options = {}) {
    try {
        // Validate task type
        if (!isValidTaskType(taskType)) {
            throw new Error(`Invalid task type: ${taskType}`);
        }

        // Get the prompt for this task
        const prompt = getPrompt(taskType);

        // Get access token
        const accessToken = await getLLMAccessToken();

        // Prepare the request payload - using system instruction for the prompt
        const requestPayload = {
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            inline_data: {
                                mime_type: options.mimeType || 'image/jpeg',
                                data: imageBase64
                            }
                        }
                    ]
                }
            ],
            system_instruction: {
                parts: [{ text: prompt }]
            },
            generation_config: {
                temperature: 0.5,
                responseMimeType: "text/plain"
            }
        };

        // Make the API call
        const response = await axios.post(
            llmConfig['Gemini-2.5-flash'],
            requestPayload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'AI-Resource-Group': 'default',
                    'Authorization': `Bearer ${accessToken}`
                },
                timeout: 30000 // 30 second timeout
            }
        );

        // Extract the result from the response
        const result = extractResultFromResponse(response.data);

        return {
            success: true,
            result: result,
            task_type: taskType
        };

    } catch (error) {
        console.error('LLM processing error:', error.message);

        return {
            success: false,
            result: null,
            task_type: taskType,
            error: error.message
        };
    }
}

/**
 * Extract the text result from the Gemini API response
 * @param {object} responseData - The API response data
 * @returns {string} - The extracted text result
 */
function extractResultFromResponse(responseData) {
    try {
        // Navigate through the Gemini response structure
        if (responseData &&
            responseData.candidates &&
            responseData.candidates[0] &&
            responseData.candidates[0].content &&
            responseData.candidates[0].content.parts &&
            responseData.candidates[0].content.parts[0] &&
            responseData.candidates[0].content.parts[0].text) {

            return responseData.candidates[0].content.parts[0].text.trim();
        }

        throw new Error('Unexpected response structure from LLM API');
    } catch (error) {
        throw new Error('Failed to extract result from LLM response: ' + error.message);
    }
}

module.exports = {
    processWithLLM
};
