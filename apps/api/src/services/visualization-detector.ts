/**
 * Visualization Detection Service
 * Detects when a user prompt requires data visualization or code execution
 */

interface VisualizationRequest {
  requiresVisualization: boolean;
  visualizationType?: 'chart' | 'graph' | 'plot' | 'table' | 'heatmap' | 'other';
  suggestedLibraries?: string[];
  dataAnalysisNeeded?: boolean;
  pythonCodeTemplate?: string;
}

export class VisualizationDetector {
  // Keywords that suggest visualization needs
  private visualizationKeywords = [
    'chart', 'graph', 'plot', 'visualize', 'diagram', 'histogram',
    'scatter', 'bar chart', 'line chart', 'pie chart', 'heatmap',
    'correlation', 'distribution', 'trend', 'timeline', 'boxplot',
    'show me', 'display', 'illustrate', 'draw', 'create a visualization',
    'analyze data', 'statistical analysis', 'regression', 'clustering'
  ];

  // Medical-specific visualization keywords
  private medicalVisualizationKeywords = [
    'patient outcomes', 'survival curve', 'kaplan-meier', 'forest plot',
    'roc curve', 'sensitivity analysis', 'prevalence chart', 'incidence rate',
    'voe frequency', 'hemoglobin levels', 'pain score trend', 'treatment response',
    'biomarker correlation', 'disease progression', 'clinical trial results'
  ];

  // Data analysis keywords
  private dataAnalysisKeywords = [
    'analyze', 'calculate', 'compute', 'statistical', 'correlation',
    'regression', 'mean', 'median', 'standard deviation', 'p-value',
    'confidence interval', 'hypothesis test', 'anova', 't-test',
    'chi-square', 'odds ratio', 'risk ratio', 'meta-analysis'
  ];

  /**
   * Detect if a prompt requires visualization
   */
  detectVisualization(prompt: string): VisualizationRequest {
    const lowerPrompt = prompt.toLowerCase();
    
    // Check for visualization keywords
    const hasVisualizationKeyword = this.visualizationKeywords.some(keyword => 
      lowerPrompt.includes(keyword)
    );
    
    const hasMedicalVisualizationKeyword = this.medicalVisualizationKeywords.some(keyword => 
      lowerPrompt.includes(keyword)
    );
    
    const hasDataAnalysisKeyword = this.dataAnalysisKeywords.some(keyword => 
      lowerPrompt.includes(keyword)
    );

    if (!hasVisualizationKeyword && !hasMedicalVisualizationKeyword && !hasDataAnalysisKeyword) {
      return { requiresVisualization: false };
    }

    // Determine visualization type
    const visualizationType = this.determineVisualizationType(lowerPrompt);
    const suggestedLibraries = this.suggestLibraries(visualizationType, lowerPrompt);
    const pythonCodeTemplate = this.generateCodeTemplate(visualizationType, lowerPrompt);

    return {
      requiresVisualization: true,
      visualizationType,
      suggestedLibraries,
      dataAnalysisNeeded: hasDataAnalysisKeyword,
      pythonCodeTemplate
    };
  }

  /**
   * Determine the type of visualization needed
   */
  private determineVisualizationType(prompt: string): 'chart' | 'graph' | 'plot' | 'table' | 'heatmap' | 'other' {
    if (prompt.includes('bar') || prompt.includes('column')) return 'chart';
    if (prompt.includes('line') || prompt.includes('trend') || prompt.includes('time')) return 'graph';
    if (prompt.includes('scatter') || prompt.includes('correlation') || prompt.includes('plot')) return 'plot';
    if (prompt.includes('table') || prompt.includes('summary')) return 'table';
    if (prompt.includes('heatmap') || prompt.includes('matrix')) return 'heatmap';
    return 'other';
  }

