#!/usr/bin/env node

/**
 * Test Runner Script
 * Comprehensive test execution with reporting and coverage analysis
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestConfig {
  type: 'unit' | 'integration' | 'e2e' | 'performance' | 'all';
  coverage: boolean;
  watch: boolean;
  verbose: boolean;
  parallel: boolean;
  timeout?: number;
  outputDir?: string;
}

class TestRunner {
  private config: TestConfig;

  constructor(config: TestConfig) {
    this.config = config;
  }

  async run(): Promise<void> {
    console.log('🧪 Starting ACCU Platform Test Suite...\n');

    const startTime = Date.now();

    try {
      // Ensure test directories exist
      this.ensureTestDirectories();

      // Run tests based on configuration
      await this.runTests();

      // Generate coverage report if requested
      if (this.config.coverage) {
        await this.generateCoverageReport();
      }

      // Generate performance report if performance tests were run
      if (this.config.type === 'performance' || this.config.type === 'all') {
        await this.generatePerformanceReport();
      }

      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      console.log(`\n✅ Test suite completed in ${duration}s`);
      
      // Exit with appropriate code
      process.exit(0);

    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  private ensureTestDirectories(): void {
    const directories = [
      '../coverage',
      '../coverage/unit',
      '../coverage/integration',
      '../coverage/e2e',
      '../coverage/reports',
      '../temp',
      '../logs',
    ];

    directories.forEach(dir => {
      const fullPath = path.resolve(__dirname, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
  }

  private async runTests(): Promise<void> {
    switch (this.config.type) {
      case 'unit':
        await this.runUnitTests();
        break;
      case 'integration':
        await this.runIntegrationTests();
        break;
      case 'e2e':
        await this.runE2ETests();
        break;
      case 'performance':
        await this.runPerformanceTests();
        break;
      case 'all':
        await this.runAllTests();
        break;
    }
  }

  private async runUnitTests(): Promise<void> {
    console.log('🔬 Running Unit Tests...');

    const args = [
      'jest',
      '--config=./jest-unit.json',
      '--runInBand', // Run tests sequentially for unit tests
      this.config.verbose ? '--verbose' : '',
      this.config.watch ? '--watch' : '',
      this.config.coverage ? '--coverage' : '',
      '--coverageDirectory=../coverage/unit',
    ].filter(Boolean);

    execSync(args.join(' '), { 
      stdio: 'inherit',
      cwd: __dirname 
    });

    console.log('✅ Unit tests completed');
  }

  private async runIntegrationTests(): Promise<void> {
    console.log('🔗 Running Integration Tests...');

    const args = [
      'jest',
      '--config=./jest-integration.json',
      '--runInBand', // Run tests sequentially for integration tests
      this.config.verbose ? '--verbose' : '',
      this.config.watch ? '--watch' : '',
      this.config.coverage ? '--coverage' : '',
      '--coverageDirectory=../coverage/integration',
      `--testTimeout=${this.config.timeout || 60000}`,
    ].filter(Boolean);

    execSync(args.join(' '), { 
      stdio: 'inherit',
      cwd: __dirname 
    });

    console.log('✅ Integration tests completed');
  }

  private async runE2ETests(): Promise<void {
    console.log('🌐 Running End-to-End Tests...');

    const args = [
      'jest',
      '--config=./jest-e2e.json',
      this.config.verbose ? '--verbose' : '',
      this.config.coverage ? '--coverage' : '',
      '--coverageDirectory=../coverage/e2e',
      `--testTimeout=${this.config.timeout || 120000}`,
    ].filter(Boolean);

    execSync(args.join(' '), { 
      stdio: 'inherit',
      cwd: __dirname 
    });

    console.log('✅ E2E tests completed');
  }

  private async runPerformanceTests(): Promise<void {
    console.log('⚡ Running Performance Tests...');

    const args = [
      'jest',
      '--config=./jest-integration.json', // Reuse integration config
      '--testNamePattern=Performance|Load',
      '--runInBand', // Run performance tests sequentially
      this.config.verbose ? '--verbose' : '',
      `--testTimeout=${this.config.timeout || 300000}`, // 5 minutes for performance tests
    ].filter(Boolean);

    execSync(args.join(' '), { 
      stdio: 'inherit',
      cwd: __dirname 
    });

    console.log('✅ Performance tests completed');
  }

  private async runAllTests(): Promise<void> {
    console.log('🚀 Running All Tests...\n');

    // Run unit tests first (fastest)
    console.log('Phase 1: Unit Tests');
    await this.runUnitTests();
    console.log('');

    // Run integration tests
    console.log('Phase 2: Integration Tests');
    await this.runIntegrationTests();
    console.log('');

    // Run performance tests
    console.log('Phase 3: Performance Tests');
    await this.runPerformanceTests();
    console.log('');

    // Run E2E tests last (slowest)
    console.log('Phase 4: End-to-End Tests');
    await this.runE2ETests();

    console.log('✅ All test phases completed');
  }

  private async generateCoverageReport(): Promise<void> {
    console.log('\n📊 Generating Coverage Report...');

    try {
      // Import and run coverage analyzer
      const { runCoverageAnalysis } = await import('../coverage/coverage-report.ts');
      await runCoverageAnalysis('../coverage');

      console.log('✅ Coverage report generated');
      console.log('📄 Reports available in: ../coverage/reports/');
    } catch (error) {
      console.warn('⚠️  Coverage report generation failed:', error.message);
    }
  }

  private async generatePerformanceReport(): Promise<void> {
    console.log('\n⚡ Generating Performance Report...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.resolve(__dirname, `../coverage/reports/performance-${timestamp}.json`);

    // This would typically collect performance metrics from test results
    // For now, we'll create a basic performance summary
    const performanceReport = {
      timestamp: new Date().toISOString(),
      testType: 'performance',
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        averageResponseTime: 0,
        throughput: 0,
        errorRate: 0,
      },
      recommendations: [
        'Monitor API response times under load',
        'Optimize database queries for large datasets',
        'Implement caching for frequently accessed data',
        'Consider horizontal scaling for high concurrency',
      ],
    };

    fs.writeFileSync(reportPath, JSON.stringify(performanceReport, null, 2));
    console.log(`✅ Performance report generated: ${reportPath}`);
  }
}

// CLI Interface
function parseArgs(): TestConfig {
  const args = process.argv.slice(2);
  const config: TestConfig = {
    type: 'all',
    coverage: false,
    watch: false,
    verbose: false,
    parallel: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--type':
      case '-t':
        config.type = nextArg as any;
        i++;
        break;
      case '--coverage':
      case '-c':
        config.coverage = true;
        break;
      case '--watch':
      case '-w':
        config.watch = true;
        break;
      case '--verbose':
      case '-v':
        config.verbose = true;
        break;
      case '--parallel':
        config.parallel = true;
        break;
      case '--sequential':
        config.parallel = false;
        break;
      case '--timeout':
        config.timeout = parseInt(nextArg);
        i++;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return config;
}

function printHelp(): void {
  console.log(`
🧪 ACCU Platform Test Runner

Usage: node run-tests.ts [options]

Options:
  --type, -t <type>         Test type: unit|integration|e2e|performance|all (default: all)
  --coverage, -c            Generate coverage report
  --watch, -w              Run tests in watch mode
  --verbose, -v            Verbose output
  --parallel               Run tests in parallel (default)
  --sequential             Run tests sequentially
  --timeout <ms>           Set test timeout (default: varies by test type)
  --help, -h               Show this help message

Examples:
  node run-tests.ts --type unit --coverage
  node run-tests.ts --type integration --verbose
  node run-tests.ts --type e2e --timeout 180000
  node run-tests.ts --coverage --verbose
  node run-tests.ts --type performance

Test Types:
  unit           - Unit tests for individual components
  integration    - Integration tests for API endpoints
  e2e           - End-to-end tests for complete workflows
  performance   - Performance and load tests
  all           - Run all test types (default)

Coverage Thresholds:
  Statements: 80%
  Functions: 80%
  Branches: 70%
  Lines: 80%
`);
}

// Main execution
if (require.main === module) {
  const config = parseArgs();
  const runner = new TestRunner(config);
  runner.run().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { TestRunner, TestConfig };