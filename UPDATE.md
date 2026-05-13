# CV Update Protocol

This document outlines the procedure for updating the content of your CV. The application is designed as a static Single Page Application (SPA) that reads from local JSON files in the `data/` directory.

## 1. Updating General Information
To update positions, grants, education, or contact info:
1. Open `data/slkp.json`.
2. Locate the relevant section (e.g., `"Positions Held"`, `"Grants and Fellowships"`).
3. Add or modify the entries within the `"rows"` array.
    - Follow the existing structural patterns for dates, links, and subtext.
    - **Note:** The "Dashboard" counts on the home page update automatically based on the number of rows in these sections.

## 2. Adding New Publications
The publication system is automated to ensure consistency and to provide AI-generated summaries.

### Step A: Update the BibTeX file
1. Open `data/slkp.bib`.
2. Append your new publication entry (Standard BibTeX format).
3. Ensure the entry includes an `ABSTRACT` field for the best AI summary results.

### Step B: Extract Publication Data
Run the extraction script to sync the BibTeX data with the web application's internal format:
```bash
node extract_data.js
```
This updates `data/extracted_pubs.json`.

### Step C: Generate AI Summaries
To generate summaries for the newly added papers, use the following command (requires a configured LLM environment):
```bash
# Example command using the Gemini CLI agent
gemini "Generate missing summaries in data/summaries.json based on data/extracted_pubs.json"
```
*Note: The application will still function if summaries are missing; it will simply display the title and metadata without the "Industrial Label" summary box.*

## 3. Deployment
Since this is a static application:
1. Ensure all changes are saved in the `data/` folder.
2. The `index.html`, `style.css`, and `app.js` files do not need to be modified unless you want to change the "Stark Industrial" design or the navigation logic.
3. Simply host the root directory on any static web server (GitHub Pages, Netlify, etc.).

## 4. Troubleshooting Rendering
- **[Object object] errors:** This usually indicates a deeply nested object in `slkp.json` that isn't being caught by the recursive formatter in `app.js`. Check that you haven't added an extra level of nesting in the JSON.
- **Blank page:** Check the browser console (F12) for JSON syntax errors or file-loading (CORS) issues.
