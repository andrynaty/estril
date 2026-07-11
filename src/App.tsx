import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package,
  Plus,
  Trash2,
  Lock,
  Sun,
  Moon,
  Database,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  Download,
  Upload,
  Info,
  ChevronRight,
  ChevronLeft,
  Calculator,
  Grid,
  Edit2,
  Sliders,
  Maximize2,
  X,
  PieChart,
  Camera,
  LogOut,
  Save,
  History,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Coins,
  Leaf,
  Globe,
  Scale,
  Truck,
  Plane,
  Ship,
  Zap,
  Tag,
  Printer,
  Search
} from 'lucide-react';

import WelcomeScreen from './components/WelcomeScreen';
import BoxModal from './components/BoxModal';
import MajBsdModal from './components/MajBsdModal';
import ScreenshotTool from './components/ScreenshotTool';
import ParcelLabelModule from './components/ParcelLabelModule';
import {
  OrderMeta,
  SizeDetails,
  ColorConfig,
  ModelsDatabase,
  ColorResult,
  PackedRow,
  LocalSaveListItem,
  CustomRemainderCarton
} from './types';
import {
  computeColorResult,
  generateSQLString,
  parseSQLString,
  exportToExcel,
  parseCartonRange,
  PALETTE,
  BG_COLORS_DARK,
  BG_COLORS_LIGHT,
  getRemainderRowColor,
  isRemainderRow,
  numberToFrenchWords,
  validateColorCustomRemainders
} from './utils';

// Default template structures
const DEFAULT_DATABASE: ModelsDatabase = {
  dim_models: [
    { name: 'WOOLWORTHS', L: 60, l: 40, h: 30 },
    { name: 'HUGO BOSS', L: 65, l: 45, h: 35 },
    { name: 'STANDARD', L: 61, l: 41, h: 30 }
  ],
  weight_piece_models: [
    { name: 'POLO SHIRT', wPiece: 0.25 },
    { name: 'T-SHIRT', wPiece: 0.18 },
    { name: 'JACKET', wPiece: 0.65 }
  ],
  weight_carton_models: [
    { name: 'MEDIUM BOX', wCarton: 0.8 },
    { name: 'LARGE BOX', wCarton: 1.2 }
  ]
};

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

