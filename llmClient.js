// Generic LLM client for frontend processing
class LLMClient {
    constructor(apiBaseUrl = '/api/llm') {
        this.apiBaseUrl = apiBaseUrl;
    }

    /**
     * Process an image with the LLM service
     * @param {Blob} imageBlob - The image to process
     * @param {string} taskType - The type of task to perform
     * @returns {Promise<object>} - The processing result
     */
    async processImage(imageBlob, taskType) {
        try {
            // Create FormData for the request
            const formData = new FormData();
            formData.append('image', imageBlob);
            formData.append('task_type', taskType);

            console.log(`Processing image with LLM (task: ${taskType})...`);

            // Make the API request
            const response = await fetch(`${this.apiBaseUrl}/process`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            console.log('LLM processing completed:', result);
            return result;

        } catch (error) {
            console.error('LLM processing failed:', error);
            throw error;
        }
    }

}

// Export for use in main app
window.LLMClient = LLMClient;