  /**
   * Suggest Python libraries based on visualization type
   */
  private suggestLibraries(type: string, prompt: string): string[] {
    const libraries = ['matplotlib', 'pandas', 'numpy'];
    
    if (prompt.includes('interactive') || prompt.includes('plotly')) {
      libraries.push('plotly');
    }
    
    if (prompt.includes('statistical') || prompt.includes('seaborn')) {
      libraries.push('seaborn', 'scipy');
    }
    
    if (prompt.includes('medical') || prompt.includes('clinical')) {
      libraries.push('lifelines', 'statsmodels');
    }
    
    return libraries;
  }

  /**
   * Generate a Python code template based on the visualization request
   */
  private generateCodeTemplate(type: string, prompt: string): string {
    const baseImports = `import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
plt.style.use('seaborn-v0_8-darkgrid')
`;

    let template = baseImports;

    // Add specific templates based on type
    switch (type) {
      case 'chart':
        template += `
# Sample bar chart
data = pd.DataFrame({
    'Category': ['A', 'B', 'C', 'D'],
    'Values': [10, 25, 15, 30]
})

plt.figure(figsize=(10, 6))
plt.bar(data['Category'], data['Values'])
plt.xlabel('Category')
plt.ylabel('Values')
plt.title('Bar Chart')
plt.show()
`;
        break;

      case 'graph':
        template += `
# Sample line graph
x = np.linspace(0, 10, 100)
y = np.sin(x)

plt.figure(figsize=(10, 6))
plt.plot(x, y)
plt.xlabel('X axis')
plt.ylabel('Y axis')
plt.title('Line Graph')
plt.grid(True)
plt.show()
`;
        break;

      case 'plot':
        template += `
# Sample scatter plot
np.random.seed(42)
x = np.random.randn(100)
y = 2 * x + np.random.randn(100) * 0.5

plt.figure(figsize=(10, 6))
plt.scatter(x, y, alpha=0.6)
plt.xlabel('X values')
plt.ylabel('Y values')
plt.title('Scatter Plot')
plt.show()

# Calculate correlation
correlation = np.corrcoef(x, y)[0, 1]
print(f"Correlation coefficient: {correlation:.3f}")
`;
        break;

      case 'heatmap':
        template += `
# Sample heatmap
data = np.random.randn(10, 12)
columns = [f'Month_{i+1}' for i in range(12)]
index = [f'Variable_{i+1}' for i in range(10)]

df = pd.DataFrame(data, columns=columns, index=index)

plt.figure(figsize=(12, 8))
sns.heatmap(df, annot=True, fmt='.2f', cmap='coolwarm', center=0)
plt.title('Heatmap')
plt.show()
`;
        break;

      default:
        template += `
# Customize this template based on your specific needs
# Your visualization code here
plt.figure(figsize=(10, 6))
# Add your plotting code
plt.show()
`;
    }

    // Add medical-specific template if medical keywords detected
    if (prompt.toLowerCase().includes('medical') || prompt.toLowerCase().includes('clinical')) {
      template += `
# Medical/Clinical visualization template
# Example: Kaplan-Meier survival curve
# from lifelines import KaplanMeierFitter
# kmf = KaplanMeierFitter()
# kmf.fit(durations, event_observed)
# kmf.plot_survival_function()
`;
    }

    return template;
  }

  /**
   * Generate E2B-ready code for execution
   */
  generateE2BCode(prompt: string, additionalContext?: string): string {
    const detection = this.detectVisualization(prompt);
    
    if (!detection.requiresVisualization) {
      return '';
    }

    let code = detection.pythonCodeTemplate || '';
    
    // Add context-specific modifications
    if (additionalContext) {
      code = `# Context: ${additionalContext}\n\n${code}`;
    }

    // Add data loading template if needed
    if (prompt.includes('data') || prompt.includes('csv') || prompt.includes('file')) {
      code = `# Data loading template
# df = pd.read_csv('your_data.csv')
# Or use provided data:
# data = ${additionalContext || '{}'}

${code}`;
    }

    return code;
  }
}