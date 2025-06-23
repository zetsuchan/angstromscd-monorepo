import Foundation
#if canImport(FoundationModels)
import FoundationModels
#endif

// MARK: - Medical Research Tools

#if canImport(FoundationModels)

@available(macOS 26.0, *)
protocol MedicalResearchTool: Tool {
    var domain: String { get }
    var specialty: String { get }
}

// MARK: - Literature Search Tool

@available(macOS 26.0, *)
@Tool
struct LiteratureSearchTool: MedicalResearchTool {
    let domain = "medical_research"
    let specialty = "sickle_cell_disease"
    
    var name: String { "literature_search" }
    var description: String {
        "Search medical literature for Sickle Cell Disease research papers, clinical trials, and treatment guidelines"
    }
    
    struct Parameters: Codable {
        let query: String
        let yearRange: YearRange?
        let publicationType: PublicationType?
        let includeAbstracts: Bool
        
        struct YearRange: Codable {
            let start: Int
            let end: Int
        }
        
        enum PublicationType: String, Codable {
            case clinicalTrial = "clinical_trial"
            case review = "review"
            case caseStudy = "case_study"
            case metaAnalysis = "meta_analysis"
        }
    }
    
    func execute(parameters: Parameters) async throws -> String {
        // In production, this would integrate with PubMed, clinical trial databases, etc.
        return """
        Found \(Int.random(in: 10...50)) relevant publications for "\(parameters.query)":
        
        1. Recent advances in VOE management (2024)
        2. Hydroxyurea therapy optimization in SCD patients (2024)
        3. Novel gene therapy approaches for sickle cell disease (2023)
        
        [Additional results would be returned from actual database queries]
        """
    }
}

// MARK: - Clinical Calculator Tool

@available(macOS 26.0, *)
@Tool
struct ClinicalCalculatorTool: MedicalResearchTool {
    let domain = "medical_research"
    let specialty = "sickle_cell_disease"
    
    var name: String { "clinical_calculator" }
    var description: String {
        "Calculate clinical scores and risk assessments for SCD patients including VOE risk, stroke risk, and medication dosing"
    }
    
    struct Parameters: Codable {
        let calculationType: CalculationType
        let patientData: PatientData
        
        enum CalculationType: String, Codable {
            case voeRisk = "voe_risk"
            case strokeRisk = "stroke_risk"
            case hydroxyureaDose = "hydroxyurea_dose"
            case painScore = "pain_score"
        }
        
        struct PatientData: Codable {
            let age: Int?
            let weight: Double? // in kg
            let hemoglobin: Double? // g/dL
            let hbF: Double? // percentage
            let priorVOECount: Int?
            let comorbidities: [String]?
        }
    }
    
    func execute(parameters: Parameters) async throws -> String {
        switch parameters.calculationType {
        case .voeRisk:
            return calculateVOERisk(patient: parameters.patientData)
        case .strokeRisk:
            return calculateStrokeRisk(patient: parameters.patientData)
        case .hydroxyureaDose:
            return calculateHydroxyureaDose(patient: parameters.patientData)
        case .painScore:
            return calculatePainScore(patient: parameters.patientData)
        }
    }
    
    private func calculateVOERisk(patient: Parameters.PatientData) -> String {
        // Simplified calculation - in production would use validated clinical models
        let baseRisk = 0.2
        var adjustedRisk = baseRisk
        
        if let priorVOE = patient.priorVOECount, priorVOE > 3 {
            adjustedRisk += 0.3
        }
        
        if let hbF = patient.hbF, hbF < 10 {
            adjustedRisk += 0.2
        }
        
        return """
        VOE Risk Assessment:
        - Calculated Risk: \(Int(adjustedRisk * 100))%
        - Risk Category: \(adjustedRisk > 0.5 ? "High" : "Moderate")
        - Recommendation: \(adjustedRisk > 0.5 ? "Consider prophylactic therapy" : "Continue current management")
        """
    }
    
    private func calculateStrokeRisk(patient: Parameters.PatientData) -> String {
        return """
        Stroke Risk Assessment:
        - Primary Stroke Risk: Low-Moderate
        - TCD Velocity Recommendation: Annual screening
        - Prevention Strategy: Continue hydroxyurea if indicated
        """
    }
    
    private func calculateHydroxyureaDose(patient: Parameters.PatientData) -> String {
        guard let weight = patient.weight else {
            return "Error: Patient weight required for dose calculation"
        }
        
        let startingDose = weight * 15 // 15 mg/kg/day starting dose
        let maxDose = weight * 35 // 35 mg/kg/day max dose
        
        return """
        Hydroxyurea Dosing Recommendation:
        - Starting Dose: \(Int(startingDose)) mg/day
        - Target Dose: \(Int(weight * 20)) mg/day
        - Maximum Dose: \(Int(maxDose)) mg/day
        - Monitoring: CBC every 2-4 weeks until stable
        """
    }
    
