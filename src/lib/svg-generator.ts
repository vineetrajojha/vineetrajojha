import { config } from '../../config';
import { GitHubStats } from './github';
import fs from 'fs/promises';
import path from 'path';

export interface GenerateSvgOptions {
  theme: 'light' | 'dark';
  stats: GitHubStats;
  visitors: number;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// Function to measure text width approximately
const CHAR_WIDTH = 8.4;
const LINE_HEIGHT = 20;

export async function generateSvg({ theme, stats, visitors }: GenerateSvgOptions): Promise<string> {
  const colors = config.theme[theme];
  
  // Read ASCII art
  let asciiArt = "";
  try {
    const asciiPath = path.join(process.cwd(), 'assets', `ascii-${theme}.txt`);
    asciiArt = await fs.readFile(asciiPath, 'utf8');
  } catch (error) {
    console.error("ASCII art not found, using placeholder.", error);
    asciiArt = "ASCII Art\nNot Found";
  }

  const asciiLines = asciiArt.split('\n');
  const maxAsciiWidth = Math.max(...asciiLines.map(line => line.length));
  
  const SVG_WIDTH = 1450; // Increased width to prevent cutoffs
  // Dynamic height based on content
  const SVG_HEIGHT = 600; 

  const leftMargin = 20;
  const topMargin = 30;
  const columnGap = 60; // Increased gap to account for wider Braille characters
  
  // Use a slightly larger CHAR_WIDTH multiplier for the ASCII calculation to ensure we clear the Braille which renders wider in some fonts
  const rightColumnX = leftMargin + (maxAsciiWidth * 10) + columnGap;

  let rightColumnY = topMargin;

  // Helper to draw a text line
  function drawText(text: string, x: number, y: number, color: string, bold: boolean = false): string {
    return `<text x="${x}" y="${y}" fill="${color}" xml:space="preserve" ${bold ? 'font-weight="bold"' : ''}>${escapeXml(text)}</text>`;
  }

  // Helper to draw terminal-like key value pair
  function drawKeyValue(key: string, value: string, y: number): string {
    const keyColor = colors.orange;
    const valueColor = colors.text;
    const dotColor = colors.secondary;
    
    // Adjusted keyWidth for the new longer keys like Architecture
    const keyWidth = 25;
    const paddedKey = key.padEnd(keyWidth, '.');
    const displayKey = `. ${paddedKey}: `;
    
    let svg = `<text x="${rightColumnX}" y="${y}" xml:space="preserve">`;
    svg += `<tspan fill="${dotColor}">. </tspan>`;
    svg += `<tspan fill="${keyColor}">${escapeXml(key)}</tspan>`;
    svg += `<tspan fill="${dotColor}">${escapeXml('.'.repeat(Math.max(2, keyWidth - key.length)))}:  </tspan>`;
    svg += `<tspan fill="${valueColor}">${escapeXml(value)}</tspan>`;
    svg += `</text>`;
    return svg;
  }

  // Helper to draw a header line
  function drawHeader(title: string, y: number): string {
    const headerColor = colors.text;
    const separatorColor = colors.secondary;
    
    let svg = `<text x="${rightColumnX}" y="${y}" xml:space="preserve">`;
    svg += `<tspan fill="${separatorColor}">- </tspan>`;
    svg += `<tspan fill="${headerColor}">${escapeXml(title)} </tspan>`;
    svg += `<tspan fill="${separatorColor}">${'-'.repeat(65 - title.length)}</tspan>`;
    svg += `</text>`;
    return svg;
  }

  const elements: string[] = [];

  // 2. Draw Right Column
  // Header
  elements.push(`<text x="${rightColumnX}" y="${rightColumnY}" xml:space="preserve" fill="${colors.text}">${escapeXml(config.github.username)}<tspan fill="${colors.secondary}">@</tspan>github <tspan fill="${colors.secondary}">${'-'.repeat(55)}</tspan></text>`);
  rightColumnY += LINE_HEIGHT + 5;

  // Profile Info
  elements.push(drawKeyValue("OS", config.profile.os, rightColumnY));
  rightColumnY += LINE_HEIGHT;
  elements.push(drawKeyValue("Role", config.profile.role, rightColumnY));
  rightColumnY += LINE_HEIGHT;
  elements.push(drawKeyValue("Building", config.profile.building, rightColumnY));
  rightColumnY += LINE_HEIGHT;
  elements.push(drawKeyValue("Focus", config.profile.focus, rightColumnY));
  rightColumnY += LINE_HEIGHT * 2;

  // Skills & Tech
  elements.push(drawKeyValue("Languages", config.skills.languages, rightColumnY));
  rightColumnY += LINE_HEIGHT;
  elements.push(drawKeyValue("Frameworks", config.skills.frameworks, rightColumnY));
  rightColumnY += LINE_HEIGHT;
  elements.push(drawKeyValue("AI Stack", config.skills.ai_stack, rightColumnY));
  rightColumnY += LINE_HEIGHT;
  elements.push(drawKeyValue("Cloud", config.skills.cloud, rightColumnY));
  rightColumnY += LINE_HEIGHT;
  elements.push(drawKeyValue("Database", config.skills.database, rightColumnY));
  rightColumnY += LINE_HEIGHT;
  elements.push(drawKeyValue("Tools", config.skills.tools, rightColumnY));
  rightColumnY += LINE_HEIGHT;
  elements.push(drawKeyValue("Architecture", config.skills.architecture, rightColumnY));
  rightColumnY += LINE_HEIGHT * 2;

  // Now
  elements.push(drawHeader("Now", rightColumnY));
  rightColumnY += LINE_HEIGHT;
  elements.push(drawKeyValue("Building", config.now.building, rightColumnY));
  rightColumnY += LINE_HEIGHT;
  elements.push(drawKeyValue("Learning", config.now.learning, rightColumnY));
  rightColumnY += LINE_HEIGHT;
  elements.push(drawKeyValue("Exploring", config.now.exploring, rightColumnY));
  rightColumnY += LINE_HEIGHT;
  elements.push(drawKeyValue("Open To", config.now.openTo, rightColumnY));
  rightColumnY += LINE_HEIGHT;
  elements.push(drawKeyValue("Based In", config.now.basedIn, rightColumnY));
  rightColumnY += LINE_HEIGHT * 2;

  // Contact
  elements.push(drawHeader("Contact", rightColumnY));
  rightColumnY += LINE_HEIGHT;
  elements.push(drawKeyValue("Portfolio", config.profile.portfolio, rightColumnY));
  rightColumnY += LINE_HEIGHT;
  elements.push(drawKeyValue("LinkedIn", config.profile.linkedin, rightColumnY));
  rightColumnY += LINE_HEIGHT;
  elements.push(drawKeyValue("Twitter/X", config.profile.twitter, rightColumnY));
  rightColumnY += LINE_HEIGHT;
  elements.push(drawKeyValue("GitHub", config.profile.github_url, rightColumnY));
  rightColumnY += LINE_HEIGHT;
  elements.push(drawKeyValue("Email", config.profile.email, rightColumnY));
  rightColumnY += LINE_HEIGHT * 2;

  // GitHub Stats
  if (config.features.githubStats) {
    elements.push(drawHeader("GitHub Stats", rightColumnY));
    rightColumnY += LINE_HEIGHT;
    
    // Formatting numbers with commas
    const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n);
    
    elements.push(`<text x="${rightColumnX}" y="${rightColumnY}" xml:space="preserve">` +
      `<tspan fill="${colors.secondary}">. </tspan>` +
      `<tspan fill="${colors.orange}">Repos: </tspan>` +
      `<tspan fill="${colors.text}">${fmt(stats.repositories).padStart(5)} </tspan>` +
      `<tspan fill="${colors.secondary}">| </tspan>` +
      `<tspan fill="${colors.orange}">Stars: </tspan>` +
      `<tspan fill="${colors.text}">${fmt(stats.stars).padStart(6)} </tspan>` +
      `<tspan fill="${colors.secondary}">| </tspan>` +
      `<tspan fill="${colors.orange}">Followers: </tspan>` +
      `<tspan fill="${colors.text}">${fmt(stats.followers).padStart(5)}</tspan>` +
    `</text>`);
    rightColumnY += LINE_HEIGHT;

    elements.push(`<text x="${rightColumnX}" y="${rightColumnY}" xml:space="preserve">` +
      `<tspan fill="${colors.secondary}">. </tspan>` +
      `<tspan fill="${colors.orange}">Commits: </tspan>` +
      `<tspan fill="${colors.text}">${fmt(stats.commits).padStart(7)}</tspan>` +
      `<tspan fill="${colors.secondary}"> | </tspan>` +
      `<tspan fill="${colors.orange}">PRs: </tspan>` +
      `<tspan fill="${colors.text}">${fmt(stats.pullRequests).padStart(8)}</tspan>` +
      `<tspan fill="${colors.secondary}"> | </tspan>` +
      `<tspan fill="${colors.orange}">Issues: </tspan>` +
      `<tspan fill="${colors.text}">${fmt(stats.issues).padStart(8)}</tspan>` +
    `</text>`);
    rightColumnY += LINE_HEIGHT;

    const totalLoc = stats.linesOfCode;
    const deletions = Math.floor(totalLoc * 0.17); // Estimate 17% deletions
    const additions = totalLoc + deletions;

    elements.push(`<text x="${rightColumnX}" y="${rightColumnY}" xml:space="preserve">` +
      `<tspan fill="${colors.secondary}">. </tspan>` +
      `<tspan fill="${colors.orange}">Lines of Code on GitHub: </tspan>` +
      `<tspan fill="${colors.text}">${fmt(totalLoc)} </tspan>` +
      `<tspan fill="${colors.secondary}">( </tspan>` +
      `<tspan fill="${colors.green}">${fmt(additions)}++</tspan>` +
      `<tspan fill="${colors.secondary}">,  </tspan>` +
      `<tspan fill="${colors.red}">${fmt(deletions)}--</tspan>` +
      `<tspan fill="${colors.secondary}"> )</tspan>` +
    `</text>`);
    rightColumnY += LINE_HEIGHT;
  }
  
