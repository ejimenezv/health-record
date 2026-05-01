"""
Analyze and report load test results.
"""
import csv
import json
from pathlib import Path
from typing import Dict, List


class LoadTestAnalyzer:
    """Analyze Locust CSV results."""

    def __init__(self, csv_stats_file: str):
        self.csv_file = csv_stats_file
        self.stats = self._load_stats()

    def _load_stats(self) -> List[Dict]:
        """Load stats from CSV."""
        stats = []
        with open(self.csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                stats.append(row)
        return stats

    def check_requirements(self) -> Dict[str, bool]:
        """Check if performance requirements are met."""
        results = {}

        for stat in self.stats:
            name = stat['Name']

            if name in ['Aggregated', '']:
                continue

            median = float(stat.get('Median Response Time', 0))
            p95 = float(stat.get('95%', 0))
            p99 = float(stat.get('99%', 0))
            failure_rate = float(stat.get('Failure Rate', '0').rstrip('%'))

            if '/query' in name:
                results[f"{name} - Latency"] = p95 < 3000
            elif '/transcription' in name:
                results[f"{name} - Latency"] = p95 < 120000
            elif '/health' in name:
                results[f"{name} - Latency"] = median < 100

            results[f"{name} - Reliability"] = failure_rate < 5.0

        return results

    def generate_report(self) -> str:
        """Generate markdown report."""
        report = "# Load Test Results\n\n"

        report += "## Performance Metrics\n\n"
        report += "| Endpoint | Requests | Failures | Median | P95 | P99 | RPS |\n"
        report += "|----------|----------|----------|--------|-----|-----|-----|\n"

        for stat in self.stats:
            if stat['Name'] in ['Aggregated', '']:
                continue

            report += f"| {stat['Name']} "
            report += f"| {stat.get('Request Count', 0)} "
            report += f"| {stat.get('Failure Count', 0)} "
            report += f"| {stat.get('Median Response Time', 0)}ms "
            report += f"| {stat.get('95%', 0)}ms "
            report += f"| {stat.get('99%', 0)}ms "
            report += f"| {stat.get('Requests/s', 0)} |\n"

        report += "\n## Requirement Compliance\n\n"

        requirements = self.check_requirements()
        passed = sum(1 for v in requirements.values() if v)
        total = len(requirements)

        report += f"**{passed}/{total} checks passed**\n\n"

        for check, result in requirements.items():
            status = "PASS" if result else "FAIL"
            report += f"- [{status}] {check}\n"

        return report


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python analyze_results.py <stats_csv_file>")
        sys.exit(1)

    analyzer = LoadTestAnalyzer(sys.argv[1])
    report = analyzer.generate_report()

    print(report)

    output_file = sys.argv[1].replace('_stats.csv', '_report.md')
    with open(output_file, 'w') as f:
        f.write(report)

    print(f"\nReport saved to: {output_file}")
