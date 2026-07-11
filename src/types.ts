export interface OrderMeta {
  order: string;
  customer: string;
  po: string;
  refClient: string;
  invoice: string;
  style: string;
  styleNumber: string;
  sku: string;
  yarn: string;
  composition: string;
  destination: string;
  address: string;
  pays: string;
  portDepart: string;
  portArrivee: string;
  qty: string;
  filename: string;
}

export interface SizeDetails {
  qtyTot: number;
  cap: number;
  wPiece: number;
  wCarton: number;
  cbmUnit: number;
  dimL: number;
  diml: number;
  dimH: number;
  sku: string;
}

export interface CustomRemainderCarton {
  id: string;
  sizes: { [sizeName: string]: number };
  writtenWords?: { [sizeName: string]: string };
}

export interface ColorConfig {
  nom: string;
  mode: 'inherit' | 'strict_solide' | 'mixte_autorise';
  sizes: {
    [sizeName: string]: SizeDetails;
  };
  tailles: string[]; // Order of sizes (e.g. ['XS', 'S', 'M', 'L', 'XL'])
  selectedPieceWeightModelName?: string;
  selectedCartonWeightModelName?: string;
  selectedDimModelName?: string;
  customRemaindersEnabled?: boolean;
  customRemainders?: CustomRemainderCarton[];
}

export interface CartonModel {
  name: string;
  L: number;
  l: number;
  h: number;
}

export interface WeightPieceModel {
  name: string;
  wPiece: number;
}

export interface WeightCartonModel {
  name: string;
  wCarton: number;
}

export interface ModelsDatabase {
  dim_models: CartonModel[];
  weight_piece_models: WeightPieceModel[];
  weight_carton_models: WeightCartonModel[];
  last_updated?: string;
}

export interface PackedRow {
  cartonRange: string;
  type: 'solid' | 'solid_r' | 'mixed';
  nbr: number;
  sizes: { [sizeName: string]: number };
  pcsPerCarton: number;
  totalPcs: number;
  skus: string[];
  netWeightRow: number;
  grossWeightRow: number;
  cbmRow: number;
}

export interface ColorResult {
  nom: string;
  color: string;
  tailles: string[];
  mode: 'strict_solide' | 'mixte_autorise';
  colorIndex?: number;
  rows: PackedRow[];
  totals: {
    c: number; // cartons
    p: number; // pieces
    n: number; // net weight
    g: number; // gross weight
    v: number; // volume CBM
    sizes: { [sizeName: string]: number };
  };
}

export interface LocalSaveListItem {
  id: string;
  name: string;
  savedAt: string;
  meta: OrderMeta;
  globalPackingMode: 'strict_solide' | 'mixte_autorise';
  maxSizesPerBox: number;
  forceSingleCarton: boolean;
  forceSubCapSolidInMixed?: boolean;
  colors: ColorConfig[];
}
