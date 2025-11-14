const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const BASE_API_URL = "https://77957961-acce-407e-8620-280b0bee17f5-00-2vodakslzrfg.pike.replit.dev";
const POLLING_INTERVAL = 5000; // Check status every 5 seconds

module.exports = {
  config: {
    name: "gen",
    aliases: ["imagine", "aiimg"],
    version: "1.0.1",
    author: "NeoKEX",
    countDown: 10,
    role: 0,
    shortDescription: "Generate an image using a POST request API.",
    longDescription: "Sends a prompt, polls for the task status, and streams the generated image.",
    category: "AI-IMAGE",
    guide: "{pn} <prompt>"
  },

  onStart: async function ({ api, event, args, message }) {
    const prompt = args.join(" ");

    if (!prompt) {
      return message.reply("❌ Please provide a prompt for image generation. What's on your mind?");
    }

    api.setMessageReaction("⏳", event.messageID, () => {}, true);
    
    let taskId = null;
    let finalImagePath = null;
    
    try {
      // Step 1: Request Image Generation (POST)
      const generateResponse = await axios.post(`${BASE_API_URL}/api/generate`, { prompt: prompt });
      const responseData = generateResponse.data;

      if (responseData.status !== 'pending' || !responseData.task_id) {
        throw new Error(`Generation failed to start. API Status: ${responseData.status}`);
      }

      taskId = responseData.task_id;
      message.reply(`✅ Generation task started. Task ID: ${taskId}. Checking status every 5 seconds...`);

      // Step 2: Poll for Status (Max 2 minutes timeout for safety)
      let imageUrl = null;
      let status = 'pending';
      const maxChecks = 24; // 24 checks * 5s = 120s (2 minutes)
      let checkCount = 0;

      while (status !== 'completed' && checkCount < maxChecks) {
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
        checkCount++;

        const statusResponse = await axios.get(`${BASE_API_URL}/api/status/${taskId}`);
        const statusData = statusResponse.data;
        status = statusData.status;

        // CRITICAL FIX: Check if image_url exists before concluding
        if (status === 'completed' && statusData.image_url) {
          imageUrl = statusData.image_url;
          break;
        }
        
        if (status === 'failed') {
            throw new Error(`Generation failed on the server. Reason: ${statusData.reason || 'Unknown'}`);
        }
      }

      if (!imageUrl) {
        throw new Error("Timeout: Image generation took too long (Max 2 minutes) or URL was not provided upon completion.");
      }

      // Step 3: Stream the Image
      const imageResponse = await axios.get(imageUrl, { responseType: "stream" });
      finalImagePath = path.join(__dirname, "cache", `${taskId}_generated.png`);
      
      const writer = fs.createWriteStream(finalImagePath);
      imageResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // Step 4: Send the image
      message.reply({
        body: `✨ Image generated successfully for: "${prompt}"`,
        attachment: fs.createReadStream(finalImagePath)
      }, () => {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      });
      

    } catch (err) {
      console.error("GEN Command Error:", err.message);
      
      let errorMessage = `❌ Image generation failed.`;
      if (taskId) {
        errorMessage += ` (Task ID: ${taskId})`;
      }
      errorMessage += ` Error: ${err.message.substring(0, 80)}`;
      
      message.reply(errorMessage);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
    } finally {
      // Cleanup the temporary file path in the cache
      if (finalImagePath && fs.existsSync(finalImagePath)) {
        await fs.remove(finalImagePath);
      }
    }
  }
};