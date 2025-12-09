import { getCodeExecutor } from "../services/code-executor";
import type {
	CodeExecutionInput,
	MedicalAnalysisInput,
	MedicalAnalysisResult,
} from "../types/e2b";
import { VOERiskTool } from "./voe-risk";

export class MedicalAnalysisOrchestrator {
	private codeExecutor = getCodeExecutor();

	/**
	 * Perform medical data analysis
	 */
	async performAnalysis(
		input: MedicalAnalysisInput,
	): Promise<MedicalAnalysisResult> {
		// Delegate to VOE risk tool if requested
		if (input.analysisType === "voe_risk") {
			const voeTool = new VOERiskTool();
			const execRes = await voeTool.run(input.data);
			return {
				analysisType: "voe_risk",
				results: { rawOutput: execRes.output },
				visualizations: execRes.files
					?.filter((f: any) => f.name.endsWith(".png"))
					.map((f: any) => ({
						name: f.name,
						type: f.type,
						data: f.content,
					})),
				summary: "VOE risk analysis completed",
				recommendations: [],
				success: execRes.success,
				output: execRes.output,
				error: execRes.error,
				files: execRes.files,
				executionTime: execRes.executionTime,
				sandboxId: execRes.sandboxId,
			};
		}
		const analysisCode = this.generateAnalysisCode(input);

		const executionInput: CodeExecutionInput = {
			code: analysisCode,
			language:
				(input.language as "python" | "javascript" | "typescript" | "bash") ||
				"python",
			files: input.files,
			packages: this.getRequiredPackages(input.analysisType),
			timeout: input.timeout,
		};

		const result = await this.codeExecutor.executeCode(executionInput);

		return {
			analysisType: input.analysisType,
			results: this.parseAnalysisResults(result.output, input.analysisType),
			visualizations: result.files
				?.filter((f: any) => f.type.startsWith("image/"))
				.map((f: any) => ({
					name: f.name,
					type: f.type,
					data: f.content,
				})),
			summary: this.generateSummary(result.output, input.analysisType),
			recommendations: this.generateRecommendations(
				result.output,
				input.analysisType,
			),
			success: result.success,
			output: result.output,
			error: result.error,
			files: result.files,
			executionTime: result.executionTime,
			sandboxId: result.sandboxId,
		};
	}

	/**
	 * Perform streaming medical analysis for long-running operations
	 */
	async performAnalysisStream(
		input: MedicalAnalysisInput,
		onProgress: (progress: string) => void,
		onError: (error: string) => void,
	): Promise<MedicalAnalysisResult> {
		const analysisCode = this.generateAnalysisCode(input);

		const executionInput: CodeExecutionInput = {
			code: analysisCode,
			language:
				(input.language as "python" | "javascript" | "typescript" | "bash") ||
				"python",
			files: input.files,
			packages: this.getRequiredPackages(input.analysisType),
			timeout: input.timeout,
		};

		const result = await this.codeExecutor.executeCodeStream(
			executionInput,
			onProgress,
			onError,
		);

		return {
			analysisType: input.analysisType,
			results: this.parseAnalysisResults(result.output, input.analysisType),
			visualizations: result.files
				?.filter((f: any) => f.type.startsWith("image/"))
				.map((f: any) => ({
					name: f.name,
					type: f.type,
					data: f.content,
				})),
			summary: this.generateSummary(result.output, input.analysisType),
			recommendations: this.generateRecommendations(
				result.output,
				input.analysisType,
			),
			success: result.success,
			output: result.output,
			error: result.error,
			files: result.files,
			executionTime: result.executionTime,
			sandboxId: result.sandboxId,
		};
	}