    private func calculatePainScore(patient: Parameters.PatientData) -> String {
        return """
        Pain Assessment:
        - Numeric Rating Scale: Requires patient input
        - FACES Scale: Requires patient input
        - Functional Impact: Assess ADL limitations
        """
    }
}

// MARK: - Drug Interaction Checker

@available(macOS 26.0, *)
@Tool
struct DrugInteractionTool: MedicalResearchTool {
    let domain = "medical_research"
    let specialty = "sickle_cell_disease"
    
    var name: String { "drug_interaction_checker" }
    var description: String {
        "Check for drug interactions relevant to SCD patients, including interactions with hydroxyurea, pain medications, and disease-modifying therapies"
    }
    
    struct Parameters: Codable {
        let medications: [String]
        let includeHerbal: Bool
        let patientFactors: PatientFactors?
        
        struct PatientFactors: Codable {
            let renalFunction: String?
            let hepaticFunction: String?
            let pregnancy: Bool?
        }
    }
    
    func execute(parameters: Parameters) async throws -> String {
        let medList = parameters.medications.joined(separator: ", ")
        
        // Simplified interaction check - in production would use drug interaction databases
        var interactions: [String] = []
        
        if parameters.medications.contains(where: { $0.lowercased().contains("hydroxyurea") }) {
            if parameters.medications.contains(where: { $0.lowercased().contains("warfarin") }) {
                interactions.append("Hydroxyurea + Warfarin: Monitor INR closely")
            }
        }
        
        return """
        Drug Interaction Analysis for: \(medList)
        
        Interactions Found: \(interactions.isEmpty ? "None" : "\(interactions.count)")
        \(interactions.joined(separator: "\n"))
        
        SCD-Specific Considerations:
        - Monitor for increased hemolysis
        - Assess impact on HbF production
        - Consider VOE trigger potential
        """
    }
}

// MARK: - Clinical Guidelines Tool

@available(macOS 26.0, *)
@Tool
struct ClinicalGuidelinesTool: MedicalResearchTool {
    let domain = "medical_research"
    let specialty = "sickle_cell_disease"
    
    var name: String { "clinical_guidelines" }
    var description: String {
        "Access current clinical practice guidelines for SCD management from major medical organizations"
    }
    
    struct Parameters: Codable {
        let topic: GuidelineTopic
        let organization: Organization?
        
        enum GuidelineTopic: String, Codable {
            case acuteVOE = "acute_voe"
            case chronicPain = "chronic_pain"
            case hydroxyurea = "hydroxyurea"
            case transfusion = "transfusion"
            case strokePrevention = "stroke_prevention"
            case pregnancy = "pregnancy"
        }
        
        enum Organization: String, Codable {
            case ash = "ASH" // American Society of Hematology
            case nhlbi = "NHLBI" // National Heart, Lung, and Blood Institute
            case bsh = "BSH" // British Society for Haematology
        }
    }
    
    func execute(parameters: Parameters) async throws -> String {
        let org = parameters.organization?.rawValue ?? "Multiple Organizations"
        
        switch parameters.topic {
        case .acuteVOE:
            return """
            Clinical Guidelines for Acute VOE Management (\(org)):
            
            1. Pain Assessment:
               - Use validated pain scales
               - Reassess every 30-60 minutes
            
            2. Analgesia:
               - Individualized opioid dosing
               - Consider PCA for severe pain
               - Multimodal approach recommended
            
            3. Supportive Care:
               - IV hydration (maintenance rate)
               - Oxygen only if hypoxic
               - Incentive spirometry
            
            Source: ASH 2020 Guidelines
            """
            
        case .hydroxyurea:
            return """
            Hydroxyurea Therapy Guidelines (\(org)):
            
            Indications:
            - ≥3 VOE/year requiring medical attention
            - History of ACS
            - Severe symptomatic anemia
            
            Monitoring:
            - CBC every 2-4 weeks during titration
            - Monthly when stable
            - Check MCV, HbF periodically
            
            Target: Maximum tolerated dose
            """
            
        default:
            return "Guidelines for \(parameters.topic.rawValue) from \(org) - [Additional content would be provided]"
        }
    }
}

// MARK: - Tool Registry

@available(macOS 26.0, *)
struct MedicalResearchToolRegistry {
    static let availableTools: [any MedicalResearchTool] = [
        LiteratureSearchTool(),
        ClinicalCalculatorTool(),
        DrugInteractionTool(),
        ClinicalGuidelinesTool()
    ]
    
    static func registerTools(with session: LanguageModelSession) {
        for tool in availableTools {
            session.registerTool(tool)
        }
    }
}

#else

// Mock implementation when FoundationModels is not available
@available(macOS 26.0, *)
struct MedicalResearchToolRegistry {
    @MainActor
    static let availableTools: [Any] = []
    
    static func registerTools(with session: Any) {
        // No-op when FoundationModels is not available
    }
}

#endif