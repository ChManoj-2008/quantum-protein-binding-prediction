from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import protein, ligand, predict, history, auth

app = FastAPI(
    title="QBindAI API",
    description="Quantum AI/ML for Protein Structure and Binding-Site Prediction Backend",
    version="1.0.0"
)

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router)
app.include_router(protein.router)
app.include_router(ligand.router)
app.include_router(predict.router)
app.include_router(history.router)

@app.get("/")
def root():
    return {
        "platform": "QBindAI",
        "description": "Quantum AI/ML for Protein Structure & Binding-Site Prediction",
        "status": "operational",
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "models": {
            "protein_representation": "ESM-2 (650M)",
            "structure_prediction": "AlphaFold 3 / ESMFold",
            "pocket_detection": "GNN / GAT",
            "docking": "AutoDock Vina / DiffDock",
            "quantum_refinement": "PennyLane / Qiskit VQE",
            "ensemble_scorer": "XGBoost / Ensemble"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
