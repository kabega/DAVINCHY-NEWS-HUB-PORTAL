# Davinchy News

Davinchy News is a React news site built with Vite. It displays publisher-provided story images when available and generates original, locally rendered SVG artwork when a feed has no image or its image cannot load. It includes responsive home, latest stories, search, contact, and newsletter demo views, and animates page elements while respecting reduced-motion preferences.

The local API aggregates public RSS feeds from NTV Uganda and Uganda Broadcasting Corporation and refreshes the news list every minute. It does not collect social-media posts: there is no complete public feed of Ugandan social accounts, and reliable access to platforms such as X, Facebook, Instagram, and TikTok requires platform-approved API access. UCC is a regulator, not a central news API; only publisher feeds that are publicly available and verified are included. Feed results contain story metadata and link back to each publisher. The source list is maintained in `server/index.js`.

## Run locally

1. Install Node.js (version 18 or newer).
2. From this directory, install dependencies:

   ```sh
   npm install
   ```

3. Start the development server:

   ```sh
   npm run dev
   ```

4. Open the local URL printed by Vite (usually `http://127.0.0.1:5173`). The development command automatically selects an available API port starting at `5175` and configures Vite to proxy `/api` requests to it.

Create a production build with `npm run build`.

## Deploy to Render

The Render Blueprint in `../render.yaml` configures one Node.js web service that builds the Vite frontend and serves it alongside the RSS API. If configuring the service manually, use this directory as the root directory, `npm ci && npm run build` as the build command, and `npm start` as the start command. Render's `PORT` environment variable is used automatically.

The contact and newsletter forms are frontend demonstrations and do not send or store submissions. The live feed view requires internet access to the configured publishers' RSS feeds.
