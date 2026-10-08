from fastapi import APIRouter
from backend.models.schemas import LigandInputRequest
from backend.services.ligand_service import LigandService

router = APIRouter(prefix="/api/ligand", tags=["Ligand"])

@router.post("/process")
def process_ligand_molecule(req: LigandInputRequest):
    properties = LigandService.parse_smiles(req.smiles)
    return {
        "status": "success",
        "ligand_name": req.ligand_name,
        "properties": properties
    }