  if (config.features.visitorCounter) {
    rightColumnY += LINE_HEIGHT;
    elements.push(drawKeyValue("Total Profile Views", new Intl.NumberFormat('en-US').format(visitors), rightColumnY));
  }

  // 1. Draw ASCII Portrait (Left side) - Vertically Centered
  const asciiHeight = asciiLines.length * LINE_HEIGHT;
  const contentHeight = rightColumnY - topMargin;
  
  // Calculate starting Y to vertically center the ASCII art relative to the right column content
  let asciiY = topMargin + Math.max(0, (contentHeight - asciiHeight) / 2);
  
  for (const line of asciiLines) {
    elements.push(drawText(line, leftMargin, asciiY, colors.text));
    asciiY += LINE_HEIGHT;
  }

  const finalHeight = Math.max(asciiY, rightColumnY) + topMargin;

  return `
<svg width="${SVG_WIDTH}" height="${finalHeight}" viewBox="0 0 ${SVG_WIDTH} ${finalHeight}" xmlns="http://www.w3.org/2000/svg">
  <style>
    text {
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
      font-size: 14px;
      line-height: ${LINE_HEIGHT}px;
    }
  </style>
  <rect width="${SVG_WIDTH}" height="${finalHeight}" fill="${colors.background}" rx="10" />
  ${elements.join('\n  ')}
</svg>`.trim();
}
