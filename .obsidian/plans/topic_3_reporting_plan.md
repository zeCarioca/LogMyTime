# Execution Plan: Advanced Reporting & Export (Topic 3)

This document outlines the step-by-step implementation plan for the **Advanced Reporting & Export** feature, focusing on the generation of branded PDF summary reports with charts.

## 🎯 Goal
Implement a robust PDF generation feature allowing users (especially the Freelancer persona) to export their KPI metrics, visual charts, and timesheet data into professional, client-ready documents directly from the browser.

---

## 🛠️ Step-by-Step Implementation

### Step 1: Library Evaluation & Setup
1. **Library Selection:** We will use `react-to-print`. This library passes a React component to the browser's native print engine, ensuring vector-quality text and crisp charts, which is superior to canvas-based snapshot libraries like `html2pdf.js`.
2. **Setup:** Install the dependency (`npm install react-to-print`) in the `frontend` directory.

### Step 2: Creating the Printable Report Component
1. **Component Scaffold:** Create a new component `<PrintableReport />` in `frontend/src/components/analytics/`. This component will render the actual content of the PDF.
2. **Layout Design:**
   - **Header:** Include the LogMyTime logo/brand, the user's name/avatar, and the selected date range.
   - **Summary Section:** Render the `KpiCard`s (Average time, total billable hours).
   - **Visuals:** Render a summarized time distribution chart (e.g., Time per Repository pie chart).
   - **Data Grid:** Render a clean HTML `<table>` containing the raw, itemized time entries (Date, Project/Repo, Task Description, Duration).

### Step 3: Print-Specific Theming (@media print)
1. **CSS Overrides:** Since the dashboard is built with a dark-mode glassmorphism aesthetic, we must provide specific print styles to ensure the PDF looks like a professional document.
2. **Adjustments:**
   - Use `@media print` in the main CSS to force a white background (`#ffffff`) and dark text (`#111111`).
   - Hide interactive UI elements (navigation bars, tooltips, buttons, shadows).
   - Apply `page-break-inside: avoid` to the charts and table rows to prevent awkward splits across PDF pages.

### Step 4: Dashboard Integration
1. **Trigger UI:** Add a prominent "Export as PDF" button to the top of the `<AnalyticsDashboard />`.
2. **Wiring:** 
   - Render the `<PrintableReport />` component inside the dashboard but visually hide it (`display: none` for screen, `display: block` for print).
   - Attach the `useReactToPrint` hook to the export button, referencing the printable component via a React `useRef`.

### Step 5: Testing & Refinement
1. Verify the PDF output across different browsers (Chrome, Edge, Firefox) as print engines can vary slightly.
2. Ensure the custom Oklch CSS variables fall back gracefully or are overridden correctly in the print stylesheet so that charts remain legible.

---

## 📅 Next Actions
- **Action 1:** Install `react-to-print` and set up the base `@media print` CSS overrides.
- **Action 2:** Construct the `<PrintableReport />` template component and wire it to an Export button on the dashboard.
