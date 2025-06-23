use super::ApiResponse;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub content: String,
    pub role: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatResponse {
    pub message: String,
    pub citations: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LiteratureResult {
    pub title: String,
    pub abstract_text: String,
    pub pmid: Option<String>,
    pub doi: Option<String>,
    pub relevance_score: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VoeAlert {
    pub id: String,
    pub patient_id: String,
    pub risk_level: String,
    pub message: String,
    pub timestamp: String,
}

#[tauri::command]
pub async fn fetch_api_data(endpoint: String) -> Result<ApiResponse<serde_json::Value>, String> {
    let client = reqwest::Client::new();
    let url = format!("http://localhost:3001/api/{}", endpoint);
    
    match client.get(&url).send().await {
        Ok(response) => {
            match response.json::<serde_json::Value>().await {
                Ok(data) => Ok(ApiResponse {
                    success: true,
                    data: Some(data),
                    error: None,
                }),
                Err(e) => Ok(ApiResponse {
                    success: false,
                    data: None,
                    error: Some(e.to_string()),
                }),
            }
        }
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

#[tauri::command]
pub async fn send_chat_message(message: ChatMessage, mode: String, tone: String) -> Result<ApiResponse<ChatResponse>, String> {
    let client = reqwest::Client::new();
    let url = "http://localhost:3001/api/chat";
    
    let body = serde_json::json!({
        "message": message.content,
        "role": message.role,
        "mode": mode,
        "tone": tone
    });
    
    match client.post(url).json(&body).send().await {
        Ok(response) => {
            match response.json::<ChatResponse>().await {
                Ok(data) => Ok(ApiResponse {
                    success: true,
                    data: Some(data),
                    error: None,
                }),
                Err(e) => Ok(ApiResponse {
                    success: false,
                    data: None,
                    error: Some(e.to_string()),
                }),
            }
        }
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

#[tauri::command]
pub async fn search_literature(query: String, limit: u32) -> Result<ApiResponse<Vec<LiteratureResult>>, String> {
    let client = reqwest::Client::new();
    let url = format!("http://localhost:3001/api/literature/search?q={}&limit={}", query, limit);
    
    match client.get(&url).send().await {
        Ok(response) => {
            match response.json::<Vec<LiteratureResult>>().await {
                Ok(data) => Ok(ApiResponse {
                    success: true,
                    data: Some(data),
                    error: None,
                }),
                Err(e) => Ok(ApiResponse {
                    success: false,
                    data: None,
                    error: Some(e.to_string()),
                }),
            }
        }
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

#[tauri::command]
pub async fn get_voe_alerts() -> Result<ApiResponse<Vec<VoeAlert>>, String> {
    let client = reqwest::Client::new();
    let url = "http://localhost:3001/api/voe/alerts";
    
    match client.get(url).send().await {
        Ok(response) => {
            match response.json::<Vec<VoeAlert>>().await {
                Ok(data) => Ok(ApiResponse {
                    success: true,
                    data: Some(data),
                    error: None,
                }),
                Err(e) => Ok(ApiResponse {
                    success: false,
                    data: None,
                    error: Some(e.to_string()),
                }),
            }
        }
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}