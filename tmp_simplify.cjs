const fs = require('fs');
let content = fs.readFileSync('services/adminAiService.ts', 'utf8');

// Find the generateLocalAnswer feedback_count case (the 2nd one from line 1205)
const markers = [];
let pos = 0;
while (true) {
  pos = content.indexOf("case 'feedback_count': {", pos);
  if (pos === -1) break;
  markers.push(pos);
  pos++;
}
// markers[0] = line 598 (fetchDataForIntent)
// markers[1] = line 1205 (generateLocalAnswer)
// markers[2] = line 1813 (generateChartData)

if (markers.length >= 2) {
  const start = markers[1];
  const end = content.indexOf("    }", start);
  const end2 = content.indexOf("\n    }\n", start);

  // Find the actual end - scan from start for the case closing brace
  let braceCount = 1;
  let i = content.indexOf('{', start) + 1;
  while (braceCount > 0 && i < content.length) {
    if (content[i] === '{') braceCount++;
    else if (content[i] === '}') braceCount--;
    i++;
  }

  const caseContent = content.substring(start, i);
  const replacement = `case 'feedback_count': {
      const fb = data.feedbacks || [];
      const count = fb.length;
      const tfLabel =
        data.timeframe === 'week'
          ? 'the past week'
          : data.timeframe === 'month'
          ? 'the past month'
          : data.timeframe === 'day'
          ? 'the past 24 hours'
          : 'all time';
      if (count === 0) {
        return "📭 No feedback was submitted in " + tfLabel + ".";
      }
      return "📊 **" + count + " feedback** submission" + (count === 1 ? "" : "s") + " in " + tfLabel + ".";
    }

    `;

  content = content.replace(caseContent, replacement);
  fs.writeFileSync('services/adminAiService.ts', content);
  console.log('Simplified generateLocalAnswer feedback_count case');
} else {
  console.log('ERROR: Could not find enough feedback_count cases');
}
