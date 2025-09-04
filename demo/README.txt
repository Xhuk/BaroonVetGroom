🗺️ MapTiler Demo - Setup Instructions
=========================================

✅ CURRENT STATUS: Demo uses OpenStreetMap tiles by default and falls back to them if MapTiler is unavailable.

📋 QUICK START:
1. From this folder run `npm run dev` (or double-click `start-demo.bat` on Windows)
2. Open browser to http://localhost:8080
3. Map will load with OpenStreetMap tiles immediately

🔑 TO GET MAPTILER TILES WORKING:
1. Create a free account at https://www.maptiler.com/ and copy your API key
2. Create a `.env` file in this directory based on `.env.example`
3. Set `VITE_MAPTILER_API_KEY=YOUR_KEY` inside that file or export the variable before running `npm run dev`
4. Restart the demo

🎯 WHAT YOU'LL TEST:
✅ Map loads and displays Monterrey veterinary clinics
✅ Clinic markers are clickable with popup info
✅ Side panel lists all clinics
✅ Click clinics to zoom to location
🔄 MapTiler style switching (needs valid API key)

📁 DEMO FILES:
- index.html = Vite entry point
- start-demo.bat = Windows launcher
- .env.example = Example environment file
- README.txt = This file

🚀 Zero dependencies, no database, no authentication needed!