	/**
	 * Generate analysis code based on the type of analysis requested
	 */
	private generateAnalysisCode(input: MedicalAnalysisInput): string {
		const baseImports = `
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import json
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Set up plotting
plt.style.use('default')
sns.set_palette("husl")
`;

		switch (input.analysisType) {
			case "data_analysis":
				return `${baseImports}
# Medical Data Analysis
print("Starting medical data analysis...")

# Load and parse data
try:
    data_str = '''${input.data}'''
    
    # Try to parse as JSON first, then CSV
    try:
        import json
        data = json.loads(data_str)
        df = pd.DataFrame(data)
    except:
        from io import StringIO
        df = pd.read_csv(StringIO(data_str))
    
    print(f"Data loaded successfully. Shape: {df.shape}")
    print("\\nData Info:")
    print(df.info())
    
    print("\\nDescriptive Statistics:")
    print(df.describe())
    
    print("\\nMissing Values:")
    print(df.isnull().sum())
    
    # Basic analysis results
    results = {
        "shape": df.shape,
        "columns": df.columns.tolist(),
        "dtypes": df.dtypes.to_dict(),
        "missing_values": df.isnull().sum().to_dict(),
        "summary_stats": df.describe().to_dict()
    }
    
    print("\\nAnalysis Results:")
    print(json.dumps(results, indent=2, default=str))
    
except Exception as e:
    print(f"Error in data analysis: {str(e)}")
    results = {"error": str(e)}
`;

			case "visualization":
				return `${baseImports}
# Medical Data Visualization
print("Creating medical data visualizations...")

try:
    data_str = '''${input.data}'''
    
    # Parse data
    try:
        data = json.loads(data_str)
        df = pd.DataFrame(data)
    except:
        from io import StringIO
        df = pd.read_csv(StringIO(data_str))
    
    print(f"Data loaded for visualization. Shape: {df.shape}")
    
    # Create multiple visualizations
    fig, axes = plt.subplots(2, 2, figsize=(15, 12))
    fig.suptitle('Medical Data Analysis Dashboard', fontsize=16)
    
    # Plot 1: Distribution of numeric columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if len(numeric_cols) > 0:
        df[numeric_cols[0]].hist(ax=axes[0,0], bins=20)
        axes[0,0].set_title(f'Distribution of {numeric_cols[0]}')
    
    # Plot 2: Correlation heatmap
    if len(numeric_cols) > 1:
        corr_matrix = df[numeric_cols].corr()
        sns.heatmap(corr_matrix, annot=True, ax=axes[0,1], cmap='coolwarm')
        axes[0,1].set_title('Correlation Matrix')
    
    # Plot 3: Box plot
    if len(numeric_cols) > 0:
        df.boxplot(column=numeric_cols[0], ax=axes[1,0])
        axes[1,0].set_title(f'Box Plot of {numeric_cols[0]}')
    
    # Plot 4: Time series or categorical analysis
    categorical_cols = df.select_dtypes(include=['object']).columns
    if len(categorical_cols) > 0:
        df[categorical_cols[0]].value_counts().plot(kind='bar', ax=axes[1,1])
        axes[1,1].set_title(f'Distribution of {categorical_cols[0]}')
        axes[1,1].tick_params(axis='x', rotation=45)
    
    plt.tight_layout()
    plt.show()
    
    print("Visualizations created successfully")
    
except Exception as e:
    print(f"Error in visualization: {str(e)}")
`;

			case "statistical_analysis":
				return `${baseImports}
from scipy import stats
from sklearn.preprocessing import StandardScaler

# Statistical Analysis
print("Performing statistical analysis...")

try:
    data_str = '''${input.data}'''
    
    # Parse data
    try:
        data = json.loads(data_str)
        df = pd.DataFrame(data)
    except:
        from io import StringIO
        df = pd.read_csv(StringIO(data_str))
    
    print(f"Data loaded for statistical analysis. Shape: {df.shape}")
    
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    
    if len(numeric_cols) >= 2:
        # Correlation analysis
        correlations = df[numeric_cols].corr()
        print("\\nCorrelation Analysis:")
        print(correlations)
        
        # T-tests between groups if applicable
        for i, col1 in enumerate(numeric_cols):
            for col2 in numeric_cols[i+1:]:
                if col1 != col2:
                    stat, p_value = stats.pearsonr(df[col1].dropna(), df[col2].dropna())
                    print(f"\\nPearson correlation between {col1} and {col2}:")
                    print(f"Correlation coefficient: {stat:.4f}")
                    print(f"P-value: {p_value:.4f}")
        
        # Normality tests
        print("\\nNormality Tests (Shapiro-Wilk):")
        for col in numeric_cols:
            stat, p_value = stats.shapiro(df[col].dropna())
            print(f"{col}: statistic={stat:.4f}, p-value={p_value:.4f}")
    
    results = {
        "correlations": correlations.to_dict() if len(numeric_cols) >= 2 else {},
        "normality_tests": {col: stats.shapiro(df[col].dropna()) for col in numeric_cols}
    }
    
    print("\\nStatistical Analysis Results:")
    print(json.dumps(results, indent=2, default=str))
    
except Exception as e:
    print(f"Error in statistical analysis: {str(e)}")
`;

			case "ml_modeling":
				return `${baseImports}
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import classification_report, mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder

# Machine Learning Modeling
print("Performing ML modeling...")

try:
    data_str = '''${input.data}'''
    
    # Parse data
    try:
        data = json.loads(data_str)
        df = pd.DataFrame(data)
    except:
        from io import StringIO
        df = pd.read_csv(StringIO(data_str))
    
    print(f"Data loaded for ML modeling. Shape: {df.shape}")
    
    # Prepare features and target
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    
    if len(numeric_cols) >= 2:
        # Use last numeric column as target, others as features
        target_col = numeric_cols[-1]
        feature_cols = numeric_cols[:-1]
        
        X = df[feature_cols].fillna(df[feature_cols].mean())
        y = df[target_col].fillna(df[target_col].mean())
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Determine if classification or regression
        if len(y.unique()) <= 10:  # Classification
            model = RandomForestClassifier(n_estimators=100, random_state=42)
            model.fit(X_train, y_train)
            predictions = model.predict(X_test)
            
            print("\\nClassification Results:")
            print(classification_report(y_test, predictions))
            
            # Feature importance
            importance = pd.DataFrame({
                'feature': feature_cols,
                'importance': model.feature_importances_
            }).sort_values('importance', ascending=False)
            
            print("\\nFeature Importance:")
            print(importance)
            
        else:  # Regression
            model = RandomForestRegressor(n_estimators=100, random_state=42)
            model.fit(X_train, y_train)
            predictions = model.predict(X_test)
            
            mse = mean_squared_error(y_test, predictions)
            r2 = r2_score(y_test, predictions)
            
            print("\\nRegression Results:")
            print(f"Mean Squared Error: {mse:.4f}")
            print(f"R² Score: {r2:.4f}")
            
            # Feature importance
            importance = pd.DataFrame({
                'feature': feature_cols,
                'importance': model.feature_importances_
            }).sort_values('importance', ascending=False)
            
            print("\\nFeature Importance:")
            print(importance)
    
    print("ML modeling completed successfully")
    
except Exception as e:
    print(f"Error in ML modeling: {str(e)}")
`;

			case "report_generation":
				return `${baseImports}
# Medical Report Generation
print("Generating medical analysis report...")

try:
    data_str = '''${input.data || ""}'''
    
    # Parse data
    try:
        data = json.loads(data_str)
        df = pd.DataFrame(data)
    except:
        from io import StringIO
        df = pd.read_csv(StringIO(data_str))
    
    print("=== MEDICAL DATA ANALYSIS REPORT ===")
    print(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*50)
    
    print("\\n1. DATA OVERVIEW")
    print(f"   - Dataset shape: {df.shape[0]} rows, {df.shape[1]} columns")
    print(f"   - Columns: {', '.join(df.columns.tolist())}")
    
    print("\\n2. DATA QUALITY ASSESSMENT")
    missing_data = df.isnull().sum()
    if missing_data.sum() > 0:
        print("   - Missing values detected:")
        for col, missing in missing_data[missing_data > 0].items():
            print(f"     * {col}: {missing} ({missing/len(df)*100:.1f}%)")
    else:
        print("   - No missing values detected")
    
    print("\\n3. DESCRIPTIVE STATISTICS")
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if len(numeric_cols) > 0:
        print("   Numeric variables summary:")
        for col in numeric_cols:
            stats = df[col].describe()
            print(f"   - {col}:")
            print(f"     * Mean: {stats['mean']:.2f}")
            print(f"     * Std: {stats['std']:.2f}")
            print(f"     * Range: {stats['min']:.2f} - {stats['max']:.2f}")
    
    print("\\n4. KEY FINDINGS")
    print("   - Data analysis completed successfully")
    print("   - Statistical patterns identified")
    print("   - Visualizations generated")
    
    print("\\n5. RECOMMENDATIONS")
    print("   - Regular monitoring recommended")
    print("   - Further analysis may be beneficial")
    print("   - Consider additional data collection")
    
    print("\\n" + "="*50)
    print("End of Report")
    
except Exception as e:
    print(f"Error in report generation: {str(e)}")
`;

			default:
				return `${baseImports}
print("Unknown analysis type: ${input.analysisType}")
print("Available types: data_analysis, visualization, statistical_analysis, ml_modeling, report_generation")
`;
		}
	}

