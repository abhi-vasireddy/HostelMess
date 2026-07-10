const fs = require('fs');
let content = fs.readFileSync('services/adminAiService.ts', 'utf8');

// Remove the incorrectly placed feedback_count case (in the wrong switch)
const wrongMarker = "case 'feedback_count':";
// Find it in the fetchDataForIntent section (before general_analysis)
const fetchGenStart = content.indexOf("case 'general_analysis':", content.indexOf("fetchDataForIntent"));
const fetchEnd = content.indexOf("case 'general_analysis':", fetchGenStart + 10);

// Find ALL occurrences and remove the one in the chart generator area
// Actually let's find the one we accidentally inserted - it's between 'general_analysis' entries
const firstGenEnd = content.indexOf("break;", content.indexOf("case 'general_analysis':", 100));
const secondGenStart = content.indexOf("case 'general_analysis':", firstGenEnd);

// Check if there's a feedback_count case between first gen_analysis end and second gen_analysis start
const section = content.substring(firstGenEnd, secondGenStart);
if (section.includes("case 'feedback_count'")) {
  // Remove it
  const fcStart = content.indexOf("case 'feedback_count':", firstGenEnd);
  const fcEnd = content.indexOf("break;", fcStart) + 6;
  const before = content.substring(0, fcStart);
  const after = content.substring(fcEnd);
  content = before + "\n" + after;
}

// Now add the feedback_count case to the chart generator (before the chart generator's general_analysis)
const chartGenMarker = "// ── General Analysis ───────────────────────────────────────────────";
const chartGenStart = content.indexOf(chartGenMarker, 1700);

if (chartGenStart === -1) {
  console.log('ERROR: Could not find chart generator general_analysis marker');
  process.exit(1);
}

const feedbackCountChart = `
    // ── Feedback Count ──
    case 'feedback_count': {
      const fb = data.feedbacks || [];
      if (fb.length > 0) {
        const byDate = new Map();
        fb.forEach((f) => {
          const key = f.date || 'unknown';
          byDate.set(key, (byDate.get(key) || 0) + 1);
        });
        const sorted = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
        charts.push({
          kind: 'bar',
          title: 'Feedback per Day',
          data: sorted.map(([date, count], i) => {
            const d = new Date(date + 'T00:00:00');
            const label = isNaN(d.getTime())
              ? date
              : d.getDate() + ' ' + d.toLocaleString('en-US', { month: 'short' });
            return { label, value: count, color: CHART_COLORS[i % CHART_COLORS.length] };
          }),
        });
      }
      break;
    }

    `;

content = content.substring(0, chartGenStart) + feedbackCountChart + content.substring(chartGenStart);

fs.writeFileSync('services/adminAiService.ts', content);
console.log('Fixed - added feedback_count chart case to correct switch');
