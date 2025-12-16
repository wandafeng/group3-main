<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1veRhN4NsnTSAY1R4_Wa8-G_9q8dVsJXy

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to GitHub Pages

This project is configured to automatically deploy to GitHub Pages when you push to the main branch.

**Setup Steps:**

1. Go to your GitHub repository settings
2. Navigate to **Settings** > **Pages**
3. Under "Build and deployment", select **Source: GitHub Actions**
4. Go to **Settings** > **Secrets and variables** > **Actions**
5. Add a new repository secret:
   - Name: `GEMINI_API_KEY`
   - Value: Your Gemini API key
6. Push your code to the main branch:
   ```bash
   git add .
   git commit -m "Setup GitHub Pages deployment"
   git push origin main
   ```
7. The GitHub Action will automatically build and deploy your app
8. Your app will be available at: `https://ilaurraa.github.io/group3/`

**Note:** The first deployment may take a few minutes. You can monitor the deployment progress in the **Actions** tab of your repository.
