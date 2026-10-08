// Sample data and default structures for QBindAI

export const SAMPLE_PROTEINS = {
  P00123: {
    id: "P00123",
    name: "EGFR Kinase Domain",
    organism: "Homo sapiens",
    fasta: `>sp|P00123|EGFR_HUMAN Epidermal growth factor receptor
MKTAYIAKQRQISFVKSHFSRQDILDWKTGQYSPEQVQKNYVRMFEQAVS
LKGLEVDITETVKGSSGTKLTEVFEKDLYTVDGVEYKFKVAPAGAKEVKVK
FDEEVKPGLSVDPEEFEKWKDEIKKQEEQVKEDLEKIKKELDEV`,
    defaultSmiles: "CC(=O)Nc1ccc(cc1)C(=O)O",
    ligandName: "Erlotinib analog",
    formula: "C9H9NO3",
    mw: "179.17 g/mol",
    predictedAffinity: "-9.8 kcal/mol",
    confidence: "High Confidence",
    confidenceScore: 0.94,
    residues: [
      { name: "TYR102", distance: "2.8 Å", type: "H-Bond" },
      { name: "PHE103", distance: "3.4 Å", type: "Pi-Pi Stacking" },
      { name: "LEU106", distance: "3.9 Å", type: "Hydrophobic" },
      { name: "VAL109", distance: "3.1 Å", type: "H-Bond" }
    ],
    featureVectors: ["0.12", "-0.34", "0.56", "-0.21", "0.89", "-0.05", "0.42", "-0.78", "0.63", "0.19"]
  },
  BRCA1: {
    id: "P38398",
    name: "BRCA1 BRCT Domain",
    organism: "Homo sapiens",
    fasta: `>sp|P38398|BRCA1_HUMAN Breast cancer type 1 susceptibility protein
MDLSALRVEEVQNVINAMQKILECPICLELIKEPVSTKCDHIFCKFCMLK
LLNQKKGPSQCPLCKNDITKRSLQESTRFSQLVEELLKIICAFQLDTGLE
YANSYNFAKKENNSPEHLKDEVSIIQSMGYRNRAKRLLQSEPENPSLQET`,
    defaultSmiles: "O=C(c1ccc(cc1)Cc2n[nH]c(=O)c3ccccc23)N4CCN(C(=O)C5CC5)CC4",
    ligandName: "Olaparib",
    formula: "C24H23FN4O3",
    mw: "434.46 g/mol",
    predictedAffinity: "-8.4 kcal/mol",
    confidence: "High Confidence",
    confidenceScore: 0.89,
    residues: [
      { name: "ARG1699", distance: "2.7 Å", type: "Salt Bridge" },
      { name: "TRP1718", distance: "3.2 Å", type: "Pi-Pi Stacking" },
      { name: "SER1655", distance: "2.9 Å", type: "H-Bond" },
      { name: "VAL1696", distance: "3.7 Å", type: "Hydrophobic" }
    ],
    featureVectors: ["0.31", "-0.18", "0.72", "-0.09", "0.45", "-0.61", "0.28", "-0.33", "0.51", "0.08"]
  },
  CDK2: {
    id: "P24941",
    name: "Cyclin-dependent kinase 2",
    organism: "Homo sapiens",
    fasta: `>sp|P24941|CDK2_HUMAN Cyclin-dependent kinase 2
MENFQKVEKIGEGTYGVVYKARNKLTGEVVALKKIRLDTETEGVPSTAIR
EISLLKELNHPNIVKLLDVIHTENKLYLVFEFLHQDLKKFMDASALTGIP
LPLIKSYLFQLLQGLAFCHSHRVLHRDLKPQNLLINTEGAIKLADFGLAR`,
    defaultSmiles: "CC(C)Nc1nc(NCc2ccccc2)c3ncn(C(C)CO)c3n1",
    ligandName: "Roscovitine",
    formula: "C19H26N6O",
    mw: "354.45 g/mol",
    predictedAffinity: "-7.9 kcal/mol",
    confidence: "High Confidence",
    confidenceScore: 0.86,
    residues: [
      { name: "GLU81", distance: "2.6 Å", type: "H-Bond" },
      { name: "LEU83", distance: "2.9 Å", type: "H-Bond" },
      { name: "PHE80", distance: "3.5 Å", type: "Hydrophobic" },
      { name: "ILE10", distance: "3.8 Å", type: "Hydrophobic" }
    ],
    featureVectors: ["0.08", "-0.45", "0.39", "-0.12", "0.67", "-0.22", "0.59", "-0.41", "0.33", "0.27"]
  }
};

export const INITIAL_HISTORY = [
  { id: 1, proteinName: "EGFR", ligand: "Erlotinib", affinity: "-9.8 kcal/mol", date: "2026-10-04 14:32", status: "Completed" },
  { id: 2, proteinName: "BRCA1", ligand: "Olaparib", affinity: "-8.4 kcal/mol", date: "2026-10-03 11:20", status: "Completed" },
  { id: 3, proteinName: "CDK2", ligand: "Roscovitine", affinity: "-7.9 kcal/mol", date: "2026-10-02 16:45", status: "Completed" },
  { id: 4, proteinName: "ACHE", ligand: "Donepezil", affinity: "-8.7 kcal/mol", date: "2026-10-01 10:12", status: "Completed" },
  { id: 5, proteinName: "VEGFR2", ligand: "Sunitinib", affinity: "-8.1 kcal/mol", date: "2026-09-30 18:07", status: "Completed" },
  { id: 6, proteinName: "HER2", ligand: "Trastuzumab", affinity: "-9.1 kcal/mol", date: "2026-09-28 09:14", status: "Completed" },
  { id: 7, proteinName: "JAK2", ligand: "Ruxolitinib", affinity: "-8.5 kcal/mol", date: "2026-09-25 15:40", status: "Completed" }
];

export const TECHNOLOGIES = [
  {
    name: "Python",
    badge: "python",
    desc: "Core computational biology, high-throughput batch modeling and workflow orchestration.",
    color: "#3776AB"
  },
  {
    name: "PyTorch",
    badge: "pytorch",
    desc: "Deep geometric deep learning, Equivariant GNNs and ESM-2 language transformer models.",
    color: "#EE4C2C"
  },
  {
    name: "RDKit",
    badge: "rdkit",
    desc: "Cheminformatics parsing, 2D/3D conformer optimization and molecular graph generation.",
    color: "#0284C7"
  },
  {
    name: "Qiskit",
    badge: "qiskit",
    desc: "Variational Quantum Eigensolver (VQE) and parameterized quantum circuits for binding energy.",
    color: "#6929C4"
  },
  {
    name: "PennyLane",
    badge: "pennylane",
    desc: "Differentiable quantum machine learning with hybrid classical-quantum gradient descent.",
    color: "#7928CA"
  }
];
