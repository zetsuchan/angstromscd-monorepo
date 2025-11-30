import { getCodeExecutor } from "../services/code-executor";
import type { CodeExecutionInput, ExecutionResult } from "../types/e2b";

/**
 * Vaso-Occlusive Event (VOE) Risk analysis tool.
 * Runs a Python script in an E2B sandbox that:
 *  1. Loads patient data (CSV/JSON string).
 *  2. Featurises common VOE risk factors.
 *  3. Uses a simple LogisticRegression model (pre-trained coefficients hard-coded for demo) to compute risk.
 *  4. Plots SHAP-style feature importance bar chart.
 */
export class VOERiskTool {
	private codeExecutor = getCodeExecutor();

	async run(
		patientData: string, // CSV or JSON string with columns age, hemoglobin, wbc, previous_voe, hydroxyurea
	): Promise<ExecutionResult> {
		const pythonCode = this.buildPythonScript(patientData);

		const input: CodeExecutionInput = {
			code: pythonCode,
			language: "python",
			timeout: 60,
			packages: ["pandas", "numpy", "scikit-learn", "matplotlib", "seaborn"],
		};

		return this.codeExecutor.executeCode(input);
	}

	private buildPythonScript(rawData: string): string {
		// Use JSON.stringify to safely embed data and prevent code injection
		const safeData = JSON.stringify(rawData);
		return `
import json, textwrap, base64, io, os, warnings
warnings.filterwarnings('ignore')
import pandas as pd, numpy as np, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.linear_model import LogisticRegression

# ---------- Load data ----------
raw = json.loads(${safeData})
try:
    data = json.loads(raw)
    df = pd.DataFrame(data)
except Exception:
    from io import StringIO
    df = pd.read_csv(StringIO(raw))

print("Loaded data shape:", df.shape)

# Ensure expected columns exist, fill missing
expected = ["age", "hemoglobin", "wbc", "previous_voe", "hydroxyurea"]
for col in expected:
    if col not in df.columns:
        df[col] = np.nan

# Simple preprocessing
X = df[expected].fillna(df[expected].median())

# ---------- Logistic model (coefficients from literature placeholder) ----------
coefs = np.array([0.03, -0.2, 0.05, 1.0, -0.8])  # demo values
intercept = -2.0

logits = np.dot(X.values, coefs) + intercept
probs = 1 / (1 + np.exp(-logits))

df["voe_risk"] = probs
print("\nRisk probabilities:")
print(df[["voe_risk"]])

# ---------- Plot feature importance ----------
fig, ax = plt.subplots(figsize=(6,3))
ax.barh(expected, coefs)
ax.set_xlabel('Coefficient')
ax.set_title('VOE Risk Feature Importance')
plt.tight_layout()
png_buf = io.BytesIO()
plt.savefig(png_buf, format='png')
print("::savefile::voe_feature_importance.png::" + base64.b64encode(png_buf.getvalue()).decode())
`;
	}
}
