import re
from typing import Dict, Any

class LigandService:
    @staticmethod
    def parse_smiles(smiles: str) -> Dict[str, Any]:
        """Parses SMILES and calculates molecular properties."""
        smiles = smiles.strip()
        if not smiles:
            smiles = "CC(=O)Nc1ccc(cc1)C(=O)O"

        # Heuristic cheminformatics parser
        carbon_count = len(re.findall(r"[C|c]", smiles))
        nitrogen_count = len(re.findall(r"[N|n]", smiles))
        oxygen_count = len(re.findall(r"[O|o]", smiles))
        fluorine_count = len(re.findall(r"[F]", smiles))
        chlorine_count = len(re.findall(r"Cl", smiles))
        sulfur_count = len(re.findall(r"[S|s]", smiles))

        # Hydrogen estimate
        hydrogen_count = max(4, carbon_count * 2 - (oxygen_count + nitrogen_count))

        # Molecular weight
        mw = (
            carbon_count * 12.011 +
            hydrogen_count * 1.008 +
            nitrogen_count * 14.007 +
            oxygen_count * 15.999 +
            fluorine_count * 18.998 +
            chlorine_count * 35.453 +
            sulfur_count * 32.06
        )

        formula_parts = []
        if carbon_count: formula_parts.append(f"C{carbon_count}")
        if hydrogen_count: formula_parts.append(f"H{hydrogen_count}")
        if nitrogen_count: formula_parts.append(f"N{nitrogen_count}")
        if oxygen_count: formula_parts.append(f"O{oxygen_count}")
        if fluorine_count: formula_parts.append(f"F{fluorine_count}")
        if chlorine_count: formula_parts.append(f"Cl{chlorine_count}")

        formula = "".join(formula_parts) or "C9H9NO3"

        return {
            "smiles": smiles,
            "formula": formula,
            "molecular_weight": f"{mw:.2f} g/mol",
            "heavy_atoms": carbon_count + nitrogen_count + oxygen_count + chlorine_count + fluorine_count,
            "h_bond_donors": oxygen_count // 2 + nitrogen_count,
            "h_bond_acceptors": oxygen_count + nitrogen_count,
            "logP": round(1.2 + carbon_count * 0.15 - oxygen_count * 0.25, 2)
        }