const CUSTS = [
  '6TH SENS', 'AGOA CTN', 'ANTHROPOLOGIE', 'ARMANI', 'AUSTIN REED', 'AWAY', 'BARBOUR', 'BONOBO', 'BRENTWOOD GENTS',
  'BREUNINGER', 'BROOKS', 'CAPE UNION', 'CHARLES TYRWITT', 'CONBIPEL', 'COUNTRY ROAD&TRENERY GENTS', 'DANIEL HECHTER',
  'DILLARDS', 'DOUBLE TWO', 'EDGARS', 'EL CORTE GENTS', 'EWM', 'EXACT', 'FABIANI', 'Faherty Brand Ladies',
  'FASHION PROJECT', 'FCN LADIES', 'FREE PEOPLE LADIES', 'GENTLEMAN FARMER', 'GIESSWEIN', 'GIOVANNI', 'HACKETT',
  'Harmont&Blaine Gents', 'HARRIS WILLSON', 'HOUSE OF BRUAR', 'HUG', 'HUGO BOSS', 'INSPECTION LYON&DEC', 'IZAC',
  'JACQUES VERT', 'JHONNIE O', 'JOHN CRAIG', 'JOHN LEWIS', 'JOS A BANK', 'JOSEPH ABBOUD', 'JULES', 'KWAY GENTS',
  'LACOSTE', 'LEFT OVER 2019', 'LION OF PORCHES & DECENIO', 'M&S', 'MAKRO', 'MARKETING TRIPS LADIES',
  'MARKHAM -FABIANI-UNION DENIM', 'MASK', 'MASSIMO', 'MONOPRIX', 'MOORES', 'MOSS BROS', 'MR BLUE', 'NEXT',
  'ORVIS', 'PETER MILLAR', 'PICK n PAY', 'POLO JEANS', 'PRINGLE', 'QUEENSPARK', 'REDBAT', 'RELAY GENTS',
  'RIVERWALK', 'RODD&GUNN', 'ROOTS', 'RUSSEL', 'SACOOR', 'SANDRO', 'SAS DEVRED', 'SCALPERS', 'SCOTCH & SODA',
  'SKIPERBAR', 'SPITZ', 'STOCK ORDER', 'STOKOMANI', 'SUIT SUPPLY', 'SUPERBALIST', 'THOMAS DEAN', 'TOMMY',
  'UNIQ mens', 'UZZI', 'VERWEIJ', 'WOOLOVERS', 'WOOLWORTHS', 'ZADIG&VOLTAIRE', 'ZLABELS'
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Database templates state (persisted via local storage)
  const [db, setDb] = useState<ModelsDatabase>(() => {
    const saved = localStorage.getItem('packing_list_pro_db');
    return saved ? JSON.parse(saved) : DEFAULT_DATABASE;
  });

  // Order Meta (with auto-save restore)
  const [meta, setMeta] = useState<OrderMeta>(() => {
    const saved = localStorage.getItem('packing_list_pro_current_meta');
    return saved ? JSON.parse(saved) : {
      order: '',
      customer: '',
      po: '',
      refClient: '',
      invoice: '',
      style: '',
      styleNumber: '',
      sku: '',
      yarn: '',
      composition: '',
      destination: '',
      address: '',
      pays: '',
      portDepart: '',
      portArrivee: '',
      qty: '',
      filename: ''
    };
  });

  // Packing strategy parameters (with auto-save restore)
  const [globalPackingMode, setGlobalPackingMode] = useState<'strict_solide' | 'mixte_autorise'>(() => {
    const saved = localStorage.getItem('packing_list_pro_current_globalPackingMode');
    return (saved === 'strict_solide' || saved === 'mixte_autorise') ? saved : 'strict_solide';
  });

  const [maxSizesPerBox, setMaxSizesPerBox] = useState<number>(() => {
    const saved = localStorage.getItem('packing_list_pro_current_maxSizesPerBox');
    return saved ? Number(saved) : 3;
  });

  const [forceSingleCarton, setForceSingleCarton] = useState<boolean>(() => {
    const saved = localStorage.getItem('packing_list_pro_current_forceSingleCarton');
    return saved === 'true';
  });

  const [forceSubCapSolidInMixed, setForceSubCapSolidInMixed] = useState<boolean>(() => {
    const saved = localStorage.getItem('packing_list_pro_current_forceSubCapSolidInMixed');
    return saved === 'true';
  });

  // Interactive dynamic Colors state (with auto-save restore)
  const [colors, setColors] = useState<ColorConfig[]>(() => {
    const saved = localStorage.getItem('packing_list_pro_current_colors');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeColorIdx, setActiveColorIdx] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Saved snapshots lists history database
  const [savedLists, setSavedLists] = useState<LocalSaveListItem[]>(() => {
    const saved = localStorage.getItem('packing_list_pro_saved_lists');
    return saved ? JSON.parse(saved) : [];
  });

  const [isAutosaveEnabled, setIsAutosaveEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('packing_list_pro_current_is_autosave_enabled');
    return saved !== 'false'; // default to true
  });

  const [saveNameInput, setSaveNameInput] = useState<string>('');
  const [savesError, setSavesError] = useState<string | null>(null);
  const [savesSuccess, setSavesSuccess] = useState<string | null>(null);

  // Auto-complete choices
  const [custQuery, setCustQuery] = useState('');
  const [custSuggestions, setCustSuggestions] = useState<string[]>([]);
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  // Modals state triggers
  const [boxModalCtx, setBoxModalCtx] = useState<{
    isOpen: boolean;
    sizeName: string;
    colorName: string;
    initialDetails: SizeDetails;
    colorIdx: number;
  } | null>(null);

  const [isMajBsdOpen, setIsMajBsdOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isPdfPrintSelectorOpen, setIsPdfPrintSelectorOpen] = useState(false);
  const [isSqlImportOpen, setIsSqlImportOpen] = useState(false);
  const [cartonLimitError, setCartonLimitError] = useState<{
    isOpen: boolean;
    message: string;
    limit: number;
    currentTotal: number;
    sizesInvolved: string[];
  } | null>(null);

  const [remainderValidationError, setRemainderValidationError] = useState<{
    isOpen: boolean;
    colorName: string;
    errors: string[];
  } | null>(null);

  // Accordion Expansions to collapse sections for clean layout
  const [isOrderMetaExpanded, setIsOrderMetaExpanded] = useState<boolean>(true);
  const [isPackingStrategyExpanded, setIsPackingStrategyExpanded] = useState<boolean>(true);
  const [isColorInputExpanded, setIsColorInputExpanded] = useState<boolean>(true);

  // Active Input Section Tab (separates metadata, strategy, and color sheet editing)
  const [activeInputTab, setActiveInputTab] = useState<'meta' | 'strategy' | 'colors' | 'packing_list' | 'breakdown' | 'summary' | 'saves' | 'labels'>('colors');

  // Active page state for sidebar: 'saisie' (page 1: Saisie & Préparation) or 'suivi' (page 2: Suivi & Livrables)
  const [sidebarActivePage, setSidebarActivePage] = useState<'saisie' | 'suivi'>('saisie');

  // Controlled wrapper to set active inputs and automatically update the sidebar page grouping
  const handleSetActiveInputTab = (tab: 'meta' | 'strategy' | 'colors' | 'packing_list' | 'breakdown' | 'summary' | 'saves' | 'labels') => {
    setActiveInputTab(tab);
    if (['meta', 'strategy', 'colors'].includes(tab)) {
      setSidebarActivePage('saisie');
    } else {
      setSidebarActivePage('suivi');
    }
  };

  const handleSwitchSidebarPage = (page: 'saisie' | 'suivi') => {
    setSidebarActivePage(page);
    if (page === 'saisie') {
      setActiveInputTab('colors');
    } else {
      setActiveInputTab('packing_list');
    }
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('packing_list_pro_sidebar_collapsed') === 'true';
  });

  // Print checklist parameters
  const [printSections, setPrintSections] = useState({
    hdr: true,
    meta: true,
    ind: true,
    cpl: true,
    leg: true,
    bk: true,
    stats: true,
    dim: false
  });

  const [printColumns, setPrintColumns] = useState({
    ctn: true,
    color: true,
    sku: true,
    sizes: true,
    nbctn: true,
    totalqty: true,
    net: true,
    gross: true,
    cbm: true
  });

  // Calculations Results display
  const [results, setResults] = useState<ColorResult[]>([]);
  const [packingListSubTab, setPackingListSubTab] = useState<'table' | 'labels_gs1'>('table');
  const [selectedLabelCarton, setSelectedLabelCarton] = useState<number>(1);
  const [ssccCompanyPrefix, setSsccCompanyPrefix] = useState<string>('3370001');
  const [gs1BarcodeType, setGs1BarcodeType] = useState<'standard' | 'minimal'>('standard');
  const [selectedExportColors, setSelectedExportColors] = useState<string[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [sqlStatus, setSqlStatus] = useState<string | null>(null);
  const [isCapturingScreen, setIsCapturingScreen] = useState(false);

  // Improvements: Smart Text/CSV Parser and Pallet type
  const [isSmartImportOpen, setIsSmartImportOpen] = useState<boolean>(false);
  const [smartImportRawText, setSmartImportRawText] = useState<string>('');
  const [palletType, setPalletType] = useState<'EUR' | 'US'>('EUR');

  // Option 1: Diagnostic threshold for safe warehouse box handling weight
  const [safetyWeightLimit, setSafetyWeightLimit] = useState<number>(15);

  // Option 4: Freight rate estimations & Carbon offset calculations states
  const [seaRate, setSeaRate] = useState<number>(115);
  const [airRate, setAirRate] = useState<number>(4.2);
  const [roadRate, setRoadRate] = useState<number>(38);
  const [freightDistance, setFreightDistance] = useState<number>(6500);
  const [currency, setCurrency] = useState<'€' | '$'>('€');

  // Modern global toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [sizesQuickRangeInput, setSizesQuickRangeInput] = useState<string>('');
  const [repartTotalQty, setRepartTotalQty] = useState<string>('600');
  const [repartMode, setRepartMode] = useState<'equal' | 'ratio' | 'bell'>('equal');
  const [repartRatioPattern, setRepartRatioPattern] = useState<string>('1:2:2:2:1');

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Sync selected export colors when results compute
  useEffect(() => {
    if (results.length > 0) {
      const validNames = results.map(r => r.nom);
      const stillValid = selectedExportColors.filter(c => validNames.includes(c));
      if (stillValid.length === 0) {
        setSelectedExportColors(validNames);
      } else {
        setSelectedExportColors(stillValid);
      }
    } else {
      setSelectedExportColors([]);
    }
  }, [results]);

  // File drag state
  const sqlFileRef = useRef<HTMLInputElement>(null);

  // Initialize initial color component
  useEffect(() => {
    if (colors.length === 0) {
      resetColorsToDefault();
    }
  }, []);

  // Sync theme
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
    } else {
      root.setAttribute('data-theme', 'light');
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Persistence for user saved snapshots database
  useEffect(() => {
    localStorage.setItem('packing_list_pro_saved_lists', JSON.stringify(savedLists));
  }, [savedLists]);

  // Sync isAutosaveEnabled setting
  useEffect(() => {
    localStorage.setItem('packing_list_pro_current_is_autosave_enabled', String(isAutosaveEnabled));
  }, [isAutosaveEnabled]);

  // Sync isSidebarCollapsed setting
  useEffect(() => {
    localStorage.setItem('packing_list_pro_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Real-time background auto-saver
  useEffect(() => {
    if (isAutosaveEnabled) {
      localStorage.setItem('packing_list_pro_current_meta', JSON.stringify(meta));
      localStorage.setItem('packing_list_pro_current_globalPackingMode', globalPackingMode);
      localStorage.setItem('packing_list_pro_current_maxSizesPerBox', String(maxSizesPerBox));
      localStorage.setItem('packing_list_pro_current_forceSingleCarton', String(forceSingleCarton));
      localStorage.setItem('packing_list_pro_current_forceSubCapSolidInMixed', String(forceSubCapSolidInMixed));
      localStorage.setItem('packing_list_pro_current_colors', JSON.stringify(colors));
    }
  }, [meta, globalPackingMode, maxSizesPerBox, forceSingleCarton, forceSubCapSolidInMixed, colors, isAutosaveEnabled]);

  // Save database modifications
  const handleSaveDatabase = (newDb: ModelsDatabase) => {
    setDb(newDb);
    localStorage.setItem('packing_list_pro_db', JSON.stringify(newDb));
  };

  const resetColorsToDefault = () => {
    const defaultColor: ColorConfig = {
      nom: 'COULEUR 1',
      mode: 'inherit',
      tailles: [...DEFAULT_SIZES],
      sizes: {}
    };
    DEFAULT_SIZES.forEach((sz, idx) => {
      defaultColor.sizes[sz] = {
        qtyTot: 0,
        cap: 25,
        wPiece: idx === 0 ? 0.25 : idx === 1 ? 0.27 : idx === 2 ? 0.30 : idx === 3 ? 0.32 : 0.35,
        wCarton: 0.80,
        cbmUnit: (61 * 41 * 30) / 1000000,
        dimL: 61,
        diml: 41,
        dimH: 30,
        sku: ''
      };
    });
    setColors([defaultColor]);
    setActiveColorIdx(0);
    setHasGenerated(false);
  };

  // Helper auto-calculate file name
  const updateFilenameAndTotal = (updatedMeta: OrderMeta, currentColors: ColorConfig[] = colors) => {
    let sumPcs = 0;
    currentColors.forEach(c => {
      c.tailles.forEach(t => {
        sumPcs += c.sizes[t]?.qtyTot || 0;
      });
    });

    const qtyString = sumPcs > 0 ? `${sumPcs}PCS` : '';
    const parts = [
      updatedMeta.order,
      updatedMeta.customer,
      updatedMeta.po,
      updatedMeta.style,
      qtyString
    ].filter(Boolean);

    const autoFile = parts.length > 0 ? `PACKING LIST ${parts.join(' ')}` : '';
    const outputQty = sumPcs > 0 ? `${sumPcs.toLocaleString('fr-FR')} PCS` : '';

    setMeta({
      ...updatedMeta,
      filename: updatedMeta.filename && updatedMeta.filename !== meta.filename ? updatedMeta.filename : autoFile,
      qty: outputQty
    });
  };

  // Input bindings
  const handleMetaChange = (key: keyof OrderMeta, value: string) => {
    const nextMeta = { ...meta, [key]: value };

    // Set auto customer template configs when chosen
    if (key === 'customer') {
      const matchedDim = db.dim_models.find(m => m.name.toUpperCase() === value.trim().toUpperCase());
      if (matchedDim) {
        // Apply this default size configuration to all current colors sizes!
        applyDimensionToAllColors(matchedDim.L, matchedDim.l, matchedDim.h);
      }

      // Compute suggestions
      if (value.trim() === '') {
        setCustSuggestions([]);
        setShowCustDropdown(false);
      } else {
        const filtered = CUSTS.filter(c => c.toUpperCase().includes(value.toUpperCase())).slice(0, 10);
        setCustSuggestions(filtered);
        setShowCustDropdown(filtered.length > 0);
      }
    }

    updateFilenameAndTotal(nextMeta);
  };

  const applyDimensionToAllColors = (L: number, l: number, h: number) => {
    const nextColors = colors.map(c => {
      const nextSizes = { ...c.sizes };
      c.tailles.forEach(t => {
        const item = nextSizes[t];
        if (item) {
          nextSizes[t] = {
            ...item,
            dimL: L,
            diml: l,
            dimH: h,
            cbmUnit: (L * l * h) / 1000000
          };
        }
      });
      return { ...c, sizes: nextSizes };
    });
    setColors(nextColors);
  };

  const handleSelectCustomerSuggestion = (cust: string) => {
    setCustQuery(cust);
    setShowCustDropdown(false);
    const nextMeta = { ...meta, customer: cust };

    const matchedDim = db.dim_models.find(m => m.name.toUpperCase() === cust.toUpperCase());
    if (matchedDim) {
      applyDimensionToAllColors(matchedDim.L, matchedDim.l, matchedDim.h);
    }

    updateFilenameAndTotal(nextMeta);
  };

  // Strategic Mode Select configurations
  const handleSelectPackingMode = (mode: 'strict_solide' | 'mixte_autorise') => {
    setGlobalPackingMode(mode);
    setHasGenerated(false);
    
    let nextColors = colors;
    if (mode === 'strict_solide') {
      nextColors = colors.map(c => ({
        ...c,
        mode: 'inherit',
        customRemaindersEnabled: false
      }));
      setColors(nextColors);
    }
    
    if (hasGenerated) {
      autoRecalculateResults(mode, forceSingleCarton, maxSizesPerBox, forceSubCapSolidInMixed, nextColors);
    }
  };

  // Config tab functions
  const handleAddColorTab = () => {
    const nextIdx = colors.length + 1;
    const modelColor = colors[0] || {
      tailles: [...DEFAULT_SIZES],
      sizes: {}
    };

    const newColor: ColorConfig = {
      nom: `COULEUR ${nextIdx}`,
      mode: 'inherit',
      tailles: [...modelColor.tailles],
      sizes: {}
    };

    modelColor.tailles.forEach(t => {
      const origSpec = modelColor.sizes[t];
      newColor.sizes[t] = {
        qtyTot: 0,
        cap: origSpec?.cap || 25,
        wPiece: origSpec?.wPiece || 0.25,
        wCarton: origSpec?.wCarton || 0.80,
        cbmUnit: origSpec?.cbmUnit || (61 * 41 * 30) / 1000000,
        dimL: origSpec?.dimL || 61,
        diml: origSpec?.diml || 41,
        dimH: origSpec?.dimH || 30,
        sku: ''
      };
    });

    const nextColors = [...colors, newColor];
    setColors(nextColors);
    setActiveColorIdx(nextColors.length - 1);
    setHasGenerated(false);
    updateFilenameAndTotal(meta, nextColors);
  };

  const handleRemoveActiveColorTab = () => {
    if (colors.length <= 1) {
      alert('Un minimum d\'une couleur est requis.');
      return;
    }
    const nextColors = colors.filter((_, idx) => idx !== activeColorIdx);
    setColors(nextColors);
    setActiveColorIdx(Math.max(0, activeColorIdx - 1));
    setHasGenerated(false);
    updateFilenameAndTotal(meta, nextColors);
  };

  const handleSmartImport = (text: string, strategy: 'replace' | 'merge') => {
    if (!text.trim()) {
      triggerToast('Saisie vide', 'error');
      return;
    }

    try {
      const templateColor = colors[0] || {
        tailles: [...DEFAULT_SIZES],
        sizes: {}
      };

      const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('//'));
      if (lines.length === 0) {
        triggerToast('Données introuvables. Vérifiez le format.', 'error');
        return;
      }

      // Check if tabular copy
      const isTabular = lines[0].includes('\t') || lines.some(l => l.split('\t').length > 2);
      const parsedList: ColorConfig[] = [];

      if (isTabular) {
        // Tabular processing
        const table = lines.map(line => line.split('\t').map(c => c.trim()));
        const headers = table[0].slice(1).filter(Boolean).map(h => h.toUpperCase());
        
        for (let r = 1; r < table.length; r++) {
          const row = table[r];
          if (!row[0]) continue;
          const colorName = row[0].toUpperCase();
          const sizesDict: { [sz: string]: SizeDetails } = {};

          headers.forEach((sz, colIdx) => {
            const valStr = row[colIdx + 1] || '0';
            const qty = parseInt(valStr.replace(/[^0-9]/g, ''), 10) || 0;
            
            // Derive spec from template if available
            const templateSpec = templateColor.sizes[sz] || Object.values(templateColor.sizes)[0];
            sizesDict[sz] = {
              qtyTot: qty,
              cap: templateSpec?.cap || 25,
              wPiece: templateSpec?.wPiece || 0.25,
              wCarton: templateSpec?.wCarton || 0.8,
              cbmUnit: templateSpec?.cbmUnit || (61 * 41 * 30) / 1000000,
              dimL: templateSpec?.dimL || 61,
              diml: templateSpec?.diml || 41,
              dimH: templateSpec?.dimH || 30,
              sku: ''
            };
          });

          parsedList.push({
            nom: colorName,
            mode: 'inherit',
            tailles: headers,
            sizes: sizesDict
          });
        }
      } else {
        // Line-by-line format: BLEU - XS:10 S:20
        lines.forEach((line, lIdx) => {
          let colorName = '';
          let remaining = line;
          const delimiters = [' - ', ' – ', ' : ', ' -> ', ' > ', ':', '-'];
          
          for (const d of delimiters) {
            const idx = remaining.indexOf(d);
            if (idx > 0) {
              colorName = remaining.substring(0, idx).trim();
              remaining = remaining.substring(idx + d.length).trim();
              break;
            }
          }

          if (!colorName) {
            colorName = `COULEUR_${lIdx + 1}`;
          }

          const pairRegex = /([A-Z0-9.\-/]{1,8})\s*[:=\s\-]+\s*([0-9]+)/gi;
          let match;
          const sizesDict: { [sz: string]: SizeDetails } = {};
          const detectedSizes: string[] = [];

          while ((match = pairRegex.exec(remaining)) !== null) {
            const szName = match[1].toUpperCase().trim();
            const qty = parseInt(match[2], 10) || 0;

            if (szName) {
              detectedSizes.push(szName);
              const templateSpec = templateColor.sizes[szName] || Object.values(templateColor.sizes)[0];
              sizesDict[szName] = {
                qtyTot: qty,
                cap: templateSpec?.cap || 25,
                wPiece: templateSpec?.wPiece || 0.25,
                wCarton: templateSpec?.wCarton || 0.8,
                cbmUnit: templateSpec?.cbmUnit || (61 * 41 * 30) / 1000000,
                dimL: templateSpec?.dimL || 61,
                diml: templateSpec?.diml || 41,
                dimH: templateSpec?.dimH || 30,
                sku: ''
              };
            }
          }

          if (detectedSizes.length > 0) {
            parsedList.push({
              nom: colorName.toUpperCase(),
              mode: 'inherit',
              tailles: detectedSizes,
              sizes: sizesDict
            });
          }
        });
      }

      if (parsedList.length === 0) {
        triggerToast('Format non reconnu ou aucune donnée extraite.', 'error');
        return;
      }

      let finalColors: ColorConfig[] = [];
      if (strategy === 'replace') {
        finalColors = parsedList;
      } else {
        // Merge strategy: update or append
        const originalColors = [...colors];
        parsedList.forEach(newCol => {
          const matchIdx = originalColors.findIndex(c => c.nom.toUpperCase() === newCol.nom.toUpperCase());
          if (matchIdx !== -1) {
            // merge size values
            const updatedSizes = { ...originalColors[matchIdx].sizes };
            const mergedSizesList = [...originalColors[matchIdx].tailles];

            newCol.tailles.forEach(sz => {
              if (!mergedSizesList.includes(sz)) {
                mergedSizesList.push(sz);
              }
              updatedSizes[sz] = {
                ...updatedSizes[sz],
                qtyTot: newCol.sizes[sz].qtyTot
              };
            });

            originalColors[matchIdx] = {
              ...originalColors[matchIdx],
              tailles: mergedSizesList,
              sizes: updatedSizes
            };
          } else {
            originalColors.push(newCol);
          }
        });
        finalColors = originalColors;
      }

      setColors(finalColors);
      setActiveColorIdx(strategy === 'replace' ? 0 : finalColors.length - 1);
      setHasGenerated(false);
      setIsSmartImportOpen(false);
      setSmartImportRawText('');
      updateFilenameAndTotal(meta, finalColors);
      triggerToast(`✅ Importation réussie : ${parsedList.length} couleur(s) traitée(s) !`, 'success');
    } catch (e: any) {
      triggerToast(`Erreur d'importation: ${e.message}`, 'error');
    }
  };

  const handleUpdateColorName = (val: string) => {
    const nextColors = colors.map((c, i) => (i === activeColorIdx ? { ...c, nom: val.toUpperCase() } : c));
    setColors(nextColors);
    updateFilenameAndTotal(meta, nextColors);
  };

  const handleUpdateTabMode = (mode: 'inherit' | 'strict_solide' | 'mixte_autorise') => {
    const nextColors = colors.map((c, i) => {
      if (i === activeColorIdx) {
        return {
          ...c,
          mode,
          customRemaindersEnabled: mode === 'strict_solide' ? false : c.customRemaindersEnabled
        };
      }
      return c;
    });
    setColors(nextColors);
    setHasGenerated(false);
    if (hasGenerated) {
      autoRecalculateResults(globalPackingMode, forceSingleCarton, maxSizesPerBox, forceSubCapSolidInMixed, nextColors);
    }
  };

  const handleAddSizeColumn = () => {
    const nextColors = colors.map((c, ci) => {
      const label = `S-${c.tailles.length + 1}`;
      const nextTailles = [...c.tailles, label];
      const nextSizes = { ...c.sizes };

      nextSizes[label] = {
        qtyTot: 0,
        cap: 25,
        wPiece: 0.25,
        wCarton: 0.80,
        cbmUnit: (61 * 41 * 30) / 1000000,
        dimL: 61,
        diml: 41,
        dimH: 30,
        sku: ''
      };

      return {
        ...c,
        tailles: nextTailles,
        sizes: nextSizes
      };
    });

    setColors(nextColors);
    setHasGenerated(false);
  };

  const handleRemoveLastSizeColumn = () => {
    const model = colors[activeColorIdx];
    if (model.tailles.length <= 1) {
      alert('Minimum 1 taille requise.');
      return;
    }

    const nextColors = colors.map(c => {
      const removedSize = c.tailles[c.tailles.length - 1];
      const nextTailles = c.tailles.slice(0, -1);
      const nextSizes = { ...c.sizes };
      delete nextSizes[removedSize];

      return {
        ...c,
        tailles: nextTailles,
        sizes: nextSizes
      };
    });

    setColors(nextColors);
    setHasGenerated(false);
    updateFilenameAndTotal(meta, nextColors);
  };

  const generateSizeRange = (input: string): string[] | null => {
    const parts = input.split(/\s*(?:-|TO|À|AU)\s*/i);
    if (parts.length !== 2) return null;
    const start = parts[0].trim();
    const end = parts[1].trim();
    
    const startUpper = start.toUpperCase();
    const endUpper = end.toUpperCase();

    // Case 1: Numeric Range (e.g., 1-6 or 36-46)
    const startNum = parseInt(start, 10);
    const endNum = parseInt(end, 10);
    if (!isNaN(startNum) && !isNaN(endNum) && String(startNum) === start && String(endNum) === end) {
      if (startNum < endNum) {
        const step = (startNum % 2 === 0 && endNum % 2 === 0) ? 2 : 1;
        const result: string[] = [];
        for (let i = startNum; i <= endNum; i += step) {
          result.push(String(i));
        }
        return result;
      }
    }

    // Case 2: Apparel Range (XS - 2XL)
    const APPAREL_SEQUENCE = [
      "YXS", "YS", "YM", "YL", "YXL",
      "3XS", "XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"
    ];
    
    const normalizeSize = (s: string) => {
      let n = s.toUpperCase();
      if (n === '2XS') return 'XXS';
      if (n === '2XL') return 'XXL';
      if (n === '3XL') return 'XXXL';
      return n;
    };

    const normStart = normalizeSize(start);
    const normEnd = normalizeSize(end);

    const idxStart = APPAREL_SEQUENCE.indexOf(normStart);
    const idxEnd = APPAREL_SEQUENCE.indexOf(normEnd);

    if (idxStart !== -1 && idxEnd !== -1 && idxStart < idxEnd) {
      const slice = APPAREL_SEQUENCE.slice(idxStart, idxEnd + 1);
      return slice.map((s) => {
        if (s === 'XXS' && (startUpper === '2XS' || endUpper === '2XS')) return '2XS';
        if (s === 'XXL' && (startUpper === '2XL' || endUpper === '2XL')) return '2XL';
        if (s === 'XXXL' && (startUpper === '3XL' || endUpper === '3XL')) return '3XL';
        return s;
      });
    }

    // Case 3: Letter Range (e.g., A-F)
    if (start.length === 1 && end.length === 1) {
      const codeStart = startUpper.charCodeAt(0);
      const codeEnd = endUpper.charCodeAt(0);
      if (codeStart >= 65 && codeStart <= 90 && codeEnd >= 65 && codeEnd <= 90 && codeStart < codeEnd) {
        const result: string[] = [];
        for (let c = codeStart; c <= codeEnd; c++) {
          result.push(String.fromCharCode(c));
        }
        return result;
      }
    }

    return null;
  };

  const handleApplySizesQuickRange = (rangeText: string) => {
    const trimmed = rangeText.trim();
    if (!trimmed) return;

    const newSizesList = generateSizeRange(trimmed);
    if (!newSizesList || newSizesList.length === 0) {
      alert("Format de range de tailles invalide.\nExemples :\n• XS - 2XL (XS, S, M, L, XL, 2XL)\n• 1 - 6 (1, 2, 3, 4, 5, 6)\n• 36 - 46 (36, 38, 40, 42, 44, 46)\n• A - F (A, B, C, D, E, F)");
      return;
    }

    const nextColors = colors.map((c) => {
      const nextSizes: { [sizeName: string]: SizeDetails } = {};
      
      newSizesList.forEach((sz) => {
        if (c.sizes[sz]) {
          nextSizes[sz] = { ...c.sizes[sz] };
        } else {
          const refSizeKey = c.tailles[0];
          const refSize = refSizeKey ? c.sizes[refSizeKey] : null;
          
          nextSizes[sz] = refSize 
            ? { ...refSize, qtyTot: 0, sku: '' } 
            : {
                qtyTot: 0,
                cap: 25,
                wPiece: 0.25,
                wCarton: 0.80,
                cbmUnit: (61 * 41 * 30) / 1000000,
                dimL: 61,
                diml: 41,
                dimH: 30,
                sku: ''
              };
        }
      });

      return {
        ...c,
        tailles: newSizesList,
        sizes: nextSizes
      };
    });

    setColors(nextColors);
    setHasGenerated(false);
    updateFilenameAndTotal(meta, nextColors);
    triggerToast(`Gamme "${trimmed.toUpperCase()}" générée avec succès (${newSizesList.length} tailles)`, 'success');
    setSizesQuickRangeInput('');
  };

  const handleApplyRepartition = () => {
    if (!colors[activeColorIdx]) return;
    const activeColor = colors[activeColorIdx];
    const numSizes = activeColor.tailles.length;
    if (numSizes === 0) {
      alert("Veuillez d'abord ajouter ou générer des tailles !");
      return;
    }

    const totalQty = parseInt(repartTotalQty, 10);
    if (isNaN(totalQty) || totalQty <= 0) {
      alert("Veuillez entrer une quantité totale de pièces valide.");
      return;
    }

    let calculatedQtys: number[] = [];

    if (repartMode === 'equal') {
      const baseShare = Math.floor(totalQty / numSizes);
      const remainder = totalQty % numSizes;
      calculatedQtys = Array(numSizes).fill(baseShare);
      for (let r = 0; r < remainder; r++) {
        calculatedQtys[r % numSizes] += 1;
      }
    } else if (repartMode === 'ratio') {
      const parts = repartRatioPattern.split(/[:\-\s]+/).map(p => parseInt(p, 10)).filter(num => !isNaN(num) && num > 0);
      if (parts.length === 0) {
        alert("Modèle de ratio invalide (ex: 1:2:2:2:1 ou 1-1-1).");
        return;
      }
      
      let ratiosToUse = [...parts];
      if (ratiosToUse.length < numSizes) {
        while (ratiosToUse.length < numSizes) {
          ratiosToUse.push(1);
        }
      } else if (ratiosToUse.length > numSizes) {
        ratiosToUse = ratiosToUse.slice(0, numSizes);
      }

      const ratioSum = ratiosToUse.reduce((sum, val) => sum + val, 0);
      let distributedSum = 0;
      calculatedQtys = ratiosToUse.map(rVal => {
        const share = Math.floor((totalQty * rVal) / ratioSum);
        distributedSum += share;
        return share;
      });

      const residual = totalQty - distributedSum;
      if (residual > 0) {
        let maxIdx = ratiosToUse.indexOf(Math.max(...ratiosToUse));
        if (maxIdx === -1) maxIdx = 0;
        calculatedQtys[maxIdx] += residual;
      }
    } else if (repartMode === 'bell') {
      const getBellWeight = (i: number, n: number) => {
        const mean = (n - 1) / 2;
        const stdDev = Math.max(0.6, n / 4);
        return Math.exp(-0.5 * Math.pow((i - mean) / stdDev, 2));
      };

      const weights = Array.from({ length: numSizes }, (_, i) => getBellWeight(i, numSizes));
      const weightsSum = weights.reduce((s, w) => s + w, 0);

      let distributedSum = 0;
      calculatedQtys = weights.map(w => {
        const share = Math.floor((totalQty * w) / weightsSum);
        distributedSum += share;
        return share;
      });

      const residual = totalQty - distributedSum;
      if (residual > 0) {
        const midIdx = Math.floor(numSizes / 2);
        calculatedQtys[midIdx] += residual;
      }
    }

    const nextColors = colors.map((c, idx) => {
      if (idx !== activeColorIdx) return c;
      const nextSizes = { ...c.sizes };
      c.tailles.forEach((sz, idxSizes) => {
        nextSizes[sz] = {
          ...nextSizes[sz],
          qtyTot: calculatedQtys[idxSizes] || 0
        };
      });
      return {
        ...c,
        sizes: nextSizes
      };
    });

    setColors(nextColors);
    setHasGenerated(false);
    updateFilenameAndTotal(meta, nextColors);
    const modeLabel = repartMode === 'equal' ? 'Égale' : repartMode === 'bell' ? 'En Cloche (Normal)' : `Ratio (${repartRatioPattern})`;
    triggerToast(`🔢 Quantité de ${totalQty} pcs répartie (${modeLabel}) !`, 'success');
  };

  const handleAutoFixSKUs = () => {
    let fixCount = 0;
    const nextColors = colors.map(c => {
      const nextSizes = { ...c.sizes };
      c.tailles.forEach(sz => {
        if (!nextSizes[sz].sku || nextSizes[sz].sku.trim() === '') {
          const stylePart = meta.styleNumber || meta.style || 'SKU';
          const colorPart = c.nom.toUpperCase().replace(/\s+/g, '');
          const sizePart = sz.toUpperCase();
          nextSizes[sz] = {
            ...nextSizes[sz],
            sku: `${stylePart}-${colorPart}-${sizePart}`.toUpperCase().substring(0, 20)
          };
          fixCount++;
        }
      });
      return { ...c, sizes: nextSizes };
    });
    if (fixCount === 0) {
      triggerToast("Tous les articles ont déjà un SKU !", "info");
      return;
    }
    setColors(nextColors);
    updateFilenameAndTotal(meta, nextColors);
    triggerToast(`⚡ ${fixCount} SKUs manquants auto-générés !`, 'success');
  };

  const handleAutoFixSpecs = () => {
    let fixCount = 0;
    const nextColors = colors.map(c => {
      const nextSizes = { ...c.sizes };
      // Find a reference size that has non-zero specs
      let refSpec = {
        wPiece: 0.25,
        wCarton: 0.8,
        cbmUnit: 0.075,
        dimL: 61,
        diml: 41,
        dimH: 30,
        cap: 25
      };

      for (const sz of c.tailles) {
        const s = c.sizes[sz];
        if (s && s.wPiece > 0 && s.wCarton > 0 && s.dimL > 0) {
          refSpec = {
            wPiece: s.wPiece,
            wCarton: s.wCarton,
            cbmUnit: s.cbmUnit,
            dimL: s.dimL,
            diml: s.diml,
            dimH: s.dimH,
            cap: s.cap
          };
          break;
        }
      }

      c.tailles.forEach(sz => {
        const s = nextSizes[sz];
        if (!s || (s.wPiece || 0) === 0 || (s.wCarton || 0) === 0 || (s.dimL || 0) === 0) {
          nextSizes[sz] = {
            ...s,
            wPiece: refSpec.wPiece,
            wCarton: refSpec.wCarton,
            cbmUnit: refSpec.cbmUnit,
            dimL: refSpec.dimL,
            diml: refSpec.diml,
            dimH: refSpec.dimH,
            cap: refSpec.cap,
            qtyTot: s?.qtyTot || 0,
            sku: s?.sku || ''
          };
          fixCount++;
        }
      });

      return { ...c, sizes: nextSizes };
    });
    if (fixCount === 0) {
      triggerToast("Toutes les spécifications sont déjà renseignées !", "info");
      return;
    }
    setColors(nextColors);
    updateFilenameAndTotal(meta, nextColors);
    triggerToast(`📐 ${fixCount} fiches dimensions/poids manquantes réparées !`, 'success');
  };

  const handleScaleQuantitiesToTarget = () => {
    const targetQty = Number(meta.qty?.replace(/\s/g, '')) || 0;
    if (targetQty <= 0) {
      triggerToast("Veuillez définir une quantité cible dans les Références !", "error");
      return;
    }
    if (grandTotals.p <= 0) {
      triggerToast("Veuillez saisir au moins quelques cartons/pièces à ajuster !", "error");
      return;
    }

    const ratio = targetQty / grandTotals.p;
    let distributedSum = 0;

    const nextColors = colors.map(c => {
      const nextSizes = { ...c.sizes };
      c.tailles.forEach(sz => {
        const s = nextSizes[sz];
        if (s && s.qtyTot > 0) {
          const newQty = Math.round(s.qtyTot * ratio);
          nextSizes[sz] = {
            ...s,
            qtyTot: newQty
          };
          distributedSum += newQty;
        }
      });
      return { ...c, sizes: nextSizes };
    });

    const residual = targetQty - distributedSum;
    if (residual !== 0) {
      let maxQty = -1;
      let targetColorIdx = 0;
      let targetSizeName = '';

      nextColors.forEach((c, ci) => {
        c.tailles.forEach(sz => {
          const originalValue = colors[ci].sizes[sz]?.qtyTot || 0;
          if (originalValue > maxQty) {
            maxQty = originalValue;
            targetColorIdx = ci;
            targetSizeName = sz;
          }
        });
      });

      if (targetSizeName) {
        nextColors[targetColorIdx].sizes[targetSizeName] = {
          ...nextColors[targetColorIdx].sizes[targetSizeName],
          qtyTot: Math.max(0, (nextColors[targetColorIdx].sizes[targetSizeName].qtyTot || 0) + residual)
        };
      }
    }

    setColors(nextColors);
    updateFilenameAndTotal(meta, nextColors);
    setHasGenerated(false);
    triggerToast(`⚖️ Quantités ajustées proportionnellement pour atteindre précisément la cible de ${targetQty} Pcs !`, 'success');
  };

  const generateSSCC18 = (cartonNo: number) => {
    const ext = "3";
    const prefix = ssccCompanyPrefix.trim() || '3370001';
    const serialLen = 17 - 1 - prefix.length;
    const serialString = String(cartonNo).padStart(serialLen, '0');
    const ssccBase = ext + prefix + serialString;
    
    let sum = 0;
    for (let i = 0; i < ssccBase.length; i++) {
      const digit = parseInt(ssccBase[i], 10);
      sum += (i % 2 === 0) ? digit * 3 : digit;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return `${ssccBase}${checkDigit}`;
  };

  const resolveCartonData = (cartonNo: number) => {
    let currentSeq = 1;
    for (const res of activeResults) {
      for (const row of res.rows) {
        const start = currentSeq;
        const end = currentSeq + row.nbr - 1;
        if (cartonNo >= start && cartonNo <= end) {
          const origColor = colors.find(c => c.nom === res.nom);
          let firstActiveSize = Object.keys(row.sizes).find(sz => (row.sizes[sz] || 0) > 0) || '';
          let sizeSpecDef = origColor?.sizes[firstActiveSize];
          
          const dims = {
            L: sizeSpecDef?.dimL || 61,
            l: sizeSpecDef?.diml || 41,
            h: sizeSpecDef?.dimH || 30,
          };
          
          const singleSizes: { [sizeName: string]: number } = {};
          Object.keys(row.sizes).forEach(sz => {
            if ((row.sizes[sz] || 0) > 0) {
              singleSizes[sz] = row.sizes[sz];
            }
          });
          
          const netWeight = row.netWeightRow / row.nbr;
          const grossWeight = row.grossWeightRow / row.nbr;
          const volume = row.cbmRow / row.nbr;
          
          return {
            cartonNumber: cartonNo,
            totalCartons: grandTotals.c,
            colorName: res.nom,
            colorHex: res.color,
            sizes: singleSizes,
            pcsPerCarton: row.pcsPerCarton,
            skus: row.skus,
            netWeight,
            grossWeight,
            volume,
            dimensions: dims,
            type: row.type,
            style: meta.style || '—',
            styleNumber: meta.styleNumber || '',
            order: meta.order || '—',
            po: meta.po || '—',
            refClient: meta.refClient || '—',
            customer: meta.customer || '—',
            destination: meta.destination || '—',
            address: meta.address || '',
            pays: meta.pays || '',
            composition: meta.composition || '',
            yarn: meta.yarn || '',
            invoice: meta.invoice || '—'
          };
        }
        currentSeq += row.nbr;
      }
    }
    return null;
  };

  const renderCSSBarcode = (value: string) => {
    const combined = value + "GS1-128-SSCC";
    let hashVal = 0;
    for (let i = 0; i < combined.length; i++) {
      hashVal = (hashVal << 5) - hashVal + combined.charCodeAt(i);
      hashVal |= 0;
    }
    
    const bars = [];
    let isBlack = true;
    for (let i = 0; i < 54; i++) {
      const pseudoRand = Math.abs(Math.sin(hashVal + i) * 10);
      const width = (pseudoRand < 3) ? 1.2 : (pseudoRand < 6) ? 2.4 : (pseudoRand < 8.5) ? 3.6 : 4.8;
      bars.push(
        <div 
          key={i} 
          style={{
            width: `${width}px`,
            backgroundColor: isBlack ? '#000' : 'transparent',
            height: '100%'
          }} 
        />
      );
      isBlack = !isBlack;
    }
    
    return (
      <div className="h-16 flex items-stretch justify-center bg-white px-2 py-1 select-none overflow-hidden max-w-full mx-auto">
        {bars}
      </div>
    );
  };

  const handleSizeHeaderChange = (idx: number, newVal: string) => {
    const cleanVal = newVal.trim().toUpperCase();
    if (!cleanVal) return;

    const currentTab = colors[activeColorIdx];
    const oldKey = currentTab.tailles[idx];
    if (oldKey === cleanVal) return;

    // Look for duplicates in other headings
    if (currentTab.tailles.includes(cleanVal)) {
      alert(`La taille "${cleanVal}" existe déjà pour cette couleur.`);
      return;
    }

    // Rename size mapping key for all colors to maintain table uniformity
    const nextColors = colors.map(c => {
      const nextTailles = c.tailles.map((t, i) => (i === idx ? cleanVal : t));
      const nextSizes = { ...c.sizes };

      if (nextSizes[oldKey]) {
        nextSizes[cleanVal] = { ...nextSizes[oldKey] };
        delete nextSizes[oldKey];
      }

      return {
        ...c,
        tailles: nextTailles,
        sizes: nextSizes
      };
    });

    setColors(nextColors);
    setHasGenerated(false);
  };

  const handleUpdateSizeCell = (sizeName: string, field: keyof SizeDetails, val: string | number) => {
    const nextColors = colors.map((c, i) => {
      if (i !== activeColorIdx) return c;
      const nextSizes = { ...c.sizes };
      const valNum = field === 'sku' ? String(val) : (typeof val === 'string' ? parseFloat(val) || 0 : val);

      nextSizes[sizeName] = {
        ...nextSizes[sizeName],
        [field]: valNum
      };

      return { ...c, sizes: nextSizes };
    });

    setColors(nextColors);
    setHasGenerated(false);

    if (field === 'qtyTot') {
      updateFilenameAndTotal(meta, nextColors);
    }
  };

  const handleUpdateActiveColorAllSizes = (field: keyof SizeDetails, val: string | number, isSkuPrefix: boolean = false) => {
    const nextColors = colors.map((c, i) => {
      if (i !== activeColorIdx) return c;
      const nextSizes = { ...c.sizes };
      c.tailles.forEach(sz => {
        let valueToSet = val;
        if (isSkuPrefix) {
          valueToSet = String(val).trim() + "-" + sz;
        } else if (field !== 'sku') {
          valueToSet = typeof val === 'string' ? parseFloat(val) || 0 : val;
        } else {
          valueToSet = String(val);
        }

        nextSizes[sz] = {
          ...nextSizes[sz],
          [field]: valueToSet
        };
      });
      return { ...c, sizes: nextSizes };
    });

    setColors(nextColors);
    setHasGenerated(false);

    if (field === 'qtyTot') {
      updateFilenameAndTotal(meta, nextColors);
    }
  };

  const handlePasteGrid2D = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startingSizeName: string,
    startingField: keyof SizeDetails
  ) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    // Split text into rows (by newline) and cells (by tab)
    const lines = pastedText.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '');
    if (lines.length === 0) return;

    const activeColorConfig = colors[activeColorIdx];
    if (!activeColorConfig) return;

    const sizeIndex = activeColorConfig.tailles.indexOf(startingSizeName);
    if (sizeIndex === -1) return;

    // Fields sequence in the Grid UI:
    const fieldsSeq: (keyof SizeDetails)[] = ['qtyTot', 'cap', 'sku'];
    const startingFieldIdx = fieldsSeq.indexOf(startingField);
    if (startingFieldIdx === -1) return;

    const nextColors = colors.map((c, idx) => {
      if (idx !== activeColorIdx) return c;
      const nextSizes = { ...c.sizes };

      lines.forEach((lineText, lineOffset) => {
        const fieldIdx = startingFieldIdx + lineOffset;
        if (fieldIdx >= fieldsSeq.length) return; // Exceeds the grid row fields
        const currentField = fieldsSeq[fieldIdx];

        // Split columns of this line. Excel tabs first, fall back to spaces if single column
        const cols = lineText.split('\t');
        const valuesList = cols.length > 1 ? cols : lineText.split(/[\s,]+/);

        valuesList.forEach((rawVal, colOffset) => {
          const destIdx = sizeIndex + colOffset;
          if (destIdx < c.tailles.length) {
            const destSizeName = c.tailles[destIdx];
            const valStr = rawVal.trim();
            if (valStr !== '') {
              if (currentField === 'sku') {
                nextSizes[destSizeName] = {
                  ...nextSizes[destSizeName],
                  sku: valStr
                };
              } else {
                const valNum = parseFloat(valStr);
                nextSizes[destSizeName] = {
                  ...nextSizes[destSizeName],
                  [currentField]: isNaN(valNum) ? 0 : valNum
                };
              }
            }
          }
        });
      });

      return { ...c, sizes: nextSizes };
    });

    setColors(nextColors);
    setHasGenerated(false);

    // If we modified qtyTot, sync filename and totals
    if (startingFieldIdx === 0 || lines.length > 1) {
      updateFilenameAndTotal(meta, nextColors);
    }
    triggerToast('⚡ Données collées depuis le presse-papiers !', 'success');
  };

  // Model automatic loaders
  const handleApplyDimModel = (modelName: string) => {
    const matched = db.dim_models.find(m => m.name === modelName);
    if (!matched) return;

    const nextColors = colors.map((c, ci) => {
      if (ci !== activeColorIdx) return c;
      const nextSizes = { ...c.sizes };
      c.tailles.forEach(t => {
        nextSizes[t] = {
          ...nextSizes[t],
          dimL: matched.L,
          diml: matched.l,
          dimH: matched.h,
          cbmUnit: (matched.L * matched.l * matched.h) / 1000000
        };
      });
      return { ...c, sizes: nextSizes, selectedDimModelName: modelName };
    });
    setColors(nextColors);
    setHasGenerated(false);
    triggerToast(`📐 Dimensions appliquées : ${matched.name} (${matched.L}x${matched.l}x${matched.h} cm)`, 'success');
  };

  const handleApplyPieceWeightModel = (modelName: string) => {
    const matched = db.weight_piece_models.find(m => m.name === modelName);
    if (!matched) return;

    const nextColors = colors.map((c, ci) => {
      if (ci !== activeColorIdx) return c;
      const nextSizes = { ...c.sizes };
      c.tailles.forEach(t => {
        nextSizes[t] = {
          ...nextSizes[t],
          wPiece: matched.wPiece
        };
      });
      return { ...c, sizes: nextSizes, selectedPieceWeightModelName: modelName };
    });
    setColors(nextColors);
    setHasGenerated(false);
    triggerToast(`⚖️ Poids unitaire appliqué : ${matched.name} (${matched.wPiece} KG)`, 'success');
  };

  const handleApplyCartonWeightModel = (modelName: string) => {
    const matched = db.weight_carton_models.find(m => m.name === modelName);
    if (!matched) return;

    const nextColors = colors.map((c, ci) => {
      if (ci !== activeColorIdx) return c;
      const nextSizes = { ...c.sizes };
      c.tailles.forEach(t => {
        nextSizes[t] = {
          ...nextSizes[t],
          wCarton: matched.wCarton
        };
      });
      return { ...c, sizes: nextSizes, selectedCartonWeightModelName: modelName };
    });
    setColors(nextColors);
    setHasGenerated(false);
    triggerToast(`📦 Tare carton vide appliquée : ${matched.name} (${matched.wCarton} KG)`, 'success');
  };

  // Box details modal triggers
  const openBoxDetailsModal = (sizeName: string, config: SizeDetails) => {
    setBoxModalCtx({
      isOpen: true,
      sizeName,
      colorName: colors[activeColorIdx].nom,
      initialDetails: config,
      colorIdx: activeColorIdx
    });
  };

  const saveBoxDetailsModal = (updated: SizeDetails) => {
    if (!boxModalCtx) return;
    const { colorIdx, sizeName } = boxModalCtx;

    const nextColors = colors.map((c, ci) => {
      if (ci !== colorIdx) return c;
      const nextSizes = { ...c.sizes, [sizeName]: updated };
      return { ...c, sizes: nextSizes };
    });

    setColors(nextColors);
    setBoxModalCtx(null);
    setHasGenerated(false);
    triggerToast(`🛠️ Gabarit de colisage mis à jour pour ${sizeName} !`, 'success');
  };

  // Quiet auto-recalculate helper to keep packing list updated on settings changes
  const autoRecalculateResults = (
    nextGlobalMode?: 'strict_solide' | 'mixte_autorise',
    nextForceSingleCarton?: boolean,
    nextMaxSizesPerBox?: number,
    nextForceSubCap?: boolean,
    nextColors?: ColorConfig[]
  ) => {
    if (!hasGenerated) return;

    const gMode = nextGlobalMode !== undefined ? nextGlobalMode : globalPackingMode;
    const fSingle = nextForceSingleCarton !== undefined ? nextForceSingleCarton : forceSingleCarton;
    const mSizes = nextMaxSizesPerBox !== undefined ? nextMaxSizesPerBox : maxSizesPerBox;
    const fSubCap = nextForceSubCap !== undefined ? nextForceSubCap : forceSubCapSolidInMixed;
    const currentColors = nextColors !== undefined ? nextColors : colors;

    // Run validation first
    for (let i = 0; i < currentColors.length; i++) {
      const color = currentColors[i];
      const validation = validateColorCustomRemainders(color, gMode, mSizes);
      if (!validation.valid) {
        triggerToast(`❌ Erreur : Les cartons personnalisés de ${color.nom} ne respectent pas les règles !`, "error");
        setRemainderValidationError({
          isOpen: true,
          colorName: color.nom,
          errors: validation.errors
        });
        return; // BLOCK and show error dialog
      }
    }

    const outputResults = currentColors.map((c, idx) => {
      return computeColorResult(c, gMode, fSingle, mSizes, idx, fSubCap);
    });

    setResults(outputResults);
    setHasGenerated(true);
  };

  // Auto group remainders helper
  const handleAutoGroupRemainders = () => {
    const activeColorConfig = colors[activeColorIdx];
    if (!activeColorConfig) return;

    interface RestInfo {
      taille: string;
      qte: number;
      cap: number;
    }
    const list: RestInfo[] = [];
    activeColorConfig.tailles.forEach(sz => {
      const qTot = activeColorConfig.sizes[sz]?.qtyTot || 0;
      const cap = activeColorConfig.sizes[sz]?.cap || 25;
      const r = qTot % cap;
      if (r > 0) {
        list.push({ taille: sz, qte: r, cap });
      }
    });

    if (list.length === 0) {
      triggerToast("ℹ️ Aucun reste à regrouper pour cette couleur !", "info");
      return;
    }

    const customCartons: CustomRemainderCarton[] = [];
    const tempPool = [...list];

    while (tempPool.length > 0) {
      tempPool.sort((a, b) => b.qte - a.qte);

      const limitGroup = tempPool.slice(0, maxSizesPerBox);
      const cartonCap = Math.max(...limitGroup.map(item => item.cap));

      const selectedList: RestInfo[] = [];
      let boxSum = 0;

      for (let i = 0; i < tempPool.length && selectedList.length < maxSizesPerBox; i++) {
        const item = tempPool[i];
        if (boxSum + item.qte <= cartonCap) {
          selectedList.push(item);
          boxSum += item.qte;
        }
      }

      if (selectedList.length === 0 && tempPool.length > 0) {
        const first = tempPool[0];
        selectedList.push(first);
        boxSum += first.qte;
      }

      selectedList.forEach(sel => {
        const fIdx = tempPool.findIndex(item => item.taille === sel.taille);
        if (fIdx >= 0) tempPool.splice(fIdx, 1);
      });

      const cartonSizes: { [size: string]: number } = {};
      const cartonWritten: { [size: string]: string } = {};

      activeColorConfig.tailles.forEach(sz => {
        cartonSizes[sz] = 0;
      });

      selectedList.forEach(item => {
        cartonSizes[item.taille] = item.qte;
        cartonWritten[item.taille] = numberToFrenchWords(item.qte);
      });

      customCartons.push({
        id: 'rc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9) + '_' + customCartons.length,
        sizes: cartonSizes,
        writtenWords: cartonWritten
      });
    }

    const nextColors = [...colors];
    nextColors[activeColorIdx] = {
      ...activeColorConfig,
      customRemainders: customCartons
    };
    setColors(nextColors);
    setHasGenerated(false);
    triggerToast(`⚡ Cartons de restes configurés automatiquement (${customCartons.length} cartons générés) !`, "success");
  };

  // Generate Results Trigger
  const handleGenerateList = () => {
    // Intervene if any custom remainders are configured incorrectly
    for (let i = 0; i < colors.length; i++) {
      const color = colors[i];
      const validation = validateColorCustomRemainders(color, globalPackingMode, maxSizesPerBox);
      if (!validation.valid) {
        triggerToast(`❌ Erreur : Les cartons personnalisés de ${color.nom} ne respectent pas les règles !`, "error");
        setRemainderValidationError({
          isOpen: true,
          colorName: color.nom,
          errors: validation.errors
        });
        return; // BLOCK generation and show validation warning
      }
    }

    const outputResults = colors.map((c, idx) => {
      return computeColorResult(c, globalPackingMode, forceSingleCarton, maxSizesPerBox, idx, forceSubCapSolidInMixed);
    });

    setResults(outputResults);
    setHasGenerated(true);
  };

  const handleResetScreen = () => {
    setMeta({
      order: '',
      customer: '',
      po: '',
      refClient: '',
      invoice: '',
      style: '',
      styleNumber: '',
      sku: '',
      yarn: '',
      composition: '',
      destination: '',
      address: '',
      pays: '',
      portDepart: '',
      portArrivee: '',
      qty: '',
      filename: ''
    });

    setCustQuery('');
    setGlobalPackingMode('strict_solide');
    setForceSingleCarton(false);
    setMaxSizesPerBox(3);
    setHasGenerated(false);
    setResults([]);
    resetColorsToDefault();
    setShowResetConfirm(false);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Save current active list to the database
  const handleSaveCurrentList = (customName: string) => {
    try {
      const timestamp = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const autoLabel = [
        meta.order ? `Order #${meta.order}` : '',
        meta.customer ? `${meta.customer}` : '',
        meta.style ? `${meta.style}` : ''
      ].filter(Boolean).join(' - ') || 'Fiche sans nom';

      const finalName = customName.trim() || `${autoLabel} (${timestamp})`;
      const newListItem: LocalSaveListItem = {
        id: 'save_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        name: finalName,
        savedAt: new Date().toISOString(),
        meta: { ...meta },
        globalPackingMode,
        maxSizesPerBox,
        forceSingleCarton,
        forceSubCapSolidInMixed,
        colors: JSON.parse(JSON.stringify(colors)) // deep copy
      };

      setSavedLists(prev => [newListItem, ...prev]);
      triggerToast(`💾 Fiche sauvegardée : "${finalName}"`, 'success');
      setSavesError(null);
      setSaveNameInput('');
    } catch (err: any) {
      setSavesError(`❌ Erreur lors de la sauvegarde : ${err?.message || err}`);
      triggerToast(`Erreur lors de la sauvegarde`, 'error');
    }
  };

  // Load a specified list from the database
  const handleLoadSavedList = (item: LocalSaveListItem) => {
    try {
      setMeta({ ...item.meta });
      setGlobalPackingMode(item.globalPackingMode);
      setMaxSizesPerBox(item.maxSizesPerBox);
      setForceSingleCarton(item.forceSingleCarton);
      setForceSubCapSolidInMixed(Boolean(item.forceSubCapSolidInMixed));
      setColors(JSON.parse(JSON.stringify(item.colors))); // deep copy
      setHasGenerated(false);
      setResults([]);
      triggerToast(`🔌 Fiche "${item.name}" rechargée !`, 'success');
      setSavesError(null);
    } catch (err: any) {
      setSavesError(`❌ Erreur lors du rechargement de la fiche : ${err?.message || err}`);
      triggerToast(`Erreur de chargement`, 'error');
    }
  };

  // Delete a list snapshot with inline double click protection
  const handleDeleteSavedList = (id: string, name: string) => {
    setSavedLists(prev => prev.filter(item => item.id !== id));
    setConfirmDeleteId(null);
    triggerToast(`🗑️ Sauvegarde "${name}" supprimée.`, 'info');
  };

  // Excel Exports
  const handleExcelExport = async () => {
    try {
      let activeResults = results;
      if (!hasGenerated || activeResults.length === 0) {
        activeResults = colors.map((c, idx) => {
          return computeColorResult(c, globalPackingMode, forceSingleCarton, maxSizesPerBox, idx, forceSubCapSolidInMixed);
        });
        setResults(activeResults);
        setHasGenerated(true);
      }

      // Filter based on selected colors
      const filteredResults = activeResults.filter(res => selectedExportColors.includes(res.nom));
      const resultsToExport = filteredResults.length > 0 ? filteredResults : activeResults;

      const sizesInputsMapping: { [colorIdx: number]: { tailles: string[]; D: { [size: string]: SizeDetails } } } = {};
      colors.forEach((c, idx) => {
        sizesInputsMapping[idx] = {
          tailles: c.tailles,
          D: c.sizes
        };
      });

      await exportToExcel(resultsToExport, meta, sizesInputsMapping, printColumns);
    } catch (err: any) {
      alert(`Erreur d'exportation Excel: ${err.message}`);
    }
  };

  // Print selections applying to printable style structures
  const handleTriggerPrint = () => {
    setIsPdfPrintSelectorOpen(false);

    // Filter printable nodes based on filters chosen
    const styleEl = document.createElement('style');
    styleEl.id = 'print-filter-styles';

    let css = '';
    if (!printSections.hdr) css += '.print-hdr { display: none !important; } ';
    if (!printSections.meta) css += '.print-meta { display: none !important; } ';
    if (!printSections.ind) css += '.print-ind-card { display: none !important; } ';
    if (!printSections.cpl) css += '.print-cpl-card { display: none !important; } ';
    if (!printSections.leg) css += '.print-legend { display: none !important; } ';
    if (!printSections.bk) css += '.print-bk-table { display: none !important; } ';
    if (!printSections.stats) css += '.print-stats-box { display: none !important; } ';
    if (!printSections.dim) css += '.print-dim-table { display: none !important; } ';

    if (!printColumns.ctn) css += '.col-ctn-index { display: none !important; } ';
    if (!printColumns.color) css += '.col-color-lbl { display: none !important; } ';
    if (!printColumns.sku) css += '.col-sku-lbl { display: none !important; } ';
    if (!printColumns.sizes) css += '.col-sizes-cells { display: none !important; } ';
    if (!printColumns.nbctn) css += '.col-nbctn-metric { display: none !important; } ';
    if (!printColumns.totalqty) css += '.col-totalqty-metric { display: none !important; } ';
    if (!printColumns.net) css += '.col-net-metric { display: none !important; } ';
    if (!printColumns.gross) css += '.col-gross-metric { display: none !important; } ';
    if (!printColumns.cbm) css += '.col-cbm-metric { display: none !important; } ';

    styleEl.innerHTML = `@media print { ${css} }`;
    document.head.appendChild(styleEl);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        styleEl.remove();
      }, 500);
    }, 200);
  };

  const handleOpenPdfPrintSelector = () => {
    if (!hasGenerated || results.length === 0) {
      const activeResults = colors.map((c, idx) => {
        return computeColorResult(c, globalPackingMode, forceSingleCarton, maxSizesPerBox, idx, forceSubCapSolidInMixed);
      });
      setResults(activeResults);
      setHasGenerated(true);
    }
    setIsPdfPrintSelectorOpen(true);
  };

  // SQL snapshots export & backup loading
  const handleExportSQL = () => {
    let activeResults = results;
    if (!hasGenerated || activeResults.length === 0) {
      activeResults = colors.map((c, idx) => {
        return computeColorResult(c, globalPackingMode, forceSingleCarton, maxSizesPerBox, idx, forceSubCapSolidInMixed);
      });
      setResults(activeResults);
      setHasGenerated(true);
    }

    const inputSizesMapping: { [colorIdx: number]: { tailles: string[]; D: { [size: string]: SizeDetails } } } = {};
    colors.forEach((c, idx) => {
      inputSizesMapping[idx] = {
        tailles: c.tailles,
        D: c.sizes
      };
    });

    const sqlStr = generateSQLString(
      meta,
      globalPackingMode,
      maxSizesPerBox,
      forceSingleCarton,
      colors.map(c => ({
        nom: c.nom,
        mode: c.mode,
        selectedPieceWeightModelName: c.selectedPieceWeightModelName,
        selectedCartonWeightModelName: c.selectedCartonWeightModelName,
        selectedDimModelName: c.selectedDimModelName
      })),
      inputSizesMapping,
      activeResults,
      forceSubCapSolidInMixed
    );

    const blob = new Blob([sqlStr], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedFilename = (meta.filename || 'SNAPSHOT')
      .replace(/[\/\\:*?"<>|]/g, '_')
      .replace(/\s+/g, '_');
    link.download = `${sanitizedFilename}_DB.sql`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSqlFileSubmit = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    setSqlStatus('⏳ Lecture du fichier SQL...');
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const sqlText = e.target?.result as string;
        const parsed = parseSQLString(sqlText);

        const restoredMeta = { ...meta };
        const keyMap: { [key: string]: keyof OrderMeta } = {
          order: 'order',
          customer: 'customer',
          po: 'po',
          ref_client: 'refClient',
          invoice: 'invoice',
          style: 'style',
          style_number: 'styleNumber',
          sku: 'sku',
          yarn: 'yarn',
          composition: 'composition',
          destination: 'destination',
          address: 'address',
          pays: 'pays',
          port_depart: 'portDepart',
          port_arrivee: 'portArrivee'
        };

        Object.entries(parsed.cfg).forEach(([k, val]) => {
          const mapKey = keyMap[k];
          if (mapKey) restoredMeta[mapKey] = val;
        });

        if (parsed.cfg.filename) restoredMeta.filename = parsed.cfg.filename;
        if (parsed.cfg.global_mode) setGlobalPackingMode(parsed.cfg.global_mode as any);
        if (parsed.cfg.max_sizes) setMaxSizesPerBox(parseInt(parsed.cfg.max_sizes) || 3);
        if (parsed.cfg.force_single_ctn) setForceSingleCarton(parsed.cfg.force_single_ctn === '1');
        if (parsed.cfg.force_subcap_solid) setForceSubCapSolidInMixed(parsed.cfg.force_subcap_solid === '1');

        if (parsed.colors.length === 0) {
          throw new Error('Données colors introuvables dans le fichier de sauvegarde.');
        }

        // Reconstruct dynamic colors input details
        const reconstructedColors: ColorConfig[] = [];

        parsed.colors.forEach((colRow) => {
          const sizesMap = parsed.sizes[colRow.id] || {};
          const sizeIndexes = Object.keys(sizesMap).map(Number).sort((a, b) => a - b);

          const sizesListNames = sizeIndexes.map(idx => sizesMap[idx].name);
          const sizesDict: { [sz: string]: SizeDetails } = {};

          sizesListNames.forEach((name, idx) => {
            const raw = sizesMap[sizeIndexes[idx]] || {};
            const qtyTot = typeof raw.qtyTot !== 'undefined' ? Number(raw.qtyTot) : (typeof raw.qty !== 'undefined' ? Number(raw.qty) : (typeof raw.qty_tot !== 'undefined' ? Number(raw.qty_tot) : 0));
            const cap = typeof raw.cap !== 'undefined' ? Number(raw.cap) : 25;
            const wPiece = typeof raw.wPiece !== 'undefined' ? Number(raw.wPiece) : (typeof raw.w_piece !== 'undefined' ? Number(raw.w_piece) : 0.25);
            const wCarton = typeof raw.wCarton !== 'undefined' ? Number(raw.wCarton) : (typeof raw.w_carton !== 'undefined' ? Number(raw.w_carton) : 0.8);
            const dimL = typeof raw.dimL !== 'undefined' ? Number(raw.dimL) : (typeof raw.dim_L !== 'undefined' ? Number(raw.dim_L) : 61);
            const diml = typeof raw.diml !== 'undefined' ? Number(raw.diml) : (typeof raw.dim_l !== 'undefined' ? Number(raw.dim_l) : 41);
            const dimH = typeof raw.dimH !== 'undefined' ? Number(raw.dimH) : (typeof raw.dim_h !== 'undefined' ? Number(raw.dim_h) : 30);
            const sku = raw.sku || '';

            sizesDict[name] = {
              qtyTot: isNaN(qtyTot) ? 0 : qtyTot,
              cap: isNaN(cap) ? 25 : cap,
              wPiece: isNaN(wPiece) ? 0.25 : wPiece,
              wCarton: isNaN(wCarton) ? 0.8 : wCarton,
              cbmUnit: ((isNaN(dimL) ? 61 : dimL) * (isNaN(diml) ? 41 : diml) * (isNaN(dimH) ? 30 : dimH)) / 1000000,
              dimL: isNaN(dimL) ? 61 : dimL,
              diml: isNaN(diml) ? 41 : diml,
              dimH: isNaN(dimH) ? 30 : dimH,
              sku: sku
            };
          });

          // Model restore & auto-detector logic
          let selectedPieceWeightModelName = (colRow as any).selectedPieceWeightModelName;
          if ((!selectedPieceWeightModelName || selectedPieceWeightModelName === '') && Object.keys(sizesDict).length > 0) {
            const weights = Object.values(sizesDict).map(s => s.wPiece);
            const uniqueWeight = weights.every(w => w === weights[0]) ? weights[0] : null;
            if (uniqueWeight !== null) {
              const matched = db.weight_piece_models.find(m => m.wPiece === uniqueWeight);
              if (matched) selectedPieceWeightModelName = matched.name;
            }
          }

          let selectedCartonWeightModelName = (colRow as any).selectedCartonWeightModelName;
          if ((!selectedCartonWeightModelName || selectedCartonWeightModelName === '') && Object.keys(sizesDict).length > 0) {
            const weights = Object.values(sizesDict).map(s => s.wCarton);
            const uniqueWeight = weights.every(w => w === weights[0]) ? weights[0] : null;
            if (uniqueWeight !== null) {
              const matched = db.weight_carton_models.find(m => m.wCarton === uniqueWeight);
              if (matched) selectedCartonWeightModelName = matched.name;
            }
          }

          let selectedDimModelName = (colRow as any).selectedDimModelName;
          if ((!selectedDimModelName || selectedDimModelName === '') && Object.keys(sizesDict).length > 0) {
            const sizesArray = Object.values(sizesDict);
            const firstVal = sizesArray[0];
            const isUniform = sizesArray.every(s => s.dimL === firstVal.dimL && s.diml === firstVal.diml && s.dimH === firstVal.dimH);
            if (isUniform) {
              const matched = db.dim_models.find(m => m.L === firstVal.dimL && m.l === firstVal.diml && m.h === firstVal.dimH);
              if (matched) selectedDimModelName = matched.name;
            }
          }

          reconstructedColors.push({
            nom: colRow.nom,
            mode: colRow.mode as any,
            tailles: sizesListNames,
            sizes: sizesDict,
            selectedPieceWeightModelName: selectedPieceWeightModelName || undefined,
            selectedCartonWeightModelName: selectedCartonWeightModelName || undefined,
            selectedDimModelName: selectedDimModelName || undefined
          });
        });

        setColors(reconstructedColors);
        setActiveColorIdx(0);
        setSqlStatus('✅ Restauration effectuée avec succès ! Génération en cours...');

        setTimeout(() => {
          setMeta(restoredMeta);
          setCustQuery(restoredMeta.customer);
          setIsSqlImportOpen(false);
          setSqlStatus(null);
          // Auto fire trigger calculation
          const output = reconstructedColors.map((c, idx) => {
            return computeColorResult(c, parsed.cfg.global_mode as any || globalPackingMode, parsed.cfg.force_single_ctn === '1', parseInt(parsed.cfg.max_sizes) || maxSizesPerBox, idx, parsed.cfg.force_subcap_solid === '1');
          });
          setResults(output);
          setHasGenerated(true);
        }, 1200);

      } catch (err: any) {
        setSqlStatus(`❌ Erreur d'importation: ${err.message}`);
      }
    };

    reader.readAsText(file);
  };

  const activeResults = results.filter(res => selectedExportColors.includes(res.nom));

  // Grand totals mapping helpers
  const getGrandTotalsSummary = (targetResults = activeResults) => {
    let totC = 0;
    let totP = 0;
    let totN = 0;
    let totG = 0;
    let totV = 0;

    targetResults.forEach(res => {
      totC += res.totals.c;
      totP += res.totals.p;
      totN += res.totals.n;
      totG += res.totals.g;
      totV += res.totals.v;
    });

    return { c: totC, p: totP, n: totN, g: totG, v: totV };
  };

  const isStandardSizeAlwaysShown = (sizeName: string) => {
    const norm = sizeName.toUpperCase().trim();
    return ['XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '2 XL'].includes(norm);
  };

  // Render combined grid size headings list
  const getOverallUniqueSizes = () => {
    const list: string[] = [];
    colors.forEach(c => {
      if (selectedExportColors.length > 0 && !selectedExportColors.includes(c.nom)) {
        return;
      }
      c.tailles.forEach(t => {
        const qty = c.sizes[t]?.qtyTot || 0;
        const isAlways = isStandardSizeAlwaysShown(t);
        if ((isAlways || qty > 0) && !list.includes(t)) {
          list.push(t);
        }
      });
    });
    return list;
  };

  if (!isAuthenticated) {
    return <WelcomeScreen onSuccess={() => setIsAuthenticated(true)} />;
  }

  const getSidebarItemStyles = (tabName: string) => {
    const isActive = activeInputTab === tabName;
    if (darkMode) {
      return isActive
        ? 'bg-white border-white text-[#0C0C0E] font-black shadow-md'
        : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white shadow-xs';
    }
    return isActive
      ? 'bg-white border-white text-blue-950 font-black shadow-md'
      : 'bg-blue-700/40 border-blue-500/30 text-blue-100 hover:bg-blue-700/75 hover:text-white shadow-xs';
  };

  const getSidebarItemHighlightStyles = (tabName: string) => {
    const isActive = activeInputTab === tabName;
    if (darkMode) {
      return isActive ? 'bg-[#0C0C0E] scale-y-100' : 'bg-white/30 scale-y-0 group-hover:scale-y-50';
    }
    return isActive ? 'bg-[#FFE100] scale-y-100' : 'bg-blue-300 scale-y-0 group-hover:scale-y-50';
  };

  const getSidebarItemIconStyles = (tabName: string) => {
    const isActive = activeInputTab === tabName;
    if (darkMode) {
      return isActive ? 'bg-neutral-100 text-[#0C0C0E]' : 'bg-white/5 text-white/50';
    }
    return isActive ? 'bg-blue-50 text-blue-800' : 'bg-blue-900/30 text-blue-200';
  };

  const getSidebarItemSubtextStyles = (tabName: string) => {
    const isActive = activeInputTab === tabName;
    if (darkMode) {
      return isActive ? 'text-neutral-500 font-medium' : 'text-white/45';
    }
    return isActive ? 'text-blue-700 font-medium' : 'text-blue-200/70';
  };

  const getSidebarItemChevronStyles = (tabName: string) => {
    const isActive = activeInputTab === tabName;
    if (darkMode) {
      return isActive ? 'translate-x-[2px] text-[#0C0C0E]' : 'text-white/40';
    }
    return isActive ? 'translate-x-[2px] text-blue-800' : 'text-blue-300';
  };

  const getInputStyles = (isAccent?: boolean) => {
    if (darkMode) {
      if (isAccent) {
        return 'bg-[#0F0F12] border-white/20 text-white focus:border-white focus:ring-1 focus:ring-white/20';
      }
      return 'bg-[#0F0F12] border-white/10 text-white focus:border-white focus:ring-1 focus:ring-white/10';
    }
    if (isAccent) {
      return 'bg-amber-500/5 border-amber-300 text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20';
    }
    return 'bg-[#f4f6fb] border-slate-350 text-slate-900 focus:border-[#ff5000] focus:ring-1 focus:ring-[#ff5000]/20';
  };

  const getSubheadingStyles = (isSpecial?: boolean) => {
    if (darkMode) {
      return 'text-white font-mono uppercase tracking-wider font-extrabold text-[11px]';
    }
    return isSpecial ? 'text-amber-600 font-mono uppercase tracking-wider font-extrabold text-[11px]' : 'text-[#ff5000] font-mono uppercase tracking-wider font-extrabold text-[11px]';
  };

  const grandTotals = getGrandTotalsSummary();
  const summaryUniqueSizes = getOverallUniqueSizes();

  // Filter colors based on the e-commerce search query
  const filteredColors = colors.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      c.nom.toLowerCase().includes(query) ||
      c.tailles.some(t => t.toLowerCase().includes(query)) ||
      c.tailles.some(t => (c.sizes[t]?.sku || '').toLowerCase().includes(query))
    );
  });

  return (
    <div className={`min-h-screen font-sans bg-grid-pattern ${darkMode ? 'bg-[#0C0C0E] text-white' : 'bg-[#f4f6fb] text-slate-900'} transition-colors duration-300 pb-12`}>
      
      {/* Dynamic Modal components */}
      {boxModalCtx?.isOpen && (
        <BoxModal
          isOpen={boxModalCtx.isOpen}
          sizeName={boxModalCtx.sizeName}
          colorName={boxModalCtx.colorName}
          initialDetails={boxModalCtx.initialDetails}
          onClose={() => setBoxModalCtx(null)}
          onSave={saveBoxDetailsModal}
          darkMode={darkMode}
        />
      )}

      {cartonLimitError?.isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9600] backdrop-blur-xs px-4">
          <div className={`border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 transition-all animate-in fade-in zoom-in-95 duration-150 ${
            darkMode ? 'bg-[#18161e] border-red-500/40 text-slate-100' : 'bg-white border-red-200 text-slate-900 shadow-xl'
          }`}>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-500/10 rounded-full text-red-500 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-sm font-sans font-black uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                  ⚠️ Limite de pièces dépassée
                </h3>
                <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-350' : 'text-slate-600'}`}>
                  {cartonLimitError.message}
                </p>
              </div>
            </div>

            {cartonLimitError.sizesInvolved && (
              <div className={`p-3 rounded-xl border text-[11px] font-mono space-y-1 ${
                darkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
              }`}>
                <div className={`font-bold flex justify-between ${darkMode ? 'text-slate-350' : 'text-slate-700'}`}>
                  <span>Détail logistique :</span>
                  <span>Max : {cartonLimitError.limit} pcs</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Tailles concernées : <b>{cartonLimitError.sizesInvolved.join(', ')}</b>
                </div>
                <div className="text-[10px] text-slate-500">
                  Total essayé : <b className="text-red-500 font-bold">{cartonLimitError.currentTotal} pcs</b>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setCartonLimitError(null)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs font-mono transition-all cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99]"
              >
                Compris, ajuster la quantité
              </button>
            </div>
          </div>
        </div>
      )}

      {remainderValidationError?.isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9600] backdrop-blur-xs px-4">
          <div className={`border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 transition-all animate-in fade-in zoom-in-95 duration-150 ${
            darkMode ? 'bg-[#18161e] border-red-500/40 text-slate-100' : 'bg-white border-red-200 text-slate-900 shadow-xl'
          }`}>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-500/10 rounded-full text-red-500 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-sm font-sans font-black uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                  ⚠️ Validation des Pièces de Reste
                </h3>
                <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-350' : 'text-slate-600'}`}>
                  La quantité de pièces répartie pour la couleur <b>{remainderValidationError.colorName}</b> est incorrecte. Le total alloué doit correspondre exactement aux pièces restantes de la taille choisie. Les pièces d'un reste ne peuvent pas être divisées autrement.
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-xl border text-[11px] font-mono space-y-2 max-h-60 overflow-y-auto ${
              darkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className={`font-bold flex justify-between pb-1.5 border-b ${darkMode ? 'text-slate-350 border-white/10' : 'text-slate-700 border-slate-200'}`}>
                <span>⚠️ Écarts de répartition constatés :</span>
              </div>
              <ul className="space-y-2 text-xs">
                {remainderValidationError.errors.map((err, i) => (
                  <li key={i} className="text-red-500 flex items-start gap-1">
                    <span className="mt-0.5">•</span>
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setRemainderValidationError(null)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs font-mono transition-all cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99]"
              >
                Compris, vérifier la quantité
              </button>
            </div>
          </div>
        </div>
      )}

      {isMajBsdOpen && (
        <MajBsdModal
          isOpen={isMajBsdOpen}
          database={db}
          onClose={() => setIsMajBsdOpen(false)}
          onSaveDatabase={handleSaveDatabase}
          darkMode={darkMode}
        />
      )}

      {/* Smart Raw Text / Excel Import Modal */}
      {isSmartImportOpen && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[9500] backdrop-blur-xs px-4">
          <div className={`border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 transition-all ${
            darkMode ? 'bg-[#1a1d27] border-indigo-550/70 text-slate-100' : 'bg-white border-slate-205 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                <h3 className={`text-sm font-mono font-bold uppercase ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  ⚡ PORTAIL DE SAISIE RAPIDE DIRECTE
                </h3>
              </div>
              <button
                onClick={() => setIsSmartImportOpen(false)}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-350' : 'text-slate-600'}`}>
                Gagnez du temps en évitant la saisie manuelle cellule par cellule ! Collez vos données au choix : 
                soit sous forme de <strong>liste texte directe</strong>, soit sous forme de <strong>grille tabulée</strong> copiée depuis Excel.
              </p>

              {/* Demo Pre-fills triggers */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-mono uppercase font-black ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Modèles de test :</span>
                <button
                  type="button"
                  onClick={() => setSmartImportRawText(
                    "ROUGE - XS:120, S:240, M:300, L:200, XL:80\n" +
                    "BLEU - XS:80, S:150, M:180, L:130, XL:50\n" +
                    "NOIR - S:90, M:200, L:150"
                  )}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded border cursor-pointer transition-all ${
                    darkMode ? 'bg-slate-800 hover:bg-slate-700 text-indigo-400 border-slate-705/60' : 'bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border-indigo-200'
                  }`}
                >
                  📋 Saisie en ligne
                </button>
                <button
                  type="button"
                  onClick={() => setSmartImportRawText(
                    "Couleur\tXS\tS\tM\tL\tXL\n" +
                    "NAVY\t100\t150\t200\t120\t80\n" +
                    "CYAN\t60\t90\t120\t100\t40\n" +
                    "KAKI\t80\t140\t160\t110\t70"
                  )}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded border cursor-pointer transition-all ${
                    darkMode ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-705/60' : 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border-emerald-200'
                  }`}
                >
                  📊 Grille Excel (Tabulé)
                </button>
                <button
                  type="button"
                  onClick={() => { setSmartImportRawText(""); }}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded border cursor-pointer transition-all ml-auto ${
                    darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-705/60' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
                  }`}
                >
                  🗑️ Effacer
                </button>
              </div>

              {/* Raw Input Text Area */}
              <div className="flex flex-col gap-1.5 font-sans">
                <label className={`text-[10px] font-mono uppercase font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Saisissez ou collez vos données ici :
                </label>
                <textarea
                  value={smartImportRawText}
                  onChange={(e) => setSmartImportRawText(e.target.value)}
                  placeholder={`ex: ROUGE - XS:120, S:180, M:240, L:150\nou copiez-collez tout un tableau rectangulaire d'une feuille Excel.`}
                  rows={8}
                  className={`w-full text-xs font-mono rounded-lg border px-3 py-2.5 focus:outline-none focus:border-indigo-505 transition-all ${
                    darkMode
                      ? 'bg-[#161a23] border-slate-750 text-slate-150 placeholder-slate-600'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Smart format instructions status */}
              <div className={`border p-3 rounded-xl space-y-1.5 text-[11px] ${
                darkMode ? 'bg-[#121522]/60 border-slate-750 text-slate-400' : 'bg-indigo-50/20 border-indigo-100 text-indigo-950/70'
              }`}>
                <span className="text-[10px] font-mono text-[#ff5000] font-black uppercase tracking-wider block">💡 Astuce Spécifications :</span>
                <p>
                  Les nouvelles tailles importées hériteront automatiquement des capacités max (Cap), du poids par pièce, et des dimensions du gabarit carton définis sur vos gabarits modèles actuels !
                </p>
              </div>
            </div>

            <div className={`flex flex-col sm:flex-row gap-3 pt-4 border-t font-sans ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                onClick={() => setIsSmartImportOpen(false)}
                className={`py-2.5 px-4 rounded-lg font-mono text-xs border cursor-pointer transition-colors ${
                  darkMode ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100 bg-white shadow-2xs'
                }`}
              >
                Annuler
              </button>
              <div className="flex-1 flex gap-2">
                <button
                  onClick={() => handleSmartImport(smartImportRawText, 'merge')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 hover:scale-[1.01] active:scale-[0.99] border ${
                    darkMode
                      ? 'bg-[#222636] hover:bg-slate-800 text-slate-150 border-slate-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-2xs'
                  }`}
                >
                  ⚡ FUSIONNER AVEC L'EXISTANT
                </button>
                <button
                  onClick={() => handleSmartImport(smartImportRawText, 'replace')}
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-lg hover:brightness-110 hover:scale-[1.01] active:scale-[0.99]"
                >
                  ⚠️ REMPLACER ET ÉCRASER TOUT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Selection Print Overlay */}
      {isPdfPrintSelectorOpen && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[9500] backdrop-blur-xs px-4">
          <div className={`border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 transition-all ${
            darkMode ? 'bg-[#1a1d27] border-amber-500/70 text-slate-100' : 'bg-white border-slate-205 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className={`text-sm font-mono font-bold uppercase ${darkMode ? 'text-amber-500' : 'text-amber-600'}`}>
                📄 CONFIGURATION DE L'IMPRESSION PDF
              </h3>
              <button
                onClick={() => setIsPdfPrintSelectorOpen(false)}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <span className={`text-[10px] font-mono uppercase tracking-widest font-bold block ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Sections à inclure :
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries({
                    hdr: "📋 En-tête document",
                    meta: "ℹ️ Infos commande",
                    ind: "📦 PL par couleur",
                    cpl: "📁 PL combinée",
                    leg: "🎨 Légende couleurs",
                    bk: "📊 Breakdown résumé",
                    stats: "📈 Stats globales",
                    dim: "📐 Gabarit carton"
                  }).map(([key, label]) => {
                    const active = (printSections as any)[key];
                    return (
                      <button
                        key={key}
                        onClick={() => setPrintSections({ ...printSections, [key]: !active })}
                        className={`p-2.5 rounded-lg border text-left text-xs font-medium cursor-pointer transition-all flex items-center gap-2 ${
                          active
                            ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold'
                            : (darkMode ? 'border-slate-800 bg-[#222636] text-slate-400 hover:text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100')
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[10px] ${
                          active
                            ? 'bg-amber-500 text-white border-amber-500'
                            : (darkMode ? 'border-slate-600 bg-slate-900/40' : 'border-slate-300 bg-white')
                        }`}>
                          {active && '✓'}
                        </div>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <span className={`text-[10px] font-mono uppercase tracking-widest font-bold block ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Colonnes du tableau à afficher :
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries({
                    ctn: "N° Carton",
                    color: "Couleur",
                    sku: "SKU",
                    sizes: "Pcs/Taille",
                    nbctn: "Cartons",
                    totalqty: "Total Qty",
                    net: "Poids Net",
                    gross: "Poids Brut",
                    cbm: "CBM m³"
                  }).map(([key, label]) => {
                    const active = (printColumns as any)[key];
                    return (
                      <button
                        key={key}
                        onClick={() => setPrintColumns({ ...printColumns, [key]: !active })}
                        className={`p-2 rounded-lg border text-left text-[11px] font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                          active
                            ? 'border-amber-500 bg-amber-500/10 text-amber-505 font-bold'
                            : (darkMode ? 'border-slate-800 bg-[#222636] text-slate-400 hover:text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100')
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-sm border flex items-center justify-center text-[8px] ${
                          active
                            ? 'bg-amber-500 text-white border-amber-500'
                            : (darkMode ? 'border-slate-600 bg-slate-900/40' : 'border-slate-300 bg-white')
                        }`}>
                          {active && '✓'}
                        </div>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Iframe sandbox printing warning */}
              <div className={`border p-3.5 rounded-xl text-xs space-y-1 ${
                darkMode ? 'bg-amber-500/10 border-amber-500/25' : 'bg-amber-50 border-amber-200 text-amber-950/85'
              }`}>
                <p className={`font-bold flex items-center gap-1.5 font-mono text-[11px] ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                  ⚠️ CONSEIL POUR L'IMPRESSION (IFRAME) :
                </p>
                <p className={`text-[11px] leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-755'}`}>
                  Si le bouton ci-dessous ne lance pas l'imprimante, c'est que l'aperçu de test AI Studio restreint l'accès. 
                  Veuillez ouvrir l'application dans son propre onglet via le bouton <b>"Ouvrir dans un nouvel onglet"</b> en haut à droite pour pouvoir exporter sans blocage !
                </p>
              </div>
            </div>

            <div className={`flex gap-3 pt-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                onClick={() => setIsPdfPrintSelectorOpen(false)}
                className={`flex-1 py-2.5 border rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                  darkMode ? 'border-slate-705 text-slate-400 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100 bg-white shadow-2xs'
                }`}
              >
                Annuler
              </button>
              <button
                onClick={handleTriggerPrint}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-white rounded-lg font-bold text-xs shadow-lg hover:shadow-xl hover:shadow-amber-500/15 transition-all cursor-pointer"
              >
                🖨️ IMPRIMER / PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL Import Backups Modal */}
      {isSqlImportOpen && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[9500] backdrop-blur-xs px-4">
          <div className={`border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 transition-all ${
            darkMode ? 'bg-[#1a1d27] border-blue-500/70 text-slate-100' : 'bg-white border-slate-205 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className={`text-sm font-mono font-bold uppercase ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                📥 CHARGER SNAPSHOT SQL
              </h3>
              <button
                onClick={() => setIsSqlImportOpen(false)}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="file"
              ref={sqlFileRef}
              accept=".sql"
              className="hidden"
              onChange={(e) => handleSqlFileSubmit(e.target.files)}
            />

            <div
              onClick={() => sqlFileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleSqlFileSubmit(e.dataTransfer.files);
              }}
              className={`border-2 border-dashed p-8 rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                darkMode
                  ? 'border-slate-700 hover:border-blue-500 hover:bg-blue-500/5 bg-slate-900/10'
                  : 'border-slate-300 hover:border-blue-600 hover:bg-blue-50 bg-slate-50 shadow-2xs'
              }`}
            >
              <Upload className="w-10 h-10 text-blue-500" />
              <div className="text-center">
                <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  Glissez votre fichier de snapshot .sql ici
                </p>
                <p className={`text-[10px] font-mono ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Ou cliquez pour parcourir vos dossiers locaux
                </p>
              </div>
            </div>

            {sqlStatus && (
              <div className={`p-3 border text-xs font-mono text-center rounded-lg ${
                darkMode
                  ? 'bg-slate-900 border-slate-800 text-blue-400'
                  : 'bg-blue-50 border-blue-105 text-blue-700'
              }`}>
                {sqlStatus}
              </div>
            )}

            <button
              onClick={() => setIsSqlImportOpen(false)}
              className={`w-full py-2.5 border rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100 bg-white'
              }`}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
      {/* HEADER & ACTIONS TOP BLOCK (STICKY) */}


      <div className={`sticky top-0 z-40 print:hidden transition-all duration-300 border-b pb-1.5 shadow-md ${
        darkMode ? 'bg-[#0C0C0E]/95 border-white/10 shadow-black/40' : 'bg-[#001A4F] border-[#001135] shadow-slate-900/10'
      } backdrop-blur-md`}>
        {/* Sleek Top Bar containing GENERATE, Reset, Excel, PDF, SQL Export, SQL Import, Mode toggle */}
        <div className="w-full max-w-full px-4 lg:px-8 xl:px-12 mx-auto py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Cdiscount Replica Logo */}
            <div className="flex items-center gap-1.5 select-none cursor-pointer">
              <div className="bg-[#E51B22] text-white w-8 h-8 rounded-lg flex items-center justify-center font-black text-xl shadow-lg shadow-black/15">C</div>
            </div>

            <div className="flex flex-col border-l border-white/10 pl-3 justify-center">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-wider uppercase font-sans text-white">
                  Andry <span className={darkMode ? 'text-white' : 'text-[#FFE100]'}>Nantenaina</span>
                </span>
              </div>
            </div>

            {/* Functional Search Bar */}
            <div className="relative w-full max-w-xs hidden lg:block">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher couleur, SKU, taille..."
                className={`w-full pl-3 pr-9 py-1 rounded-lg text-xs text-white focus:outline-none focus:ring-1 transition-all ${
                  darkMode 
                    ? 'bg-[#151518] border border-white/10 placeholder:text-white/30 focus:ring-white focus:border-white' 
                    : 'bg-[#001135]/40 border border-blue-900/50 placeholder:text-blue-200/50 focus:ring-[#FFE100] focus:border-[#FFE100]'
                }`}
              />
              <div className={`absolute right-2.5 top-2 ${darkMode ? 'text-white/50' : 'text-blue-300'}`}>
                <Search className="w-3 h-3" />
              </div>
            </div>

            {/* Live Totals Summary (Pcs, Crt, Vol) */}
            <div className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 border rounded-lg text-white font-mono text-[10px] sm:text-xs shadow-inner select-none ${
              darkMode ? 'bg-[#151518] border-white/10' : 'bg-blue-950/40 border-blue-900/50'
            }`}>
              <div className="flex items-center gap-1">
                <span className={`text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold ${darkMode ? 'text-white/40' : 'text-blue-300'}`}>Pcs:</span>
                <span className={`font-bold ${darkMode ? 'text-white font-black' : 'text-[#FFE100]'}`}>{grandTotals.p.toLocaleString('fr-FR')}</span>
              </div>
              <div className="h-3 w-px bg-white/10" />
              <div className="flex items-center gap-1">
                <span className={`text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold ${darkMode ? 'text-white/40' : 'text-blue-300'}`}>Crt:</span>
                <span className={`font-bold ${darkMode ? 'text-white font-black' : 'text-[#FFE100]'}`}>{grandTotals.c.toLocaleString('fr-FR')}</span>
              </div>
              <div className="h-3 w-px bg-white/10" />
              <div className="flex items-center gap-1">
                <span className={`text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold ${darkMode ? 'text-white/40' : 'text-blue-300'}`}>Vol:</span>
                <span className={`font-bold ${darkMode ? 'text-white font-black' : 'text-[#FFE100]'}`} style={{ color: '#fae7e7', fontWeight: 'bold' }}>{grandTotals.v.toFixed(3)} m³</span>
              </div>
            </div>
          </div>

          <div className={`flex items-center gap-2 flex-wrap p-2.5 rounded-xl border shadow-md transition-colors ${
            darkMode ? 'bg-[#151518] border-white/10 text-white' : 'bg-[#0e4f62] text-white border-blue-500/40'
          }`}>
            {/* CTA Generer styled as Cdiscount's Adding to Cart CTA button (Energetic Yellow/Orange) */}
            <button
              onClick={handleGenerateList}
              className={`px-3.5 py-1.5 font-black rounded-lg text-[11px] transition-all focus:outline-none flex items-center gap-1.5 cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99] uppercase tracking-wider font-sans ${
                darkMode
                  ? 'bg-white hover:bg-neutral-200 text-[#0C0C0E] border border-white/10 shadow-white/5'
                  : 'bg-[#FFE100] hover:bg-[#ffe733] text-[#001e62] shadow-amber-500/15 animate-pulse hover:animate-none'
              }`}
            >
              <Calculator className={`w-3.5 h-3.5 ${darkMode ? 'text-[#0C0C0E]' : 'text-[#001e62]'}`} />
              <span>GÉNÉRER / CALCULER</span>
            </button>

            {/* Admin / Utility actions */}
            <button
              onClick={() => setIsMajBsdOpen(true)}
              className="px-2 py-1.5 border border-white/10 hover:bg-white/5 rounded-lg text-[11px] font-bold text-white/95 transition-all cursor-pointer flex items-center gap-1 hover:scale-[1.02]"
              title="🗂️ MAJ BSD (Gabarits)"
            >
              <Database className={`w-3 h-3 ${darkMode ? 'text-white' : 'text-[#FFE100]'}`} />
              <span className="hidden sm:inline">Gabarits</span>
            </button>

            <button
              onClick={() => setIsCapturingScreen(true)}
              className="px-2 py-1.5 border border-white/10 hover:bg-white/5 rounded-lg text-[11px] font-bold text-white/95 transition-all cursor-pointer flex items-center gap-1 hover:scale-[1.02]"
              title="📸 CAPTURE D'ÉCRAN"
            >
              <Camera className={`w-3 h-3 ${darkMode ? 'text-white' : 'text-blue-300'}`} />
              <span className="hidden sm:inline">Capture</span>
            </button>

            <button
              onClick={() => setIsAuthenticated(false)}
              className="px-2 py-1.5 border border-white/10 hover:bg-white/5 rounded-lg text-[11px] font-bold text-rose-200 hover:text-rose-100 transition-all cursor-pointer flex items-center gap-1 hover:scale-[1.02]"
              title="🚪 SE DÉCONNECTER"
            >
              <LogOut className={`w-3 h-3 ${darkMode ? 'text-white' : 'text-[#E51B22]'}`} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>

            <div className="h-4 w-px bg-white/15 mx-0.5" />

            {results.length > 0 && (
              <button
                onClick={handleGenerateList}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all flex items-center gap-1 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] ${
                  !hasGenerated
                    ? 'bg-[#E51B22] border-[#E51B22] text-white font-extrabold animate-pulse shadow-md shadow-red-500/20'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white font-bold'
                }`}
                title={!hasGenerated ? "Cliquez ici pour recalculer et appliquer vos modifications !" : "Les calculs sont à jour"}
              >
                <RefreshCw className={`w-3 h-3 ${!hasGenerated ? 'animate-spin' : ''}`} style={!hasGenerated ? { animationDuration: '2.5s' } : undefined} />
                <span>{!hasGenerated ? 'RE-CALCUL REQUIS' : 'À JOUR'}</span>
              </button>
            )}

            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-2.5 py-1.5 border border-white/10 hover:bg-white/5 rounded-lg text-[11px] font-bold text-white transition-all cursor-pointer flex items-center gap-1"
                title="Saisir à zéro"
              >
                <RefreshCw className={`w-3 h-3 ${darkMode ? 'text-white' : 'text-[#FFE100]'}`} />
                <span>Réinitialiser</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 p-0.5 rounded-lg transition-all border border-red-500/40 bg-red-500/10 text-white">
                <span className="text-[9px] font-black px-1 uppercase font-mono text-red-350">RESET?</span>
                <button
                  onClick={handleResetScreen}
                  className="px-2 py-0.5 bg-[#E51B22] hover:bg-red-700 text-white font-bold rounded text-[9px] transition-all cursor-pointer"
                >
                  Oui
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-2 py-0.5 bg-white/10 hover:bg-white/20 text-slate-200 font-bold rounded text-[9px] transition-all cursor-pointer"
                >
                  Non
                </button>
              </div>
            )}

            <div className="h-4 w-px bg-white/15 mx-0.5" />

            <button
              onClick={handleExcelExport}
              className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border hover:scale-[1.02] cursor-pointer transition-all flex items-center gap-1 ${
                darkMode
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white font-bold'
                  : 'bg-slate-800 hover:bg-slate-900 border-slate-700 text-white font-bold shadow-md shadow-slate-800/10'
              }`}
              title="Exporter vers Microsoft Excel"
            >
              <FileSpreadsheet className={`w-3 h-3 ${darkMode ? 'text-white/70' : 'text-white'}`} />
              <span>Excel</span>
            </button>

            <button
              onClick={handleOpenPdfPrintSelector}
              className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border hover:scale-[1.02] cursor-pointer transition-all flex items-center gap-1 ${
                darkMode
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white font-bold'
                  : 'bg-slate-800 hover:bg-slate-900 border-slate-700 text-white font-bold shadow-md shadow-slate-800/10'
              }`}
              title="Générer un PDF / Imprimer"
            >
              <FileText className={`w-3 h-3 ${darkMode ? 'text-white/70' : 'text-white'}`} />
              <span>PDF / Imprimer</span>
            </button>

            <div className="h-4 w-px bg-white/15 mx-0.5" />

            <button
              onClick={handleExportSQL}
              className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border hover:scale-[1.02] cursor-pointer transition-all flex items-center gap-1 ${
                darkMode
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white font-bold'
                  : 'bg-slate-800 hover:bg-slate-900 border-slate-700 text-white font-bold shadow-md shadow-slate-800/10'
              }`}
              title="Exporter la base au format SQL"
            >
              <Database className={`w-3 h-3 ${darkMode ? 'text-white/70' : 'text-white'}`} />
              <span>SQL Export</span>
            </button>

            <button
              onClick={() => setIsSqlImportOpen(true)}
              className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                darkMode
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white font-bold'
                  : 'bg-slate-800 hover:bg-slate-900 border-slate-700 text-white font-bold shadow-md shadow-slate-800/10'
              }`}
              title="Restaurer à partir d'un fichier SQL"
            >
              <Upload className={`w-3 h-3 ${darkMode ? 'text-white/70' : 'text-white'}`} style={undefined} />
              <span>SQL Import</span>
            </button>

            <div className="h-4 w-px bg-white/15 mx-1" />

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-1.5 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
                darkMode ? 'border-slate-800 bg-slate-900 text-amber-400 hover:text-white' : 'border-slate-300 bg-white text-slate-600 hover:text-black'
              }`}
              title={darkMode ? "Mode Clair" : "Mode Sombre"}
            >
              {darkMode ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Container workspace */}
      <main className="w-full max-w-full px-4 lg:px-8 xl:px-12 mx-auto space-y-6 print:px-0 pb-44 pt-6 mb-12">



        {/* Mobile Header indicator explaining menu state */}
        <div className="lg:hidden flex items-center justify-between w-full p-3 border rounded-xl font-sans text-[6px] font-bold transition-all print:hidden shadow-xs border-dashed z-30 sticky top-[60px] bg-[#fbf5f5] border-white text-[#0d0b0b] text-left leading-[-1px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#4f8ef7] animate-pulse" />
            <span className="uppercase tracking-wider font-mono text-[11px]">
              {
                activeInputTab === 'meta' ? '📋 RÉFÉRENCES' : 
                activeInputTab === 'strategy' ? '⚙️ STRATÉGIE' : 
                activeInputTab === 'colors' ? '⌨️ SAISIE COLISAGE' : 
                activeInputTab === 'packing_list' ? '📦 PACKING LIST' : 
                activeInputTab === 'breakdown' ? '📊 BREAKDOWN' : 
                activeInputTab === 'summary' ? '📈 RECAPITULATIF' : 
                activeInputTab === 'saves' ? '💾 SAUVEGARDES' : '🏷️ ÉTIQUETTES PARCELLES'
              }
            </span>
          </div>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-bold uppercase transition-all bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-[#4f8ef7] cursor-pointer"
          >
            {isSidebarCollapsed ? '👁️ Afficher Rubans' : '🙈 Masquer Rubans'}
          </button>
        </div>

        {/* INPUT PANELS & SIDEBAR NAVIGATION RIBBONS */}
        <div className="flex flex-col lg:flex-row gap-6 print:hidden items-stretch lg:h-[calc(100vh-170px)] lg:overflow-hidden">
          
          {/* SIDEBAR NAVIGATION: PETITS RUBANS À GAUCHE */}
          <div 
            className={`flex-shrink-0 transition-all duration-300 ease-in-out self-start lg:self-stretch z-30 
              ${isSidebarCollapsed ? 'hidden lg:flex lg:w-20' : 'w-full lg:w-64 flex'} 
              flex-col gap-2.5 lg:h-full lg:overflow-y-auto overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none border rounded-2xl p-3 shadow-lg text-white
              ${darkMode ? 'bg-[#0F0F12] border-white/10' : 'bg-[#0b5870] border-[#f5f0f0]'}
            `}
          >
            {/* COLLAPSE/EXPAND TOGGLE HEADER - DESKTOP ONLY */}
            <div className={`hidden lg:flex items-center justify-between border-b pb-2 ${
              darkMode ? 'border-white/10' : 'border-blue-400/30'
            } ${isSidebarCollapsed ? 'justify-center border-none pb-0' : 'px-1 mb-1'}`}>
              {!isSidebarCollapsed && (
                <span className={`text-[10px] font-mono tracking-wider font-extrabold uppercase ${
                  darkMode ? 'text-white/60' : 'text-blue-100'
                }`}>
                  🧭 Navigation
                </span>
              )}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`p-1.5 rounded-lg border cursor-pointer transition-all shadow-xs ${
                  darkMode 
                    ? 'border-white/10 bg-white/5 text-white hover:bg-white/10 hover:scale-[1.05] active:scale-[0.95]' 
                    : 'border-blue-400/50 bg-blue-700/40 text-blue-100 hover:text-white hover:bg-blue-50 hover:scale-[1.05] active:scale-[0.95]'
                }`}
                title={isSidebarCollapsed ? "Déployer le panneau" : "Réduire le panneau"}
              >
                {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* SECTION 1: SAISIE (REFERENCE / STRATEGY / COLISAGE) */}
            <div className={`flex flex-col gap-1.5 ${isSidebarCollapsed ? 'items-center' : 'w-full'}`}>
              {!isSidebarCollapsed && (
                <div className={`px-1 text-[9px] font-mono tracking-wider font-extrabold uppercase mb-1 transition-colors select-none ${
                  darkMode ? 'text-white/40' : 'text-blue-200/90'
                }`}>
                  ✍️ SAISIE
                </div>
              )}
              
              <div className={isSidebarCollapsed ? 'flex flex-col gap-2' : 'flex flex-col gap-1.5 w-full'}>
                {/* RIBBON 1: RÉFÉRENCES */}
                <button
                  onClick={() => setActiveInputTab('meta')}
                  className={`group flex items-center gap-3 transition-all border rounded-xl relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] overflow-hidden ${
                    isSidebarCollapsed 
                      ? 'lg:w-12 lg:h-12 lg:justify-center p-0 lg:p-2' 
                      : 'p-2.5 text-left w-full'
                  } ${getSidebarItemStyles('meta')}`}
                  title="📋 RÉFÉRENCES : Coordonnées Commande"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 transition-transform duration-300 ${getSidebarItemHighlightStyles('meta')}`}
                  />
                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${getSidebarItemIconStyles('meta')} transition-colors ${isSidebarCollapsed ? 'ml-0' : 'ml-0.5'}`}>
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex-1 min-w-0 pr-1 select-none">
                      <div className="text-[10px] font-mono tracking-wider font-extrabold uppercase truncate">
                        📋 RÉFÉRENCES
                      </div>
                      <div className={`text-[9px] hidden lg:block mt-0.5 font-sans truncate ${getSidebarItemSubtextStyles('meta')}`}>
                        Commande & Clients
                      </div>
                    </div>
                  )}
                  {!isSidebarCollapsed && (
                    <ChevronRight className={`w-3 h-3 ml-auto hidden lg:block transition-all duration-200 ${getSidebarItemChevronStyles('meta')}`} />
                  )}
                </button>

                {/* RIBBON 2: STRATÉGIE */}
                <button
                  onClick={() => setActiveInputTab('strategy')}
                  className={`group flex items-center gap-3 transition-all border rounded-xl relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] overflow-hidden ${
                    isSidebarCollapsed 
                      ? 'lg:w-12 lg:h-12 lg:justify-center p-0 lg:p-2' 
                      : 'p-2.5 text-left w-full'
                  } ${getSidebarItemStyles('strategy')}`}
                  title="⚙️ STRATÉGIE : Normes d'Emballage"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 transition-transform duration-300 ${getSidebarItemHighlightStyles('strategy')}`}
                  />
                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${getSidebarItemIconStyles('strategy')} transition-colors ${isSidebarCollapsed ? 'ml-0' : 'ml-0.5'}`}>
                    <Sliders className="w-3.5 h-3.5" />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex-1 min-w-0 pr-1 select-none">
                      <div className="text-[10px] font-mono tracking-wider font-extrabold uppercase truncate">
                        ⚙️ STRATÉGIE
                      </div>
                      <div className={`text-[9px] hidden lg:block mt-0.5 font-sans truncate ${getSidebarItemSubtextStyles('strategy')}`}>
                        Normes d'Emballage
                      </div>
                    </div>
                  )}
                  {!isSidebarCollapsed && (
                    <ChevronRight className={`w-3 h-3 ml-auto hidden lg:block transition-all duration-200 ${getSidebarItemChevronStyles('strategy')}`} />
                  )}
                </button>

                {/* RIBBON 3: COLISAGE */}
                <button
                  onClick={() => setActiveInputTab('colors')}
                  className={`group flex items-center gap-3 transition-all border rounded-xl relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] overflow-hidden ${
                    isSidebarCollapsed 
                      ? 'lg:w-12 lg:h-12 lg:justify-center p-0 lg:p-2' 
                      : 'p-2.5 text-left w-full'
                  } ${getSidebarItemStyles('colors')}`}
                  title="⌨️ GRILLE SAISIE : Colisage par Couleur"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 transition-transform duration-300 ${getSidebarItemHighlightStyles('colors')}`}
                  />
                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${getSidebarItemIconStyles('colors')} transition-colors ${isSidebarCollapsed ? 'ml-0' : 'ml-0.5'}`}>
                    <Grid className="w-3.5 h-3.5" />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex-1 min-w-0 pr-1 select-none">
                      <div className="text-[10px] font-mono tracking-wider font-extrabold uppercase truncate">
                        ⌨️ GRILLE SAISIE
                      </div>
                      <div className={`text-[9px] hidden lg:block mt-0.5 font-sans truncate ${getSidebarItemSubtextStyles('colors')}`}>
                        Colisage par Couleur
                      </div>
                    </div>
                  )}
                  {!isSidebarCollapsed && (
                    <ChevronRight className={`w-3 h-3 ml-auto hidden lg:block transition-all duration-200 ${getSidebarItemChevronStyles('colors')}`} />
                  )}
                </button>
              </div>
            </div>

            {/* SEPARATOR */}
            <div className={`h-px my-1 ${darkMode ? 'bg-white/10' : 'bg-blue-400/30'} ${isSidebarCollapsed ? 'w-8' : 'w-full'}`} />

            {/* SECTION 2: SUIVI (PACKING LIST / BREAKDOWN / RECAP / SAUVEGARDES) */}
            <div className={`flex flex-col gap-1.5 ${isSidebarCollapsed ? 'items-center' : 'w-full'}`}>
              {!isSidebarCollapsed && (
                <div className={`px-1 text-[9px] font-mono tracking-wider font-extrabold uppercase mb-1 transition-colors select-none ${
                  darkMode ? 'text-white/40' : 'text-blue-200/90'
                }`}>
                  📊 SUIVI & LIVRABLES
                </div>
              )}
              
              <div className={isSidebarCollapsed ? 'flex flex-col gap-2' : 'flex flex-col gap-1.5 w-full'}>
                {/* RIBBON 4: PACKING LIST */}
                <button
                  onClick={() => setActiveInputTab('packing_list')}
                  className={`group flex items-center gap-3 transition-all border rounded-xl relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] overflow-hidden ${
                    isSidebarCollapsed 
                      ? 'lg:w-12 lg:h-12 lg:justify-center p-0 lg:p-2' 
                      : 'p-2.5 text-left w-full'
                  } ${getSidebarItemStyles('packing_list')}`}
                  title="📦 PACKING LIST : Fiches de Colisage"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 transition-transform duration-300 ${getSidebarItemHighlightStyles('packing_list')}`}
                  />
                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${getSidebarItemIconStyles('packing_list')} transition-colors ${isSidebarCollapsed ? 'ml-0' : 'ml-0.5'}`}>
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex-1 min-w-0 pr-1 select-none">
                      <div className="text-[10px] font-mono tracking-wider font-extrabold uppercase truncate">
                        📦 PACKING LIST
                      </div>
                      <div className={`text-[9px] hidden lg:block mt-0.5 font-sans truncate ${getSidebarItemSubtextStyles('packing_list')}`}>
                        Fiches de Colisage
                      </div>
                    </div>
                  )}
                  {!isSidebarCollapsed && (
                    <ChevronRight className={`w-3 h-3 ml-auto hidden lg:block transition-all duration-200 ${getSidebarItemChevronStyles('packing_list')}`} />
                  )}
                </button>

                {/* RIBBON 5: COLOR/SIZE BREAKDOWN */}
                <button
                  onClick={() => setActiveInputTab('breakdown')}
                  className={`group flex items-center gap-3 transition-all border rounded-xl relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] overflow-hidden ${
                    isSidebarCollapsed 
                      ? 'lg:w-12 lg:h-12 lg:justify-center p-0 lg:p-2' 
                      : 'p-2.5 text-left w-full'
                  } ${getSidebarItemStyles('breakdown')}`}
                  title="📊 BREAKDOWN : Résumé Couleur/Taille"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 transition-transform duration-300 ${getSidebarItemHighlightStyles('breakdown')}`}
                  />
                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${getSidebarItemIconStyles('breakdown')} transition-colors ${isSidebarCollapsed ? 'ml-0' : 'ml-0.5'}`}>
                    <Grid className="w-3.5 h-3.5" />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex-1 min-w-0 pr-1 select-none">
                      <div className="text-[10px] font-mono tracking-wider font-extrabold uppercase truncate">
                        📊 BREAKDOWN
                      </div>
                      <div className={`text-[9px] hidden lg:block mt-0.5 font-sans truncate ${getSidebarItemSubtextStyles('breakdown')}`}>
                        Résumé Couleur/Taille
                      </div>
                    </div>
                  )}
                  {!isSidebarCollapsed && (
                    <ChevronRight className={`w-3 h-3 ml-auto hidden lg:block transition-all duration-200 ${getSidebarItemChevronStyles('breakdown')}`} />
                  )}
                </button>

                {/* RIBBON 6: RECAPITULATIF */}
                <button
                  onClick={() => setActiveInputTab('summary')}
                  className={`group flex items-center gap-3 transition-all border rounded-xl relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] overflow-hidden ${
                    isSidebarCollapsed 
                      ? 'lg:w-12 lg:h-12 lg:justify-center p-0 lg:p-2' 
                      : 'p-2.5 text-left w-full'
                  } ${getSidebarItemStyles('summary')}`}
                  title="📈 RECAPITULATIF : Résumé & Analyses"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 transition-transform duration-300 ${getSidebarItemHighlightStyles('summary')}`}
                  />
                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${getSidebarItemIconStyles('summary')} transition-colors ${isSidebarCollapsed ? 'ml-0' : 'ml-0.5'}`}>
                    <PieChart className="w-3.5 h-3.5" />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex-1 min-w-0 pr-1 select-none">
                      <div className="text-[10px] font-mono tracking-wider font-extrabold uppercase truncate">
                        📈 RECAP
                      </div>
                      <div className={`text-[9px] hidden lg:block mt-0.5 font-sans truncate ${getSidebarItemSubtextStyles('summary')}`}>
                        Résumé & Analyses
                      </div>
                    </div>
                  )}
                  {!isSidebarCollapsed && (
                    <ChevronRight className={`w-3 h-3 ml-auto hidden lg:block transition-all duration-200 ${getSidebarItemChevronStyles('summary')}`} />
                  )}
                </button>

                {/* RIBBON 7: SAUVEGARDES */}
                <button
                  onClick={() => setActiveInputTab('saves')}
                  className={`group flex items-center gap-3 transition-all border rounded-xl relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] overflow-hidden ${
                    isSidebarCollapsed 
                      ? 'lg:w-12 lg:h-12 lg:justify-center p-0 lg:p-2' 
                      : 'p-2.5 text-left w-full'
                  } ${getSidebarItemStyles('saves')}`}
                  title="💾 SAUVEGARDES : Sauvegarde & Historique"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 transition-transform duration-300 ${getSidebarItemHighlightStyles('saves')}`}
                  />
                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${getSidebarItemIconStyles('saves')} transition-colors ${isSidebarCollapsed ? 'ml-0' : 'ml-0.5'}`}>
                    <History className="w-3.5 h-3.5" />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex-1 min-w-0 pr-1 select-none">
                      <div className="text-[10px] font-mono tracking-wider font-extrabold uppercase truncate">
                        💾 SAUVEGARDES
                      </div>
                      <div className={`text-[9px] hidden lg:block mt-0.5 font-sans truncate ${getSidebarItemSubtextStyles('saves')}`}>
                        Sauvegarde & Historique
                      </div>
                    </div>
                  )}
                  {!isSidebarCollapsed && (
                    <ChevronRight className={`w-3 h-3 ml-auto hidden lg:block transition-all duration-200 ${getSidebarItemChevronStyles('saves')}`} />
                  )}
                </button>

                {/* RIBBON 8: ÉTIQUETTES / PARCEL LABELS */}
                <button
                  onClick={() => setActiveInputTab('labels')}
                  className={`group flex items-center gap-3 transition-all border rounded-xl relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] overflow-hidden ${
                    isSidebarCollapsed 
                      ? 'lg:w-12 lg:h-12 lg:justify-center p-0 lg:p-2' 
                      : 'p-2.5 text-left w-full'
                  } ${getSidebarItemStyles('labels')}`}
                  title="🏷️ ÉTIQUETTES : Impression d'étiquettes colis réelles A6"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 transition-transform duration-300 ${getSidebarItemHighlightStyles('labels')}`}
                  />
                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${getSidebarItemIconStyles('labels')} transition-colors ${isSidebarCollapsed ? 'ml-0' : 'ml-0.5'}`}>
                    <Printer className="w-3.5 h-3.5" />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex-1 min-w-0 pr-1 select-none">
                      <div className="text-[10px] font-mono tracking-wider font-extrabold uppercase truncate">
                        🏷️ ÉTIQUETTES A6
                      </div>
                      <div className={`text-[9px] hidden lg:block mt-0.5 font-sans truncate ${getSidebarItemSubtextStyles('labels')}`}>
                        Impression étiquettes Colis
                      </div>
                    </div>
                  )}
                  {!isSidebarCollapsed && (
                    <ChevronRight className={`w-3 h-3 ml-auto hidden lg:block transition-all duration-200 ${getSidebarItemChevronStyles('labels')}`} />
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* MAIN WORKSHEET CONTENT PANEL */}
          <div className="flex-1 w-full min-w-0 lg:h-full lg:overflow-y-auto pr-2 pb-12">
            <AnimatePresence mode="wait">
              {activeInputTab === 'meta' && (
                <motion.div
                  key="meta-section"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* ORDER METADATA FRAME */}
                  <div className={`rounded-2xl border p-6 ${
                    darkMode ? 'bg-[#0F0F12] border-white/10 shadow-lg shadow-black/20 text-white' : 'bg-white border-[#024c51] shadow-sm'
                  } space-y-5 transition-all duration-300`}>
                    
                    {/* Elegant Document Manifest look */}
                    <div className="flex items-center justify-between border-b pb-4 border-dashed border-slate-200 dark:border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-5 rounded-md ${darkMode ? 'bg-white' : 'bg-gradient-to-b from-[#ff5000] to-orange-600'}`} />
                        <div>
                          <h2 className={`text-xs font-bold font-mono tracking-wider ${darkMode ? 'text-slate-100' : 'text-slate-800'} uppercase`}>
                            📋 FICHE TRAÇABILITÉ & INFORMATIONS COMMANDE
                          </h2>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wide">
                            Enregistrement officiel de la cargaison et des instructions de routage transit
                          </p>
                        </div>
                      </div>
                      <span className="hidden sm:inline-block px-2.5 py-1 text-[9px] font-mono rounded-lg border border-slate-200 dark:border-slate-800 text-slate-450 uppercase font-black tracking-wider bg-slate-50 dark:bg-slate-900/40">
                        DOC-REF-MASTER
                      </span>
                    </div>

                    <div className="space-y-4 pt-1">
                      {/* Sub-section: References */}
                      <div className="space-y-4">
              <div className={`text-[10px] flex items-center gap-1 ${getSubheadingStyles(false)}`}>
                <ChevronRight className="w-3.5 h-3.5" /> Références En-têtes
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Order / Commande</label>
                  <input
                    type="text"
                    value={meta.order}
                    onChange={(e) => handleMetaChange('order', e.target.value)}
                    className={`w-full text-xs font-mono rounded-lg border px-3 py-2 focus:outline-none transition-all ${getInputStyles()}`}
                    placeholder="ex: 2630001AA"
                  />
                </div>

                <div className="flex flex-col gap-1 relative">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Customer / Client</label>
                  <input
                    type="text"
                    value={meta.customer}
                    onChange={(e) => handleMetaChange('customer', e.target.value)}
                    onFocus={() => { if (meta.customer) setShowCustDropdown(true); }}
                    className={`w-full text-xs font-mono rounded-lg border px-3 py-2 focus:outline-none transition-all ${getInputStyles()}`}
                    placeholder="ex: Johnnie-O"
                    autoComplete="off"
                  />

                  {/* Autocomplete suggestions */}
                  {showCustDropdown && (
                    <div className={`absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border shadow-xl max-h-48 overflow-y-auto ${
                      darkMode ? 'bg-[#0F0F12] border-white/20' : 'bg-white border-slate-300'
                    }`}>
                      {custSuggestions.map((c, i) => (
                        <div
                          key={i}
                          onClick={() => handleSelectCustomerSuggestion(c)}
                          className="px-3 py-2 text-xs font-mono hover:bg-neutral-800 hover:text-white cursor-pointer transition-colors"
                        >
                          {c}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">PO# Client</label>
                  <input
                    type="text"
                    value={meta.po}
                    onChange={(e) => handleMetaChange('po', e.target.value)}
                    className={`w-full text-xs font-mono rounded-lg border px-3 py-2 focus:outline-none transition-all ${getInputStyles()}`}
                    placeholder="ex: 08788-00"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-amber-500 uppercase font-semibold">Ref Client ★</label>
                  <input
                    type="text"
                    value={meta.refClient}
                    onChange={(e) => handleMetaChange('refClient', e.target.value)}
                    className={`w-full text-xs font-mono rounded-lg border px-3 py-2 focus:outline-none transition-all ${getInputStyles(true)}`}
                    placeholder="ex: RC-2025-001"
                  />
                </div>
              </div>
            </div>

            {/* Sub-section: Order Details */}
            <div className="space-y-4 pt-2">
              <div className={`text-[10px] flex items-center gap-1 ${getSubheadingStyles(false)}`}>
                <ChevronRight className="w-3.5 h-3.5" /> Informations de commande
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {/* Row 1 */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Style N°</label>
                  <input
                    type="text"
                    value={meta.style}
                    onChange={(e) => handleMetaChange('style', e.target.value)}
                    className={`w-full text-xs font-mono rounded-lg border px-3 py-2 focus:outline-none transition-all ${getInputStyles()}`}
                    placeholder="ex: AMANDA"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-amber-500 uppercase font-semibold">Style Number ★</label>
                  <input
                    type="text"
                    value={meta.styleNumber}
                    onChange={(e) => handleMetaChange('styleNumber', e.target.value)}
                    className={`w-full text-xs font-mono rounded-lg border px-3 py-2 focus:outline-none transition-all ${getInputStyles(true)}`}
                    placeholder="ex: JWSW100150"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-amber-500 uppercase font-semibold">SKU Global ★</label>
                  <input
                    type="text"
                    value={meta.sku}
                    onChange={(e) => handleMetaChange('sku', e.target.value)}
                    className={`w-full text-xs font-mono rounded-lg border px-3 py-2 focus:outline-none transition-all ${getInputStyles(true)}`}
                    placeholder="ex: SKU-100150"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-amber-500 uppercase font-semibold">Yarn / Fil ★</label>
                  <input
                    type="text"
                    value={meta.yarn}
                    onChange={(e) => handleMetaChange('yarn', e.target.value)}
                    className={`w-full text-xs font-mono rounded-lg border px-3 py-2 focus:outline-none transition-all ${getInputStyles(true)}`}
                    placeholder="ex: 100% Cotton"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-amber-500 uppercase font-semibold">Composition ★</label>
                  <input
                    type="text"
                    value={meta.composition}
                    onChange={(e) => handleMetaChange('composition', e.target.value)}
                    className={`w-full text-xs font-mono rounded-lg border px-3 py-2 focus:outline-none transition-all ${getInputStyles(true)}`}
                    placeholder="ex: 80% Cotton 20% Poly"
                  />
                </div>

                {/* Row 2 */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-amber-500 uppercase font-semibold">Destination ★</label>
                  <input
                    type="text"
                    value={meta.destination}
                    onChange={(e) => handleMetaChange('destination', e.target.value)}
                    className={`w-full text-xs font-mono rounded-lg border px-3 py-2 focus:outline-none transition-all ${getInputStyles(true)}`}
                    placeholder="ex: New York"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Fichier Export</label>
                  <input
                    type="text"
                    value={meta.filename}
                    onChange={(e) => handleMetaChange('filename', e.target.value)}
                    className={`w-full text-xs font-mono rounded-lg border px-3 py-2 focus:outline-none transition-all ${getInputStyles()}`}
                    placeholder="Nom automatique"
                  />
                </div>

                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Couleur(s) (Auto)</label>
                  <input
                    type="text"
                    value={colors.map(c => c.nom).filter(Boolean).join(', ')}
                    disabled
                    className={`w-full text-xs font-mono rounded-lg border px-3 py-2 font-medium opacity-70 ${
                      darkMode ? 'bg-[#0F0F12] border-white/10 text-white' : 'bg-slate-100 border-slate-350 text-[#ff5000]'
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Quantité Totale (Auto)</label>
                  <input
                    type="text"
                    value={meta.qty}
                    disabled
                    className={`w-full text-xs font-mono rounded-lg border px-3 py-2 font-medium opacity-70 ${
                      darkMode ? 'bg-[#0F0F12] border-white/10 text-white' : 'bg-slate-100 border-slate-350 text-emerald-600'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className={`text-[10px] font-mono flex items-center gap-1 pt-1 ${darkMode ? 'text-white/60' : 'text-amber-600'}`}>
              <Info className="w-3.5 h-3.5" />
              <span className={`font-bold ${darkMode ? 'text-amber-200' : 'text-amber-800'}`}>★ = Paramètres requis demandés par le tableau de colisage client.</span>
            </div>
          </div>
        </div>
      </motion.div>
    )}

    {activeInputTab === 'strategy' && (
      <motion.div
        key="strategy-section"
        initial={{ opacity: 0, x: 15 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -15 }}
        transition={{ duration: 0.15 }}
      >
        {/* PACKING STRATEGY FRAME */}
                  <div className={`rounded-2xl border p-6 ${
                    darkMode ? 'bg-[#0F0F12] border-white/10 shadow-lg shadow-black/20 text-white' : 'bg-white border-slate-200 shadow-sm'
                  } space-y-5 transition-all duration-300`}>
                    
                    {/* Elegant Document Manifest look */}
                    <div className="flex items-center justify-between border-b pb-4 border-dashed border-slate-200 dark:border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-5 rounded-md ${darkMode ? 'bg-white' : 'bg-gradient-to-b from-purple-500 to-indigo-600'}`} />
                        <div>
                          <h2 className={`text-xs font-bold font-mono tracking-wider ${darkMode ? 'text-slate-100' : 'text-slate-800'} uppercase`}>
                            ⚙️ CONFIGURATION DES ALGORITHMES & MODES D'EMBALLAGE
                          </h2>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wide">
                            Calcul optimisé de la répartition par carton solide ou mixte intelligent (Dossier colisage)
                          </p>
                        </div>
                      </div>
                      <span className="hidden sm:inline-block px-2.5 py-1 text-[9px] font-mono rounded-lg border border-slate-200 dark:border-slate-800 text-slate-450 uppercase font-black tracking-wider bg-slate-50 dark:bg-slate-900/40">
                        OPT-ENG-V2
                      </span>
                    </div>

                    <div className="space-y-4 pt-1">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Solid Mode card */}
              <div
                onClick={() => handleSelectPackingMode('strict_solide')}
                className={`p-4 rounded-xl border-2 text-left cursor-pointer transition-all flex items-start gap-3 ${
                  globalPackingMode === 'strict_solide'
                    ? (darkMode ? 'border-white bg-white/5 text-white' : 'border-[#ff5000] bg-[#ff5000]/5 text-[#ff5000]')
                    : (darkMode ? 'border-white/10 bg-[#0F0F12] text-white/50 hover:border-white/20 hover:text-white' : 'border-slate-350 bg-slate-50 text-slate-500 hover:border-slate-400')
                }`}
              >
                <div className={`p-2.5 rounded-lg text-white ${darkMode ? 'bg-white/10 text-white' : 'bg-[#ff5000]'}`}>
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-xs font-bold font-mono tracking-tight uppercase ${darkMode ? 'text-white' : 'text-slate-800'}`}>Solid Pack Strict</h3>
                  <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-white/60' : 'text-slate-400'}`}>
                    Mode Colisage Solide. Chaque carton contient exclusivement des pièces d'une seule et unique taille.
                  </p>
                </div>
              </div>

              {/* Mixed Mode card */}
              <div
                onClick={() => handleSelectPackingMode('mixte_autorise')}
                className={`p-4 rounded-xl border-2 text-left cursor-pointer transition-all flex items-start gap-3 ${
                  globalPackingMode === 'mixte_autorise'
                    ? (darkMode ? 'border-white bg-white/5 text-white' : 'border-purple-500 bg-purple-500/5 text-purple-600')
                    : (darkMode ? 'border-white/10 bg-[#0F0F12] text-white/50 hover:border-white/20 hover:text-white' : 'border-slate-350 bg-slate-50 text-slate-500 hover:border-slate-400')
                }`}
              >
                <div className={`p-2.5 rounded-lg text-white ${darkMode ? 'bg-white/10 text-white' : 'bg-purple-500'}`}>
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-xs font-bold font-mono tracking-tight uppercase ${darkMode ? 'text-white' : 'text-slate-800'}`}>Mixed Pack Autorisé</h3>
                  <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-white/60' : 'text-slate-400'}`}>
                    Les fragments restants sont intelligemment regroupés dans des cartons mixtes contenant plusieurs tailles.
                  </p>
                </div>
              </div>

              {/* Unique mixed config */}
              <div className={`rounded-xl p-4 flex flex-col justify-between border ${
                darkMode ? 'bg-[#0F0F12] border-white/10 text-white' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-mono font-semibold uppercase ${darkMode ? 'text-white/90' : 'text-slate-600'}`}>Forcer 1 carton unique</span>
                  <button
                    onClick={() => {
                      const val = !forceSingleCarton;
                      setForceSingleCarton(val);
                      setHasGenerated(false);
                      if (hasGenerated) {
                        autoRecalculateResults(globalPackingMode, val, maxSizesPerBox, forceSubCapSolidInMixed, colors);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider transition-all cursor-pointer ${
                      forceSingleCarton
                        ? (darkMode ? 'bg-white text-black border border-white' : 'bg-amber-500/10 text-amber-600 border border-amber-500')
                        : (darkMode ? 'bg-white/5 text-white/45 border border-white/10' : 'bg-slate-200 text-slate-500 border border-slate-300')
                    }`}
                  >
                    {forceSingleCarton ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Si activé, toutes les couleurs et tailles calculées sont injectées dans un unique et seul carton.
                </p>
              </div>
            </div>

            {/* Variable sizes & options mixed selection */}
            <AnimatePresence>
              {globalPackingMode === 'mixte_autorise' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div className={`border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 ${
                    darkMode ? 'bg-[#0F0F12] border-white/10' : 'bg-purple-500/5 border-purple-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono font-semibold ${darkMode ? 'text-white/80' : 'text-purple-600'}`}>
                        Max tailles différentes par carton mixte :
                      </span>
                      <div className="flex gap-2">
                        {[2, 3, 4, 99].map(num => (
                          <button
                            key={num}
                            onClick={() => {
                              setMaxSizesPerBox(num);
                              setHasGenerated(false);
                              if (hasGenerated) {
                                autoRecalculateResults(globalPackingMode, forceSingleCarton, num, forceSubCapSolidInMixed, colors);
                              }
                            }}
                            className={`px-3.5 py-1 text-xs font-mono font-bold rounded-lg cursor-pointer transition-all ${
                              maxSizesPerBox === num
                                ? (darkMode ? 'bg-white text-black border border-white' : 'bg-purple-500 border border-purple-500 text-white')
                                : (darkMode ? 'bg-white/5 border border-white/10 text-white/50' : 'bg-slate-100 border border-slate-300 text-slate-500')
                            }`}
                          >
                            {num === 99 ? 'Toutes' : `${num} tailles`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Option Qty inférieure au nombre pcs par carton */}
                  <div className={`border rounded-lg p-3.5 flex items-center justify-between gap-4 ${
                    darkMode ? 'bg-[#0F0F12] border-white/10' : 'bg-purple-500/5 border-purple-200'
                  }`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-bold uppercase tracking-tight ${darkMode ? 'text-white/90' : 'text-slate-800'}`}>
                          Forcer carton plein si Qty &lt; Pcs/Carton
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${darkMode ? 'bg-white/10 text-white/90' : 'bg-purple-500/20 text-purple-600'}`}>
                          Option Mixte
                        </span>
                      </div>
                      <p className={`text-[11px] mt-1 ${darkMode ? 'text-white/60' : 'text-slate-500'}`}>
                        Si activé, une quantité totale inférieure à la capacité max d&apos;un carton n&apos;est pas mixée et constitue un carton solide à part. Si désactivé, elle est envoyée dans les cartons mixtes (LAST).
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const val = !forceSubCapSolidInMixed;
                        setForceSubCapSolidInMixed(val);
                        setHasGenerated(false);
                        if (hasGenerated) {
                          autoRecalculateResults(globalPackingMode, forceSingleCarton, maxSizesPerBox, val, colors);
                        }
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer shrink-0 ${
                        forceSubCapSolidInMixed
                          ? (darkMode ? 'bg-white text-black border border-white' : 'bg-purple-500 text-white border border-purple-400')
                          : (darkMode ? 'bg-white/5 text-white/40 border border-white/10' : 'bg-slate-200 text-slate-500 border border-slate-300')
                      }`}
                    >
                      {forceSubCapSolidInMixed ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 🔥 Assistant de Répartition de Quantités */}
            <div className={`rounded-xl border p-5 ${darkMode ? 'bg-[#0F0F12] border-white/10 shadow-md shadow-black/10' : 'bg-slate-50 border-slate-200 shadow-xs'} space-y-3.5 mt-5`}>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-4.5 rounded-sm ${darkMode ? 'bg-white' : 'bg-indigo-500'}`} />
                <h3 className={`text-xs font-bold font-mono uppercase tracking-wider ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                  🔢 Assistant de répartition automatique par ratio/courbe
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Distribuez automatiquement une quantité globale sur toutes les tailles de la couleur sélectionnée.
              </p>
              
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Appliquer sur la couleur :</span>
                  <select
                    value={activeColorIdx}
                    onChange={(e) => setActiveColorIdx(parseInt(e.target.value, 10))}
                    className={`p-2 border rounded-lg text-xs font-sans outline-none transition-all cursor-pointer ${
                      darkMode
                        ? 'border-white/10 bg-[#0F0F12] text-white hover:border-white/20 focus:border-white focus:ring-1 focus:ring-white/10'
                        : 'border-slate-330 bg-white text-slate-800 hover:border-slate-400 focus:border-[#ff5000] focus:ring-1 focus:ring-[#ff5000]/20 shadow-xs'
                    }`}
                  >
                    {colors.map((c, idx) => (
                      <option key={idx} value={idx}>
                        {c.nom || `COULEUR ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Quantité totale à répartir :</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="ex: 1000"
                    value={repartTotalQty}
                    onChange={(e) => setRepartTotalQty(e.target.value)}
                    className={`w-32 p-2 text-xs font-mono font-bold rounded-lg border outline-none transition-all ${
                      darkMode 
                        ? 'bg-[#0F0F12] border-white/10 text-white focus:border-white focus:ring-1 focus:ring-white/10' 
                        : 'bg-white border-slate-300 text-slate-800 focus:border-indigo-550 focus:ring-1 focus:ring-indigo-550/15 hover:border-slate-400 shadow-xs'
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Mode de répartition :</span>
                  <select
                    value={repartMode}
                    onChange={(e) => setRepartMode(e.target.value as any)}
                    className={`p-2 border rounded-lg text-xs font-sans font-bold outline-none cursor-pointer transition-all ${
                      darkMode
                        ? 'bg-[#0F0F12] border-white/10 text-slate-200 focus:border-white focus:ring-1'
                        : 'bg-white border-slate-200 text-slate-700 shadow-xs'
                    }`}
                  >
                    <option value="equal">📊 Égalitaire</option>
                    <option value="ratio">🔢 Ratio personnalisé</option>
                    <option value="bell">📈 Courbe en Cloche</option>
                  </select>
                </div>

                {repartMode === 'ratio' && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Modèle de ratio :</span>
                    <input
                      type="text"
                      placeholder="ex: 1:2:2:1"
                      value={repartRatioPattern}
                      onChange={(e) => setRepartRatioPattern(e.target.value)}
                      className={`w-36 p-2 text-xs font-mono font-bold rounded-lg border outline-none transition-all ${
                        darkMode 
                          ? 'bg-[#0F0F12] border-white/10 text-white focus:border-white focus:ring-1' 
                          : 'bg-white border-slate-300 text-slate-800 focus:border-indigo-550 hover:border-slate-400 shadow-xs'
                      }`}
                      title="Entrez un ratio séparé par des double-points ou des tirets"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5 self-end">
                  <button
                    type="button"
                    onClick={handleApplyRepartition}
                    className={`px-4 py-2 font-sans text-xs font-black rounded-lg cursor-pointer transition-all uppercase tracking-wide h-[38px] flex items-center justify-center border ${
                      darkMode 
                        ? 'bg-white hover:bg-white/90 text-black border-white' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-650/10 border-indigo-500'
                    }`}
                  >
                    Répartir les pièces
                  </button>
                </div>
              </div>
            </div>
                </motion.div>
              )}

              {activeInputTab === 'colors' && (() => {
                const activeColorConfig = colors[activeColorIdx];
                const activeColorResult = activeColorConfig ? computeColorResult(
                  activeColorConfig,
                  globalPackingMode,
                  forceSingleCarton,
                  maxSizesPerBox,
                  activeColorIdx,
                  forceSubCapSolidInMixed
                ) : null;
                return (
                  <motion.div
                    key="colors-section"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* SPREADSHEET COLORS EDITOR */}
                    <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-[#0F0F12] border-white/10 shadow-lg shadow-black/20 text-white' : 'bg-white border-slate-200 shadow-sm'} space-y-5 transition-all duration-300`}>
                      
                      {/* Elegant Document Manifest look */}
                      <div className="flex items-center justify-between border-b pb-4 border-dashed border-slate-200 dark:border-slate-800/80 flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-5 rounded-md ${darkMode ? 'bg-white' : 'bg-gradient-to-b from-[#ff5000] to-orange-600'}`} />
                          <div>
                            <h2 className={`text-xs font-bold font-mono tracking-wider ${darkMode ? 'text-slate-100' : 'text-slate-800'} uppercase`}>
                              ⌨️ GRILLE DE SAISIE DE COLISAGE ET MULTI-COULEURS
                            </h2>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wide">
                              Contrôle précis et édition matricielle des tailles, SKUs, poids et capacités
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 text-[10px] font-sans font-bold">
                          <span className="text-xs">⚡</span>
                          <span>Support copier-coller Excel (Ctrl+V) actif sur la grille</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* Config workspace tabs */}
                        <div className={`flex flex-wrap items-center justify-between gap-3 p-2 border rounded-xl transition-all duration-300 ${
                          darkMode ? 'bg-[#0F0F12] border-white/10' : 'bg-slate-100/60 border-slate-200'
                        }`}>
                          <div className="flex flex-wrap gap-1.5">
                            {colors.map((c, idx) => {
                              // Cdiscount dynamic color search matching logic
                              const query = searchQuery.toLowerCase().trim();
                              const isMatch = !query || 
                                c.nom.toLowerCase().includes(query) ||
                                c.tailles.some(t => t.toLowerCase().includes(query)) ||
                                c.tailles.some(t => (c.sizes[t]?.sku || '').toLowerCase().includes(query));

                              if (!isMatch) return null;

                              return (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setActiveColorIdx(idx);
                                  }}
                                  className={`px-3.5 py-2 rounded-lg text-xs font-sans font-bold transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                                    activeColorIdx === idx
                                      ? darkMode
                                        ? 'bg-white border border-white text-black font-black shadow-md shadow-black/10'
                                        : 'bg-[#E51B22]/5 border border-[#E51B22] text-[#E51B22] font-extrabold shadow-sm'
                                      : darkMode
                                        ? 'bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:border-white/20'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-950 hover:border-slate-350 shadow-xs'
                                  }`}
                                >
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                                  <span className="truncate max-w-[115px]">{c.nom || `COULEUR ${idx + 1}`}</span>
                                  {(() => {
                                    const sum = c.tailles.reduce((acc, t) => acc + (c.sizes[t]?.qtyTot || 0), 0);
                                    if (sum > 0) {
                                      return (
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono leading-none ${
                                          activeColorIdx === idx
                                            ? (darkMode ? 'bg-black text-white font-black' : 'bg-[#E51B22]/20 text-[#E51B22] font-black')
                                            : 'bg-slate-500/10 text-slate-400'
                                        }`}>
                                          {sum}
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={handleAddColorTab}
                              className={`px-3 py-1.5 font-sans font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 ${
                                darkMode
                                  ? 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'
                                  : 'bg-slate-800 hover:bg-slate-900 border border-slate-700 text-white shadow-md shadow-slate-800/10'
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5" /> ＋ Couleur
                            </button>
                            <button
                              onClick={handleRemoveActiveColorTab}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                darkMode
                                  ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-red-400'
                                  : 'bg-slate-800 hover:bg-slate-900 border border-slate-700 text-white shadow-md shadow-slate-800/10'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> － Couleur
                            </button>
                            <button
                              onClick={() => setIsSmartImportOpen(true)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                darkMode
                                  ? 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'
                                  : 'bg-slate-800 hover:bg-slate-900 border border-slate-700 text-white shadow-md shadow-slate-800/10'
                              }`}
                              title="Saisie ultra-rapide par copier-coller de texte simple ou de tableaux Excel"
                            >
                              <Sparkles className="w-3.5 h-3.5" /> ⚡ Saisie Rapide
                            </button>
                          </div>
                        </div>

              {/* Active Tab Workspace Panel */}
              {colors[activeColorIdx] && (
                <div className="space-y-4 pt-1 animate-fadeIn">
                  <div className={`flex flex-wrap items-center gap-4 justify-between border rounded-xl p-4 transition-all duration-300 ${
                    darkMode ? 'bg-[#0F0F12] border-white/10' : 'bg-[#f4f6fb]/50 border-slate-200'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-md border border-slate-700" style={{ backgroundColor: PALETTE[activeColorIdx % PALETTE.length] }} />
                    <input
                      type="text"
                      value={colors[activeColorIdx].nom}
                      onChange={(e) => handleUpdateColorName(e.target.value)}
                      className={`text-sm font-mono font-bold uppercase py-1 border-b border-dashed focus:border-white bg-transparent focus:outline-none transition-colors ${
                        darkMode ? 'border-white/10 text-white' : 'border-slate-300 text-slate-800'
                      }`}
                      placeholder="NOM COULEUR"
                    />
                    <span className="text-[10px] text-slate-500 font-mono italic">(Saisissez pour renommer)</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">MODE :</span>
                    <button
                      onClick={() => handleUpdateTabMode('strict_solide')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                        colors[activeColorIdx].mode === 'strict_solide'
                          ? (darkMode ? 'bg-white border-white text-black font-black' : 'bg-[#ff5000] border-[#ff5000] text-white shadow-md')
                          : darkMode
                            ? 'bg-[#0F0F12] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs'
                      }`}
                    >
                      📦 SOLID
                    </button>
                    <button
                      onClick={() => handleUpdateTabMode('mixte_autorise')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                        colors[activeColorIdx].mode === 'mixte_autorise'
                          ? (darkMode ? 'bg-white border-white text-black font-black' : 'bg-purple-500 border-purple-500 text-white shadow-md')
                          : darkMode
                            ? 'bg-[#0F0F12] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs'
                      }`}
                    >
                      🔀 MIXED
                    </button>
                    <button
                      onClick={() => handleUpdateTabMode('inherit')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                        colors[activeColorIdx].mode === 'inherit'
                          ? (darkMode ? 'bg-white/10 border border-white/20 text-white font-extrabold' : 'bg-amber-500/15 border border-amber-500 text-amber-500 font-extrabold')
                          : darkMode
                            ? 'bg-[#0F0F12] border-white/10 text-slate-500 hover:text-slate-350'
                            : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700 shadow-xs'
                      }`}
                    >
                      ⚙️ Global
                    </button>

                    <div className={`h-5 w-px mx-1.5 hidden lg:block ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`} />

                    {/* 🔥 2. ACCELERATEUR DE SÉLECTION DE GAMME RAPIDE DE TAILLES */}
                    <div className={`flex flex-wrap items-center gap-2 p-1 rounded-xl border ${darkMode ? 'border-white/10 bg-white/5' : 'border-[#ff5000]/20 bg-[#ff5000]/5'}`}>
                      <span className="flex items-center gap-1 pl-1 text-[11px] font-mono font-bold text-slate-400">
                        <Zap className={`w-3.5 h-3.5 animate-pulse ${darkMode ? 'text-white' : 'text-[#ff5000]'}`} />
                        Gamme :
                      </span>
                      <input
                        type="text"
                        placeholder="ex: XS - 2XL ou 1-6"
                        value={sizesQuickRangeInput}
                        onChange={(e) => setSizesQuickRangeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleApplySizesQuickRange(sizesQuickRangeInput);
                          }
                        }}
                        className={`w-32 px-2 py-1 text-xs font-mono font-bold rounded-lg border outline-none text-center transition-all ${
                          darkMode 
                            ? 'bg-[#0F0F12] border-white/10 text-white focus:border-white focus:ring-1 focus:ring-white/10' 
                            : 'bg-white border-slate-300 text-slate-800 focus:border-[#ff5000] focus:ring-1 focus:ring-[#ff5000]/15 hover:border-slate-400'
                        }`}
                        title="Entrez par ex. XS - 2XL, 1 - 6, 36 - 46 ou A - F puis pressez Entrée"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplySizesQuickRange(sizesQuickRangeInput)}
                        className={`px-2.5 py-1 font-sans text-xs font-black rounded-lg cursor-pointer transition-all uppercase tracking-wide border ${
                          darkMode ? 'bg-white text-black border-white hover:bg-white/90' : 'bg-[#ff5000] hover:bg-[#ff5000]/90 text-white border-transparent'
                        }`}
                      >
                        Générer
                      </button>
                    </div>

                    <div className={`h-5 w-px mx-1.5 hidden sm:block ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`} />

                    <button
                      onClick={handleAddSizeColumn}
                      className={`px-3 py-1.5 font-mono text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 border ${
                        darkMode
                          ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                          : 'bg-[#ff5000]/10 hover:bg-[#ff5000]/20 border border-[#ff5000]/30 text-[#ff5000]'
                      }`}
                      title="Ajouter une colonne de taille au tableau"
                    >
                      <Plus className="w-3.5 h-3.5" /> ＋ Taille
                    </button>
                    <button
                      onClick={handleRemoveLastSizeColumn}
                      className={`px-3 py-1.5 font-mono text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 border ${
                        darkMode
                          ? 'bg-white/5 hover:bg-white/10 border-white/10 text-red-400'
                          : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500'
                      }`}
                      title="Retirer la dernière colonne de taille"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> － Taille
                    </button>
                  </div>
                </div>

                {/* Quick Models/Presets Application section */}
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 border rounded-xl p-4 transition-all duration-300 ${
                  darkMode ? 'bg-[#0F0F12] border-white/10' : 'bg-[#f8fafc] border-slate-200'
                }`}>
                  {/* Category 1: Weight Per Piece */}
                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[10px] font-mono uppercase tracking-wider font-bold block ${
                      darkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      ⚖️ Poids par pièce (Appliquer à tous)
                    </label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleApplyPieceWeightModel(e.target.value);
                          e.target.value = ""; // reset selection
                        }
                      }}
                      className={`w-full p-2 border rounded-lg text-xs font-mono outline-none transition-all cursor-pointer ${
                        darkMode
                          ? 'border-white/10 bg-[#0F0F12] text-white hover:border-white/20 focus:border-white focus:ring-1 focus:ring-white/10'
                          : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 focus:border-[#ff5000] focus:ring-1 focus:ring-[#ff5000]/20'
                      }`}
                    >
                      <option value="">-- Sélectionner Poids Pièce --</option>
                      {db.weight_piece_models.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name} ({m.wPiece} KG)
                        </option>
                      ))}
                    </select>
                    {colors[activeColorIdx]?.selectedPieceWeightModelName && (
                      <div className="text-[11px] font-mono text-emerald-500 font-bold flex items-center gap-1 bg-emerald-500/5 px-2.5 py-1 rounded border border-emerald-500/15 font-sans">
                        <span className="scale-90 pb-0.5">🟢</span>
                        <span>Modèle : </span>
                        <span className="underline text-emerald-600 dark:text-emerald-300">{colors[activeColorIdx].selectedPieceWeightModelName}</span>
                      </div>
                    )}
                  </div>

                  {/* Category 2: Empty Carton Weight */}
                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[10px] font-mono uppercase tracking-wider font-bold block ${
                      darkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      📦 Poids carton vide (Appliquer à tous)
                    </label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleApplyCartonWeightModel(e.target.value);
                          e.target.value = ""; // reset selection
                        }
                      }}
                      className={`w-full p-2 border rounded-lg text-xs font-mono outline-none transition-all cursor-pointer ${
                        darkMode
                          ? 'border-white/10 bg-[#0F0F12] text-white hover:border-white/20 focus:border-white focus:ring-1 focus:ring-white/10'
                          : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 focus:border-[#ff5000] focus:ring-1 focus:ring-[#ff5000]/20'
                      }`}
                    >
                      <option value="">-- Sélectionner Poids Carton --</option>
                      {db.weight_carton_models.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name} ({m.wCarton} KG)
                        </option>
                      ))}
                    </select>
                    {colors[activeColorIdx]?.selectedCartonWeightModelName && (
                      <div className="text-[11px] font-mono text-emerald-500 font-bold flex items-center gap-1 bg-emerald-500/5 px-2.5 py-1 rounded border border-emerald-500/15 font-sans">
                        <span className="scale-90 pb-0.5">🟢</span>
                        <span>Modèle : </span>
                        <span className="underline text-emerald-600 dark:text-emerald-300">{colors[activeColorIdx].selectedCartonWeightModelName}</span>
                      </div>
                    )}
                  </div>

                  {/* Category 3: Carton Dimensions */}
                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[10px] font-mono uppercase tracking-wider font-bold block ${
                      darkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      📐 Dimensions carton (Appliquer à tous)
                    </label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleApplyDimModel(e.target.value);
                          e.target.value = ""; // reset selection
                        }
                      }}
                      className={`w-full p-2 border rounded-lg text-xs font-mono outline-none transition-all cursor-pointer ${
                        darkMode
                          ? 'border-white/10 bg-[#0F0F12] text-white hover:border-white/20 focus:border-white focus:ring-1 focus:ring-white/10'
                          : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 focus:border-[#ff5000] focus:ring-1 focus:ring-[#ff5000]/20'
                      }`}
                    >
                      <option value="">-- Sélectionner Dimensions --</option>
                      {db.dim_models.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name} ({m.L}x{m.l}x{m.h} cm)
                        </option>
                      ))}
                    </select>
                    {colors[activeColorIdx]?.selectedDimModelName && (
                      <div className="text-[11px] font-mono text-emerald-500 font-bold flex items-center gap-1 bg-emerald-500/5 px-2.5 py-1 rounded border border-emerald-500/15 font-sans">
                        <span className="scale-90 pb-0.5">🟢</span>
                        <span>Modèle : </span>
                        <span className="underline text-emerald-600 dark:text-emerald-300">{colors[activeColorIdx].selectedDimModelName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Real-time cargo statistics estimates to see live calculations as you update numbers */}
                {activeColorResult && (
                  <div className={`grid grid-cols-2 lg:grid-cols-5 gap-3 p-3.5 border rounded-xl transition-all duration-300 ${
                    darkMode ? 'bg-[#0F0F12] border-white/10' : 'bg-[#f0f4f8] border-slate-200'
                  }`}>
                    <div className={`p-2 rounded-lg border flex flex-col justify-center ${
                      darkMode ? 'bg-[#15151A] border-white/5' : 'bg-white border-slate-200 shadow-xs'
                    }`}>
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1">
                        👕 Total Pièces
                      </span>
                      <span className={`text-xs font-bold font-mono mt-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {activeColorResult.totals.p} pcs
                      </span>
                    </div>

                    <div className={`p-2 rounded-lg border flex flex-col justify-center ${
                      darkMode ? 'bg-[#15151A] border-white/5' : 'bg-white border-slate-200 shadow-xs'
                    }`}>
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1">
                        📦 Cartons Projetés
                      </span>
                      <span className={`text-xs font-bold font-mono mt-0.5 ${darkMode ? 'text-white' : 'text-amber-600'}`}>
                        {activeColorResult.totals.c} {activeColorResult.totals.c > 1 ? 'ctns' : 'ctn'}
                      </span>
                    </div>

                    <div className={`p-2 rounded-lg border flex flex-col justify-center ${
                      darkMode ? 'bg-[#15151A] border-white/5' : 'bg-white border-slate-200 shadow-xs'
                    }`}>
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1">
                        ⚖️ Poids Net Estimé
                      </span>
                      <span className={`text-xs font-bold font-mono mt-0.5 ${darkMode ? 'text-white' : 'text-teal-600'}`}>
                        {activeColorResult.totals.n.toFixed(2)} KG
                      </span>
                    </div>

                    <div className={`p-2 rounded-lg border flex flex-col justify-center ${
                      darkMode ? 'bg-[#15151A] border-white/5' : 'bg-white border-slate-200 shadow-xs'
                    }`}>
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1">
                        🏋️ Poids Brut Estimé
                      </span>
                      <span className={`text-xs font-bold font-mono mt-0.5 ${darkMode ? 'text-white' : 'text-red-500'}`}>
                        {activeColorResult.totals.g.toFixed(2)} KG
                      </span>
                    </div>

                    <div className={`p-2 rounded-lg border flex flex-col justify-center col-span-2 lg:col-span-1 ${
                      darkMode ? 'bg-[#15151A] border-white/5' : 'bg-white border-slate-200 shadow-xs'
                    }`}>
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1">
                        📐 Cube Global Vol
                      </span>
                      <span className={`text-xs font-bold font-mono mt-0.5 ${darkMode ? 'text-white' : 'text-blue-600'}`}>
                        {activeColorResult.totals.v.toFixed(4)} m³
                      </span>
                    </div>
                  </div>
                )}

                <div className={`overflow-x-auto rounded-xl border transition-all duration-300 ${
                  darkMode ? 'border-white/10 bg-[#0F0F12]' : 'border-slate-200 bg-slate-50/40 shadow-sm'
                }`}>
                  <table className="w-full text-xs text-center border-collapse">
                    <thead>
                      <tr className={`${
                        darkMode ? 'bg-white/5 text-slate-400 border-white/10' : 'bg-white text-slate-800 border-slate-200'
                      } font-mono font-bold border-b`}>
                        <th className={`py-3 px-4 text-left border-r font-sans tracking-wide ${
                          darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-800'
                        }`}>
                          PARAMÈTRE DE COLISAGE
                        </th>
                        {colors[activeColorIdx].tailles.map((sz, idx) => (
                          <th key={idx} className={`border-r col-sizes-cells p-1.5 ${darkMode ? 'border-white/10' : 'border-slate-200 bg-white text-slate-800'}`}>
                            <input
                              type="text"
                              value={sz}
                              onChange={(e) => handleSizeHeaderChange(idx, e.target.value)}
                              className={`w-full text-center border font-mono font-bold px-2 py-1.5 rounded-md focus:outline-none uppercase transition-all ${
                                darkMode
                                  ? 'bg-white/5 border-white/10 text-white focus:border-white focus:ring-1 focus:ring-white/10 hover:border-white/20'
                                  : 'bg-white border-slate-200 text-slate-800 focus:border-[#ff5000] focus:ring-1 focus:ring-[#ff5000]/10 hover:border-slate-300 hover:shadow-xs'
                              }`}
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`divide-y font-mono ${darkMode ? 'divide-white/10' : 'divide-slate-200'}`}>
                      {/* Row 1: QTY Totale */}
                      <tr className={darkMode ? '' : 'hover:bg-slate-50/50'}>
                        <td className={`py-2 px-4 text-left font-sans font-semibold border-r ${
                          darkMode ? 'border-white/10 bg-white/5 text-slate-300' : 'border-slate-200 bg-slate-100/30 text-slate-755'
                        }`}>
                          <div className="flex flex-col">
                            <span>Quantité Totale à Emballer</span>
                            <span className="text-[10px] text-slate-500 font-normal italic font-mono">Presse-papiers Excel tolléré</span>
                          </div>
                        </td>
                        {colors[activeColorIdx].tailles.map((sz) => {
                          const qTot = colors[activeColorIdx].sizes[sz]?.qtyTot || 0;
                          const c = colors[activeColorIdx].sizes[sz]?.cap || 0;
                          const lastPcs = qTot - (c > 0 ? Math.floor(qTot / c) * c : 0);
                          let remColor: any = null;
                          if (lastPcs > 0 && activeColorResult) {
                            const remRow = activeColorResult.rows.find(row => row.sizes[sz] > 0 && isRemainderRow(row, activeColorConfig));
                            if (remRow) {
                              remColor = getRemainderRowColor(remRow, activeColorResult, activeColorConfig, darkMode);
                            }
                          }

                          return (
                            <td key={sz} className={`p-1 border-r col-sizes-cells ${darkMode ? 'border-white/10' : 'border-slate-200'}`} style={remColor ? { backgroundColor: remColor.bg + '1a' } : undefined}>
                              <input
                                type="number"
                                min="0"
                                value={colors[activeColorIdx].sizes[sz]?.qtyTot || ''}
                                onChange={(e) => handleUpdateSizeCell(sz, 'qtyTot', e.target.value)}
                                onPaste={(e) => handlePasteGrid2D(e, sz, 'qtyTot')}
                                className={`w-full text-center py-1.5 font-bold rounded-md bg-transparent border focus:outline-none transition-all ${
                                  remColor
                                    ? ''
                                    : (darkMode
                                      ? 'bg-[#15151A] border-white/10 focus:border-white focus:ring-1 focus:ring-white/10 text-white'
                                      : 'bg-white border-slate-200 focus:border-[#ff5000] focus:ring-1 focus:ring-[#ff5000]/10 text-slate-855 hover:border-slate-300')
                                }`}
                                style={remColor ? { backgroundColor: remColor.bg, color: remColor.text, borderColor: remColor.bg } : undefined}
                                placeholder="0"
                              />
                            </td>
                          );
                        })}
                      </tr>

                      {/* Row 2: Cap */}
                      <tr className={darkMode ? '' : 'hover:bg-slate-50/50'}>
                        <td className={`py-2 px-4 text-left font-sans font-semibold border-r ${
                          darkMode ? 'border-white/10 bg-white/5 text-slate-300' : 'border-slate-200 bg-slate-100/30 text-slate-755'
                        }`}>
                          <div className="flex flex-col gap-1.5">
                            <span>Pièces Max par Carton (Cap)</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                placeholder="Tous"
                                className={`w-14 px-1.5 py-0.5 text-center text-[10px] rounded border font-mono font-semibold leading-normal ${
                                  darkMode 
                                    ? 'bg-[#15151A] border-white/10 text-white focus:border-white' 
                                    : 'bg-white border-slate-300 text-[#ff5000] focus:border-[#ff5000]'
                                } focus:outline-none`}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = (e.currentTarget as HTMLInputElement).value;
                                    const num = parseInt(val, 10);
                                    if (num > 0) {
                                      handleUpdateActiveColorAllSizes('cap', val);
                                      (e.currentTarget as HTMLInputElement).value = '';
                                      triggerToast(`⚡ Capacité de ${num} pcs appliquée à toutes les tailles !`, 'success');
                                    }
                                  }
                                }}
                              />
                              <span className="text-[9px] text-slate-500 font-mono font-medium">⏎ Appliquer</span>
                            </div>
                          </div>
                        </td>
                        {colors[activeColorIdx].tailles.map((sz) => (
                          <td key={sz} className={`p-1 border-r col-sizes-cells ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                            <input
                              type="number"
                              min="1"
                              value={colors[activeColorIdx].sizes[sz]?.cap || ''}
                              onChange={(e) => handleUpdateSizeCell(sz, 'cap', e.target.value)}
                              onPaste={(e) => handlePasteGrid2D(e, sz, 'cap')}
                              className={`w-full text-center py-1.5 font-bold rounded-md bg-transparent border focus:outline-none transition-all ${
                                darkMode
                                  ? 'bg-[#15151A] border-white/10 focus:border-white focus:ring-1 focus:ring-white/10 text-slate-300'
                                  : 'bg-white border-slate-200 focus:border-[#ff5000] focus:ring-1 focus:ring-[#ff5000]/10 text-slate-600 hover:border-slate-300'
                              }`}
                              placeholder="25"
                            />
                          </td>
                        ))}
                      </tr>

                      {/* Row 3: SKU per size */}
                      <tr className={darkMode ? '' : 'hover:bg-slate-50/50'}>
                        <td className={`py-2 px-4 text-left font-sans font-semibold border-r ${
                          darkMode ? 'border-white/10 bg-white/5 text-white' : 'border-slate-200 bg-emerald-50/10 text-emerald-800'
                        }`}>
                          <div className="flex flex-col gap-1.5">
                            <span>SKU spécifique (facultatif)</span>
                            <div className="flex items-center gap-1.5 font-normal text-slate-500">
                              <input
                                type="text"
                                placeholder="Prefix"
                                className={`w-16 px-1.5 py-0.5 text-center text-[10px] rounded border font-mono font-semibold leading-normal ${
                                  darkMode 
                                    ? 'bg-[#15151A] border-white/10 text-white focus:border-white' 
                                    : 'bg-white border-slate-300 text-emerald-650 focus:border-emerald-500'
                                } focus:outline-none`}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = (e.currentTarget as HTMLInputElement).value;
                                    if (val.trim()) {
                                      handleUpdateActiveColorAllSizes('sku', val, true);
                                      (e.currentTarget as HTMLInputElement).value = '';
                                      triggerToast(`⚡ SKUs générés (ex: ${val.trim()}-${colors[activeColorIdx].tailles[0]}) !`, 'success');
                                    }
                                  }
                                }}
                              />
                              <span className="text-[9px] text-slate-500 font-mono font-medium">⏎ Remplir</span>
                            </div>
                          </div>
                        </td>
                        {colors[activeColorIdx].tailles.map((sz) => (
                          <td key={sz} className={`p-1 border-r col-sizes-cells ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                            <input
                              type="text"
                              value={colors[activeColorIdx].sizes[sz]?.sku || ''}
                              onChange={(e) => handleUpdateSizeCell(sz, 'sku', e.target.value)}
                              onPaste={(e) => handlePasteGrid2D(e, sz, 'sku')}
                              className={`w-full text-center py-1 font-mono font-semibold text-[11px] uppercase rounded-md border focus:outline-none transition-all ${
                                darkMode
                                  ? 'bg-[#15151A] border-white/10 focus:border-white focus:ring-1 focus:ring-white/10 text-slate-300'
                                  : 'bg-white border-slate-200 focus:border-[#ff5000] focus:ring-1 focus:ring-[#ff5000]/10 text-emerald-600 hover:border-slate-300'
                              }`}
                              placeholder="SKU"
                            />
                          </td>
                        ))}
                      </tr>

                      {/* Row 4: Config Button */}
                      <tr className={darkMode ? '' : 'hover:bg-slate-50/50'}>
                        <td className={`py-2.5 px-4 text-left font-sans font-semibold border-r ${
                          darkMode ? 'border-white/10 bg-white/5 text-slate-300' : 'border-slate-200 bg-slate-100/30 text-slate-600'
                        }`}>
                          Configure Gabarit (Poids/Dimensions)
                        </td>
                        {colors[activeColorIdx].tailles.map((sz) => {
                          const config = colors[activeColorIdx].sizes[sz];
                          return (
                            <td key={sz} className={`p-1.5 border-r col-sizes-cells ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                              <button
                                onClick={() => openBoxDetailsModal(sz, config)}
                                className={`px-3.5 py-1.5 rounded-md font-mono text-xs w-full cursor-pointer transition-all border ${
                                  darkMode
                                    ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs'
                                }`}
                              >
                                ✏️ Éditer
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* NEW RECAP TABLE: PROJECTION DES COLIS (FULL VS LAST) */}
                {colors[activeColorIdx] && (() => {
                  const activeColorConfig = colors[activeColorIdx];
                  const activeColorResult = computeColorResult(
                    activeColorConfig,
                    globalPackingMode,
                    forceSingleCarton,
                    maxSizesPerBox,
                    activeColorIdx,
                    forceSubCapSolidInMixed
                  );
                  
                  // Sum metrics for the TOTALE column
                  let sumQtyTot = 0;
                  let sumQtyFullCtn = 0;
                  let sumQtyFullPcs = 0;
                  let sumQtyLastPcs = 0;
                  
                  activeColorConfig.tailles.forEach(t => {
                    const qTot = activeColorConfig.sizes[t]?.qtyTot || 0;
                    const c = activeColorConfig.sizes[t]?.cap || 25;
                    const fullCtn = c > 0 ? Math.floor(qTot / c) : 0;
                    const fullPcs = fullCtn * c;
                    const lastPcs = qTot - fullPcs;
                    
                    sumQtyTot += qTot;
                    sumQtyFullCtn += fullCtn;
                    sumQtyFullPcs += fullPcs;
                    sumQtyLastPcs += lastPcs;
                  });

                  return (
                    <div className="mt-6 space-y-3">
                      <div className={`flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border ${
                        darkMode ? 'bg-white/5 border-white/10' : 'bg-[#f8f9fa] border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">📊</span>
                          <h4 className={`text-xs font-mono font-bold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                            SYNTHÈSE DE PROJECTION DES COLIS (Saisie Actuelle)
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Cartons Total pour cette couleur :</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            darkMode ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-800'
                          }`}>
                            {activeColorResult ? activeColorResult.totals.c : 0} {activeColorResult && activeColorResult.totals.c > 1 ? 'cartons' : 'carton'}
                          </span>
                        </div>
                      </div>
                      
                      <div className={`overflow-x-auto rounded-xl border transition-all duration-300 ${
                        darkMode ? 'border-white/10 bg-[#0F0F12]' : 'border-slate-200 bg-white shadow-sm'
                      }`}>
                        <table className="w-full text-xs text-center border-collapse">
                          <thead>
                            <tr className={`${
                              darkMode ? 'bg-white/5 border-white/10 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                            } font-mono font-bold border-b`}>
                              <th className={`py-3 px-4 text-left border-r font-sans tracking-wide uppercase text-[10px] font-black ${
                                darkMode ? 'border-white/10 text-slate-300' : 'border-slate-200 text-slate-800'
                              }`} style={{ width: '220px' }}>
                                INDICATION PAR COLISAGE
                              </th>
                              {activeColorConfig.tailles.map((sz) => (
                                <th key={sz} className={`p-2 border-r col-sizes-cells font-mono font-black text-xs ${
                                  darkMode ? 'border-white/10 bg-white/5 text-white' : 'border-slate-200 bg-white text-slate-800 font-bold'
                                }`}>
                                  {sz}
                                </th>
                              ))}
                              <th className={`p-2 font-mono font-black text-xs ${
                                  darkMode ? 'border-white/10 bg-white/10 text-white' : 'border-slate-200 bg-white text-slate-800 font-bold'
                              }`}>
                                TOTALE
                              </th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y font-mono font-semibold ${darkMode ? 'divide-white/10 text-slate-300' : 'divide-slate-200 text-slate-800'}`}>
                            {/* Line 1: QTY PCS TOTALE */}
                            <tr className={darkMode ? 'bg-[#0F0F12] hover:bg-white/5' : 'bg-white hover:bg-slate-50'}>
                              <td className={`py-2.5 px-4 text-left font-sans font-medium border-r ${
                                darkMode ? 'border-white/10 bg-white/5 text-slate-300' : 'border-slate-200 bg-slate-100/40 text-slate-800'
                              }`}>
                                QTY PCS TOTALE
                              </td>
                              {activeColorConfig.tailles.map((sz) => {
                                const qTot = activeColorConfig.sizes[sz]?.qtyTot || 0;
                                return (
                                  <td key={sz} className={`p-2 border-r col-sizes-cells font-black text-xs ${darkMode ? 'border-white/10 text-white' : 'border-slate-200 text-slate-800'}`}>
                                    {qTot}
                                  </td>
                                );
                              })}
                              <td className={`p-2 font-bold ${darkMode ? 'text-white bg-white/10' : 'text-emerald-500 bg-emerald-500/5'}`}>{sumQtyTot}</td>
                            </tr>

                            {/* Line 2: QTY PCS PAR CARTON */}
                            <tr className={darkMode ? 'bg-[#0F0F12] hover:bg-white/5' : 'bg-white hover:bg-slate-50'}>
                              <td className={`py-2.5 px-4 text-left font-sans font-medium border-r ${
                                darkMode ? 'border-white/10 bg-white/5 text-slate-300' : 'border-slate-200 bg-slate-100/40 text-slate-800'
                              }`}>
                                QTY PCS PAR CARTON
                              </td>
                              {activeColorConfig.tailles.map((sz) => {
                                const c = activeColorConfig.sizes[sz]?.cap || 0;
                                return (
                                  <td key={sz} className={`p-2 border-r col-sizes-cells text-slate-500 dark:text-slate-400 font-medium ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                                    {c}
                                  </td>
                                );
                              })}
                              <td className="p-2 font-medium text-slate-500 dark:text-slate-400 font-mono">—</td>
                            </tr>

                            {/* Line 3: QTY CARTON FULL */}
                            <tr className={darkMode ? 'bg-[#0F0F12] hover:bg-white/5' : 'bg-white hover:bg-slate-50'}>
                              <td className={`py-2.5 px-4 text-left font-sans font-medium border-r ${
                                darkMode ? 'border-white/10 bg-white/5 text-slate-300' : 'border-slate-200 bg-slate-100/40 text-slate-800'
                              }`}>
                                QTY CARTON FULL
                              </td>
                              {activeColorConfig.tailles.map((sz) => {
                                const qTot = activeColorConfig.sizes[sz]?.qtyTot || 0;
                                const c = activeColorConfig.sizes[sz]?.cap || 0;
                                const fullCtn = c > 0 ? Math.floor(qTot / c) : 0;
                                return (
                                  <td key={sz} className={`p-2 border-r col-sizes-cells font-semibold ${darkMode ? 'border-white/10 text-slate-250' : 'border-slate-200 text-slate-700'}`}>
                                    {fullCtn}
                                  </td>
                                );
                              })}
                              <td className={`p-2 font-black ${darkMode ? 'text-white bg-white/10' : 'text-[#ff5000] bg-[#ff5000]/5'}`}>{sumQtyFullCtn}</td>
                            </tr>

                            {/* Line 4: QTY PCS FULL TOTALE */}
                            <tr className={darkMode ? 'bg-[#0F0F12] hover:bg-white/5' : 'bg-white hover:bg-slate-50'}>
                              <td className={`py-2.5 px-4 text-left font-sans font-medium border-r ${
                                darkMode ? 'border-white/10 bg-white/5 text-slate-300' : 'border-slate-200 bg-slate-100/40 text-slate-800'
                              }`}>
                                QTY PCS FULL (TOTAL PACKÉ)
                              </td>
                              {activeColorConfig.tailles.map((sz) => {
                                const qTot = activeColorConfig.sizes[sz]?.qtyTot || 0;
                                const c = activeColorConfig.sizes[sz]?.cap || 0;
                                const fullCtn = c > 0 ? Math.floor(qTot / c) : 0;
                                const fullPcs = fullCtn * c;
                                return (
                                  <td key={sz} className={`p-2 border-r col-sizes-cells font-medium ${darkMode ? 'border-white/10 text-slate-300' : 'border-slate-200 text-slate-700'}`}>
                                    {fullPcs}
                                  </td>
                                );
                              })}
                              <td className={`p-2 font-black ${darkMode ? 'text-white bg-white/10' : 'text-indigo-500 bg-indigo-500/5'}`}>{sumQtyFullPcs}</td>
                            </tr>

                            {/* Line 5: QTY PCS LAST */}
                            <tr className={darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-amber-500/5 hover:bg-amber-500/10'}>
                              <td className={`py-2.5 px-4 text-left font-sans font-black border-r ${
                                darkMode ? 'border-white/10 bg-[#15151A] text-white' : 'border-slate-200 bg-slate-100/20 text-red-700'
                              }`}>
                                QTY PCS LAST (RESTE)
                              </td>
                              {activeColorConfig.tailles.map((sz) => {
                                const qTot = activeColorConfig.sizes[sz]?.qtyTot || 0;
                                const c = activeColorConfig.sizes[sz]?.cap || 0;
                                const fullCtn = c > 0 ? Math.floor(qTot / c) : 0;
                                const fullPcs = fullCtn * c;
                                const lastPcs = qTot - fullPcs;
                                
                                // GET DYNAMIC COLOR HIGHLIGHT BASED ON PACKING RESULTS
                                let cellStyle: React.CSSProperties = {};
                                if (lastPcs > 0 && activeColorResult) {
                                  const remRow = activeColorResult.rows.find(row => row.sizes[sz] > 0 && isRemainderRow(row, activeColorConfig));
                                  if (remRow) {
                                    const remColor = getRemainderRowColor(remRow, activeColorResult, activeColorConfig, darkMode);
                                    if (remColor) {
                                      cellStyle = {
                                        backgroundColor: remColor.bg,
                                        color: remColor.text,
                                        fontWeight: 'black'
                                      };
                                    }
                                  }
                                }
                                
                                return (
                                  <td key={sz} className={`p-2 border-r col-sizes-cells font-mono font-black ${darkMode ? 'border-white/10 text-white' : 'border-slate-200 text-slate-800'}`} style={cellStyle}>
                                    {lastPcs}
                                  </td>
                                );
                              })}
                              <td className={`p-2 font-black ${darkMode ? 'text-white bg-white/10' : 'text-red-500 bg-red-500/5'}`}>{sumQtyLastPcs}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* SECTION : PERSONNALISATION DU MÉLANGE DES RESTES (PIÈCES LAST) */}
                      <div className={`mt-4 p-5 rounded-xl border ${
                        darkMode ? 'bg-white/5 border-white/10' : 'bg-[#fcfdfe] border-slate-200 shadow-sm'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 mb-4" style={{ borderColor: darkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
                          <div className="space-y-1">
                            <h4 className={`text-sm font-sans font-black uppercase tracking-wider flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                              <span>📦</span>
                              <span>MÉLANGE ET PERSONNALISATION DES RESTES (PIÈCES LAST)</span>
                            </h4>
                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              Décidez vous-même comment regrouper les {sumQtyLastPcs} pièces restantes en cartons personnalisés.
                            </p>
                          </div>
                          
                          <label 
                            className={`relative inline-flex items-center select-none ${
                              activeColorResult?.mode !== 'mixte_autorise' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                            }`}
                            onClick={(e) => {
                              if (activeColorResult?.mode !== 'mixte_autorise') {
                                // Prevent checkbox from toggling anyway, and alert user
                                e.preventDefault();
                                triggerToast("❌ Activation bloquée : Le mélange des pièces (restes) n'est pas applicable sous la stratégie SOLID PACK !", "error");
                              }
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={!!activeColorConfig.customRemaindersEnabled && activeColorResult?.mode === 'mixte_autorise'}
                              disabled={activeColorResult?.mode !== 'mixte_autorise'}
                              onChange={(e) => {
                                if (activeColorResult?.mode !== 'mixte_autorise') return;
                                const nextColors = [...colors];
                                nextColors[activeColorIdx] = {
                                  ...activeColorConfig,
                                  customRemaindersEnabled: e.target.checked,
                                  customRemainders: activeColorConfig.customRemainders || []
                                };
                                setColors(nextColors);
                                setHasGenerated(false);
                                if (hasGenerated) {
                                  autoRecalculateResults(globalPackingMode, forceSingleCarton, maxSizesPerBox, forceSubCapSolidInMixed, nextColors);
                                }
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            <span className={`ml-3 text-xs font-bold uppercase ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                              {activeColorConfig.customRemaindersEnabled && activeColorResult?.mode === 'mixte_autorise' ? 'Activé (Manuel)' : 'Désactivé (Auto)'}
                            </span>
                          </label>
                        </div>

                        {activeColorResult?.mode !== 'mixte_autorise' ? (
                          <div className={`p-5 rounded-xl border border-dashed text-center space-y-3 ${
                            darkMode ? 'border-red-500/30 bg-red-500/5 text-red-400' : 'border-amber-200 bg-amber-50 text-amber-900 shadow-xs'
                          }`}>
                            <div className="text-2xl">⚠️</div>
                            <h5 className="text-xs font-sans font-black uppercase tracking-wider text-red-500">
                              Mélange non applicable (Stratégie SOLID active)
                            </h5>
                            <p className="text-xs max-w-lg mx-auto opacity-80 font-sans leading-relaxed">
                              La stratégie de colisage résolue pour la couleur <b>{activeColorConfig.nom}</b> est actuellement réglée sur <b>SOLID (Solide)</b>. Le mélange et la personnalisation des restes de pièces ne sont applicables que sous la stratégie <b>MIXED (Mixte)</b>.
                            </p>
                            <p className="text-[11px] max-w-lg mx-auto opacity-70 font-mono leading-relaxed">
                              Pour utiliser cette fonctionnalité, changez le mode de cette couleur en <b>MIXED</b> ou configurez la stratégie <b>Globale</b> en MIXTE dans l'onglet des paramètres.
                            </p>
                          </div>
                        ) : !activeColorConfig.customRemaindersEnabled ? (
                          <div className={`p-4 rounded-lg text-xs flex items-center gap-2 font-mono ${darkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
                            <span>ℹ️</span>
                            <span>Le colisage automatique est actif. Les {sumQtyLastPcs} pièces restantes seront réparties selon la méthode classique de la stratégie globale.</span>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* 1. Recoupment table of remainder pieces */}
                            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-[#0A0A0C] border-white/5' : 'bg-white border-slate-100'}`}>
                              <h5 className={`text-xs font-mono font-bold uppercase mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                📌 État des pièces restantes (Reste disponible à mixer)
                              </h5>
                              
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {activeColorConfig.tailles.map(sz => {
                                  const qTot = activeColorConfig.sizes[sz]?.qtyTot || 0;
                                  const cap = activeColorConfig.sizes[sz]?.cap || 25;
                                  const fullCtn = cap > 0 ? Math.floor(qTot / cap) : 0;
                                  const r = qTot - (fullCtn * cap);
                                  
                                  // Calculate how much has been allocated so far in custom remainders
                                  let allocated = 0;
                                  activeColorConfig.customRemainders?.forEach(cc => {
                                    allocated += cc.sizes[sz] || 0;
                                  });
                                  const unallocated = r - allocated;
                                  
                                  return (
                                    <div key={sz} className={`p-3 rounded-lg border text-xs font-mono flex flex-col justify-between ${
                                      unallocated < 0 
                                        ? (darkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-700')
                                        : unallocated === 0
                                        ? (darkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                                        : (darkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700')
                                    }`}>
                                      <div className="font-bold border-b pb-1 mb-1 flex items-center justify-between" style={{ borderColor: 'currentColor' }}>
                                        <span>Taille {sz}</span>
                                        <span className="font-mono text-[10px]">Requis: <b>{r} pcs</b></span>
                                      </div>
                                      <div className="space-y-1 text-[10px] opacity-90 mt-1">
                                        <div className="text-[9px] uppercase tracking-wider opacity-75">
                                          ({r > 0 ? numberToFrenchWords(r) : 'zéro'} {r > 1 ? 'pièces' : 'pièce'})
                                        </div>
                                        <div className="border-t pt-1 mt-1 border-dotted" style={{ borderColor: 'currentColor' }}>
                                          <div>Alloué : <b>{allocated} pcs</b> ({numberToFrenchWords(allocated)})</div>
                                          <div>Restant : <b className={unallocated !== 0 ? "font-black" : ""}>{unallocated} pcs</b></div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* 2. Custom remainder cartons list */}
                            <div className="space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <h5 className={`text-xs font-mono font-bold uppercase ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                  📦 Vos cartons de reste personnalisés ({activeColorConfig.customRemainders?.length || 0})
                                </h5>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newCarton: CustomRemainderCarton = {
                                        id: 'rc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
                                        sizes: {}
                                      };
                                      activeColorConfig.tailles.forEach(sz => {
                                        newCarton.sizes[sz] = 0;
                                      });
                                      
                                      const nextColors = [...colors];
                                      nextColors[activeColorIdx] = {
                                        ...activeColorConfig,
                                        customRemainders: [...(activeColorConfig.customRemainders || []), newCarton]
                                      };
                                      setColors(nextColors);
                                      setHasGenerated(false);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all inline-flex items-center gap-1 cursor-pointer ${
                                      darkMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                    }`}
                                  >
                                    <span>➕</span> Ajouter un carton
                                  </button>

                                  <button
                                    type="button"
                                    onClick={handleAutoGroupRemainders}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all inline-flex items-center gap-1 cursor-pointer ${
                                      darkMode ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'
                                    }`}
                                    title="Regrouper automatiquement tous les restes de manière conforme"
                                  >
                                    <span>💡</span> Auto-configurer cartons
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Instantly run the packing generator to apply manual remainders
                                      handleGenerateList();
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all inline-flex items-center gap-1 cursor-pointer ${
                                      darkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                                    }`}
                                    title="Valider et générer la liste de colisage"
                                  >
                                    <span>✔️</span> Valider les restes
                                  </button>
                                </div>
                              </div>

                              {(!activeColorConfig.customRemainders || activeColorConfig.customRemainders.length === 0) ? (
                                <div className={`p-6 rounded-xl border border-dashed text-center space-y-2 ${darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                                  <span className="text-2xl block">📦</span>
                                  <span className="text-xs font-mono block">Aucun carton de reste personnalisé pour le moment.</span>
                                  <span className="text-[10px] text-slate-400 block">Cliquez sur le bouton ci-dessus pour composer votre premier carton de reste.</span>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {activeColorConfig.customRemainders.map((cc, cIdx) => {
                                    const totalPcsInCtn = Object.values(cc.sizes).reduce((sum: number, v: any) => sum + (Number(v) || 0), 0);
                                    
                                    // Calculate weights and CBM for this carton
                                    let netW = 0;
                                    let maxCartonW = 0.8;
                                    let maxCbmVal = 0.08;
                                    
                                    Object.entries(cc.sizes).forEach(([sz, qtyVal]) => {
                                      const qty = Number(qtyVal) || 0;
                                      const spec = activeColorConfig.sizes[sz];
                                      if (spec && qty > 0) {
                                        netW += qty * spec.wPiece;
                                        if (spec.wCarton > maxCartonW) maxCartonW = spec.wCarton;
                                        if (spec.cbmUnit > maxCbmVal) maxCbmVal = spec.cbmUnit;
                                      }
                                    });
                                    
                                    const grossW = netW > 0 ? netW + maxCartonW : 0;
                                    
                                    return (
                                      <div key={cc.id} className={`p-4 rounded-xl border relative shadow-xs ${
                                        darkMode ? 'bg-[#121215] border-white/10' : 'bg-white border-slate-200'
                                      }`}>
                                        <div className="flex items-center justify-between border-b pb-2 mb-3" style={{ borderColor: darkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}>
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-sm">📦</span>
                                            <span className={`text-xs font-mono font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                              CARTON DE RESTE #{cIdx + 1}
                                            </span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const nextColors = [...colors];
                                              nextColors[activeColorIdx] = {
                                                ...activeColorConfig,
                                                customRemainders: (activeColorConfig.customRemainders || []).filter(item => item.id !== cc.id)
                                              };
                                              setColors(nextColors);
                                              setHasGenerated(false);
                                            }}
                                            className="text-red-500 hover:text-red-600 font-bold text-xs p-1 rounded transition-all cursor-pointer"
                                            title="Supprimer ce carton"
                                          >
                                            Supprimer
                                          </button>
                                        </div>

                                        <div className="space-y-2 mb-3">
                                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Quantités par taille :</span>
                                          <div className="grid grid-cols-2 gap-2">
                                            {activeColorConfig.tailles.map(sz => {
                                              const qTot = activeColorConfig.sizes[sz]?.qtyTot || 0;
                                              const cap = activeColorConfig.sizes[sz]?.cap || 25;
                                              const r = qTot % cap;

                                              if (r === 0) {
                                                return (
                                                  <div key={sz} className={`p-2 rounded-lg border opacity-40 flex items-center justify-between ${
                                                    darkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
                                                  }`}>
                                                    <span className="font-bold text-xs">{sz}</span>
                                                    <span className="text-[10px] font-mono text-slate-400">Aucun reste</span>
                                                  </div>
                                                );
                                              }

                                              const isIncluded = (cc.sizes[sz] || 0) > 0;
                                              const userSpelling = (cc.writtenWords?.[sz] || '').trim();
                                              const correctSpelling = numberToFrenchWords(r);
                                              const isSpellingCorrect = userSpelling.toLowerCase() === correctSpelling.toLowerCase();

                                              return (
                                                <div key={sz} className={`p-2 rounded-lg border flex flex-col justify-between transition-all ${
                                                  isIncluded 
                                                    ? (isSpellingCorrect 
                                                        ? 'border-emerald-500/40 bg-emerald-500/5' 
                                                        : 'border-red-500/30 bg-red-50/10')
                                                    : (darkMode ? 'border-white/10 bg-[#161619]' : 'border-slate-250 bg-slate-50/50')
                                                }`}>
                                                  <div className="flex items-center justify-between gap-1">
                                                    <span className={`font-black font-sans text-xs ${isIncluded ? (darkMode ? 'text-white' : 'text-slate-800') : 'text-slate-400'}`}>
                                                      {sz} <span className="font-normal font-mono text-[10px]">({r} pcs)</span>
                                                    </span>
                                                    <input
                                                      type="checkbox"
                                                      checked={isIncluded}
                                                      onChange={(e) => {
                                                        const included = e.target.checked;
                                                        const val = included ? r : 0;
                                                        
                                                        // Calculate prospective sizes
                                                        const prospectiveSizes = {
                                                          ...cc.sizes,
                                                          [sz]: val
                                                        };
                                                        
                                                        // Find sizes with quantity > 0
                                                        const activeSizes = Object.keys(prospectiveSizes).filter(s => (Number(prospectiveSizes[s]) || 0) > 0);
                                                        
                                                        if (activeSizes.length > maxSizesPerBox) {
                                                          // Show error dialog and block!
                                                          triggerToast(`❌ Limite de tailles dépassée : maximum ${maxSizesPerBox} tailles autorisées par carton mixte !`, 'error');
                                                          setCartonLimitError({
                                                            isOpen: true,
                                                            message: `Le nombre de tailles mélangées dans ce carton (${activeSizes.length}) dépasse la limite de tailles différentes autorisées par carton mixte (${maxSizesPerBox} tailles max selon vos paramètres logistiques).`,
                                                            limit: maxSizesPerBox,
                                                            currentTotal: activeSizes.length,
                                                            sizesInvolved: activeSizes
                                                          });
                                                          return; // BLOCK state update
                                                        }

                                                        if (activeSizes.length > 0) {
                                                          // Get the capacity limit for each active size in the carton
                                                          const caps = activeSizes.map(s => activeColorConfig.sizes[s]?.cap || 25);
                                                          const limit = Math.min(...caps);
                                                          
                                                          // Get the prospective total pieces in this carton
                                                          const prospectiveTotal = Object.values(prospectiveSizes).reduce((sum: number, v: any) => sum + (Number(v) || 0), 0) as number;
                                                          
                                                          if (prospectiveTotal > limit) {
                                                            // Show error dialog and block!
                                                            triggerToast(`❌ Capacité maximale dépassée : maximum ${limit} pièces par carton mixte !`, 'error');
                                                            setCartonLimitError({
                                                              isOpen: true,
                                                              message: `Le nombre total de pièces dans ce carton mixte (${prospectiveTotal} pcs) dépasse le nombre maximum de pièces par carton autorisé pour les tailles incluses (${limit} pcs).`,
                                                              limit: limit,
                                                              currentTotal: prospectiveTotal,
                                                              sizesInvolved: activeSizes
                                                            });
                                                            return; // BLOCK state update
                                                          }
                                                        }

                                                        const nextColors = [...colors];
                                                        const updatedRemainders = (activeColorConfig.customRemainders || []).map(item => {
                                                          if (item.id === cc.id) {
                                                            const nextWritten = { ...(item.writtenWords || {}) };
                                                            if (!included) {
                                                              delete nextWritten[sz];
                                                            } else {
                                                              nextWritten[sz] = '';
                                                            }
                                                            return {
                                                              ...item,
                                                              sizes: {
                                                                ...item.sizes,
                                                                [sz]: val
                                                              },
                                                              writtenWords: nextWritten
                                                            };
                                                          }
                                                          return item;
                                                        });
                                                        nextColors[activeColorIdx] = {
                                                          ...activeColorConfig,
                                                          customRemainders: updatedRemainders
                                                        };
                                                        setColors(nextColors);
                                                        setHasGenerated(false);
                                                      }}
                                                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                                                    />
                                                  </div>

                                                  {isIncluded && (
                                                    <div className="mt-2 pt-1 border-t border-slate-500/10 space-y-1">
                                                      <div className="flex justify-between items-center text-[9px] font-mono font-bold">
                                                        <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>CONFIRMER :</span>
                                                        {isSpellingCorrect ? (
                                                          <span className="text-emerald-500">✔️ OK</span>
                                                        ) : (
                                                          <span className="text-red-500 font-mono">"{correctSpelling}"</span>
                                                        )}
                                                      </div>
                                                      <input
                                                        type="text"
                                                        placeholder={`écrire "${correctSpelling}"`}
                                                        value={cc.writtenWords?.[sz] || ''}
                                                        onChange={(e) => {
                                                          const textVal = e.target.value;
                                                          const nextColors = [...colors];
                                                          const updatedRemainders = (activeColorConfig.customRemainders || []).map(item => {
                                                            if (item.id === cc.id) {
                                                              return {
                                                                ...item,
                                                                writtenWords: {
                                                                  ...(item.writtenWords || {}),
                                                                  [sz]: textVal
                                                                }
                                                              };
                                                            }
                                                            return item;
                                                          });
                                                          nextColors[activeColorIdx] = {
                                                            ...activeColorConfig,
                                                            customRemainders: updatedRemainders
                                                          };
                                                          setColors(nextColors);
                                                          setHasGenerated(false);
                                                        }}
                                                        className={`w-full px-1.5 py-0.5 rounded text-[10px] text-center focus:outline-none focus:ring-1 ${
                                                          isSpellingCorrect 
                                                            ? (darkMode ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border border-emerald-250 text-emerald-800') 
                                                            : (darkMode ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-800')
                                                        }`}
                                                      />
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        {/* Carton metrics */}
                                        <div className={`p-2.5 rounded-lg text-[10px] font-mono grid grid-cols-2 gap-1.5 mt-2 ${
                                          darkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-600'
                                        }`}>
                                          <div>Pièces : <b className={darkMode ? 'text-white' : 'text-slate-900'}>{totalPcsInCtn} pcs</b></div>
                                          <div>CBM : <b className={darkMode ? 'text-white' : 'text-slate-900'}>{maxCbmVal.toFixed(3)} m³</b></div>
                                          <div>Net : <b className={darkMode ? 'text-white' : 'text-slate-900'}>{netW.toFixed(1)} kg</b></div>
                                          <div>Brut : <b className={darkMode ? 'text-white' : 'text-slate-900'}>{grossW.toFixed(1)} kg</b></div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* 3. Global leftovers info */}
                            {(() => {
                              let anyLeftover = false;
                              const unallocatedInfo: string[] = [];
                              activeColorConfig.tailles.forEach(sz => {
                                const qTot = activeColorConfig.sizes[sz]?.qtyTot || 0;
                                const cap = activeColorConfig.sizes[sz]?.cap || 25;
                                const r = qTot - (Math.floor(qTot / cap) * cap);
                                
                                let allocated = 0;
                                activeColorConfig.customRemainders?.forEach(cc => {
                                  allocated += cc.sizes[sz] || 0;
                                });
                                const unallocated = r - allocated;
                                if (unallocated > 0) {
                                  anyLeftover = true;
                                  unallocatedInfo.push(`${unallocated} pcs de ${sz}`);
                                }
                              });
                              
                              if (anyLeftover) {
                                return (
                                  <div className={`p-3 rounded-lg text-xs font-mono border flex items-start gap-2 ${
                                    darkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                                  }`}>
                                    <span>💡</span>
                                    <div>
                                      <b>Note logistique :</b> Les pièces de reste suivantes ne sont pas encore allouées : <b>{unallocatedInfo.join(', ')}</b>. Elles seront automatiquement conditionnées en cartons de reste individuels par taille pour garantir la quantité totale.
                                    </div>
                                  </div>
                                );
                              } else {
                                return (
                                  <div className={`p-3 rounded-lg text-xs font-mono border flex items-start gap-2 ${
                                    darkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  }`}>
                                    <span>✅</span>
                                    <div>
                                      <b>Parfait !</b> Toutes les pièces de reste ont été allouées à vos cartons personnalisés.
                                    </div>
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
                  </div>
                </div>
              </motion.div>
            );
          })()}

              {activeInputTab === 'packing_list' && (
                <motion.div
                  key="packing-list-section"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {!hasGenerated ? (
                    <div className={`rounded-xl border p-8 text-center space-y-4 ${darkMode ? 'bg-[#0F0F12] border-white/10' : 'bg-white border-slate-205'} shadow-sm`}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${darkMode ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-800'}`}>
                        <FileSpreadsheet className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h3 className={`text-sm font-bold font-mono uppercase ${darkMode ? 'text-white' : 'text-slate-800'}`}>Packing List non générée</h3>
                        <p className={`text-xs max-w-md mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                           Veuillez saisir vos grilles de colisage dans l'onglet <b>⌨️ GRILLE SAISIE</b>, puis cliquez sur le bouton ci-dessous pour lancer la génération de la Packing List.
                        </p>
                      </div>
                      <button
                        onClick={handleGenerateList}
                        className={`px-4 py-2 font-bold rounded-lg text-xs transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5 ${
                          darkMode ? 'bg-white text-black hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        <span>GÉNÉRER LA PACKING LIST</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Color Selector Filter Control */}
                      {results.length > 1 && (
                        <div id="color-filter-card" className={`p-4 rounded-xl border print:hidden shadow-sm transition-colors ${
                          darkMode ? 'bg-[#0F0F12] border-white/10' : 'bg-white border-slate-205'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-extrabold tracking-tight font-mono ${darkMode ? 'text-white' : 'text-slate-800'}`}>🎨 FILTRER PAR COULEURS À AFFICHER & EXPORTER</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${darkMode ? 'bg-white/10 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                {selectedExportColors.length}/{results.length} sélectionnée(s)
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelectedExportColors(results.map(r => r.nom))}
                                className="px-2.5 py-1 text-[11px] font-bold font-mono rounded border cursor-pointer transition-all hover:brightness-95 active:scale-[0.98]"
                                style={{ backgroundColor: '#f1cd3f', borderColor: '#f2a727', color: '#ffffff', fontWeight: 'bold' }}
                              >
                                TOUTES LES COULEURS
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {results.map((res) => {
                              const isChecked = selectedExportColors.includes(res.nom);
                              return (
                                <button
                                  key={res.nom}
                                  onClick={() => {
                                    if (isChecked) {
                                      if (selectedExportColors.length > 1) {
                                        setSelectedExportColors(selectedExportColors.filter(c => c !== res.nom));
                                      }
                                    } else {
                                      setSelectedExportColors([...selectedExportColors, res.nom]);
                                    }
                                  }}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                                    isChecked
                                      ? 'border-[#fc55b2] text-white'
                                      : (darkMode 
                                        ? 'bg-transparent border-white/5 text-slate-500 opacity-60 hover:opacity-100 hover:border-white/10' 
                                        : 'bg-transparent border-slate-200 text-slate-500 opacity-60 hover:opacity-100 hover:border-slate-300')
                                  }`}
                                  style={isChecked ? { backgroundColor: '#fc55b2', color: '#ffffff' } : undefined}
                                >
                                  <div className="w-3 h-3 rounded-full flex items-center justify-center border border-slate-700/40" style={{ backgroundColor: res.color }}>
                                    {isChecked && (
                                      <span className="text-[8px] text-white">✓</span>
                                    )}
                                  </div>
                                  <span>{res.nom}</span>
                                  <span 
                                    className={`text-[10px] px-1.5 py-0.15 rounded font-mono font-bold ${
                                      isChecked 
                                        ? '' 
                                        : (darkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-400')
                                    }`}
                                    style={isChecked ? { backgroundColor: '#ffffff', color: '#fc55b2' } : undefined}
                                  >
                                    {res.totals.p.toLocaleString('fr-FR')} Pcs
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {activeResults.map((res, ci) => {
                        const origIdx = res.colorIndex ?? ci;
                        const bgClass = darkMode ? BG_COLORS_DARK[origIdx % PALETTE.length] : BG_COLORS_LIGHT[origIdx % PALETTE.length];
                        const activeColorSizes = res.tailles.filter(t => isStandardSizeAlwaysShown(t) || (colors[origIdx]?.sizes[t]?.qtyTot || 0) > 0);
                        return (
                          <div
                            key={ci}
                            className={`rounded-xl border p-5 print-ind-card break-inside-avoid shadow-sm ${
                              darkMode ? 'bg-[#0F0F12] border-white/10' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div 
                              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border mb-3 font-mono font-bold uppercase text-xs"
                              style={{ backgroundColor: '#3988e7', color: '#fffbfb', borderColor: '#2c7cd1' }}
                            >
                              <div className="w-3 h-3 rounded-full border border-black/20" style={{ backgroundColor: res.color }} />
                              PACKING LIST — COULEUR : {res.nom}
                            </div>

                            <div className="pb-3 text-xs">
                              {res.mode === 'strict_solide' ? (
                                <span 
                                  className="px-2.5 py-1 rounded border font-bold font-mono tracking-wide"
                                  style={{ color: '#ff0436', borderColor: '#ff0436' }}
                                >
                                  🔒 SOLID PACK STRICT
                                </span>
                              ) : (
                                <span 
                                  className="px-2.5 py-1 rounded border font-bold font-mono tracking-wide"
                                  style={{ color: '#ff0436', borderColor: '#ff0436' }}
                                >
                                  🔀 MIXED PACK AUTORISÉ (max {maxSizesPerBox} tailles)
                                </span>
                              )}
                            </div>

                            <div className={`overflow-x-auto rounded-lg border ${darkMode ? 'border-white/10 bg-[#0F0F12]' : 'border-slate-200 bg-slate-50/50'}`}>
                              <table className="w-full text-xs text-center border-collapse">
                                <thead>
                                  {(() => {
                                    let firstThRendered = false;
                                    const getThProps = (baseClass: string) => {
                                      if (!firstThRendered) {
                                        firstThRendered = true;
                                        return {
                                          className: baseClass,
                                          style: { backgroundColor: '#f85cae', color: '#ffffff', fontWeight: 'bold' }
                                        };
                                      }
                                      return { className: baseClass };
                                    };
                                    return (
                                      <tr className="font-mono font-bold text-[11px] border-b text-white" style={{ backgroundColor: '#ba66f7' }}>
                                        {printColumns.ctn && (
                                          <>
                                            <th {...getThProps(`py-2.5 px-2 uppercase text-center border-r col-ctn-index ${darkMode ? 'border-white/10' : 'border-slate-200'}`)}>N° DÉBUT</th>
                                            <th {...getThProps(`py-2.5 px-2 uppercase text-center border-r col-ctn-index ${darkMode ? 'border-white/10' : 'border-slate-200'}`)}>N° FIN</th>
                                          </>
                                        )}
                                        {printColumns.color && (
                                          <th {...getThProps(`px-2 border-r col-color-lbl ${darkMode ? 'border-white/10' : 'border-slate-200'}`)}>COULEUR</th>
                                        )}
                                        {(() => {
                                          const origColor = colors.find(c => c.nom === res.nom);
                                          const showSkuCol = printColumns.sku && !!(origColor && Object.values(origColor.sizes || {}).some((s: any) => s.sku && String(s.sku).trim() !== ''));
                                          return showSkuCol && (
                                            <th {...getThProps(`px-3 border-r col-sku-lbl ${darkMode ? 'border-white/10' : 'border-slate-200'} font-bold`)}>SKU</th>
                                          );
                                        })()}
                                        {printColumns.sizes && activeColorSizes.map(t => (
                                          <th key={t} {...getThProps(`px-2 border-r col-sizes-cells ${darkMode ? 'border-white/10' : 'border-slate-200'} font-bold`)}>{t}</th>
                                        ))}
                                        <th {...getThProps(`px-2 border-r ${darkMode ? 'border-white/10' : 'border-slate-200'}`)}>PCS/CTN</th>
                                        {printColumns.nbctn && (
                                          <th {...getThProps(`px-2 border-r col-nbctn-metric ${darkMode ? 'border-white/10' : 'border-slate-200'}`)}>NB CTN</th>
                                        )}
                                        {printColumns.totalqty && (
                                          <th {...getThProps(`px-2 border-r col-totalqty-metric ${darkMode ? 'border-white/10' : 'border-slate-200'}`)}>TOTAL QTY</th>
                                        )}
                                        {printColumns.net && (
                                          <th {...getThProps(`px-2 border-r col-net-metric ${darkMode ? 'border-white/10' : 'border-slate-200'} font-bold`)}>N.W (KG)</th>
                                        )}
                                        {printColumns.gross && (
                                          <th {...getThProps(`px-2 border-r col-gross-metric ${darkMode ? 'border-white/10' : 'border-slate-200'} font-bold`)}>G.W (KG)</th>
                                        )}
                                        {printColumns.cbm && (
                                          <th {...getThProps(`px-2 col-cbm-metric`)}>CBM (m³)</th>
                                        )}
                                      </tr>
                                    );
                                  })()}
                                </thead>
                                <tbody className={`divide-y font-mono font-medium ${darkMode ? 'divide-white/10' : 'divide-slate-200'}`}>
                                  {res.rows.map((row, rIdx) => {
                                    const origColor = colors.find(c => c.nom === res.nom);
                                    const showSkuCol = printColumns.sku && !!(origColor && Object.values(origColor.sizes || {}).some((s: any) => s.sku && String(s.sku).trim() !== ''));
                                    return (
                                      <tr
                                        key={rIdx}
                                        className={`divide-x ${darkMode ? 'hover:bg-white/5 divide-white/10' : 'hover:bg-slate-100/40 divide-slate-200'}`}
                                      >
                                        {printColumns.ctn && (
                                          <>
                                            <td className={`py-2 px-2 text-center font-bold col-ctn-index ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                              {parseCartonRange(row.cartonRange).start}
                                            </td>
                                            <td className={`py-2 px-2 text-center font-bold col-ctn-index ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                              {parseCartonRange(row.cartonRange).end}
                                            </td>
                                          </>
                                        )}
                                        {printColumns.color && <td className="px-2 font-bold col-color-lbl" style={{ color: res.color }}>{res.nom}</td>}
                                        {showSkuCol && <td className={`px-3 truncate max-w-28 text-[11px] font-semibold col-sku-lbl ${darkMode ? 'text-white' : 'text-emerald-700'}`}>{row.skus.join('/') || '—'}</td>}
                                        {printColumns.sizes && activeColorSizes.map(t => (
                                          <td key={t} className={`px-2 font-bold col-sizes-cells ${darkMode ? 'text-white' : 'text-slate-800'}`}>{row.sizes[t] || ''}</td>
                                        ))}
                                        <td className={`px-2 font-bold ${darkMode ? 'bg-white/5 text-white' : 'bg-slate-100/40 text-slate-800'}`}>{row.pcsPerCarton}</td>
                                        {printColumns.nbctn && <td className={`px-2 font-black col-nbctn-metric ${darkMode ? 'text-white' : 'text-slate-800'}`}>{row.nbr}</td>}
                                        {printColumns.totalqty && <td className={`px-2 font-black col-totalqty-metric ${darkMode ? 'bg-white/10 text-white' : 'bg-slate-100/60 text-slate-800'}`}>{row.totalPcs}</td>}
                                        {printColumns.net && <td className={`px-2 font-bold col-net-metric ${darkMode ? 'text-white' : 'text-teal-600'}`}>{row.netWeightRow.toFixed(2)}</td>}
                                        {printColumns.gross && <td className={`px-2 font-bold col-gross-metric ${darkMode ? 'text-white' : 'text-red-500'}`}>{row.grossWeightRow.toFixed(2)}</td>}
                                        {printColumns.cbm && <td className={`px-2 col-cbm-metric ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{row.cbmRow.toFixed(4)}</td>}
                                      </tr>
                                    );
                                  })}

                                  {/* Totals row index */}
                                  <tr className={`font-black border-t-2 border-b divide-x ${
                                    darkMode ? 'border-t-white border-b-white/10 bg-white/5 text-white divide-white/10' : 'border-t-slate-800 border-b-slate-200 bg-slate-100/40 text-slate-900 divide-slate-200'
                                  }`}>
                                    {printColumns.ctn && <td colSpan={2} className="py-2.5 px-3 text-center col-ctn-index">TOTALE</td>}
                                    {printColumns.color && <td className="px-2 font-extrabold col-color-lbl">{res.nom}</td>}
                                    {(() => {
                                      const origColor = colors.find(c => c.nom === res.nom);
                                      const showSkuCol = printColumns.sku && !!(origColor && Object.values(origColor.sizes || {}).some((s: any) => s.sku && String(s.sku).trim() !== ''));
                                      return showSkuCol && <td className="px-3 col-sku-lbl">—</td>;
                                    })()}
                                    {printColumns.sizes && activeColorSizes.map(t => (
                                      <td key={t} className="px-2 col-sizes-cells">{res.totals.sizes[t] || 0}</td>
                                    ))}
                                    <td>—</td>
                                    {printColumns.nbctn && <td className="px-2 col-nbctn-metric">{res.totals.c}</td>}
                                    {printColumns.totalqty && <td className="px-2 col-totalqty-metric">{res.totals.p}</td>}
                                    {printColumns.net && <td className="px-2 font-black col-net-metric">{res.totals.n.toFixed(2)}</td>}
                                    {printColumns.gross && <td className="px-2 font-black col-gross-metric">{res.totals.g.toFixed(2)}</td>}
                                    {printColumns.cbm && <td className="px-2 col-cbm-metric">{res.totals.v.toFixed(4)}</td>}
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}

                      {/* COMBINED LEDGER (MULTIPLE COLORS CHOSEN) */}
                      {activeResults.length > 1 && (
                        <div className={`rounded-xl border p-5 print-cpl-card break-inside-avoid shadow-sm ${
                          darkMode ? 'bg-[#0F0F12] border-white/10' : 'bg-white border-slate-200'
                        }`}>
                          <div className={`border-2 font-bold px-4 py-3 rounded-lg flex items-center gap-3 font-mono text-sm mb-4 ${
                            darkMode ? 'bg-white/5 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-800'
                          }`}>
                            📁 COMBINED PACKING LIST — LEDGER GLOBAL TOUTES COULEURS ({activeResults.length})
                          </div>

                          <div className={`overflow-x-auto rounded-lg border ${darkMode ? 'border-white/10 bg-[#0F0F12]' : 'border-slate-200 bg-slate-50/50'}`}>
                            <table className="w-full text-xs text-center border-collapse">
                              <thead>
                                  {(() => {
                                    let firstThRendered = false;
                                    const getThProps = (baseClass: string) => {
                                      if (!firstThRendered) {
                                        firstThRendered = true;
                                        return {
                                          className: baseClass,
                                          style: { backgroundColor: '#f85cae', color: '#ffffff', fontWeight: 'bold' }
                                        };
                                      }
                                      return { className: baseClass };
                                    };
                                    return (
                                      <tr className="font-mono font-bold text-[11px] border-b text-white" style={{ backgroundColor: '#ba66f7' }}>
                                        {printColumns.ctn && (
                                          <>
                                            <th {...getThProps(`py-2.5 px-2 uppercase text-center border-r col-ctn-index ${darkMode ? 'border-white/10' : 'border-slate-200'}`)}>N° DÉBUT</th>
                                            <th {...getThProps(`py-2.5 px-2 uppercase text-center border-r col-ctn-index ${darkMode ? 'border-white/10' : 'border-slate-200'}`)}>N° FIN</th>
                                          </>
                                        )}
                                        {printColumns.color && (
                                          <th {...getThProps(`px-2 border-r col-color-lbl ${darkMode ? 'border-white/10' : 'border-slate-200'}`)}>COULEUR</th>
                                        )}
                                        {(() => {
                                          const showSkuColCombined = printColumns.sku && colors.some(col => Object.values(col.sizes || {}).some((s: any) => s.sku && String(s.sku).trim() !== ''));
                                          return showSkuColCombined && (
                                            <th {...getThProps(`px-3 border-r col-sku-lbl ${darkMode ? 'border-white/10 text-white font-bold' : 'border-slate-200 text-slate-800 font-bold'}`)}>SKU</th>
                                          );
                                        })()}
                                        {printColumns.sizes && summaryUniqueSizes.map(t => (
                                          <th key={t} {...getThProps(`px-2 border-r col-sizes-cells ${darkMode ? 'border-white/10 text-white font-bold' : 'border-slate-200 text-slate-800 font-bold'}`)}>{t}</th>
                                        ))}
                                        <th {...getThProps(`px-2 border-r ${darkMode ? 'border-white/10' : 'border-slate-200'}`)}>PCS/CTN</th>
                                        {printColumns.nbctn && (
                                          <th {...getThProps(`px-2 border-r col-nbctn-metric ${darkMode ? 'border-white/10' : 'border-slate-200'}`)}>NB CTN</th>
                                        )}
                                        {printColumns.totalqty && (
                                          <th {...getThProps(`px-2 border-r col-totalqty-metric ${darkMode ? 'border-white/10' : 'border-slate-200'}`)}>TOTAL QTY</th>
                                        )}
                                        {printColumns.net && (
                                          <th {...getThProps(`px-2 border-r col-net-metric ${darkMode ? 'border-white/10' : 'border-slate-200'} font-bold`)}>N.W (KG)</th>
                                        )}
                                        {printColumns.gross && (
                                          <th {...getThProps(`px-2 border-r col-gross-metric ${darkMode ? 'border-white/10' : 'border-slate-200'} font-bold`)}>G.W (KG)</th>
                                        )}
                                        {printColumns.cbm && (
                                          <th {...getThProps(`px-2 col-cbm-metric`)}>CBM (m³)</th>
                                        )}
                                      </tr>
                                    );
                                  })()}
                              </thead>
                              <tbody className={`divide-y font-mono text-left ${darkMode ? 'divide-white/10' : 'divide-slate-200'}`}>
                                {(() => {
                                  let seqNum = 1;
                                  const showSkuColCombined = printColumns.sku && colors.some(col => Object.values(col.sizes || {}).some((s: any) => s.sku && String(s.sku).trim() !== ''));
                                  return activeResults.map((res, ci) => {
                                    const origIdx = res.colorIndex ?? ci;
                                    const bgCode = darkMode ? BG_COLORS_DARK[origIdx % PALETTE.length] : BG_COLORS_LIGHT[origIdx % PALETTE.length];
                                    return res.rows.map((row, rIdx) => {
                                      const currentStart = seqNum;
                                      const currentEnd = seqNum + row.nbr - 1;
                                      seqNum += row.nbr;
                                      const rowBg = bgCode;
                                      const rowTextColor = undefined;
                                      return (
                                        <tr
                                          key={`${ci}-${rIdx}`}
                                          className={`divide-x font-medium ${darkMode ? 'hover:bg-white/5 divide-white/10' : 'hover:bg-slate-100/20 divide-slate-200'}`}
                                          style={{ backgroundColor: rowBg, color: rowTextColor }}
                                        >
                                          {printColumns.ctn && (
                                            <>
                                              <td className={`py-2 px-2 text-center font-bold col-ctn-index ${darkMode ? 'text-white' : 'text-slate-800'}`}>{currentStart}</td>
                                              <td className={`py-2 px-2 text-center font-bold col-ctn-index ${darkMode ? 'text-white' : 'text-slate-800'}`}>{currentEnd}</td>
                                            </>
                                          )}
                                          {printColumns.color && <td className="px-2 font-bold col-color-lbl" style={{ color: res.color }}>{res.nom}</td>}
                                          {showSkuColCombined && <td className={`px-3 truncate max-w-28 text-[11px] col-sku-lbl ${darkMode ? 'text-white' : 'text-emerald-700'}`}>{row.skus.join('/') || '—'}</td>}
                                          {printColumns.sizes && summaryUniqueSizes.map(t => (
                                            <td key={t} className={`px-2 text-center font-bold col-sizes-cells ${darkMode ? 'text-white' : 'text-slate-800'}`}>{row.sizes[t] || ''}</td>
                                          ))}
                                          <td className={`px-2 text-center font-bold ${darkMode ? 'text-white' : 'text-slate-850'}`}>{row.pcsPerCarton}</td>
                                          {printColumns.nbctn && <td className={`px-2 text-center font-black col-nbctn-metric ${darkMode ? 'text-white' : 'text-slate-800'}`}>{row.nbr}</td>}
                                          {printColumns.totalqty && <td className={`px-2 text-center font-black col-totalqty-metric ${darkMode ? 'bg-white/10 text-white' : 'bg-slate-100/70 text-slate-900'}`}>{row.totalPcs}</td>}
                                          {printColumns.net && <td className={`px-2 text-center font-bold col-net-metric ${darkMode ? 'text-white' : 'text-teal-600'}`}>{row.netWeightRow.toFixed(2)}</td>}
                                          {printColumns.gross && <td className={`px-2 text-center font-bold col-gross-metric ${darkMode ? 'text-white' : 'text-red-500'}`}>{row.grossWeightRow.toFixed(2)}</td>}
                                          {printColumns.cbm && <td className={`px-2 text-center col-cbm-metric ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{row.cbmRow.toFixed(4)}</td>}
                                        </tr>
                                      );
                                    });
                                  });
                                })()}

                                {/* Global combined total row */}
                                <tr className={`font-extrabold border-t-2 divide-x ${
                                  darkMode ? 'border-t-white bg-white/5 text-white divide-white/10' : 'border-t-slate-800 bg-slate-100/40 text-slate-900 divide-slate-200'
                                }`}>
                                  {printColumns.ctn && <td colSpan={2} className="py-2.5 px-3 text-center col-ctn-index">GRAND TOTAL</td>}
                                  {printColumns.color && <td className="px-2 font-extrabold col-color-lbl">ALL</td>}
                                  {(() => {
                                    const showSkuColCombined = printColumns.sku && colors.some(col => Object.values(col.sizes || {}).some((s: any) => s.sku && String(s.sku).trim() !== ''));
                                    return showSkuColCombined && <td className="px-3 col-sku-lbl">—</td>;
                                  })()}
                                  {printColumns.sizes && summaryUniqueSizes.map(t => {
                                    let sumT = 0;
                                    activeResults.forEach(r => { sumT += r.totals.sizes[t] || 0; });
                                    return <td key={t} className="px-2 text-center col-sizes-cells font-bold">{sumT}</td>;
                                  })}
                                  <td className="text-center">—</td>
                                  {printColumns.nbctn && <td className="px-2 text-center col-nbctn-metric font-extrabold">{grandTotals.c}</td>}
                                  {printColumns.totalqty && <td className="px-2 text-center col-totalqty-metric">{grandTotals.p}</td>}
                                  {printColumns.net && <td className="px-2 text-center font-black col-net-metric">{grandTotals.n.toFixed(2)}</td>}
                                  {printColumns.gross && <td className="px-2 text-center font-black col-gross-metric">{grandTotals.g.toFixed(2)}</td>}
                                  {printColumns.cbm && <td className="px-2 text-center col-cbm-metric font-medium">{grandTotals.v.toFixed(4)}</td>}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {activeInputTab === 'breakdown' && (
                <motion.div
                  key="breakdown-section"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.15 }}
                >
                  {!hasGenerated ? (
                    <div className={`rounded-xl border p-8 text-center space-y-4 ${darkMode ? 'bg-[#0F0F12] border-white/10' : 'bg-white border-slate-205'} shadow-sm`}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${darkMode ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-800'}`}>
                        <Grid className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h3 className={`text-sm font-bold font-mono uppercase ${darkMode ? 'text-white' : 'text-slate-800'}`}>Breakdown non généré</h3>
                        <p className={`text-xs max-w-md mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Veuillez saisir vos grilles de colisage dans l'onglet <b>⌨️ GRILLE SAISIE</b>, puis cliquez sur le bouton ci-dessous pour calculer le Breakdown résumé.
                        </p>
                      </div>
                      <button
                        onClick={handleGenerateList}
                        className={`px-4 py-2 font-bold rounded-lg text-xs transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5 ${
                          darkMode ? 'bg-white text-black hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        <span>GÉNÉRER LE BREAKDOWN</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className={`rounded-xl border p-5 print-bk-table break-inside-avoid shadow-sm ${
                        darkMode ? 'bg-[#0F0F12] border-white/10' : 'bg-white border-slate-200'
                      }`}>
                        <div className={`border font-mono font-bold px-4 py-3 rounded-lg text-xs mb-4 uppercase ${
                          darkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-105 border-slate-300 text-slate-900'
                        }`}>
                          📊 COLOR / SIZE BREAKDOWN COMBINED (Ledger global des colisages)
                        </div>
                        <div className={`overflow-x-auto rounded-lg border ${darkMode ? 'border-white/10' : 'border-slate-200 bg-slate-50/50'}`}>
                          <table className="w-full text-xs text-center border-collapse">
                            <thead>
                              <tr className="font-mono font-bold text-[11px] border-b text-white" style={{ backgroundColor: '#ba66f7' }}>
                                <th className={`py-2.5 px-3 text-left border-r ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>COLOR / COULEUR</th>
                                {summaryUniqueSizes.map(t => <th key={t} className={`border-r col-sizes-cells ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>{t}</th>)}
                                <th className="py-2.5">TOTAL PCS</th>
                              </tr>
                            </thead>
                            <tbody className={`divide-y font-mono font-medium ${darkMode ? 'divide-white/10' : 'divide-slate-200'}`}>
                              {activeResults.map((res, ci) => (
                                <tr key={ci} className={`divide-x ${darkMode ? 'hover:bg-white/5 divide-white/10' : 'hover:bg-slate-100/40 divide-slate-200'}`}>
                                  <td className={`py-2 px-3 text-left font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    <div className="flex items-center gap-1.5 justify-start">
                                      <span className="w-2.5 h-2.5 rounded-full border border-slate-700/40 shrink-0" style={{ backgroundColor: res.color }} />
                                      <span>{res.nom}</span>
                                    </div>
                                  </td>
                                  {summaryUniqueSizes.map(t => (
                                    <td key={t} className={`font-bold col-sizes-cells ${darkMode ? 'text-white' : 'text-slate-800'}`}>{res.totals.sizes[t] || ''}</td>
                                  ))}
                                  <td className={`font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{res.totals.p}</td>
                                </tr>
                              ))}
                              <tr className={`font-extrabold border-t-2 divide-x ${
                                darkMode ? 'border-t-white bg-white/5 text-white divide-white/10' : 'border-t-slate-800 bg-slate-100/40 text-slate-900 divide-slate-200'
                              }`}>
                                <td className="py-2.5 px-3 text-left">TOTAL SHIFT</td>
                                {summaryUniqueSizes.map(t => {
                                  let sumT = 0;
                                  activeResults.forEach(r => { sumT += r.totals.sizes[t] || 0; });
                                  return <td key={t} className="font-extrabold col-sizes-cells">{sumT}</td>;
                                })}
                                <td className="font-extrabold">{grandTotals.p}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 mt-6 border-t border-dashed print-stats-box break-inside-avoid ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                          <div className={`p-3 rounded-lg border ${darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
                            <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Nombre de Pièces :</div>
                            <div className={`text-sm font-bold font-mono mt-0.5 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{grandTotals.p.toLocaleString('fr-FR')} PCS</div>
                          </div>
                          <div className={`p-3 rounded-lg border ${darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
                            <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Nombre de Cartons :</div>
                            <div className={`text-sm font-bold font-mono mt-0.5 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{grandTotals.c} Cartons</div>
                          </div>
                          <div className={`p-3 rounded-lg border ${darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
                            <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Poids Net :</div>
                            <div className={`text-sm font-bold font-mono mt-0.5 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{grandTotals.n.toFixed(2)} KG</div>
                          </div>
                          <div className={`p-3 rounded-lg border ${darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
                            <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Poids Brut :</div>
                            <div className={`text-sm font-bold font-mono mt-0.5 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{grandTotals.g.toFixed(2)} KG</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeInputTab === 'summary' && (
                <motion.div
                  key="summary-section"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {!hasGenerated ? (
                    <div className={`rounded-xl border p-8 text-center space-y-4 ${darkMode ? 'bg-[#0F0F12] border-white/10' : 'bg-white border-slate-205'} shadow-sm`}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${darkMode ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-800'}`}>
                        <PieChart className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h3 className={`text-sm font-bold font-mono uppercase ${darkMode ? 'text-white' : 'text-slate-800'}`}>Récapitulatif non généré</h3>
                        <p className={`text-xs max-w-md mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Veuillez saisir vos grilles de colisage dans l'onglet <b>⌨️ GRILLE SAISIE</b>, puis cliquez sur le bouton ci-dessous pour calculer le tableau de synthèse et les analyses.
                        </p>
                      </div>
                      <button
                        onClick={handleGenerateList}
                        className={`px-4 py-2 font-bold rounded-lg text-xs transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5 ${
                          darkMode ? 'bg-white text-black hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        <span>GÉNÉRER LE RÉCAPITULATIF</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-fadeIn">
                      {/* Dashboard Metrics Header */}
                      <div className={`rounded-xl border p-5 shadow-sm ${darkMode ? 'bg-[#0F0F12] border-white/10 shadow-black/20' : 'bg-white border-slate-200'}`}>
                        <div className={`border font-sans font-extrabold px-4 py-3 rounded-lg text-xs mb-6 uppercase flex items-center gap-2 tracking-wider ${
                          darkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                        }`}>
                          <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${darkMode ? 'bg-white' : 'bg-slate-900'}`} />
                          <span>📊 TABLEAU DE BORD DE SYNTHÈSE DES EXPÉDITIONS</span>
                        </div>

                        {/* 📝 RÉFÉRENCES & COORDONNÉES DE LA COMMANDE (DETAILED ORDER INFO) */}
                        <div className={`mb-6 p-4 rounded-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-[#fcfdfe] border-slate-200 shadow-xs'}`}>
                          <div className={`text-xs font-sans font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                            <span className={`w-1.5 h-3.5 rounded-sm ${darkMode ? 'bg-white' : 'bg-slate-900'}`} />
                            <span>📝 DÉTAILS DE LA COMMANDE & RÉFÉRENCES (FICHE LOGISTIQUE)</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-bold">Client / Customer</span>
                              <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{meta.customer || '—'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-bold">Commande / Order</span>
                              <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{meta.order || '—'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-bold">PO# Client</span>
                              <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{meta.po || '—'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-bold">Réf Client</span>
                              <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-905'}`}>{meta.refClient || '—'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-bold">Style N° / Nom</span>
                              <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{(meta.style || meta.styleNumber) ? `${meta.style || ''} ${meta.styleNumber ? `(#${meta.styleNumber})` : ''}` : '—'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-bold">Facture / Invoice</span>
                              <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{meta.invoice || '—'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-bold">Composition</span>
                              <span className={`font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>{meta.composition || '—'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-bold">Destination / Pays</span>
                              <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{meta.destination || meta.pays ? `${meta.destination || ''} ${meta.pays ? `(${meta.pays})` : ''}` : '—'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Top Bento Grid of Totals */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div className={`p-4 rounded-xl border transition-all duration-300 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white text-slate-900 border-slate-200 shadow-xs'}`}>
                            <div className={`text-[10px] uppercase font-sans tracking-widest font-extrabold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Pièces</div>
                            <div className={`text-2xl font-black font-mono mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{grandTotals.p.toLocaleString('fr-FR')}</div>
                            <div className={`text-[9.5px] mt-1 font-mono ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Pcs expédiées</div>
                          </div>

                          <div className={`p-4 rounded-xl border transition-all duration-300 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white text-slate-900 border-slate-200 shadow-xs'}`}>
                            <div className={`text-[10px] uppercase font-sans tracking-widest font-extrabold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Cartons</div>
                            <div className={`text-2xl font-black font-mono mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{grandTotals.c}</div>
                            <div className={`text-[9.5px] mt-1 font-mono ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Cartons colisage</div>
                          </div>

                          <div className={`p-4 rounded-xl border transition-all duration-300 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white text-slate-900 border-slate-200 shadow-xs'}`}>
                            <div className={`text-[10px] uppercase font-sans tracking-widest font-extrabold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Poids Global</div>
                            <div className={`text-2xl font-black font-mono mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{grandTotals.g.toFixed(1)} KG</div>
                            <div className={`text-[9.5px] mt-1 font-mono ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>N.W: {grandTotals.n.toFixed(1)} KG</div>
                          </div>

                          <div className={`p-4 rounded-xl border transition-all duration-300 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white text-slate-900 border-slate-200 shadow-xs'}`}>
                            <div className={`text-[10px] uppercase font-sans tracking-widest font-extrabold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Volume Total</div>
                            <div className={`text-2xl font-black font-mono mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{grandTotals.v.toFixed(3)} m³</div>
                            <div className={`text-[9.5px] mt-1 font-mono ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Cubage estimé</div>
                          </div>
                        </div>

                        {/* Mid Row: Interactive SVG Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          
                          {/* Left Visual: Color Qty Distribution */}
                          <div className={`p-4 rounded-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50/50 border-slate-200'}`}>
                            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-350 pb-3 border-b border-white/10 flex items-center justify-between">
                              <span>🎨 Répartition Qty par Couleur</span>
                              <span className="text-[10px] text-slate-500 font-mono">Unité: Pcs</span>
                            </h3>
                            <div className="space-y-4 pt-4">
                              {activeResults.map((res, ci) => {
                                const pct = grandTotals.p > 0 ? (res.totals.p / grandTotals.p) * 100 : 0;
                                return (
                                  <div key={ci} className="space-y-1">
                                    <div className="flex justify-between text-xs font-mono">
                                      <span className={`font-semibold flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                        <span className="w-2.5 h-2.5 rounded-full border border-slate-700/40 shrink-0" style={{ backgroundColor: res.color }} />
                                        {res.nom}
                                      </span>
                                      <span className="text-slate-400">
                                        <b>{res.totals.p} Pcs</b> ({pct.toFixed(1)}%)
                                      </span>
                                    </div>
                                    <div className={`w-full h-3 rounded-full overflow-hidden flex ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                                      <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ backgroundColor: res.color, width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Right Visual: Size Qty Distribution */}
                          <div className={`p-4 rounded-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50/50 border-slate-200'}`}>
                            <h3 className={`text-xs font-mono font-bold uppercase tracking-wider text-slate-350 pb-3 flex items-center justify-between border-b ${
                              darkMode ? 'border-white/10' : 'border-slate-200'
                            }`}>
                              <span>📐 Répartition Qty par Taille</span>
                              <span className="text-[10px] text-slate-500 font-mono">Unité: Pcs</span>
                            </h3>
                            <div className="space-y-3 pt-4 font-mono">
                              {summaryUniqueSizes.map(size => {
                                const sizeSum = activeResults.reduce((acc, r) => acc + (r.totals.sizes[size] || 0), 0);
                                const maxVal = Math.max(...summaryUniqueSizes.map(s => {
                                  return activeResults.reduce((acc, r) => acc + (r.totals.sizes[s] || 0), 0);
                                }), 1);
                                const pctOfMax = (sizeSum / maxVal) * 100;
                                return (
                                  <div key={size} className="flex items-center gap-3">
                                    <span className={`w-12 text-xs font-mono font-bold text-left ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{size}</span>
                                    <div className={`flex-1 h-5 rounded border flex items-center px-1 ${
                                      darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
                                    }`}>
                                      <div
                                        className={`h-3.5 rounded-xs transition-all duration-500 flex items-center justify-end pr-1.5 ${
                                          darkMode ? 'bg-white text-black' : 'bg-slate-800 text-white'
                                        }`}
                                        style={{ width: `${Math.max(pctOfMax, 4)}%` }}
                                      >
                                        {sizeSum > 0 && <span className="text-[9px] font-mono font-bold">{sizeSum}</span>}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                        </div>

                        {/* ⚡ AMÉLIORATIONS SÉLECTIONNÉES : 1. CODE DIAGNOSTIC DE CONFORMITÉ & 4. SIMULATEUR DE FRET/CO2 */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6 font-sans">
                          {/* 🔍 OPTION 1 : DIAGNOSTIC DE CONFORMITÉ, DE SÉCURITÉ & DE COHÉRENCE */}
                          {(() => {
                            const targetQty = Number(meta.qty?.replace(/\s/g, '')) || 0;
                            const qtyDiff = grandTotals.p - targetQty;
                            const isQtyMatch = targetQty === 0 || qtyDiff === 0;

                            // Calculate overweight cartons based on safety limit threshold
                            let overweightCartonsCount = 0;
                            let maxWeightSeen = 0;
                            const overweightDetailsList: string[] = [];

                            activeResults.forEach(res => {
                              res.rows.forEach(row => {
                                const rowCtnWeight = row.grossWeightRow / row.nbr; // weight per carton
                                if (rowCtnWeight > maxWeightSeen) maxWeightSeen = rowCtnWeight;
                                if (rowCtnWeight > safetyWeightLimit) {
                                  overweightCartonsCount += row.nbr;
                                  overweightDetailsList.push(`${row.nbr} ctn ${res.nom} (${rowCtnWeight.toFixed(1)} kg/ctn)`);
                                }
                              });
                            });

                            // Check for empty SKUs
                            let missingSKUCount = 0;
                            activeResults.forEach((res, ci) => {
                              const origIdx = res.colorIndex ?? ci;
                              res.tailles.forEach(t => {
                                const sizeInfo = colors[origIdx]?.sizes[t];
                                if (sizeInfo && sizeInfo.qtyTot > 0 && !sizeInfo.sku) {
                                  missingSKUCount++;
                                }
                              });
                            });

                            // Check for invalid specs
                            let zeroSpecsCount = 0;
                            activeResults.forEach((res, ci) => {
                              const origIdx = res.colorIndex ?? ci;
                              res.tailles.forEach(t => {
                                const sizeInfo = colors[origIdx]?.sizes[t];
                                if (sizeInfo && sizeInfo.qtyTot > 0) {
                                  if ((sizeInfo.wPiece || 0) === 0 || (sizeInfo.wCarton || 0) === 0 || (sizeInfo.cbmUnit || 0) === 0) {
                                    zeroSpecsCount++;
                                  }
                                }
                              });
                            });

                            const hasAlerts = !isQtyMatch || overweightCartonsCount > 0 || missingSKUCount > 0 || zeroSpecsCount > 0;

                            return (
                              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-[#0F0F12] border-white/10' : 'bg-white border-slate-200'} shadow-md flex flex-col justify-between space-y-4`}>
                                <div className="space-y-3">
                                  <div className={`flex items-center justify-between border-b pb-3 ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                                    <div className="flex items-center gap-2">
                                      <Scale className="w-5 h-5 text-white" />
                                      <h3 className={`text-xs font-mono font-bold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                        🔍 Option 1 : Diagnostic & Alertes Sécurité
                                      </h3>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider ${
                                      darkMode
                                        ? 'bg-white/10 text-white border border-white/25'
                                        : !hasAlerts
                                          ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/20'
                                          : 'bg-amber-500/15 text-amber-800 border border-amber-500/20'
                                    }`}>
                                      {!hasAlerts ? '✓ Conforme' : '⚠️ Attention'}
                                    </span>
                                  </div>

                                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                                    Ce module de vérification inspecte continuellement la cohérence de vos données de colisage par rapport à l'ordre d'expédition et évalue les normes de manutention physique des boîtes.
                                  </p>

                                  {/* Safe weight limit slider */}
                                  <div className={`p-3 rounded-xl border space-y-1.5 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center justify-between text-xs font-mono">
                                      <span className={`font-bold flex items-center gap-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        <Sliders className="w-3.5 h-3.5 text-slate-500" />
                                        Seuil Poids de Manutention :
                                      </span>
                                      <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{safetyWeightLimit} kg / Carton</span>
                                    </div>
                                    <input
                                      type="range"
                                      min="8"
                                      max="25"
                                      step="1"
                                      value={safetyWeightLimit}
                                      onChange={(e) => setSafetyWeightLimit(Number(e.target.value))}
                                      className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-white bg-slate-800"
                                    />
                                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                                      <span>8 kg (Léger)</span>
                                      <span>15 kg (Recommandé)</span>
                                      <span>25 kg (Maximum)</span>
                                    </div>
                                  </div>

                                  {/* Diagnostic list items */}
                                  <div className="space-y-2.5 pt-2">
                                    {/* 1. Target Qty discrepancy */}
                                    <div className="flex items-start gap-2.5 text-xs font-mono">
                                      {isQtyMatch ? (
                                        <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${darkMode ? 'text-white' : 'text-emerald-500'}`} />
                                      ) : (
                                        <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 animate-pulse ${darkMode ? 'text-white' : 'text-rose-500'}`} />
                                      )}
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className={`font-semibold ${darkMode ? 'text-white' : isQtyMatch ? 'text-slate-700' : 'text-rose-700'}`}>
                                            Quantité de commande vs Validée
                                          </span>
                                          {!isQtyMatch && targetQty > 0 && grandTotals.p > 0 && (
                                            <button
                                              type="button"
                                              onClick={handleScaleQuantitiesToTarget}
                                              className={`px-2 py-0.5 border rounded text-[9px] font-mono font-bold transition-all uppercase cursor-pointer flex items-center gap-1 ${
                                                darkMode 
                                                  ? 'bg-white text-black hover:bg-slate-200 border-white/30' 
                                                  : 'bg-rose-50 hover:bg-rose-500 text-rose-750 hover:text-white border border-rose-200'
                                              }`}
                                              title="Ajuste proportionnellement toutes les tailles pour que la somme réélle atteigne exactement la cible"
                                            >
                                              ⚖️ Auto-Ajuster
                                            </button>
                                          )}
                                        </div>
                                        <span className={`block text-[11px] mt-0.5 font-sans ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                          {targetQty === 0 
                                            ? "Aucune quantité cible spécifiée dans l'en-tête." 
                                            : isQtyMatch 
                                              ? `Correspondance parfaite à ${grandTotals.p} Pcs.` 
                                              : `Écart de ${Math.abs(qtyDiff)} Pcs (Cible: ${targetQty} Pcs / Packé: ${grandTotals.p} Pcs)`
                                          }
                                        </span>
                                      </div>
                                    </div>

                                    {/* 2. Overweight cartons */}
                                    <div className="flex items-start gap-2.5 text-xs font-mono">
                                      {overweightCartonsCount === 0 ? (
                                        <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${darkMode ? 'text-white' : 'text-emerald-500'}`} />
                                      ) : (
                                        <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${darkMode ? 'text-white' : 'text-amber-500'}`} />
                                      )}
                                      <div className="flex-1">
                                        <span className={`font-semibold ${darkMode ? 'text-white' : overweightCartonsCount === 0 ? 'text-slate-700' : 'text-amber-700'}`}>
                                          Limites ergonomiques de poids
                                        </span>
                                        <span className={`block text-[11px] mt-0.5 font-sans ${darkMode ? 'text-slate-450' : 'text-slate-550'}`}>
                                          {overweightCartonsCount === 0 
                                            ? `Tous les cartons respectent la limite de sécurité humaine (${safetyWeightLimit} kg).` 
                                            : `${overweightCartonsCount} carton(s) dépasse(nt) le seuil sécurisé (${safetyWeightLimit} kg). Danger de fatigue physique lors de la manutention.`
                                          }
                                        </span>
                                        {overweightDetailsList.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1.5">
                                            {overweightDetailsList.slice(0, 3).map((det, di) => (
                                              <span key={di} className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                                darkMode 
                                                  ? 'bg-white/10 text-white border-white/20' 
                                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                                              }`}>
                                                {det}
                                              </span>
                                            ))}
                                            {overweightDetailsList.length > 3 && (
                                              <span className="text-[9.5px] text-slate-500 self-center font-bold">
                                                +{overweightDetailsList.length - 3} autres
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* 3. Missing SKUs */}
                                    <div className="flex items-start gap-2.5 text-xs font-mono">
                                      {missingSKUCount === 0 ? (
                                        <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${darkMode ? 'text-white' : 'text-emerald-500'}`} />
                                      ) : (
                                        <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 animate-pulse ${darkMode ? 'text-white' : 'text-[#ff5000]'}`} />
                                      )}
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className={`font-semibold ${darkMode ? 'text-white' : missingSKUCount === 0 ? 'text-slate-700' : 'text-amber-700'}`}>
                                            Vérification des codes SKU
                                          </span>
                                          {missingSKUCount > 0 && (
                                            <button
                                              type="button"
                                              onClick={handleAutoFixSKUs}
                                              className={`px-2 py-0.5 border rounded text-[9px] font-mono font-bold transition-all uppercase cursor-pointer flex items-center gap-1 ${
                                                darkMode 
                                                  ? 'bg-white text-black hover:bg-slate-200 border-white/30' 
                                                  : 'bg-orange-50 text-[#ff5000] border border-orange-200 hover:bg-[#ff5000] hover:text-white'
                                              }`}
                                              title="Auto-générer les codes SKU manquants (ex: STYLE-COLOR-SIZE)"
                                            >
                                              ⚡ Corriger ({missingSKUCount})
                                            </button>
                                          )}
                                        </div>
                                        <span className={`block text-[11px] mt-0.5 font-sans ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                          {missingSKUCount === 0 
                                            ? "Tous les articles packés contiennent un code SKU valide." 
                                            : `${missingSKUCount} variante(s) de taille manque(nt) de code SKU. Risque d'erreur d'inventaire.`
                                          }
                                        </span>
                                      </div>
                                    </div>

                                    {/* 4. Complete dimensions and weights details */}
                                    <div className="flex items-start gap-2.5 text-xs font-mono">
                                      {zeroSpecsCount === 0 ? (
                                        <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${darkMode ? 'text-white' : 'text-emerald-500'}`} />
                                      ) : (
                                        <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 animate-pulse ${darkMode ? 'text-white' : 'text-rose-500'}`} />
                                      )}
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className={`font-semibold ${darkMode ? 'text-white' : zeroSpecsCount === 0 ? 'text-slate-700' : 'text-rose-700'}`}>
                                            Fiche technique & Dimensions
                                          </span>
                                          {zeroSpecsCount > 0 && (
                                            <button
                                              type="button"
                                              onClick={handleAutoFixSpecs}
                                              className={`px-2 py-0.5 border rounded text-[9px] font-mono font-bold transition-all uppercase cursor-pointer flex items-center gap-1 ${
                                                darkMode 
                                                  ? 'bg-white text-black hover:bg-slate-200 border-white/30' 
                                                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-500 hover:text-white'
                                              }`}
                                              title="Remplir automatiquement les tailles à 0 à partir d'une taille existante ou des dimensions standard"
                                            >
                                              🔧 Réparer ({zeroSpecsCount})
                                            </button>
                                          )}
                                        </div>
                                        <span className={`block text-[11px] mt-0.5 font-sans ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                          {zeroSpecsCount === 0 
                                            ? "Les dimensions de cartons et poids unitaires de toutes les tailles sont renseignés." 
                                            : `${zeroSpecsCount} tailles possèdent des coefficients de dimensions ou de poids à zéro. Les calculs de m³ et de kg sont incomplets.`
                                          }
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-[10px] text-slate-500 font-mono text-right pt-2.5 border-t border-slate-800/40">
                                  Poids unitaire Max détecté : <span className="text-slate-300 font-bold">{maxWeightSeen.toFixed(2)} kg</span>
                                </div>
                              </div>
                            );
                          })()}

                          {/* 💰 OPTION 4 : ESTIMATEUR FINANCIER & ANALYSE CARBONE DE FRET */}
                          {(() => {
                            // Calculate Freight Prices
                            const seaCalculatedTotal = grandTotals.v * seaRate;
                            const airCalculatedTotal = grandTotals.g * airRate;
                            const roadCalculatedTotal = grandTotals.v * roadRate;

                            // Calculate CO2 emissions
                            // Formula: Tons * Distance * transportIntensityFactor (kg CO2 / ton-km)
                            // Sea: 0.040 kg / t-km
                            // Air: 0.500 kg / t-km
                            // Road: 0.100 kg / t-km
                            const totalTons = grandTotals.g / 1000;
                            const seaCO2 = totalTons * freightDistance * 0.040;
                            const airCO2 = totalTons * freightDistance * 0.500;
                            const roadCO2 = totalTons * freightDistance * 0.100;

                            return (
                              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-[#151926] border-slate-800' : 'bg-white border-slate-200'} shadow-md flex flex-col justify-between space-y-4`}>
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                                    <div className="flex items-center gap-2">
                                      <Coins className="w-5 h-5 text-indigo-400 animate-pulse" />
                                      <h3 className={`text-xs font-mono font-bold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                        💰 Option 4 : Coût Fret & Bilan Carbone
                                      </h3>
                                    </div>
                                    {/* Currency Switcher selector */}
                                    <div className="flex items-center gap-1 bg-[#1a1f2e] border border-slate-700/60 p-0.5 rounded-md">
                                      <button
                                        type="button"
                                        onClick={() => setCurrency('€')}
                                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                                          currency === '€' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-white'
                                        }`}
                                      >
                                        EUR (€)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setCurrency('$')}
                                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                                          currency === '$' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-white'
                                        }`}
                                      >
                                        USD ($)
                                      </button>
                                    </div>
                                  </div>

                                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                                    Estimez instantanément les frais logistiques internationaux et l'impact de Gaz à Effet de Serre (GES CO2) associés à votre cargaison pour les différents modes de transit.
                                  </p>

                                  {/* Distance Slider container */}
                                  <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1.5">
                                    <div className="flex items-center justify-between text-xs font-mono">
                                      <span className="text-slate-400 font-bold flex items-center gap-1">
                                        <Globe className="w-3.5 h-3.5 text-slate-500" />
                                        Distance estimée du trajet :
                                      </span>
                                      <span className="text-indigo-400 font-bold">{freightDistance.toLocaleString('fr-FR')} km</span>
                                    </div>
                                    <input
                                      type="range"
                                      min="200"
                                      max="18000"
                                      step="100"
                                      value={freightDistance}
                                      onChange={(e) => setFreightDistance(Number(e.target.value))}
                                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                                      <span>200 km</span>
                                      <span>6 500 km</span>
                                      <span>18 000 km</span>
                                    </div>
                                  </div>

                                  {/* Interactive Rates inputs block */}
                                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                                    <div className="p-2 border border-slate-800 rounded-lg bg-slate-900/40 text-center">
                                      <span className="text-slate-500 text-[9px] uppercase font-bold block mb-1">Fret Mer (CBM)</span>
                                      <div className="flex items-center justify-center gap-1">
                                        <input
                                          type="number"
                                          value={seaRate}
                                          onChange={(e) => setSeaRate(Math.max(0, Number(e.target.value)))}
                                          className={`w-12 bg-transparent text-center font-bold focus:outline-none transition-all rounded p-0.5 text-xs ${
                                            darkMode ? 'text-slate-200' : 'text-slate-800'
                                          }`}
                                        />
                                        <span className="text-slate-400 text-[10px]">{currency}</span>
                                      </div>
                                    </div>
                                    <div className="p-2 border border-slate-800 rounded-lg bg-slate-900/40 text-center">
                                      <span className="text-slate-500 text-[9px] uppercase font-bold block mb-1">Fret Air (KG)</span>
                                      <div className="flex items-center justify-center gap-1">
                                        <input
                                          type="number"
                                          step="0.1"
                                          value={airRate}
                                          onChange={(e) => setAirRate(Math.max(0, Number(e.target.value)))}
                                          className={`w-12 bg-transparent text-center font-bold focus:outline-none transition-all rounded p-0.5 text-xs ${
                                            darkMode ? 'text-slate-200' : 'text-slate-800'
                                          }`}
                                        />
                                        <span className="text-slate-400 text-[10px]">{currency}</span>
                                      </div>
                                    </div>
                                    <div className="p-2 border border-slate-800 rounded-lg bg-slate-900/40 text-center">
                                      <span className="text-slate-500 text-[9px] uppercase font-bold block mb-1">Fret Route (CBM)</span>
                                      <div className="flex items-center justify-center gap-1">
                                        <input
                                          type="number"
                                          value={roadRate}
                                          onChange={(e) => setRoadRate(Math.max(0, Number(e.target.value)))}
                                          className={`w-12 bg-transparent text-center font-bold focus:outline-none transition-all rounded p-0.5 text-xs ${
                                            darkMode ? 'text-slate-200' : 'text-slate-800'
                                          }`}
                                        />
                                        <span className="text-slate-400 text-[10px]">{currency}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Transit modes details matrix */}
                                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono">
                                    <div className="p-2 rounded-lg border border-slate-800 bg-[#34495e]/5 text-center flex flex-col justify-between h-20">
                                      <div className="flex items-center justify-center gap-1 text-slate-450 font-bold mb-1">
                                        <Ship className="w-3.5 h-3.5 text-blue-400" />
                                        <span>Mer</span>
                                      </div>
                                      <div className="mt-auto space-y-0.5">
                                        <div className="text-[12px] font-black text-slate-200">
                                          {seaCalculatedTotal.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {currency}
                                        </div>
                                        <div className="text-[9px] text-emerald-400 font-bold flex items-center justify-center gap-0.5">
                                          <Leaf className="w-2.5 h-2.5 shrink-0 text-emerald-400" />
                                          <span>{seaCO2.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} kg</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="p-2 rounded-lg border border-slate-800 bg-[#34495e]/5 text-center flex flex-col justify-between h-20">
                                      <div className="flex items-center justify-center gap-1 text-slate-455 font-bold mb-1">
                                        <Plane className="w-3.5 h-3.5 text-rose-500" />
                                        <span>Air</span>
                                      </div>
                                      <div className="mt-auto space-y-0.5">
                                        <div className="text-[12px] font-black text-slate-200">
                                          {airCalculatedTotal.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {currency}
                                        </div>
                                        <div className="text-[9px] text-rose-500 font-bold flex items-center justify-center gap-0.5">
                                          <span>⚠️ {airCO2.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} kg</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="p-2 rounded-lg border border-slate-800 bg-[#34495e]/5 text-center flex flex-col justify-between h-20">
                                      <div className="flex items-center justify-center gap-1 text-slate-450 font-bold mb-1">
                                        <Truck className="w-3.5 h-3.5 text-yellow-500" />
                                        <span>Route</span>
                                      </div>
                                      <div className="mt-auto space-y-0.5">
                                        <div className="text-[12px] font-black text-slate-200">
                                          {roadCalculatedTotal.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {currency}
                                        </div>
                                        <div className="text-[9px] text-yellow-500 font-bold flex items-center justify-center gap-0.5">
                                          <span>{roadCO2.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} kg</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-[10px] text-slate-500 font-mono text-center pt-3 border-t border-slate-800/40">
                                  Bilan CO₂ estimé sur <span className="text-slate-350 font-bold">{(grandTotals.g / 1000).toFixed(3)} t</span> de fret
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* 📦 ESTIMATEUR DE PALETTISATION & SIMULATEUR DE CHARGEMENT */}
                        <div className={`mt-6 p-5 rounded-2xl border ${darkMode ? 'bg-[#151926] border-slate-800' : 'bg-white border-slate-200'} shadow-md space-y-5 font-sans`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                              <h3 className={`text-xs font-mono font-bold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                📦 Simulateur Logistique : Palettisation & Chargement Conteneur
                              </h3>
                            </div>
                            {/* Pallet Switcher Selector */}
                            <div className="flex items-center gap-1 bg-[#1a1f2e] border border-slate-700/60 p-1 rounded-lg">
                              <button
                                type="button"
                                onClick={() => setPalletType('EUR')}
                                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                  palletType === 'EUR'
                                    ? 'bg-indigo-600 text-white shadow'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                Palette EUR (120x80cm)
                              </button>
                              <button
                                type="button"
                                onClick={() => setPalletType('US')}
                                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                  palletType === 'US'
                                    ? 'bg-indigo-600 text-white shadow'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                Palette US (120x100cm)
                              </button>
                            </div>
                          </div>

                          {/* Calculations for pallets */}
                          {(() => {
                            const palletVolumeLimit = palletType === 'EUR' ? 1.392 : 1.764; // holds ~1.39m3 & 1.76m3 stacked safely at max loading height
                            const palletWeightLimit = palletType === 'EUR' ? 1500 : 2000;
                            
                            const pctVolumeOfOnePallet = (grandTotals.v / palletVolumeLimit) * 100;
                            const palletsNeededFraction = grandTotals.v / palletVolumeLimit;
                            const fullPalletsCount = Math.floor(palletsNeededFraction);
                            const lastPalletFilling = Math.round((palletsNeededFraction - fullPalletsCount) * 100);
                            const totalPalletsNeeded = Math.ceil(palletsNeededFraction) || 0;

                            // Containers
                            const gp20Pct = Math.min((grandTotals.v / 33) * 100, 100);
                            const gp40Pct = Math.min((grandTotals.v / 67) * 100, 100);
                            const hc40Pct = Math.min((grandTotals.v / 76) * 100, 100);

                            // Recommend best container format
                            let recommendedContainer = 'Conteneur 20 pieds Standard (20ft GP)';
                            let recommendedColor = 'text-emerald-400';
                            let recommendedBg = 'border-emerald-500/30 bg-emerald-500/5';
                            if (grandTotals.v > 67) {
                              recommendedContainer = 'Conteneur 40 pieds High Cube (40ft HC)';
                              recommendedColor = 'text-amber-400';
                              recommendedBg = 'border-amber-500/30 bg-amber-500/5';
                            } else if (grandTotals.v > 33) {
                              recommendedContainer = 'Conteneur 40 pieds Standard (40ft GP)';
                              recommendedColor = 'text-indigo-400';
                              recommendedBg = 'border-indigo-500/30 bg-indigo-500/5';
                            }

                            return (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
                                {/* Left: Statistics report card */}
                                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-4`}>
                                  <div className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400 pb-2 border-b border-slate-800/45">
                                    📋 ANALYSE DE SURCHARGE & VOLUMÉTRIES
                                  </div>
                                  <div className="space-y-3 font-mono">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-500 font-bold">Volume total cargaison :</span>
                                      <span className="font-semibold text-slate-200">{grandTotals.v.toFixed(3)} m³</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-500 font-bold">Poids total cargaison :</span>
                                      <span className="font-semibold text-teal-400">{grandTotals.g.toFixed(1)} kg</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-500 font-bold">Limites par palette :</span>
                                      <span className="text-slate-400 text-[11px] font-semibold">{palletWeightLimit} kg / {palletVolumeLimit} m³</span>
                                    </div>
                                    <div className="border-t border-slate-800/60 pt-2 flex flex-col gap-1">
                                      <span className="text-[10px] text-slate-500 uppercase font-black">Estimation d'espace palettes :</span>
                                      <span className="text-sm font-black text-[#ff5000]">
                                        {totalPalletsNeeded === 0 
                                          ? 'Aucune palette' 
                                          : `${totalPalletsNeeded} Palettes requises`
                                        }
                                      </span>
                                      {fullPalletsCount > 0 && (
                                        <span className="text-[10.5px] text-slate-400">
                                          ({fullPalletsCount} palette(s) à 100% {lastPalletFilling > 0 ? `+ 1 remplie à ${lastPalletFilling}%` : ''})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Center: Interactive dynamic visual palletizing cards stack representation */}
                                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/45 border-slate-800/80 shadow-inner' : 'bg-slate-50 border-slate-200'} flex flex-col justify-between h-full`}>
                                  <div className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400 pb-2 border-b border-slate-800/45">
                                    🏢 MODULE DE GERBAGE DES PALETTES
                                  </div>
                                  <div className="flex items-end justify-center gap-1.5 py-4 h-24">
                                    {totalPalletsNeeded === 0 ? (
                                      <div className="text-xs text-slate-500 text-center uppercase font-mono">Aucun colis à charger</div>
                                    ) : (
                                      Array.from({ length: Math.min(totalPalletsNeeded, 8) }).map((_, index) => {
                                        const isLast = index === totalPalletsNeeded - 1;
                                        const fillPercent = isLast && lastPalletFilling > 0 ? lastPalletFilling : 100;
                                        return (
                                          <div key={index} className="flex flex-col items-center gap-1.5 w-6 group relative">
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full mb-1.5 hidden group-hover:flex bg-slate-900 text-[10px] text-white p-1 rounded font-mono shadow-md whitespace-nowrap z-50">
                                              Palette #{index + 1} ({fillPercent}% Pleine)
                                            </div>
                                            {/* Pallet structure layout */}
                                            <div className="w-full h-14 bg-slate-900 border border-slate-700/60 rounded-sm flex flex-col justify-end overflow-hidden p-0.5">
                                              <div
                                                className="w-full bg-gradient-to-t from-indigo-500 to-indigo-600 rounded-xs transition-all duration-700"
                                                style={{ height: `${fillPercent}%` }}
                                              />
                                            </div>
                                            {/* Wooden board */}
                                            <div className="h-1 w-full bg-amber-700/80 rounded-full" />
                                            <span className="text-[9px] font-mono text-slate-500 font-bold">P{index + 1}</span>
                                          </div>
                                        );
                                      })
                                    )}
                                    {totalPalletsNeeded > 8 && (
                                      <div className="text-slate-400 text-xs font-bold self-center font-mono pl-1">+{totalPalletsNeeded - 8} ...</div>
                                    )}
                                  </div>
                                  <p className="text-[10.5px] text-slate-500 text-center font-semibold">
                                    Hauteur empilement conseillée : ~1.45m maximum
                                  </p>
                                </div>

                                {/* Right: Container Space Projections options */}
                                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'} flex flex-col justify-between gap-3`}>
                                  <div>
                                    <div className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400 pb-2 border-b border-slate-800/45">
                                      🛳️ UTILISATION DU CONTENEUR MARITIME
                                    </div>
                                    <div className="space-y-2.5 pt-3">
                                      {/* GP 20 */}
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-[11px] font-mono">
                                          <span className="text-slate-400">Conteneur 20 pieds (33m³)</span>
                                          <span className="text-slate-350">{gp20Pct.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                          <div className={`h-full rounded-full ${gp20Pct >= 98 ? 'bg-indigo-650' : gp20Pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${gp20Pct}%` }} />
                                        </div>
                                      </div>
                                      {/* GP 40 */}
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-[11px] font-mono">
                                          <span className="text-slate-400">Conteneur 40 pieds (67m³)</span>
                                          <span className="text-slate-350">{gp40Pct.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-850 rounded-full overflow-hidden">
                                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${gp40Pct}%` }} />
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Recommendation panel */}
                                  <div className={`p-2.5 rounded-lg border text-xs leading-normal ${recommendedBg} ${recommendedColor}`}>
                                    <span className="text-[9.5px] font-mono font-black uppercase tracking-wider block">Option recommandée :</span>
                                    <p className="font-bold text-[11px] font-sans mt-0.5">{recommendedContainer}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Bottom Row: Detailed Recap Matrix */}
                        <div className="mt-6 border-t border-slate-800 pt-6">
                          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-350 mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-3 bg-teal-400 rounded-sm" />
                            <span>📋 Tableau de Synthèse des totaux par couleur</span>
                          </h3>
                           <div className={`overflow-x-auto rounded-xl border ${darkMode ? 'border-slate-800 bg-slate-900/10' : 'border-slate-200 bg-slate-50/50'}`}>
                             <table className="w-full text-xs text-center border-collapse">
                               <thead>
                                 <tr className="font-mono font-bold text-[11px] border-b text-white" style={{ backgroundColor: '#ba66f7' }}>
                                   <th className="py-2.5 px-3 text-left">Couleur</th>
                                   <th className="py-2.5">Total Cartons</th>
                                   <th className="py-2.5">Style d'emballage</th>
                                   <th className="py-2.5">Total Pièces</th>
                                   <th className={`py-2.5 font-bold ${darkMode ? 'text-teal-400' : 'text-teal-700 font-bold'}`}>Poids Net</th>
                                   <th className={`py-2.5 font-bold ${darkMode ? 'text-red-500' : 'text-red-700 font-bold'}`}>Poids Brut</th>
                                 </tr>
                               </thead>
                               <tbody className={`divide-y font-mono ${darkMode ? 'divide-slate-800/65' : 'divide-slate-200'}`}>
                                 {activeResults.map((res, ci) => (
                                   <tr key={ci} className={darkMode ? 'hover:bg-slate-800/25' : 'hover:bg-slate-100/50'}>
                                     <td className={`py-2.5 px-3 text-left font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                       <div className="flex items-center gap-1.5 justify-start">
                                         <span className="w-2.5 h-2.5 rounded-full border border-slate-700/40 shrink-0" style={{ backgroundColor: res.color }} />
                                         <span>{res.nom}</span>
                                       </div>
                                     </td>
                                     <td className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>{res.totals.c}</td>
                                     <td className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                       {res.mode === 'strict_solide' ? '🔒 SOLID PACK' : '🔀 MIXED PACK'}
                                     </td>
                                     <td className={`font-bold ${darkMode ? 'text-amber-500' : 'text-amber-700'}`}>{res.totals.p} Pcs</td>
                                     <td className={`font-semibold ${darkMode ? 'text-teal-400' : 'text-teal-700'}`}>{res.totals.n.toFixed(1)} KG</td>
                                     <td className={`font-semibold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{res.totals.g.toFixed(1)} KG</td>
                                  </tr>
                                ))}
                                <tr className="bg-amber-500/10 dark:bg-amber-955/30 text-amber-800 dark:text-amber-400 font-extrabold border-t-2 border-t-amber-500/80">
                                  <td className="py-3 px-3 text-left font-black">TOTAL EXPÉDITION</td>
                                  <td className="font-extrabold">{grandTotals.c}</td>
                                  <td className="text-amber-600 dark:text-amber-500 text-[10px] font-bold">MULTICOLORE / MULTISIZE</td>
                                  <td className="text-amber-600 dark:text-amber-300 font-black">{grandTotals.p} Pcs</td>
                                  <td className="font-bold text-[#0e7490] dark:text-[#38bdf8]">{grandTotals.n.toFixed(1)} KG</td>
                                  <td className="font-bold text-[#b91c1c] dark:text-[#f87171]">{grandTotals.g.toFixed(1)} KG</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* 📦 BORDEREAU COMPLET DU PACKING LIST PAR CARTONS */}
                        <div className="mt-8 border-t border-slate-800 pt-6">
                          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-350 mb-4 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <span className="w-1.5 h-3 bg-emerald-500 rounded-sm" />
                              <span>📦 DÉTAILS COMPLETS DU PACKING LIST PAR CARTONS</span>
                            </span>
                          </h3>
                          <div className="space-y-6">
                            {activeResults.map((res, ci) => {
                              const origIdx = res.colorIndex ?? ci;
                              const activeColorSizes = res.tailles.filter(t => isStandardSizeAlwaysShown(t) || (colors[origIdx]?.sizes[t]?.qtyTot || 0) > 0);
                              return (
                                <div key={ci} className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-950/25 border-slate-900/60' : 'bg-slate-50 border-slate-250/60'}`}>
                                  <div className={`flex items-center gap-2 border-b border-dashed border-slate-850/40 pb-2 mb-3 text-xs font-mono font-bold uppercase ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    <div className="w-2.5 h-2.5 rounded-full border border-slate-700/40" style={{ backgroundColor: res.color }} />
                                    <span>Couleur: {res.nom} — {res.mode === 'strict_solide' ? '🔒 Solid Pack' : '🔀 Mixed Pack'}</span>
                                  </div>
                                  <div className={`overflow-x-auto rounded-lg border ${
                                    darkMode ? 'border-slate-800 bg-slate-900/10' : 'border-slate-200 bg-slate-100/10'
                                  }`}>
                                    <table className="w-full text-xs text-center border-collapse">
                                      <thead>
                                        <tr className="border-b font-mono font-bold text-[11px] text-white" style={{ backgroundColor: '#ba66f7' }}>
                                          <th className={`py-2 px-1 uppercase text-center border-r ${darkMode ? 'border-slate-800' : 'border-slate-250'}`}>Début</th>
                                          <th className={`py-2 px-1 uppercase text-center border-r ${darkMode ? 'border-slate-800' : 'border-slate-250'}`}>Fin</th>
                                          {activeColorSizes.map(t => (
                                            <th key={t} className={`px-1.5 border-r ${darkMode ? 'border-slate-800 text-white font-bold' : 'border-slate-250 text-slate-800 font-bold'}`}>{t}</th>
                                          ))}
                                          <th className={`px-1.5 border-r ${darkMode ? 'border-slate-800' : 'border-slate-250'}`}>Pcs/Ctn</th>
                                          <th className={`px-1.5 border-r ${darkMode ? 'border-slate-800' : 'border-slate-250'}`}>Nb Ctn</th>
                                          <th className={`px-1.5 border-r ${darkMode ? 'border-slate-800' : 'border-slate-250'}`}>Total Qty</th>
                                          <th className={`px-1.5 border-r col-net-metric ${darkMode ? 'border-slate-800 text-teal-400' : 'border-slate-250 text-teal-700 font-bold'}`}>N.W (KG)</th>
                                          <th className={`px-1.5 col-gross-metric ${darkMode ? 'text-red-400' : 'text-red-700 font-bold'}`}>G.W (KG)</th>
                                        </tr>
                                      </thead>
                                      <tbody className={`divide-y font-mono ${darkMode ? 'divide-slate-800/40' : 'divide-slate-200'}`}>
                                        {res.rows.map((row, rIdx) => (
                                          <tr key={rIdx} className={`hover:bg-slate-800/10 divide-x ${darkMode ? 'divide-slate-800/30' : 'divide-slate-200'}`}>
                                            <td className={`py-1.5 px-1 font-bold ${darkMode ? 'text-slate-400' : 'text-slate-800'}`}>{parseCartonRange(row.cartonRange).start}</td>
                                            <td className={`py-1.5 px-1 font-bold ${darkMode ? 'text-slate-400' : 'text-slate-800'}`}>{parseCartonRange(row.cartonRange).end}</td>
                                            {activeColorSizes.map(t => (
                                              <td key={t} className={`px-1.5 font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{row.sizes[t] || ''}</td>
                                            ))}
                                            <td className={`px-1.5 font-bold ${darkMode ? 'bg-slate-900/10 text-slate-200' : 'bg-slate-100/40 text-slate-800'}`}>{row.pcsPerCarton}</td>
                                            <td className={`px-1.5 font-bold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{row.nbr}</td>
                                            <td className={`px-1.5 font-bold ${darkMode ? 'text-slate-300' : 'text-slate-950'}`}>{row.totalPcs}</td>
                                            <td className="px-1.5 text-teal-400 font-semibold">{row.netWeightRow.toFixed(1)}</td>
                                            <td className="px-1.5 text-red-500 font-semibold">{row.grossWeightRow.toFixed(1)}</td>
                                          </tr>
                                        ))}
                                        <tr className={`font-bold border-t divide-x ${
                                          darkMode 
                                            ? 'bg-amber-500/5 text-amber-400 border-slate-800 divide-slate-800' 
                                            : 'bg-amber-500/5 text-amber-850 border-slate-200 divide-slate-200'
                                        }`}>
                                          <td colSpan={2} className="py-1.5 px-2">Total {res.nom}</td>
                                          {activeColorSizes.map(t => (
                                            <td key={t} className={darkMode ? 'text-slate-400' : 'text-slate-700'}>{res.totals.sizes[t] || 0}</td>
                                          ))}
                                          <td>—</td>
                                          <td className="px-1.5">{res.totals.c} ctns</td>
                                          <td className="px-1.5 text-amber-600 dark:text-amber-300">{res.totals.p} pcs</td>
                                          <td className="px-1.5 text-teal-400">{res.totals.n.toFixed(1)} KG</td>
                                          <td className="px-1.5 text-red-500">{res.totals.g.toFixed(1)} KG</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeInputTab === 'saves' && (
                <motion.div
                  key="saves-section"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {/* SAVE CREATOR GRID CONTROL */}
                  <div className={`rounded-xl border p-5 ${darkMode ? 'bg-[#161a23] border-slate-800' : 'bg-white border-slate-200'} space-y-4 shadow-sm`}>
                    <div className="flex items-center justify-between border-b pb-3 border-dashed border-slate-800/60">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-4 bg-blue-500 rounded-sm" />
                        <h2 className={`text-xs font-mono font-bold tracking-wider ${darkMode ? 'text-slate-100' : 'text-slate-700'} uppercase`}>
                          💾 Sauvegarder la Fiche Actuelle
                        </h2>
                      </div>

                      {/* Autosave Switcher */}
                      <button
                        onClick={() => setIsAutosaveEnabled(!isAutosaveEnabled)}
                        className={`px-3 py-1.5 rounded-lg border font-mono text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                          isAutosaveEnabled
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}
                        title="Désactiver ou réactiver l'enregistrement automatique sur le navigateur"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isAutosaveEnabled ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
                        <span>SAUVEGARDE AUTO : {isAutosaveEnabled ? 'ACTIVE' : 'ASSOUPIE'}</span>
                      </button>
                    </div>

                    <div className="pt-2 space-y-3">
                      <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        L'enregistrement automatique stocke vos modifications en temps réel. 
                        Vous pouvez aussi figer des <strong>instantanés d'étapes nommés</strong> de vos fiches de colisage ci-dessous.
                      </p>

                      <div className="flex flex-col sm:flex-row items-stretch gap-3 pt-1">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={saveNameInput}
                            onChange={(e) => setSaveNameInput(e.target.value)}
                            placeholder="Saisir un nom de sauvegarde personnalisé (vide = auto-génération)"
                            className={`w-full text-xs font-mono rounded-lg border px-3 py-2.5 focus:outline-none transition-all ${
                              darkMode ? 'bg-[#1f2430] border-slate-800 text-white focus:border-blue-500' : 'bg-[#f4f6fb] border-slate-300 text-slate-900 focus:border-[#4f8ef7]'
                            }`}
                          />
                        </div>
                        <button
                          onClick={() => handleSaveCurrentList(saveNameInput)}
                          className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-[#4f8ef7] hover:brightness-110 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/10 hover:scale-[1.01] active:scale-[0.99]"
                        >
                          <Save className="w-4 h-4" />
                          <span>CRÉER UN INSTANTANÉ</span>
                        </button>
                      </div>

                      {/* Flash feedback alerts */}
                      <AnimatePresence mode="wait">
                        {savesSuccess && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono rounded-lg font-bold"
                          >
                            {savesSuccess}
                          </motion.div>
                        )}
                        {savesError && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono rounded-lg font-bold"
                          >
                            {savesError}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* SAVED SLOTS GRID */}
                  <div className={`rounded-xl border p-5 ${darkMode ? 'bg-[#161a23] border-slate-800' : 'bg-white border-slate-200'} space-y-4 shadow-sm pb-6`}>
                    <div className="flex items-center justify-between border-b pb-3 border-dashed border-slate-800/60 font-mono">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-4 bg-purple-500 rounded-sm" />
                        <h2 className={`text-xs font-mono font-bold tracking-wider ${darkMode ? 'text-slate-100' : 'text-slate-700'} uppercase`}>
                          🗄️ Historique & Fiches Enregistrées ({savedLists.length})
                        </h2>
                      </div>
                    </div>

                    {savedLists.length === 0 ? (
                      <div className="text-center py-10 px-4 space-y-3">
                        <div className="w-12 h-12 bg-slate-800/30 text-slate-500 rounded-full flex items-center justify-center mx-auto">
                          <History className="w-6 h-6 animate-pulse" />
                        </div>
                        <div className="space-y-1">
                          <h4 className={`text-xs font-bold font-mono uppercase ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Aucune fiche sauvegardée</h4>
                          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                            Toutes vos fiches de colisage de cartons solides ou mixtes peuvent être archivées localement sur ce navigateur. 
                            Créez-en une en utilisant le module ci-dessus !
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {savedLists.map((item) => {
                          const isAutosaveEquivalent = meta.order === item.meta.order && meta.customer === item.meta.customer && meta.style === item.meta.style;
                          
                          return (
                            <div
                              key={item.id}
                              className={`p-4 border rounded-xl transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                                darkMode 
                                  ? isAutosaveEquivalent
                                    ? 'bg-[#18233c]/60 border-blue-500/40 hover:border-blue-500/60 shadow-[#4f8ef7]/5'
                                    : 'bg-[#1e2330]/50 border-slate-800 hover:border-slate-700'
                                  : isAutosaveEquivalent
                                    ? 'bg-[#f4f7fc] border-blue-400/60 hover:border-blue-500/65 shadow-xs'
                                    : 'bg-[#fcfdfe] border-slate-250 hover:border-slate-350'
                              }`}
                            >
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className={`text-xs font-bold font-sans ${darkMode ? 'text-white' : 'text-slate-800'} truncate max-w-xl`}>
                                    {item.name}
                                  </h4>
                                  {isAutosaveEquivalent && (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase font-mono bg-blue-500/15 border border-blue-500/30 text-[#4f8ef7]" title="Cette fiche correspond aux en-têtes actuellement ouverts">
                                      Ouvert
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-slate-400">
                                  <span>📅 {new Date(item.savedAt).toLocaleDateString('fr-FR')} {new Date(item.savedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                  <span>•</span>
                                  <span>🏭 Client: <strong className={darkMode ? 'text-slate-350': 'text-slate-700'}>{item.meta.customer || '—'}</strong></span>
                                  <span>•</span>
                                  <span>📁 Commande: <strong className={darkMode ? 'text-slate-350' : 'text-slate-700'}>{item.meta.order || '—'}</strong></span>
                                  <span>•</span>
                                  <span className={`px-1 py-px rounded text-[9px] ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
                                    {item.colors.length} Couleur{item.colors.length > 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>

                              {/* Button interaction cluster */}
                              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                <button
                                  onClick={() => handleLoadSavedList(item)}
                                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1 border hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                                    darkMode 
                                      ? 'bg-[#1e293b] hover:bg-slate-700 border-slate-700 text-slate-100'
                                      : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                                  }`}
                                  title="Recharger cette fiche dans l'éditeur de colisage"
                                >
                                  🔌 Restaurer
                                </button>

                                {confirmDeleteId !== item.id ? (
                                  <button
                                    onClick={() => setConfirmDeleteId(item.id)}
                                    className="px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-500/5 text-red-400 font-mono text-xs hover:bg-red-500/10 cursor-pointer"
                                    title="Supprimer cette sauvegarde définitivement"
                                  >
                                    🗑️
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/40 p-1 rounded-lg transition-all">
                                    <button
                                      onClick={() => handleDeleteSavedList(item.id, item.name)}
                                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-black rounded text-[10px] cursor-pointer"
                                    >
                                      🚨 CONFIRMER
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(null)}
                                      className={`px-1.5 py-1 text-slate-300 rounded text-[10px] cursor-pointer ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-300 hover:bg-slate-400'}`}
                                      title="Annuler"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeInputTab === 'labels' && (
                <motion.div
                  key="labels-section"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.15 }}
                >
                  <ParcelLabelModule
                    results={results}
                    colors={colors}
                    meta={meta}
                    darkMode={darkMode}
                    triggerToast={triggerToast}
                    globalPackingMode={globalPackingMode}
                    forceSingleCarton={forceSingleCarton}
                    maxSizesPerBox={maxSizesPerBox}
                    forceSubCapSolidInMixed={forceSubCapSolidInMixed}
                    computeColorResult={computeColorResult}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* CALCULATION RESULTS DISPLAY PANELS (RENDERED EXCLUSIVELY FOR PRINT VIEW AND HIDDEN ON-SCREEN TO PREVENT TAB CLUTTER) */}
        {hasGenerated && (
          <div className="hidden print:block print:space-y-6">
            
            {/* PRINT INDIVIDUAL COLOR PACKS */}
            {printSections.ind && activeResults.map((res, ci) => {
              const origIdx = res.colorIndex ?? ci;
              const bgClass = darkMode ? BG_COLORS_DARK[origIdx % PALETTE.length] : BG_COLORS_LIGHT[origIdx % PALETTE.length];
              const activeColorSizes = res.tailles.filter(t => isStandardSizeAlwaysShown(t) || (colors[origIdx]?.sizes[t]?.qtyTot || 0) > 0);
              return (
                <div
                  key={ci}
                  className={`rounded-xl border p-5 print-ind-card break-inside-avoid shadow-sm ${
                    darkMode ? 'bg-[#161a23] border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Print custom headers */}
                  {printSections.hdr && (
                    <div className="hidden print:block text-center border-b-2 border-red-700 pb-3 mb-4">
                      <h2 className="text-xl font-bold text-red-750">PACKING LIST ({meta.customer})</h2>
                      <div className="mt-2 text-[10px] text-slate-600 grid grid-cols-2 text-left gap-1">
                        <div><b>COMMANDE :</b> {meta.order || '—'}</div>
                        {meta.po && <div><b>PO# :</b> {meta.po}</div>}
                        {meta.invoice && <div><b>INVOICE N° :</b> {meta.invoice}</div>}
                        {meta.refClient && <div><b>REF CLIENT :</b> {meta.refClient}</div>}
                        {meta.style && <div><b>STYLE :</b> {meta.style} {meta.styleNumber ? `(${meta.styleNumber})` : ''}</div>}
                        {meta.destination && <div><b>DESTINATION :</b> {meta.destination} {meta.address ? `(${meta.address})` : ''}</div>}
                      </div>
                    </div>
                  )}

                  <div 
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border mb-3 font-mono font-bold uppercase text-xs"
                    style={{ backgroundColor: '#3988e7', color: '#fffbfb', borderColor: '#2c7cd1' }}
                  >
                    <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: res.color }} />
                    PACKING LIST — COULEUR : {res.nom}
                  </div>

                  {/* Print metadata row */}
                  {printSections.meta && (
                    <div className={`flex flex-wrap gap-4 text-[11px] font-mono pb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      <span>COMMANDE: <b className={darkMode ? 'text-white' : 'text-slate-900'}>{meta.order || '—'}</b></span>
                      <span>CLIENT: <b className={darkMode ? 'text-white' : 'text-slate-900'}>{meta.customer || '—'}</b></span>
                      {meta.po && <span>PO: <b className={darkMode ? 'text-white' : 'text-slate-900'}>{meta.po}</b></span>}
                      {meta.invoice && <span>INV: <b className={darkMode ? 'text-white' : 'text-slate-900'}>{meta.invoice}</b></span>}
                      {meta.style && <span>STYLE: <b className={darkMode ? 'text-white' : 'text-slate-900'}>{meta.style}</b></span>}
                      {meta.destination && <span>DESTINATION: <b className={darkMode ? 'text-white' : 'text-slate-900'}>{meta.destination}</b></span>}
                      {meta.portDepart && <span>PORTS: <b className={darkMode ? 'text-white' : 'text-slate-900'}>{meta.portDepart} → {meta.portArrivee}</b></span>}
                    </div>
                  )}

                  {/* Mode strategies hints */}
                  <div className="pb-3 text-xs">
                    {res.mode === 'strict_solide' ? (
                      <span className="px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold font-mono tracking-wide">
                        🔒 SOLID PACK STRICT
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/30 text-purple-400 font-bold font-mono tracking-wide">
                        🔀 MIXED PACK AUTORISÉ (max {maxSizesPerBox} tailles)
                      </span>
                    )}
                  </div>

                  {/* Grid layout */}
                  <div className={`overflow-x-auto rounded-lg border ${
                    darkMode ? 'border-slate-800 bg-slate-900/10' : 'border-slate-200 bg-slate-100/10'
                  }`}>
                    <table className="w-full text-xs text-center border-collapse">
                      <thead>
                        {(() => {
                          let firstThRendered = false;
                          const getThProps = (baseClass: string) => {
                            if (!firstThRendered) {
                              firstThRendered = true;
                              return {
                                className: baseClass,
                                style: { backgroundColor: '#f85cae', color: '#ffffff', fontWeight: 'bold' }
                              };
                            }
                            return { className: baseClass };
                          };
                          return (
                            <tr className="border-b font-mono font-bold text-[11px] text-white" style={{ backgroundColor: '#ba66f7' }}>
                              {printColumns.ctn && (
                                <>
                                  <th {...getThProps(`py-2.5 px-2 uppercase text-center col-ctn-index border-r ${darkMode ? 'border-indigo-900/40' : 'border-slate-200'}`)}>N° DÉBUT</th>
                                  <th {...getThProps(`py-2.5 px-2 uppercase text-center col-ctn-index border-r ${darkMode ? 'border-indigo-900/40' : 'border-slate-200'}`)}>N° FIN</th>
                                </>
                              )}
                              {printColumns.color && (
                                <th {...getThProps(`px-2 col-color-lbl border-r ${darkMode ? 'border-indigo-900/40' : 'border-slate-200'}`)}>COULEUR</th>
                              )}
                              {(() => {
                                const origColor = colors.find(c => c.nom === res.nom);
                                const showSkuCol = printColumns.sku && !!(origColor && Object.values(origColor.sizes || {}).some((s: any) => s.sku && String(s.sku).trim() !== ''));
                                return showSkuCol && (
                                  <th {...getThProps(`px-3 col-sku-lbl border-r ${darkMode ? 'border-indigo-900/40 text-white font-bold' : 'border-slate-200 text-slate-800 font-bold'}`)}>SKU</th>
                                );
                              })()}
                              {printColumns.sizes && activeColorSizes.map(t => (
                                <th key={t} {...getThProps(`px-2 col-sizes-cells border-r ${darkMode ? 'border-indigo-900/40 text-white font-bold' : 'border-slate-200 text-slate-800 font-bold'}`)}>{t}</th>
                              ))}
                              <th {...getThProps(`px-2 border-r ${darkMode ? 'border-indigo-900/40' : 'border-slate-200'}`)}>PCS/CTN</th>
                              {printColumns.nbctn && (
                                <th {...getThProps(`px-2 col-nbctn-metric border-r ${darkMode ? 'border-indigo-900/40' : 'border-slate-200'}`)}>NB CTN</th>
                              )}
                              {printColumns.totalqty && (
                                <th {...getThProps(`px-2 col-totalqty-metric border-r ${darkMode ? 'border-indigo-900/40' : 'border-slate-200'}`)}>TOTAL QTY</th>
                              )}
                              {printColumns.net && (
                                <th {...getThProps(`px-2 col-net-metric border-r ${darkMode ? 'border-indigo-900/40 text-teal-300 font-bold' : 'border-slate-200 text-teal-850 font-black'}`)}>N.W (KG)</th>
                              )}
                              {printColumns.gross && (
                                <th {...getThProps(`px-2 col-gross-metric border-r ${darkMode ? 'border-indigo-900/40 text-red-300 font-bold' : 'border-slate-200 text-red-850 font-black'}`)}>G.W (KG)</th>
                              )}
                              {printColumns.cbm && (
                                <th {...getThProps(`px-2 col-cbm-metric`)}>CBM (m³)</th>
                              )}
                            </tr>
                          );
                        })()}
                      </thead>
                      <tbody className={`divide-y font-mono font-medium ${darkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                        {res.rows.map((row, rIdx) => {
                          const origColor = colors.find(c => c.nom === res.nom);
                          const showSkuCol = printColumns.sku && !!(origColor && Object.values(origColor.sizes || {}).some((s: any) => s.sku && String(s.sku).trim() !== ''));
                          return (
                            <tr key={rIdx} className={`hover:bg-slate-800/40 divide-x ${darkMode ? 'divide-slate-800/40' : 'divide-slate-200'}`}>
                              {printColumns.ctn && (
                                <>
                                  <td className={`py-2 px-2 text-center font-bold col-ctn-index ${darkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                                    {parseCartonRange(row.cartonRange).start}
                                  </td>
                                  <td className={`py-2 px-2 text-center font-bold col-ctn-index ${darkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                                    {parseCartonRange(row.cartonRange).end}
                                  </td>
                                </>
                              )}
                              {printColumns.color && <td className="px-2 font-bold col-color-lbl" style={{ color: res.color }}>{res.nom}</td>}
                              {showSkuCol && <td className="px-3 truncate max-w-28 text-[11px] text-emerald-500 font-semibold col-sku-lbl">{row.skus.join('/') || '—'}</td>}
                              {printColumns.sizes && activeColorSizes.map(t => (
                                <td key={t} className={`px-2 font-bold col-sizes-cells ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{row.sizes[t] || ''}</td>
                              ))}
                              <td className={`px-2 font-bold bg-slate-900/10 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{row.pcsPerCarton}</td>
                              {printColumns.nbctn && <td className={`px-2 font-black col-nbctn-metric ${darkMode ? 'text-slate-100' : 'text-slate-950'}`}>{row.nbr}</td>}
                              {printColumns.totalqty && <td className={`px-2 font-black bg-slate-900/15 col-totalqty-metric ${darkMode ? 'text-slate-100' : 'text-slate-950'}`}>{row.totalPcs}</td>}
                              {printColumns.net && <td className="px-2 font-bold text-teal-400 col-net-metric">{row.netWeightRow.toFixed(2)}</td>}
                              {printColumns.gross && <td className={`px-2 font-bold col-gross-metric ${darkMode ? 'text-red-300' : 'text-red-650'}`}>{row.grossWeightRow.toFixed(2)}</td>}
                              {printColumns.cbm && <td className={`px-2 col-cbm-metric ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{row.cbmRow.toFixed(4)}</td>}
                            </tr>
                          );
                        })}

                        {/* Totals row index */}
                        <tr className="bg-amber-500/10 dark:bg-amber-955/30 text-amber-800 dark:text-amber-400 font-black border-t-2 border-t-amber-500/70 border-b border-dark-900 divide-x divide-slate-800">
                          {printColumns.ctn && <td colSpan={2} className="py-2.5 px-3 text-center col-ctn-index">TOTALE</td>}
                          {printColumns.color && <td className="px-2 font-extrabold col-color-lbl">{res.nom}</td>}
                          {(() => {
                            const origColor = colors.find(c => c.nom === res.nom);
                            const showSkuCol = printColumns.sku && !!(origColor && Object.values(origColor.sizes || {}).some((s: any) => s.sku && String(s.sku).trim() !== ''));
                            return showSkuCol && <td className="px-3 col-sku-lbl">—</td>;
                          })()}
                          {printColumns.sizes && activeColorSizes.map(t => (
                            <td key={t} className="px-2 col-sizes-cells">{res.totals.sizes[t] || 0}</td>
                          ))}
                          <td>—</td>
                          {printColumns.nbctn && <td className="px-2 col-nbctn-metric">{res.totals.c}</td>}
                          {printColumns.totalqty && <td className="px-2 text-amber-600 dark:text-amber-300 col-totalqty-metric">{res.totals.p}</td>}
                          {printColumns.net && <td className="px-2 font-black col-net-metric text-[#0e7490] dark:text-[#38bdf8]">{res.totals.n.toFixed(2)}</td>}
                          {printColumns.gross && <td className="px-2 font-black col-gross-metric text-[#b91c1c] dark:text-[#f87171]">{res.totals.g.toFixed(2)}</td>}
                          {printColumns.cbm && <td className="px-2 text-slate-400 col-cbm-metric">{res.totals.v.toFixed(4)}</td>}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Print weights templates list */}
                  {printSections.dim && (
                    <div className="mt-4 pt-3 border-t border-dashed border-slate-800 font-mono text-[10px] text-slate-500 space-y-1 print-dim-table">
                      <span className="font-bold uppercase tracking-wider block">GABARIT DE COLIS ET DIRECTIVES DU MODÈLE :</span>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {activeColorSizes.map(t => {
                          const spec = colors[res.colorIndex ?? ci]?.sizes[t];
                          if (!spec) return null;
                          return (
                            <div key={t} className="p-1.5 rounded bg-slate-900 border border-slate-800 flex flex-col">
                              <span>Taille: <b>{t}</b> SKUs: {spec.sku || '—'}</span>
                              <span>Pce: {spec.wPiece}kg Carton: {spec.wCarton}kg</span>
                              <span>Dim: {spec.dimL}×{spec.diml}×{spec.dimH} cm</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* PRINT COMBINED LEDGER (MULTIPLE COLORS CHOSEN) */}
            {printSections.cpl && activeResults.length > 1 && (
              <div className={`rounded-xl border p-5 print-cpl-card break-inside-avoid shadow-sm ${
                darkMode ? 'bg-[#161a23] border-slate-805' : 'bg-white border-slate-200'
              }`}>
                {/* Print custom headers */}
                {printSections.hdr && (
                  <div className="hidden print:block text-center border-b-2 border-red-700 pb-3 mb-4">
                    <h2 className="text-xl font-bold text-red-750">COMBINED LEDGER ({meta.customer})</h2>
                    <div className="mt-2 text-[10px] text-slate-600 grid grid-cols-2 text-left gap-1">
                      <div><b>COMMANDE :</b> {meta.order || '—'}</div>
                      {meta.po && <div><b>PO# :</b> {meta.po}</div>}
                      {meta.invoice && <div><b>INVOICE N° :</b> {meta.invoice}</div>}
                      {meta.refClient && <div><b>REF CLIENT :</b> {meta.refClient}</div>}
                      {meta.style && <div><b>STYLE :</b> {meta.style} {meta.styleNumber ? `(${meta.styleNumber})` : ''}</div>}
                      {meta.destination && <div><b>DESTINATION :</b> {meta.destination} {meta.address ? `(${meta.address})` : ''}</div>}
                    </div>
                  </div>
                )}

                <div className={`bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30 font-bold px-4 py-3 rounded-lg flex items-center gap-3 font-mono text-sm mb-4 ${darkMode ? 'text-white' : 'text-[#4f8ef7]'}`}>
                  📁 COMBINED PACKING LIST — LEDGER GLOBAL TOUTES COULEURS ({results.length})
                </div>

                {printSections.meta && (
                  <div className={`flex flex-wrap gap-4 text-[11px] font-mono pb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span>COMMANDE: <b className={darkMode ? 'text-white' : 'text-slate-900'}>{meta.order || '—'}</b></span>
                    <span>CLIENT: <b className={darkMode ? 'text-white' : 'text-slate-900'}>{meta.customer || '—'}</b></span>
                    {meta.po && <span>PO: <b className={darkMode ? 'text-white' : 'text-slate-900'}>{meta.po}</b></span>}
                    {meta.destination && <span>DESTINATION: <b className={darkMode ? 'text-white' : 'text-slate-900'}>{meta.destination}</b></span>}
                    <span>CARTONS TOTAL: <b className={darkMode ? 'text-white' : 'text-slate-900'}>{grandTotals.c}</b></span>
                    <span>QTE TOUTE: <b className={darkMode ? 'text-slate-200' : 'text-slate-900'}>{grandTotals.p.toLocaleString('fr-FR')} PCS</b></span>
                  </div>
                )}

                {/* Legend list indicators */}
                {printSections.leg && (
                  <div className="flex flex-wrap gap-3 pb-4 items-center print-legend">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">LÉGENDE GRAPHES :</span>
                    {results.map((res, ci) => (
                      <div key={ci} className="flex items-center gap-1.5 text-xs font-mono font-bold">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: res.color }} />
                        <span>{res.nom}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className={`overflow-x-auto rounded-lg border ${
                  darkMode ? 'border-slate-800 bg-slate-900/10' : 'border-slate-200 bg-slate-100/10'
                }`}>
                  <table className="w-full text-xs text-center border-collapse">
                    <thead>
                        {(() => {
                          let firstThRendered = false;
                          const getThProps = (baseClass: string) => {
                            if (!firstThRendered) {
                              firstThRendered = true;
                              return {
                                className: baseClass,
                                style: { backgroundColor: '#f85cae', color: '#ffffff', fontWeight: 'bold' }
                              };
                            }
                            return { className: baseClass };
                          };
                          return (
                            <tr className="border-b font-mono font-bold text-[11px] text-white" style={{ backgroundColor: '#ba66f7' }}>
                              {printColumns.ctn && (
                                <>
                                  <th {...getThProps(`py-2.5 px-2 uppercase text-center col-ctn-index border-r ${darkMode ? 'border-indigo-900/40' : 'border-slate-200'}`)}>N° DÉBUT</th>
                                  <th {...getThProps(`py-2.5 px-2 uppercase text-center col-ctn-index border-r ${darkMode ? 'border-indigo-900/40' : 'border-slate-200'}`)}>N° FIN</th>
                                </>
                              )}
                              {printColumns.color && (
                                <th {...getThProps(`px-2 col-color-lbl border-r ${darkMode ? 'border-indigo-900/40' : 'border-slate-200'}`)}>COULEUR</th>
                              )}
                              {(() => {
                                const showSkuColCombined = printColumns.sku && colors.some(col => Object.values(col.sizes || {}).some((s: any) => s.sku && String(s.sku).trim() !== ''));
                                return showSkuColCombined && (
                                  <th {...getThProps(`px-3 col-sku-lbl border-r ${darkMode ? 'border-indigo-900/40 text-white font-bold' : 'border-slate-200 text-slate-800 font-bold'}`)}>SKU</th>
                                );
                              })()}
                              {printColumns.sizes && summaryUniqueSizes.map(t => (
                                <th key={t} {...getThProps(`px-2 col-sizes-cells border-r ${darkMode ? 'border-indigo-900/40 text-white font-bold' : 'border-slate-200 text-slate-800 font-bold'}`)}>{t}</th>
                              ))}
                              <th {...getThProps(`px-2 border-r ${darkMode ? 'border-indigo-900/40' : 'border-slate-200'}`)}>PCS/CTN</th>
                              {printColumns.nbctn && (
                                <th {...getThProps(`px-2 col-nbctn-metric border-r ${darkMode ? 'border-indigo-900/40' : 'border-slate-200'}`)}>NB CTN</th>
                              )}
                              {printColumns.totalqty && (
                                <th {...getThProps(`px-2 col-totalqty-metric border-r ${darkMode ? 'border-indigo-900/40' : 'border-slate-200'}`)}>TOTAL QTY</th>
                              )}
                              {printColumns.net && (
                                <th {...getThProps(`px-2 col-net-metric border-r ${darkMode ? 'border-indigo-900/40 text-teal-300 font-bold' : 'border-slate-200 text-teal-850 font-black'}`)}>N.W (KG)</th>
                              )}
                              {printColumns.gross && (
                                <th {...getThProps(`px-2 col-gross-metric border-r ${darkMode ? 'border-indigo-900/40 text-red-300 font-bold' : 'border-slate-200 text-red-850 font-black'}`)}>G.W (KG)</th>
                              )}
                              {printColumns.cbm && (
                                <th {...getThProps(`px-2 col-cbm-metric`)}>CBM (m³)</th>
                              )}
                            </tr>
                          );
                        })()}
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-left">
                      {(() => {
                        let rowCount = 0;
                        let seqNum = 1;
                        const showSkuColCombined = printColumns.sku && colors.some(col => Object.values(col.sizes || {}).some((s: any) => s.sku && String(s.sku).trim() !== ''));
                        return results.map((res, ci) => {
                          const bgCode = darkMode ? BG_COLORS_DARK[ci % PALETTE.length] : BG_COLORS_LIGHT[ci % PALETTE.length];
                          return res.rows.map((row, rIdx) => {
                            const currentStart = seqNum;
                            const currentEnd = seqNum + row.nbr - 1;
                            seqNum += row.nbr;
                            rowCount++;
                            return (
                              <tr
                                key={`${ci}-${rIdx}`}
                                className="hover:bg-slate-800/20 divide-x divide-slate-800/40 font-medium"
                                style={{ backgroundColor: bgCode }}
                              >
                                {printColumns.ctn && (
                                  <>
                                    <td className={`py-2 px-2 text-center font-bold col-ctn-index ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{currentStart}</td>
                                    <td className={`py-2 px-2 text-center font-bold col-ctn-index ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{currentEnd}</td>
                                  </>
                                )}
                                {printColumns.color && <td className="px-2 font-bold col-color-lbl" style={{ color: res.color }}>{res.nom}</td>}
                                {showSkuColCombined && <td className="px-3 truncate max-w-28 text-[11px] text-emerald-500 col-sku-lbl">{row.skus.join('/') || '—'}</td>}
                                {printColumns.sizes && summaryUniqueSizes.map(t => (
                                  <td key={t} className={`px-2 text-center font-bold col-sizes-cells ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{row.sizes[t] || ''}</td>
                                ))}
                                <td className={`px-2 text-center font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{row.pcsPerCarton}</td>
                                {printColumns.nbctn && <td className={`px-2 text-center font-black col-nbctn-metric ${darkMode ? 'text-slate-100' : 'text-slate-950'}`}>{row.nbr}</td>}
                                {printColumns.totalqty && <td className={`px-2 text-center font-black bg-slate-900/10 col-totalqty-metric ${darkMode ? 'text-slate-100' : 'text-slate-950'}`}>{row.totalPcs}</td>}
                                {printColumns.net && <td className="px-2 text-center font-bold text-teal-400 col-net-metric">{row.netWeightRow.toFixed(2)}</td>}
                                {printColumns.gross && <td className={`px-2 text-center font-bold col-gross-metric ${darkMode ? 'text-red-300' : 'text-red-650'}`}>{row.grossWeightRow.toFixed(2)}</td>}
                                {printColumns.cbm && <td className={`px-2 text-center col-cbm-metric ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{row.cbmRow.toFixed(4)}</td>}
                              </tr>
                            );
                          });
                        });
                      })()}

                      {/* Global combined total row */}
                      <tr className="bg-[#222636]/40 font-bold border-t border-slate-700 divide-x divide-slate-800">
                        {printColumns.ctn && <td colSpan={2} className="py-2.5 px-3 text-center col-ctn-index">GRAND TOTAL</td>}
                        {printColumns.color && <td className="px-2 col-color-lbl">ALL</td>}
                        {(() => {
                          const showSkuColCombined = printColumns.sku && colors.some(col => Object.values(col.sizes || {}).some((s: any) => s.sku && String(s.sku).trim() !== ''));
                          return showSkuColCombined && <td className="px-3 col-sku-lbl">—</td>;
                        })()}
                        {printColumns.sizes && summaryUniqueSizes.map(t => {
                          let sumT = 0;
                          results.forEach(r => { sumT += r.totals.sizes[t] || 0; });
                          return <td key={t} className="px-2 text-center col-sizes-cells">{sumT}</td>;
                        })}
                        <td className="text-center">—</td>
                        {printColumns.nbctn && <td className="px-2 text-center col-nbctn-metric">{grandTotals.c}</td>}
                        {printColumns.totalqty && <td className={`px-2 text-center col-totalqty-metric ${darkMode ? 'text-slate-100' : 'text-slate-950'}`}>{grandTotals.p}</td>}
                        {printColumns.net && <td className="px-2 text-center text-teal-400 col-net-metric">{grandTotals.n.toFixed(2)}</td>}
                        {printColumns.gross && <td className="px-2 text-center text-red-400 col-gross-metric">{grandTotals.g.toFixed(2)}</td>}
                        {printColumns.cbm && <td className="px-2 text-center text-slate-400 col-cbm-metric">{grandTotals.v.toFixed(4)}</td>}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Color/Size matrices */}
                {printSections.bk && (
                  <div className="mt-6 space-y-3 print-bk-table break-inside-avoid">
                    <div className="bg-[#f6e05e] border border-amber-500/60 font-mono font-bold px-4 py-2 text-slate-900 rounded-lg text-xs">
                      📊 COLOR / SIZE BREAKDOWN COMBINED (Ledger global des colisages)
                    </div>
                    <div className={`overflow-x-auto rounded-lg border ${
                      darkMode ? 'border-slate-800' : 'border-slate-200 bg-white'
                    }`}>
                      <table className="w-full text-xs text-center border-collapse">
                        <thead>
                          <tr className="font-mono font-bold text-[11px] border-b text-white" style={{ backgroundColor: '#ba66f7' }}>
                            <th className={`py-2 px-3 text-left border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>COLOR / COULEUR</th>
                            {summaryUniqueSizes.map(t2 => <th key={t2} className={`border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>{t2}</th>)}
                            <th className="py-2.5">TOTAL PCS</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y font-mono font-medium ${darkMode ? 'divide-slate-800 text-slate-200' : 'divide-slate-200 text-slate-800'}`}>
                          {activeResults.map((res, ci) => (
                            <tr key={ci} className={`hover:bg-slate-800/40 divide-x ${darkMode ? 'divide-slate-800/40' : 'divide-slate-200'}`}>
                              <td className={`py-2 px-3 text-left font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                <div className="flex items-center gap-1.5 justify-start">
                                  <span className="w-2.5 h-2.5 rounded-full border border-slate-700/40 shrink-0" style={{ backgroundColor: res.color }} />
                                  <span>{res.nom}</span>
                                </div>
                              </td>
                              {summaryUniqueSizes.map(t => (
                                <td key={t} className="font-bold">{res.totals.sizes[t] || ''}</td>
                              ))}
                              <td className={`font-black ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{res.totals.p}</td>
                            </tr>
                          ))}
                          <tr className={`font-extrabold border-t-2 divide-x ${
                            darkMode 
                              ? 'bg-amber-500/10 text-amber-400 border-t-amber-500/80 divide-slate-800' 
                              : 'bg-amber-500/5 text-amber-850 border-t-amber-500/60 divide-slate-200'
                          }`}>
                            <td className="py-2.5 px-3 text-left">TOTAL SHIFT</td>
                            {summaryUniqueSizes.map(t => {
                              let sumT = 0;
                              activeResults.forEach(r => { sumT += r.totals.sizes[t] || 0; });
                              return <td key={t} className="font-extrabold text-amber-600 dark:text-amber-300">{sumT}</td>;
                            })}
                            <td className="font-extrabold text-amber-600 dark:text-amber-300">{grandTotals.p}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Stats recap details cards */}
                {printSections.stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-dashed border-slate-800 print-stats-box break-inside-avoid">
                    <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/10">
                      <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Nombre de Pièces :</div>
                      <div className="text-lg font-bold text-amber-500 font-mono mt-0.5">{grandTotals.p.toLocaleString('fr-FR')} PCS</div>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/10">
                      <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Nombre de Cartons (CTN) :</div>
                      <div className="text-lg font-bold text-slate-350 font-mono mt-0.5">{grandTotals.c} Cartons</div>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/10">
                      <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Poids Net (N.W) :</div>
                      <div className="text-lg font-bold text-teal-400 font-mono mt-0.5">{grandTotals.n.toFixed(2)} KG</div>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/10">
                      <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Poids Brut (GW) :</div>
                      <div className="text-lg font-bold text-red-400 font-mono mt-0.5">{grandTotals.g.toFixed(2)} KG</div>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/10 col-span-2">
                      <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Volume Total m³ (CBM) :</div>
                      <div className="text-lg font-bold text-blue-400 font-mono mt-0.5">{grandTotals.v.toFixed(4)} m³</div>
                    </div>
                    {meta.yarn && (
                      <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/10 col-span-2">
                        <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Composition de Fil :</div>
                        <div className="text-xs font-semibold text-slate-20s truncate mt-0.5">{meta.yarn} / {meta.composition}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Standalone Single color Breakdown fallback */}
            {printSections.bk && activeResults.length === 1 && (
              <div className={`rounded-xl border p-5 print-ind-card break-inside-avoid shadow-sm ${
                darkMode ? 'bg-[#161a23] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="bg-[#f6e05e] border border-amber-500/60 font-mono font-bold px-4 py-2 text-slate-900 rounded-lg text-xs mb-3 uppercase">
                  📊 COLOR / SIZE BREAKDOWN SUMMARY
                </div>

                <div className={`overflow-x-auto rounded-lg border ${
                  darkMode ? 'border-slate-800' : 'border-slate-200 bg-white'
                }`}>
                  <table className="w-full text-xs text-center border-collapse">
                    <thead>
                      <tr className="font-mono font-bold text-[11px] border-b text-white" style={{ backgroundColor: '#ba66f7' }}>
                        <th className={`py-2 px-3 text-left border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>COLORS / COULEURS</th>
                        {activeResults[0].tailles.filter(t => isStandardSizeAlwaysShown(t) || (colors[activeResults[0].colorIndex ?? 0]?.sizes[t]?.qtyTot || 0) > 0).map(t => (
                          <th key={t} className={`border-r ${darkMode ? 'border-slate-800' : 'border-slate-700'}`}>{t}</th>
                        ))}
                        <th className="py-2 font-bold">TOTAL QTY</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y font-mono font-medium ${darkMode ? 'divide-slate-800 text-slate-200' : 'divide-slate-200 text-slate-800'}`}>
                      <tr className={`divide-x ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                        <td className={`py-2 px-3 text-left font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          <div className="flex items-center gap-1.5 justify-start">
                            <span className="w-2.5 h-2.5 rounded-full border border-slate-700/40 shrink-0" style={{ backgroundColor: activeResults[0].color }} />
                            <span>{activeResults[0].nom}</span>
                          </div>
                        </td>
                        {activeResults[0].tailles.filter(t => isStandardSizeAlwaysShown(t) || (colors[activeResults[0].colorIndex ?? 0]?.sizes[t]?.qtyTot || 0) > 0).map(t => (
                          <td key={t} className="font-bold">{activeResults[0].totals.sizes[t] || ''}</td>
                        ))}
                        <td className={`font-black ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{activeResults[0].totals.p}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {printSections.stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 print-stats-box break-inside-avoid">
                    <div className={`p-3 rounded-lg border bg-slate-900/10 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                      <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Cartons :</div>
                      <div className={`text-sm font-bold font-mono mt-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{activeResults[0].totals.c}</div>
                    </div>
                    <div className={`p-3 rounded-lg border bg-slate-900/10 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                      <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Poids Net :</div>
                      <div className="text-sm font-bold font-mono text-teal-500 mt-0.5">{activeResults[0].totals.n.toFixed(2)} KG</div>
                    </div>
                    <div className={`p-3 rounded-lg border bg-slate-900/10 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                      <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Poids Brut :</div>
                      <div className="text-sm font-bold font-mono text-red-500 mt-0.5">{activeResults[0].totals.g.toFixed(2)} KG</div>
                    </div>
                    <div className={`p-3 rounded-lg border bg-slate-900/10 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                      <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">Volume Total :</div>
                      <div className="text-sm font-bold font-mono text-blue-500 mt-0.5">{activeResults[0].totals.v.toFixed(4)} m³</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Screenshot Overlay and Editor Tool Suite */}
      <ScreenshotTool
        isCapturing={isCapturingScreen}
        setIsCapturing={setIsCapturingScreen}
        darkMode={darkMode}
      />

      {/* Dynamic Modern Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[9999]"
          >
            <div className={`px-4.5 py-3 rounded-xl border flex items-center gap-2.5 text-xs font-mono font-bold shadow-xl backdrop-blur-md ${
              toast.type === 'error'
                ? 'bg-red-500/15 border-red-500/40 text-red-500 dark:text-red-400'
                : toast.type === 'info'
                  ? 'bg-blue-500/15 border-blue-500/40 text-blue-500 dark:text-blue-400'
                  : 'bg-[#ff5000]/15 border-[#ff5000]/40 text-[#ff5000]'
            }`}>
              <span className="text-sm">{toast.type === 'error' ? '❌' : toast.type === 'info' ? 'ℹ️' : '✓'}</span>
              <span>{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
