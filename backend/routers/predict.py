from fastapi import APIRouter
from backend.models.schemas import (
    FullPredictionRequest,
    PocketPredictionResponse,
    DockingResponse,
    QuantumRefinementResponse,
    FinalPredictionResponse
)
from backend.services.protein_service import ProteinService
from backend.services.ligand_service import LigandService
from backend.services.pocket_service import PocketService
from backend.services.docking_service import DockingService
from backend.services.quantum_service import QuantumService
from backend.services.ensemble_service import EnsembleService

router = APIRouter(prefix="/api/predict", tags=["Prediction Pipeline"])

@router.post("/full-pipeline")
def execute_full_pipeline(req: FullPredictionRequest):
    """
    Executes the complete end-to-end pipeline:
    1. Protein processing (ESM-2 embeddings)
    2. Ligand processing (SMILES cheminformatics)
    3. Structure prediction (AlphaFold 3 / ESMFold)
    4. Pocket detection (GNN / GAT)
    5. Molecular docking (AutoDock Vina / DiffDock)
    6. Quantum refinement (VQE / PennyLane / Qiskit)
    7. Ensemble consensus & final affinity score
    """
    # 1. Protein
    header, seq = ProteinService.parse_fasta(req.fasta_sequence)
    protein_rep = ProteinService.generate_esm2_embeddings(seq)

    # 2. Ligand
    ligand_props = LigandService.parse_smiles(req.smiles)

    # 3. Pocket
    pocket_res = PocketService.predict_pockets(seq)

    # 4. Docking
    docking_res = DockingService.run_molecular_docking(seq, req.smiles)

    # 5. Quantum Refinement
    quantum_res = QuantumService.run_vqe_refinement(docking_res["binding_energy_raw"])

    # 6. Qiskit quantum ML analysis (complementary model)
    quantum_analysis = QuantumService.run_qiskit_binding_analysis(
        protein_features=protein_rep,
        ligand_properties=ligand_props,
        docking_energy=docking_res["binding_energy_raw"],
    )

    # 7. Ensemble Consensus
    final_res = EnsembleService.calculate_final_prediction(
        protein_name=req.protein_name or header,
        ligand_name=req.ligand_name,
        docking_energy=docking_res["binding_energy_raw"],
        quantum_correction=quantum_res["quantum_correction_factor"],
        quantum_binding_probability=quantum_analysis["binding_probability"]
    )

    return {
        "status": "completed",
        "protein_representation": protein_rep,
        "ligand_properties": ligand_props,
        "pocket_prediction": pocket_res,
        "molecular_docking": docking_res,
        "quantum_refinement": quantum_res,
        "quantum_analysis": quantum_analysis,
        "final_prediction": final_res
    }

@router.post("/pocket", response_model=PocketPredictionResponse)
def predict_pocket_step(req: FullPredictionRequest):
    header, seq = ProteinService.parse_fasta(req.fasta_sequence)
    res = PocketService.predict_pockets(seq)
    return PocketPredictionResponse(**res)

@router.post("/docking", response_model=DockingResponse)
def dock_molecule_step(req: FullPredictionRequest):
    res = DockingService.run_molecular_docking(req.fasta_sequence, req.smiles)
    return DockingResponse(**res)

@router.post("/quantum-refinement", response_model=QuantumRefinementResponse)
def quantum_refine_step(docking_energy: float = -9.45):
    res = QuantumService.run_vqe_refinement(docking_energy)
    return QuantumRefinementResponse(**res)

@router.post("/final-consensus", response_model=FinalPredictionResponse)
def final_consensus_step(req: FullPredictionRequest):
    res = EnsembleService.calculate_final_prediction(
        protein_name=req.protein_name or "Target Protein",
        ligand_name=req.ligand_name or "Ligand",
        docking_energy=-9.45,
        quantum_correction=-0.35
    )
    return FinalPredictionResponse(**res)