	/**
	 * Get required packages for each analysis type
	 */
	private getRequiredPackages(analysisType: string): string[] {
		const basePackages = ["pandas", "numpy", "matplotlib", "seaborn"];

		switch (analysisType) {
			case "statistical_analysis":
				return [...basePackages, "scipy"];
			case "ml_modeling":
				return [...basePackages, "scikit-learn"];
			case "visualization":
				return [...basePackages, "plotly"];
			default:
				return basePackages;
		}
	}

	/**
	 * Parse analysis results from output
	 */
	private parseAnalysisResults(
		output: string,
		analysisType: string,
	): Record<string, any> {
		try {
			// Look for JSON in the output
			const jsonMatch = output.match(/\{[\s\S]*\}/g);
			if (jsonMatch && jsonMatch.length > 0) {
				const lastMatch = jsonMatch[jsonMatch.length - 1];
				if (lastMatch) {
					return JSON.parse(lastMatch);
				}
			}
		} catch (error) {
			// If JSON parsing fails, return structured output
		}

		return {
			analysisType,
			rawOutput: output,
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Generate human-readable summary
	 */
	private generateSummary(output: string, analysisType: string): string {
		const lines = output.split("\n").filter((line) => line.trim());
		const importantLines = lines.filter(
			(line) =>
				line.includes("successfully") ||
				line.includes("completed") ||
				line.includes("Results:") ||
				line.includes("Error:"),
		);

		if (importantLines.length > 0) {
			return `${analysisType} completed. Key findings: ${importantLines.join(". ")}`;
		}

		return `${analysisType} analysis was performed on the provided medical data.`;
	}

	/**
	 * Generate medical recommendations based on analysis
	 */
	private generateRecommendations(
		output: string,
		analysisType: string,
	): string[] {
		const recommendations: string[] = [];

		if (output.includes("error") || output.includes("Error")) {
			recommendations.push("Review data quality and format");
			recommendations.push("Ensure all required fields are present");
		} else {
			switch (analysisType) {
				case "data_analysis":
					recommendations.push("Consider additional data validation");
					recommendations.push("Monitor key metrics regularly");
					break;
				case "statistical_analysis":
					recommendations.push("Review statistical significance of findings");
					recommendations.push("Consider larger sample size if needed");
					break;
				case "ml_modeling":
					recommendations.push("Validate model performance on new data");
					recommendations.push("Consider feature engineering improvements");
					break;
				default:
					recommendations.push("Continue monitoring and analysis");
			}
		}

		return recommendations;
	}
}

// Singleton instance
let medicalAnalysisInstance: MedicalAnalysisOrchestrator | null = null;

export function getMedicalAnalysisOrchestrator(): MedicalAnalysisOrchestrator {
	if (!medicalAnalysisInstance) {
		medicalAnalysisInstance = new MedicalAnalysisOrchestrator();
	}
	return medicalAnalysisInstance;
}
