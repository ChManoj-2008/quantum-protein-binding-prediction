from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ProteinInputRequest(BaseModel):
    fasta_sequence: str = Field(..., description="FASTA format amino acid sequence")
    protein_name: Optional[str] = Field("Protein Target", description="Name of the protein target")

class LigandInputRequest(BaseModel):
    smiles: str = Field(..., description="SMILES string or chemical identifier")
    ligand_name: Optional[str] = Field("Ligand Molecule", description="Name of the ligand")

class FullPredictionRequest(BaseModel):
    fasta_sequence: str
    smiles: str
    protein_name: Optional[str] = "Target Protein"
    ligand_name: Optional[str] = "Candidate Ligand"
    selected_model: Optional[str] = "AlphaFold 3 / ESMFold"

class ResidueInteraction(BaseModel):
    name: str
    distance: str
    interaction_type: str

class ProteinRepresentationResponse(BaseModel):
    sequence_length: int
    esm2_model: str
    embedding_dimension: int = 1280
    model_status: str = "✓ Completed"
    heatmap_matrix: List[List[float]]
    sample_feature_vectors: List[float]
    representation_summary: str

class StructurePredictionResponse(BaseModel):
    model: str
    plddt_score: float
    confidence_percentage: float = 92.4
    num_residues: int
    pdb_id: str
    view_modes: List[str] = ["Ribbon", "Surface", "Cartoon"]
    pdb_download_url: str

class PocketSite(BaseModel):
    id: str
    name: str
    probability: float
    probability_bar: str
    volume: str
    residues: List[str]
    is_primary: bool = False

class PocketPredictionResponse(BaseModel):
    model: str
    num_pockets_found: int
    primary_pocket_center: List[float]
    sites: List[PocketSite]
    probability_distribution: Dict[str, float]
    interacting_residues: List[str]

class DockingPose(BaseModel):
    pose_id: int
    label: str
    affinity: str
    energy_kcal_mol: float
    rmsd: float
    is_best: bool = False
    residues: List[ResidueInteraction]

class DockingResponse(BaseModel):
    docking_model: str
    best_pose_rmsd: float
    binding_energy_raw: float
    poses: List[DockingPose]
    key_residues: List[ResidueInteraction]

class QuantumRefinementResponse(BaseModel):
    quantum_framework: str
    ansatz_type: str
    equation: str = "E(θ) = ⟨ψ(θ)|H|ψ(θ)⟩"
    active_region_residues: List[str]
    vqe_iterations: int
    classical_energy: float
    hamiltonian_energy: float
    quantum_correction_factor: float
    convergence_history: List[float]
    circuit_summary: Dict[str, Any]

class FinalPredictionResponse(BaseModel):
    protein_name: str
    ligand_name: str
    binding_affinity: str
    binding_affinity_val: float
    confidence_level: str
    confidence_score: float
    classical_baseline: str = "-9.45 kcal/mol"
    quantum_refinement_delta: str = "-0.35 kcal/mol"
    ensemble_model: str
    steps_completed: List[str]
    timestamp: str

class HistoryItem(BaseModel):
    id: int
    protein_name: str
    ligand: str
    binding_affinity: str
    date: str
    status: str
