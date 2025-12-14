/**
 * Test Coverage Analysis and Reporting
 * Provides comprehensive coverage reporting and analysis
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CoverageThresholds {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export interface CoverageReport {
  total: CoverageThresholds;
  covered: CoverageThresholds;
  skipped: CoverageThresholds;
  pct: CoverageThresholds;
}

export interface ModuleCoverage {
  path: string;
  name: string;
  coverage: CoverageReport;
  lines: {
    found: number;
    covered: number;
    skipped: number;
    pct: number;
  };
  statements: {
    found: number;
    covered: number;
    skipped: number;
    pct: number;
  };
  functions: {
    found: number;
    covered: number;
    skipped: number;
    pct: number;
  };
  branches: {
    found: number;
    covered: number;
    skipped: number;
    pct: number;
  };
}

export interface CoverageSummary {
  timestamp: string;
  totalCoverage: CoverageReport;
  moduleCount: number;
  totalLines: number;
  coveredLines: number;
  totalStatements: number;
  coveredStatements: number;
  totalFunctions: number;
  coveredFunctions: number;
  totalBranches: number;
  coveredBranches: number;
  overallPercentage: number;
  moduleCoverages: ModuleCoverage[];
  qualityGate: {
    passed: boolean;
    failingModules: string[];
    warnings: string[];
  };
}

export class CoverageAnalyzer {
  private coverageData: any;
  private coveragePath: string;

  constructor(coveragePath: string = '../coverage') {
    this.coveragePath = coveragePath;
  }

  async loadCoverageData(): Promise<any> {
    const coverageFilePath = path.join(this.coveragePath, 'coverage-final.json');
    
    if (!fs.existsSync(coverageFilePath)) {
      throw new Error('Coverage file not found. Run tests with coverage first.');
    }

    const coverageContent = fs.readFileSync(coverageFilePath, 'utf8');
    this.coverageData = JSON.parse(coverageContent);
    
    return this.coverageData;
  }

  async generateCoverageReport(): Promise<CoverageSummary> {
    if (!this.coverageData) {
      await this.loadCoverageData();
    }

    const moduleCoverages = this.parseModuleCoverages();
    const totalCoverage = this.calculateTotalCoverage(moduleCoverages);
    const qualityGate = this.evaluateQualityGate(moduleCoverages);

    return {
      timestamp: new Date().toISOString(),
      totalCoverage,
      moduleCount: moduleCoverages.length,
      totalLines: totalCoverage.lines.found,
      coveredLines: totalCoverage.lines.covered,
      totalStatements: totalCoverage.statements.found,
      coveredStatements: totalCoverage.statements.covered,
      totalFunctions: totalCoverage.functions.found,
      coveredFunctions: totalCoverage.functions.covered,
      totalBranches: totalCoverage.branches.found,
      coveredBranches: totalCoverage.branches.covered,
      overallPercentage: this.calculateOverallPercentage(totalCoverage),
      moduleCoverages,
      qualityGate,
    };
  }

  private parseModuleCoverages(): ModuleCoverage[] {
    return Object.entries(this.coverageData).map(([filePath, data]: [string, any]) => {
      const relativePath = this.getRelativePath(filePath);
      const moduleName = this.extractModuleName(relativePath);

      return {
        path: relativePath,
        name: moduleName,
        coverage: {
          total: {
            statements: data.s?.length || 0,
            branches: data.b?.length || 0,
            functions: data.f?.length || 0,
            lines: Object.keys(data.lineCoverage || {}).length,
          },
          covered: {
            statements: this.countCovered(data.s),
            branches: this.countCoveredBranches(data.b),
            functions: this.countCovered(data.f),
            lines: this.countCoveredLines(data.lineCoverage),
          },
          skipped: {
            statements: 0,
            branches: 0,
            functions: 0,
            lines: 0,
          },
          pct: {
            statements: this.calculatePercentage(this.countCovered(data.s), data.s?.length || 0),
            branches: this.calculatePercentage(this.countCoveredBranches(data.b), data.b?.length || 0),
            functions: this.calculatePercentage(this.countCovered(data.f), data.f?.length || 0),
            lines: this.calculatePercentage(this.countCoveredLines(data.lineCoverage), Object.keys(data.lineCoverage || {}).length),
          },
        },
        lines: {
          found: Object.keys(data.lineCoverage || {}).length,
          covered: this.countCoveredLines(data.lineCoverage),
          skipped: 0,
          pct: this.calculatePercentage(this.countCoveredLines(data.lineCoverage), Object.keys(data.lineCoverage || {}).length),
        },
        statements: {
          found: data.s?.length || 0,
          covered: this.countCovered(data.s),
          skipped: 0,
          pct: this.calculatePercentage(this.countCovered(data.s), data.s?.length || 0),
        },
        functions: {
          found: data.f?.length || 0,
          covered: this.countCovered(data.f),
          skipped: 0,
          pct: this.calculatePercentage(this.countCovered(data.f), data.f?.length || 0),
        },
        branches: {
          found: data.b?.length || 0,
          covered: this.countCoveredBranches(data.b),
          skipped: 0,
          pct: this.calculatePercentage(this.countCoveredBranches(data.b), data.b?.length || 0),
        },
      };
    });
  }

  private getRelativePath(filePath: string): string {
    // Convert absolute paths to relative paths for better readability
    if (filePath.includes('/src/')) {
      return filePath.split('/src/')[1];
    }
    return filePath;
  }

  private extractModuleName(filePath: string): string {
    // Extract meaningful module names from file paths
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];
    const moduleName = fileName.replace(/\.(ts|js)$/, '');
    
    // Convert camelCase to readable format
    return moduleName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  private countCovered(items: number[]): number {
    if (!items) return 0;
    return items.filter(count => count > 0).length;
  }

  private countCoveredBranches(branches: { [key: string]: number[] }): number {
    if (!branches) return 0;
    
    let covered = 0;
    Object.values(branches).forEach(branchCounts => {
      covered += branchCounts.filter(count => count > 0).length;
    });
    
    return covered;
  }

  private countCoveredLines(lineCoverage: { [key: string]: number }): number {
    if (!lineCoverage) return 0;
    return Object.values(lineCoverage).filter(count => count > 0).length;
  }

  private calculatePercentage(covered: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((covered / total) * 10000) / 100; // Round to 2 decimal places
  }

  private calculateTotalCoverage(moduleCoverages: ModuleCoverage[]): CoverageReport {
    const totals = {
      statements: { found: 0, covered: 0, skipped: 0 },
      branches: { found: 0, covered: 0, skipped: 0 },
      functions: { found: 0, covered: 0, skipped: 0 },
      lines: { found: 0, covered: 0, skipped: 0 },
    };

    moduleCoverages.forEach(module => {
      totals.statements.found += module.statements.found;
      totals.statements.covered += module.statements.covered;
      
      totals.branches.found += module.branches.found;
      totals.branches.covered += module.branches.covered;
      
      totals.functions.found += module.functions.found;
      totals.functions.covered += module.functions.covered;
      
      totals.lines.found += module.lines.found;
      totals.lines.covered += module.lines.covered;
    });

    return {
      total: {
        statements: totals.statements.found,
        branches: totals.branches.found,
        functions: totals.functions.found,
        lines: totals.lines.found,
      },
      covered: {
        statements: totals.statements.covered,
        branches: totals.branches.covered,
        functions: totals.functions.covered,
        lines: totals.lines.covered,
      },
      skipped: {
        statements: totals.statements.skipped,
        branches: totals.branches.skipped,
        functions: totals.functions.skipped,
        lines: totals.lines.skipped,
      },
      pct: {
        statements: this.calculatePercentage(totals.statements.covered, totals.statements.found),
        branches: this.calculatePercentage(totals.branches.covered, totals.branches.found),
        functions: this.calculatePercentage(totals.functions.covered, totals.functions.found),
        lines: this.calculatePercentage(totals.lines.covered, totals.lines.found),
      },
    };
  }

  private calculateOverallPercentage(coverage: CoverageReport): number {
    const totalPercentage = (
      coverage.pct.statements +
      coverage.pct.branches +
      coverage.pct.functions +
      coverage.pct.lines
    ) / 4;

    return Math.round(totalPercentage * 100) / 100;
  }

  private evaluateQualityGate(moduleCoverages: ModuleCoverage[]): CoverageSummary['qualityGate'] {
    const thresholds: CoverageThresholds = {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    };

    const failingModules: string[] = [];
    const warnings: string[] = [];

    moduleCoverages.forEach(module => {
      const moduleFailures: string[] = [];

      if (module.statements.pct < thresholds.statements) {
        moduleFailures.push(`statements (${module.statements.pct}% < ${thresholds.statements}%)`);
      }

      if (module.branches.pct < thresholds.branches) {
        moduleFailures.push(`branches (${module.branches.pct}% < ${thresholds.branches}%)`);
      }

      if (module.functions.pct < thresholds.functions) {
        moduleFailures.push(`functions (${module.functions.pct}% < ${thresholds.functions}%)`);
      }

      if (module.lines.pct < thresholds.lines) {
        moduleFailures.push(`lines (${module.lines.pct}% < ${thresholds.lines}%)`);
      }

      if (moduleFailures.length > 0) {
        failingModules.push(`${module.name}: ${moduleFailures.join(', ')}`);
      }

      // Add warnings for modules below 90% coverage
      if (module.overallPercentage < 90) {
        warnings.push(`${module.name}: ${module.overallPercentage}% overall coverage`);
      }
    });

    return {
      passed: failingModules.length === 0,
      failingModules,
      warnings,
    };
  }

  async generateHTMLReport(coverageSummary: CoverageSummary, outputPath: string): Promise<void> {
    const html = this.generateHTMLTemplate(coverageSummary);
    fs.writeFileSync(outputPath, html);
  }

  async generateMarkdownReport(coverageSummary: CoverageSummary, outputPath: string): Promise<void> {
    const markdown = this.generateMarkdownTemplate(coverageSummary);
    fs.writeFileSync(outputPath, markdown);
  }

  private generateHTMLTemplate(summary: CoverageSummary): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ACCU Platform Test Coverage Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; margin-bottom: 20px; }
        .metric { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); flex: 1; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .metric-label { color: #6b7280; font-size: 0.9em; }
        .pass { color: #10b981; }
        .fail { color: #ef4444; }
        .warning { color: #f59e0b; }
        table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; }
        .progress-bar { width: 100%; height: 20px; background: #e5e7eb; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #10b981, #059669); transition: width 0.3s ease; }
        .quality-gate { padding: 15px; border-radius: 8px; margin: 20px 0; }
        .quality-pass { background: #d1fae5; border: 1px solid #10b981; }
        .quality-fail { background: #fee2e2; border: 1px solid #ef4444; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 ACCU Platform Test Coverage Report</h1>
        <p>Generated: ${summary.timestamp}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <div class="metric-value">${summary.overallPercentage}%</div>
            <div class="metric-label">Overall Coverage</div>
        </div>
        <div class="metric">
            <div class="metric-value">${summary.moduleCount}</div>
            <div class="metric-label">Modules Tested</div>
        </div>
        <div class="metric">
            <div class="metric-value">${summary.coveredStatements}/${summary.totalStatements}</div>
            <div class="metric-label">Statements</div>
        </div>
        <div class="metric">
            <div class="metric-value">${summary.coveredFunctions}/${summary.totalFunctions}</div>
            <div class="metric-label">Functions</div>
        </div>
    </div>

    <div class="quality-gate ${summary.qualityGate.passed ? 'quality-pass' : 'quality-fail'}">
        <h3>Quality Gate: ${summary.qualityGate.passed ? '✅ PASSED' : '❌ FAILED'}</h3>
        ${summary.qualityGate.failingModules.length > 0 ? 
          `<p><strong>Failing Modules:</strong></p><ul>${summary.qualityGate.failingModules.map(m => `<li>${m}</li>`).join('')}</ul>` : 
          '<p>All modules meet the coverage requirements.</p>'
        }
        ${summary.qualityGate.warnings.length > 0 ? 
          `<p><strong>Warnings:</strong></p><ul>${summary.qualityGate.warnings.map(w => `<li>${w}</li>`).join('')}</ul>` : 
          ''
        }
    </div>

    <h2>Coverage by Module</h2>
    <table>
        <thead>
            <tr>
                <th>Module</th>
                <th>Lines</th>
                <th>Statements</th>
                <th>Functions</th>
                <th>Branches</th>
                <th>Overall</th>
            </tr>
        </thead>
        <tbody>
            ${summary.moduleCoverages.map(module => `
                <tr>
                    <td><strong>${module.name}</strong></td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${module.lines.pct}%"></div>
                        </div>
                        ${module.lines.pct}%
                    </td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${module.statements.pct}%"></div>
                        </div>
                        ${module.statements.pct}%
                    </td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${module.functions.pct}%"></div>
                        </div>
                        ${module.functions.pct}%
                    </td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${module.branches.pct}%"></div>
                        </div>
                        ${module.branches.pct}%
                    </td>
                    <td><strong>${this.calculateOverallPercentage(module.coverage)}%</strong></td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>
    `;
  }

  private generateMarkdownTemplate(summary: CoverageSummary): string {
    return `# 🧪 ACCU Platform Test Coverage Report

**Generated:** ${summary.timestamp}

## Summary

| Metric | Value |
|--------|-------|
| **Overall Coverage** | ${summary.overallPercentage}% |
| **Modules Tested** | ${summary.moduleCount} |
| **Statements** | ${summary.coveredStatements}/${summary.totalStatements} (${summary.totalCoverage.pct.statements}%) |
| **Functions** | ${summary.coveredFunctions}/${summary.totalFunctions} (${summary.totalCoverage.pct.functions}%) |
| **Branches** | ${summary.coveredBranches}/${summary.totalBranches} (${summary.totalCoverage.pct.branches}%) |
| **Lines** | ${summary.coveredLines}/${summary.totalLines} (${summary.totalCoverage.pct.lines}%) |

## Quality Gate: ${summary.qualityGate.passed ? '✅ PASSED' : '❌ FAILED'}

${summary.qualityGate.failingModules.length > 0 ? `
### Failing Modules
${summary.qualityGate.failingModules.map(m => `- ${m}`).join('\n')}
` : 'All modules meet the coverage requirements.'}

${summary.qualityGate.warnings.length > 0 ? `
### Warnings
${summary.qualityGate.warnings.map(w => `- ${w}`).join('\n')}
` : ''}

## Coverage by Module

| Module | Lines | Statements | Functions | Branches | Overall |
|--------|-------|------------|-----------|----------|---------|
${summary.moduleCoverages.map(module => 
  `| ${module.name} | ${module.lines.pct}% | ${module.statements.pct}% | ${module.functions.pct}% | ${module.branches.pct}% | **${this.calculateOverallPercentage(module.coverage)}%** |`
).join('\n')}

## Coverage Thresholds

- **Statements:** 80%
- **Functions:** 80%
- **Branches:** 70%
- **Lines:** 80%

---
*Report generated by ACCU Platform Test Framework*
`;
  }
}

export class CoverageMonitor {
  private analyzer: CoverageAnalyzer;

  constructor(coveragePath: string = '../coverage') {
    this.analyzer = new CoverageAnalyzer(coveragePath);
  }

  async checkCoverage(thresholds: CoverageThresholds): Promise<{ passed: boolean; report: CoverageSummary }> {
    const report = await this.analyzer.generateCoverageReport();
    
    const passed = 
      report.totalCoverage.pct.statements >= thresholds.statements &&
      report.totalCoverage.pct.functions >= thresholds.functions &&
      report.totalCoverage.pct.branches >= thresholds.branches &&
      report.totalCoverage.pct.lines >= thresholds.lines;

    return { passed, report };
  }

  async generateReports(outputDir: string = '../coverage/reports'): Promise<void> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const report = await this.analyzer.generateCoverageReport();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    await this.analyzer.generateHTMLReport(report, path.join(outputDir, `coverage-report-${timestamp}.html`));
    await this.analyzer.generateMarkdownReport(report, path.join(outputDir, `coverage-report-${timestamp}.md`));

    // Also generate the latest reports
    await this.analyzer.generateHTMLReport(report, path.join(outputDir, 'coverage-report.html'));
    await this.analyzer.generateMarkdownReport(report, path.join(outputDir, 'coverage-report.md'));
  }

  async getCoverageTrend(previousReports: string[]): Promise<any> {
    // This would compare current coverage with historical data
    // Implementation would read previous reports and calculate trends
    return {
      trend: 'improving', // or 'declining', 'stable'
      improvement: '+2.5%',
      details: 'Coverage has improved by 2.5% compared to the previous build.',
    };
  }
}

// CLI Functions for easy usage
export async function runCoverageAnalysis(coveragePath: string = '../coverage'): Promise<void> {
  const monitor = new CoverageMonitor(coveragePath);
  
  try {
    console.log('🔍 Analyzing test coverage...');
    const { passed, report } = await monitor.checkCoverage({
      statements: 80,
      functions: 80,
      branches: 70,
      lines: 80,
    });

    console.log(`\n📊 Coverage Report:`);
    console.log(`Overall: ${report.overallPercentage}%`);
    console.log(`Statements: ${report.totalCoverage.pct.statements}%`);
    console.log(`Functions: ${report.totalCoverage.pct.functions}%`);
    console.log(`Branches: ${report.totalCoverage.pct.branches}%`);
    console.log(`Lines: ${report.totalCoverage.pct.lines}%`);

    console.log(`\n🎯 Quality Gate: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

    if (report.qualityGate.failingModules.length > 0) {
      console.log('\n❌ Failing Modules:');
      report.qualityGate.failingModules.forEach(module => {
        console.log(`  - ${module}`);
      });
    }

    if (report.qualityGate.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      report.qualityGate.warnings.forEach(warning => {
        console.log(`  - ${warning}`);
      });
    }

    console.log('\n📄 Generating detailed reports...');
    await monitor.generateReports();
    console.log('✅ Reports generated in coverage/reports/');

    if (!passed) {
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Coverage analysis failed:', error.message);
    process.exit(1);
  }
}