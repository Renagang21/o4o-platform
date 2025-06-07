from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

app = FastAPI(title="AI Services", version="1.0.0", description="AI Services for O4O Platform")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "AI Services is running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai-services"}

@app.post("/api/v1/recommend")
async def recommend_products(request: dict):
    """제품 추천 API"""
    customer_id = request.get("customer_id")
    preferences = request.get("preferences", [])
    
    # TODO: 실제 AI 추천 로직 구현
    mock_recommendations = [
        {"product_id": "1", "name": "추천 상품 1", "score": 0.95},
        {"product_id": "2", "name": "추천 상품 2", "score": 0.87},
        {"product_id": "3", "name": "추천 상품 3", "score": 0.78}
    ]
    
    return {
        "customer_id": customer_id,
        "recommendations": mock_recommendations,
        "status": "success"
    }

@app.post("/api/v1/analyze")
async def analyze_data(request: dict):
    """데이터 분석 API"""
    data_type = request.get("data_type")
    data = request.get("data", [])
    
    # TODO: 실제 데이터 분석 로직 구현
    mock_analysis = {
        "data_type": data_type,
        "total_items": len(data),
        "analysis_result": "분석 완료",
        "confidence": 0.92
    }
    
    return {
        "analysis": mock_analysis,
        "status": "success"
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 3000))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=False)
