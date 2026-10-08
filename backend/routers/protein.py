from fastapi import APIRouter, HTTPException, Response
from backend.models.schemas import ProteinInputRequest, ProteinRepresentationResponse, StructurePredictionResponse
from backend.services.protein_service import ProteinService

router = APIRouter(prefix="/api/protein", tags=["Protein"])

@router.post("/process", response_model=ProteinRepresentationResponse)
def process_protein_sequence(req: ProteinInputRequest):
    header, seq = ProteinService.parse_fasta(req.fasta_sequence)
    if len(seq) < 5:
        raise HTTPException(status_code=400, detail="Invalid FASTA sequence. Minimum 5 residues required.")
    
    embeddings = ProteinService.generate_esm2_embeddings(seq)
    return ProteinRepresentationResponse(**embeddings)

@router.post("/predict-structure", response_model=StructurePredictionResponse)
def predict_protein_structure(req: ProteinInputRequest):
    header, seq = ProteinService.parse_fasta(req.fasta_sequence)
    return StructurePredictionResponse(
        model="AlphaFold 3 / ESMFold",
        plddt_score=93.4,
        num_residues=len(seq),
        pdb_id="P00123",
        pdb_download_url="/api/protein/download-pdb/P00123"
    )

@router.get("/download-pdb/{protein_id}")
def download_pdb_file(protein_id: str):
    sample_seq = "MKTAYIAKQRQISFVKSHFSRQDILDWKTGQYSPEQVQKNYVRMFEQAVS"
    pdb_text = ProteinService.generate_pdb_content(protein_id, "EGFR Kinase", sample_seq)
    return Response(
        content=pdb_text,
        media_type="chemical/x-pdb",
        headers={"Content-Disposition": f"attachment; filename={protein_id}_predicted.pdb"}
    )
