from fastapi import APIRouter
from typing import List
from backend.models.schemas import HistoryItem

router = APIRouter(prefix="/api/history", tags=["History"])

# Seed database matching Image 9
HISTORY_STORE = [
    HistoryItem(id=1, protein_name="EGFR", ligand="Erlotinib", binding_affinity="-9.8 kcal/mol", date="2026-10-04 14:32", status="Completed"),
    HistoryItem(id=2, protein_name="BRCA1", ligand="Olaparib", binding_affinity="-8.4 kcal/mol", date="2026-10-03 11:20", status="Completed"),
    HistoryItem(id=3, protein_name="CDK2", ligand="Roscovitine", binding_affinity="-7.9 kcal/mol", date="2026-10-02 16:45", status="Completed"),
    HistoryItem(id=4, protein_name="ACHE", ligand="Donepezil", binding_affinity="-8.7 kcal/mol", date="2026-10-01 10:12", status="Completed"),
    HistoryItem(id=5, protein_name="VEGFR2", ligand="Sunitinib", binding_affinity="-8.1 kcal/mol", date="2026-09-30 18:07", status="Completed"),
]

@router.get("", response_model=List[HistoryItem])
def get_prediction_history():
    return HISTORY_STORE

@router.post("", response_model=HistoryItem)
def add_prediction_history(item: HistoryItem):
    HISTORY_STORE.insert(0, item)
    return item
