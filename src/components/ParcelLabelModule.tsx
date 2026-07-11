import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Tag, 
  User, 
  Building, 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  RefreshCw,
  Sliders,
  Sparkles,
  Layers,
  FileText
} from 'lucide-react';
import { ColorResult, OrderMeta, PackedRow } from '../types';

interface ParcelLabelModuleProps {
  results: ColorResult[];
  colors: any[];
  meta: OrderMeta;
  darkMode: boolean;
  triggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  globalPackingMode: 'solid' | 'mixed';
  forceSingleCarton: boolean;
  maxSizesPerBox: number;
  forceSubCapSolidInMixed?: boolean;
  computeColorResult: any;
}

interface FlattenedCarton {
  id: string; // unique ID
  colorName: string;
  colorHex: string;
  originalColorIdx: number;
  rowIdx: number;
  cartonNum: number; // sequential number for this color
  globalCartonNum: number; // overall sequential number
  type: 'solid' | 'solid_r' | 'mixed';
  pcsPerCarton: number;
  sizes: { [sizeName: string]: number };
  netWeight: number;
  grossWeight: number;
  cbm: number;
  dimensions: string; // e.g. "60x40x35"
  sku: string;
}

export default function ParcelLabelModule({
  results,
  colors,
  meta,
  darkMode,
  triggerToast,
  globalPackingMode,
  forceSingleCarton,
  maxSizesPerBox,
  forceSubCapSolidInMixed,
  computeColorResult
}: ParcelLabelModuleProps) {
  // 1. Sender Info (Expéditeur) saved in localStorage
  const [senderName, setSenderName] = useState(() => localStorage.getItem('p_pro_sender_name') || 'EUROPE APPAREL HUB');
  const [senderAddress, setSenderAddress] = useState(() => localStorage.getItem('p_pro_sender_address') || '45 Rue du Colisage, Bâtiment C');
  const [senderZipCity, setSenderZipCity] = useState(() => localStorage.getItem('p_pro_sender_zipcity') || '59100 Roubaix');
  const [senderCountry, setSenderCountry] = useState(() => localStorage.getItem('p_pro_sender_country') || 'FRANCE');
  const [senderPhone, setSenderPhone] = useState(() => localStorage.getItem('p_pro_sender_phone') || '+33 (0)3 20 12 34 56');

  // 2. Override Recipient Info (Destinataire)
  const [isRecipientOverridden, setIsRecipientOverridden] = useState(false);
  const [destName, setDestName] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [destZipCity, setDestZipCity] = useState('');
  const [destCountry, setDestCountry] = useState('');

  // 3. Carrier Settings
  const [carrier, setCarrier] = useState<'DHL' | 'FEDEX' | 'UPS' | 'CHRONOPOST' | 'COLISSIMO' | 'DPD' | 'CUSTOM'>('FEDEX');
  const [routingZone, setRoutingZone] = useState('EU-WEST-CH7');
  const [customPoNumber, setCustomPoNumber] = useState('');
  const [customBranding, setCustomBranding] = useState('PACKING LIST PRO');
  const [barcodeType, setBarcodeType] = useState<'CODE128' | 'DATAMATRIX'>('CODE128');

  // GS1/Cdiscount Compliant Shipping Mark customized states
  const [poNumber, setPoNumber] = useState(() => localStorage.getItem('sm_po_number') || meta.po || '4901844481');
  const [poItem, setPoItem] = useState(() => localStorage.getItem('sm_po_item') || '00040');
  const [senderId, setSenderId] = useState(() => localStorage.getItem('sm_sender_id') || '6076032');
  const [quantityQ, setQuantityQ] = useState(() => localStorage.getItem('sm_quantity_q') || '1');
  const [styleNameOverride, setStyleNameOverride] = useState(() => localStorage.getItem('sm_style_name') || (meta.style ? `${meta.style} ${meta.styleNumber || ''}`.trim() : 'Akiro_S 10265865 01'));
  const [materialOverride, setMaterialOverride] = useState(() => localStorage.getItem('sm_material') || '50527573');
  const [destinationDepot, setDestinationDepot] = useState(() => localStorage.getItem('sm_dest_depot') || meta.destination || 'HB Filderstadt');
  const [ssccCompanyPrefix, setSsccCompanyPrefix] = useState(() => localStorage.getItem('sm_sscc_prefix') || '340214040296'); // 12-digit prefix

  // 4. Flattened & filtered list of Cartons
  const [flattenedCartons, setFlattenedCartons] = useState<FlattenedCarton[]>([]);
  const [selectedCartonIds, setSelectedCartonIds] = useState<Set<string>>(new Set());
  const [colorFilter, setColorFilter] = useState<string>('all');
  
  // 5. Preview index
  const [previewIdx, setPreviewIdx] = useState<number>(0);

  // Synchronize custom fields when meta changes from above
  useEffect(() => {
    if (meta.po) setPoNumber(meta.po);
    if (meta.style) setStyleNameOverride(`${meta.style} ${meta.styleNumber || ''}`.trim());
    if (meta.destination) setDestinationDepot(meta.destination);
  }, [meta]);

  // Persist custom fields
  useEffect(() => {
    localStorage.setItem('sm_po_number', poNumber);
    localStorage.setItem('sm_po_item', poItem);
    localStorage.setItem('sm_sender_id', senderId);
    localStorage.setItem('sm_quantity_q', quantityQ);
    localStorage.setItem('sm_style_name', styleNameOverride);
    localStorage.setItem('sm_material', materialOverride);
    localStorage.setItem('sm_dest_depot', destinationDepot);
    localStorage.setItem('sm_sscc_prefix', ssccCompanyPrefix);
  }, [poNumber, poItem, senderId, quantityQ, styleNameOverride, materialOverride, destinationDepot, ssccCompanyPrefix]);

  const calculateGS1CheckDigit = (digits17: string): number => {
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      const digit = parseInt(digits17.charAt(i), 10) || 0;
      const posFromRight = 17 - i;
      const multiplier = (posFromRight % 2 !== 0) ? 3 : 1;
      sum += digit * multiplier;
    }
    const nextMultipleOf10 = Math.ceil(sum / 10) * 10;
    return nextMultipleOf10 - sum;
  };

  const getSSCC18ForCarton = (globalCartonNum: number): string => {
    const prefix = ssccCompanyPrefix || '340214040296';
    const targetLength = 17;
    const serialLength = Math.max(1, targetLength - prefix.length);
    const serial = String(globalCartonNum).padStart(serialLength, '0');
    const digits17 = (prefix + serial).slice(0, 17);
    const checkDigit = calculateGS1CheckDigit(digits17);
    return `${digits17}${checkDigit}`;
  };

  const getColorSizeText = (ctn: FlattenedCarton): string => {
    const sizeKeys = Object.keys(ctn.sizes);
    if (sizeKeys.length === 1) {
      return `${ctn.colorName} ${sizeKeys[0]}`;
    } else {
      return `${ctn.colorName} MIX`;
    }
  };

  const render1DBarcode = (code: string) => {
    const bars: boolean[] = [];
    for (let i = 0; i < 10; i++) bars.push(false);
    
    const seed = code.replace(/[^0-9]/g, '');
    for (let i = 0; i < seed.length; i++) {
      const val = parseInt(seed.charAt(i), 10) || 0;
      const pattern = [
        [true, false, true, true, false, false],
        [true, true, false, true, false, false],
        [true, true, false, false, true, false],
        [true, false, false, true, true, false],
        [true, false, false, false, true, true],
        [true, true, false, true, true, false],
        [true, true, false, false, true, true],
        [true, false, true, true, false, true],
        [true, false, true, true, true, false],
        [true, true, true, false, true, false]
      ][val];
      pattern.forEach(b => {
        bars.push(b);
        bars.push(b);
      });
      bars.push(i % 2 === 0);
      bars.push(false);
    }
    bars.push(true, true, false, false, true, true, true, false, true, true);
    for (let i = 0; i < 10; i++) bars.push(false);

    return (
      <svg className="w-full h-16" viewBox={`0 0 ${bars.length} 100`} preserveAspectRatio="none" shapeRendering="crispEdges">
        <g fill="black">
          {bars.map((bar, idx) => bar ? (
            <rect key={idx} x={idx} y={0} width={1} height={100} />
          ) : null)}
        </g>
      </svg>
    );
  };

  const render2DBarcode = () => {
    const size = 24;
    const pixels: boolean[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (r === size - 1 || c === 0) {
          pixels.push(true);
        } else if (r === 0 || c === size - 1) {
          pixels.push((r + c) % 2 === 0);
        } else {
          const noise = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453;
          pixels.push((Math.floor((noise - Math.floor(noise)) * 10) % 2) === 0);
        }
      }
    }
    return (
      <svg className="w-10 h-10" viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">
        <g fill="black">
          {pixels.map((black, idx) => {
            if (!black) return null;
            const r = Math.floor(idx / size);
            const c = idx % size;
            return <rect key={idx} x={c} y={r} width={1} height={1} />;
          })}
        </g>
      </svg>
    );
  };

  // Synchronize Recipient inputs with current meta in props unless overridden
  useEffect(() => {
    if (!isRecipientOverridden) {
      setDestName(meta.customer || 'CLIENTS ET COMPAGNIE');
      setDestAddress(meta.address || '128 Boulevard Central, Quai de Déchargement');
      setDestZipCity(meta.destination || '75001 Paris');
      setDestCountry(meta.pays || 'FRANCE');
    }
  }, [meta, isRecipientOverridden]);

  // Persist Sender inputs
  useEffect(() => {
    localStorage.setItem('p_pro_sender_name', senderName);
    localStorage.setItem('p_pro_sender_address', senderAddress);
    localStorage.setItem('p_pro_sender_zipcity', senderZipCity);
    localStorage.setItem('p_pro_sender_country', senderCountry);
    localStorage.setItem('p_pro_sender_phone', senderPhone);
  }, [senderName, senderAddress, senderZipCity, senderCountry, senderPhone]);

  // Expand rows from colors / results on data change
  useEffect(() => {
    // Standardize results. If results is empty, calculate them live
    const activeResults: ColorResult[] = results.length > 0 ? results : colors.map((c, i) => {
      return computeColorResult(c, globalPackingMode, forceSingleCarton, maxSizesPerBox, i, forceSubCapSolidInMixed);
    });

    const flattened: FlattenedCarton[] = [];
    let globalCounter = 1;

    activeResults.forEach((res, colorIdx) => {
      // Find the dimensions and SKUs info from source color configuration if available
      const sourceColor = colors[colorIdx] || { sizes: {}, nom: res.nom };
      
      res.rows.forEach((row, rowIdx) => {
        // Find carton numbers within this range
        const rangeNums = parseCartonRange(row.cartonRange);
        
        rangeNums.forEach((ctnNum) => {
          // Identify dimension text: find first size that has dim defined
          let dimString = '60 × 40 × 30'; // fallback
          let itemSku = sourceColor.nom + '-CORE';

          const firstSizeKey = Object.keys(row.sizes)[0];
          if (firstSizeKey && sourceColor.sizes?.[firstSizeKey]) {
            const firstDetails = sourceColor.sizes[firstSizeKey];
            if (firstDetails.dimL) {
              dimString = `${firstDetails.dimL} × ${firstDetails.diml} × ${firstDetails.dimH}`;
            }
            if (firstDetails.sku) {
              itemSku = firstDetails.sku;
            }
          }

          const singleNetWeight = row.netWeightRow / row.nbr;
          const singleGrossWeight = row.grossWeightRow / row.nbr;
          const singleCbm = row.cbmRow / row.nbr;

          flattened.push({
            id: `${res.nom}-row${rowIdx}-ctn${ctnNum}`,
            colorName: res.nom,
            colorHex: res.color,
            originalColorIdx: colorIdx,
            rowIdx,
            cartonNum: ctnNum,
            globalCartonNum: globalCounter++,
            type: row.type,
            pcsPerCarton: row.pcsPerCarton,
            sizes: row.sizes,
            netWeight: singleNetWeight,
            grossWeight: singleGrossWeight,
            cbm: singleCbm,
            dimensions: dimString,
            sku: row.skus?.[0] || itemSku
          });
        });
      });
    });

    setFlattenedCartons(flattened);
    
    // Auto select all newly generated carton ids
    const allIds = new Set(flattened.map(item => item.id));
    setSelectedCartonIds(allIds);
    setPreviewIdx(0);
  }, [results, colors, globalPackingMode, forceSingleCarton, maxSizesPerBox, forceSubCapSolidInMixed]);

  const parseCartonRange = (rangeStr: string): number[] => {
    const parts = rangeStr.split('-').map(s => parseInt(s.trim(), 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const nums = [];
      for (let i = parts[0]; i <= parts[1]; i++) {
        nums.push(i);
      }
      return nums;
    }
    const single = parseInt(rangeStr.trim(), 10);
    if (!isNaN(single)) {
      return [single];
    }
    return [1];
  };

  const visibleCartons = flattenedCartons.filter(c => colorFilter === 'all' || c.colorName === colorFilter);

  // Checkbox helpers
  const toggleSelectCarton = (id: string) => {
    const updated = new Set(selectedCartonIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedCartonIds(updated);
  };

  const selectAllVisible = () => {
    const updated = new Set(selectedCartonIds);
    visibleCartons.forEach(c => updated.add(c.id));
    setSelectedCartonIds(updated);
    triggerToast(`📥 ${visibleCartons.length} cartons sélectionnés`, 'success');
  };

  const deselectAllVisible = () => {
    const updated = new Set(selectedCartonIds);
    visibleCartons.forEach(c => updated.delete(c.id));
    setSelectedCartonIds(updated);
    triggerToast(`📂 Sélection effacée pour cette vue`, 'info');
  };

  // Sound scan simulation
  const handleScanSimulation = (carton: FlattenedCarton) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, audioCtx.currentTime); // high pitched beep
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12); // beep duration 120ms
    } catch (e) {
      // AudioContext blocker or unsupported
    }

    const sizesSummary = Object.entries(carton.sizes)
      .map(([sz, qty]) => `${sz}: ${qty}`)
      .join(', ');

    triggerToast(
      `🎯 SCAN OK ! [${carrier}] • CTN #${carton.globalCartonNum} [${carton.colorName}] • ${carton.pcsPerCarton} PCS • Gross Wt: ${carton.grossWeight.toFixed(2)} KG`,
      'success'
    );
  };

  // Multi-labels printer
  const handlePrintLabels = () => {
    const chosenLabels = flattenedCartons.filter(c => selectedCartonIds.has(c.id));
    
    if (chosenLabels.length === 0) {
      triggerToast('⚠️ Veuillez sélectionner au moins 1 carton à imprimer !', 'error');
      return;
    }

    // Create the printing iframe or absolute hidden area
    let printArea = document.getElementById('labels-print-area');
    if (!printArea) {
      printArea = document.createElement('div');
      printArea.id = 'labels-print-area';
      printArea.style.display = 'none';
      document.body.appendChild(printArea);
    }

    // Populate print area with pure high-contrast A6 blocks
    printArea.innerHTML = chosenLabels.map((ctn) => {
      const ssccCode = getSSCC18ForCarton(ctn.globalCartonNum);
      const ssccWithAI = `(00)${ssccCode}`;
      const colorSizeVal = getColorSizeText(ctn);
      const matVal = materialOverride || ctn.sku || '50527573';

      // Barcode generation (SVG)
      const bars: boolean[] = [];
      for (let i = 0; i < 10; i++) bars.push(false); // Quiet zone
      
      const seed = ssccCode.replace(/[^0-9]/g, '');
      for (let i = 0; i < seed.length; i++) {
        const val = parseInt(seed.charAt(i), 10) || 0;
        const pattern = [
          [true, false, true, true, false, false],
          [true, true, false, true, false, false],
          [true, true, false, false, true, false],
          [true, false, false, true, true, false],
          [true, false, false, false, true, true],
          [true, true, false, true, true, false],
          [true, true, false, false, true, true],
          [true, false, true, true, false, true],
          [true, false, true, true, true, false],
          [true, true, true, false, true, false]
        ][val];
        pattern.forEach(b => {
          bars.push(b);
          bars.push(b); // double width
        });
        bars.push(i % 2 === 0);
        bars.push(false);
      }
      bars.push(true, true, false, false, true, true, true, false, true, true); // stop
      for (let i = 0; i < 10; i++) bars.push(false); // Quiet zone

      let barcodeRectsHTML = '';
      bars.forEach((bar, idx) => {
        if (bar) {
          barcodeRectsHTML += `<rect x="${idx}" y="0" width="1" height="100" />`;
        }
      });

      // DataMatrix generation (SVG)
      const dmSize = 24;
      const dmPixels: boolean[] = [];
      for (let r = 0; r < dmSize; r++) {
        for (let c = 0; c < dmSize; c++) {
          if (r === dmSize - 1 || c === 0) {
            dmPixels.push(true);
          } else if (r === 0 || c === dmSize - 1) {
            dmPixels.push((r + c) % 2 === 0);
          } else {
            const noise = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453;
            dmPixels.push((Math.floor((noise - Math.floor(noise)) * 10) % 2) === 0);
          }
        }
      }

      let dmRectsHTML = '';
      dmPixels.forEach((black, idx) => {
        if (black) {
          const r = Math.floor(idx / dmSize);
          const c = idx % dmSize;
          dmRectsHTML += `<rect x="${c}" y="${r}" width="1" height="1" />`;
        }
      });

      return `
        <div class="print-label-page" style="
          width: 105mm;
          height: 148mm;
          page-break-after: always;
          break-after: page;
          box-sizing: border-box;
          padding: 24px 28px;
          display: flex;
          flex-direction: column;
          font-family: 'Arial', 'Helvetica', sans-serif;
          color: black;
          background: white;
          justify-content: flex-start;
          gap: 16px;
        ">
          <!-- TOP ROW: PO / PO-ITEM / SENDER / Q + DATAMATRIX -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
            <div style="display: flex; gap: 24px; flex: 1;">
              <div>
                <div style="font-size: 9px; text-transform: uppercase; color: #555; font-weight: bold; margin-bottom: 2px; font-family: sans-serif;">PO</div>
                <div style="font-size: 18px; font-weight: 900; letter-spacing: -0.3px; font-family: sans-serif;">${poNumber}</div>
              </div>
              <div>
                <div style="font-size: 9px; text-transform: uppercase; color: #555; font-weight: bold; margin-bottom: 2px; font-family: sans-serif;">PO-ITEM</div>
                <div style="font-size: 18px; font-weight: 900; letter-spacing: -0.3px; font-family: sans-serif;">${poItem}</div>
              </div>
              <div>
                <div style="font-size: 9px; text-transform: uppercase; color: #555; font-weight: bold; margin-bottom: 2px; font-family: sans-serif;">SENDER</div>
                <div style="font-size: 18px; font-weight: 900; letter-spacing: -0.3px; font-family: sans-serif;">${senderId}</div>
              </div>
              <div>
                <div style="font-size: 9px; text-transform: uppercase; color: #555; font-weight: bold; margin-bottom: 2px; font-family: sans-serif;">Q</div>
                <div style="font-size: 18px; font-weight: 900; letter-spacing: -0.3px; font-family: sans-serif;">${quantityQ}</div>
              </div>
            </div>
            <!-- DataMatrix SVG -->
            <div style="width: 52px; height: 52px; flex-shrink: 0;">
              <svg viewBox="0 0 ${dmSize} ${dmSize}" style="width: 100%; height: 100%;" shape-rendering="crispEdges">
                <g fill="black">
                  ${dmRectsHTML}
                </g>
              </svg>
            </div>
          </div>

          <!-- STYLENAME -->
          <div style="display: flex; flex-direction: column; width: 100%;">
            <div style="font-size: 9px; text-transform: uppercase; color: #555; font-weight: bold; margin-bottom: 2px; font-family: sans-serif;">Stylename</div>
            <div style="font-size: 19px; font-weight: 900; font-family: sans-serif; letter-spacing: -0.2px;">${styleNameOverride}</div>
          </div>

          <!-- COLUMN DETAILS: COLOR/SIZE / QUANTITY / MATERIAL -->
          <div style="display: flex; width: 100%; justify-content: flex-start; gap: 40px;">
            <div style="min-width: 90px;">
              <div style="font-size: 9px; text-transform: uppercase; color: #555; font-weight: bold; margin-bottom: 2px; font-family: sans-serif;">Color / Size</div>
              <div style="font-size: 18px; font-weight: 900; font-family: sans-serif; letter-spacing: -0.2px;">${colorSizeVal}</div>
            </div>
            <div style="min-width: 70px;">
              <div style="font-size: 9px; text-transform: uppercase; color: #555; font-weight: bold; margin-bottom: 2px; font-family: sans-serif;">Quantity</div>
              <div style="font-size: 18px; font-weight: 900; font-family: sans-serif; letter-spacing: -0.2px;">${ctn.pcsPerCarton}</div>
            </div>
            <div>
              <div style="font-size: 9px; text-transform: uppercase; color: #555; font-weight: bold; margin-bottom: 2px; font-family: sans-serif;">Material</div>
              <div style="font-size: 18px; font-weight: 900; font-family: sans-serif; letter-spacing: -0.2px;">${matVal}</div>
            </div>
          </div>

          <!-- LOCATION / DEPOT -->
          <div style="font-size: 21px; font-weight: 900; font-family: sans-serif; width: 100%; margin-top: 4px; letter-spacing: -0.3px;">
            ${destinationDepot}
          </div>

          <!-- 1D SSCC BARCODE -->
          <div style="display: flex; flex-direction: column; align-items: center; width: 100%; margin-top: auto; padding-top: 12px;">
            <div style="width: 100%; height: 75px;">
              <svg viewBox="0 0 ${bars.length} 100" preserveAspectRatio="none" style="width: 100%; height: 100%;" shape-rendering="crispEdges">
                <g fill="black">
                  ${barcodeRectsHTML}
                </g>
              </svg>
            </div>
            <div style="font-size: 14px; font-weight: 900; font-family: sans-serif; letter-spacing: 0.5px; text-align: center; margin-top: 6px;">
              ${ssccWithAI}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Inject temporary styles for pure layout rendering
    const styleEl = document.createElement('style');
    styleEl.id = 'print-labels-styles';
    styleEl.innerHTML = `
      @media print {
        body > *:not(#labels-print-area) {
          display: none !important;
        }
        #labels-print-area {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .print-label-page {
          width: 105mm !important;
          height: 148mm !important;
          page-break-after: always !important;
          break-after: page !important;
          display: flex !important;
          flex-direction: column !important;
          box-sizing: border-box !important;
          background: white !important;
          color: black !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        @page {
          size: A6 portrait;
          margin: 0;
        }
      }
    `;
    document.head.appendChild(styleEl);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        styleEl.remove();
        // Clear printer nodes
        if (printArea) printArea.innerHTML = '';
      }, 500);
    }, 200);
  };

  // Preview elements
  const currentPreviewCarton = visibleCartons[previewIdx];

  const handlePrevPreview = () => {
    if (previewIdx > 0) {
      setPreviewIdx(previewIdx - 1);
    } else {
      setPreviewIdx(visibleCartons.length - 1);
    }
  };

  const handleNextPreview = () => {
    if (previewIdx < visibleCartons.length - 1) {
      setPreviewIdx(previewIdx + 1);
    } else {
      setPreviewIdx(0);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BAR AND METRICS DETAILED */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
        darkMode ? 'bg-[#161a23] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-orange-500/15 text-orange-500">
              <Printer className="w-4 h-4" />
            </span>
            <h2 className={`text-sm font-mono font-bold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              🏷️ MODULE D'IMPRESSION D'ÉTIQUETTES PARCELLES (A6 THERMIQUE)
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 font-sans max-w-2xl leading-relaxed">
            Configurez les adresses professionnelles, sélectionnez vos colis de façon indépendante, simulez un scan code barre, et imprimez simultanément vos étiquettes sur support adhésif thermique standard <strong>A6 (105x148 mm)</strong>.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handlePrintLabels}
            className="px-4 py-2 bg-gradient-to-r from-[#E51B22] to-red-600 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer text-white font-extrabold text-[10px] font-mono tracking-wider uppercase rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-red-500/10"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>IMPRIMER LES ({selectedCartonIds.size}) SÉLECTIONNÉS</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* PARAMS SIDE (6 cols) */}
        <div className="xl:col-span-7 space-y-6">
          
          {/* ADVANCED ROUTING CONFIG COMPLETION */}
          <div className={`p-5 rounded-xl border ${darkMode ? 'bg-[#161a23] border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
            <div className="flex items-center gap-2 pb-2 border-b border-dashed border-slate-850 dark:border-slate-800">
              <User className="w-3.5 h-3.5 text-orange-500" />
              <h3 className={`text-xs font-mono font-extrabold uppercase ${darkMode ? 'text-slate-200' : 'text-slate-705'}`}>
                1. EXPÉDITEUR / SENDER (Dépôt Stock)
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Raison sociale / Société</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className={`w-full text-[11px] font-mono rounded-lg px-2.5 py-2 block border focus:outline-none transition-all ${
                    darkMode ? 'bg-[#1f2430] border-slate-800 text-white focus:border-orange-500' : 'bg-[#f4f6fb] border-slate-250 text-slate-900 focus:border-[#ff5000]'
                  }`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Téléphone Dépôt</label>
                <input
                  type="text"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className={`w-full text-[11px] font-mono rounded-lg px-2.5 py-2 block border focus:outline-none transition-all ${
                    darkMode ? 'bg-[#1f2430] border-slate-800 text-white focus:border-orange-500' : 'bg-[#f4f6fb] border-slate-250 text-slate-900 focus:border-[#ff5000]'
                  }`}
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Adresse Rue / Bâtiment / Quai</label>
                <input
                  type="text"
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                  className={`w-full text-[11px] font-mono rounded-lg px-2.5 py-2 block border focus:outline-none transition-all ${
                    darkMode ? 'bg-[#1f2430] border-slate-800 text-white focus:border-orange-500' : 'bg-[#f4f6fb] border-slate-250 text-slate-900 focus:border-[#ff5000]'
                  }`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Code Postal & Ville</label>
                <input
                  type="text"
                  value={senderZipCity}
                  onChange={(e) => setSenderZipCity(e.target.value)}
                  className={`w-full text-[11px] font-mono rounded-lg px-2.5 py-2 block border focus:outline-none transition-all ${
                    darkMode ? 'bg-[#1f2430] border-slate-800 text-white focus:border-orange-500' : 'bg-[#f4f6fb] border-slate-250 text-slate-900 focus:border-[#ff5000]'
                  }`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Pays Origine</label>
                <input
                  type="text"
                  value={senderCountry}
                  onChange={(e) => setSenderCountry(e.target.value)}
                  className={`w-full text-[11px] font-mono rounded-lg px-2.5 py-2 block border focus:outline-none transition-all ${
                    darkMode ? 'bg-[#1f2430] border-slate-800 text-white focus:border-orange-500' : 'bg-[#f4f6fb] border-slate-250 text-slate-900 focus:border-[#ff5000]'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className={`p-5 rounded-xl border ${darkMode ? 'bg-[#161a23] border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
            <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-850 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-orange-500" />
                <h3 className={`text-xs font-mono font-extrabold uppercase ${darkMode ? 'text-slate-200' : 'text-slate-705'}`}>
                  2. DESTINATAIRE / SHIP TO (Client final)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRecipientOverridden(!isRecipientOverridden);
                  if (isRecipientOverridden) {
                    // resets to props
                    setDestName(meta.customer || 'CLIENTS ET COMPAGNIE');
                    setDestAddress(meta.address || '128 Boulevard Central, Quai de Déchargement');
                    setDestZipCity(meta.destination || '75001 Paris');
                    setDestCountry(meta.pays || 'FRANCE');
                  }
                }}
                className={`px-2 py-1 rounded border text-[9px] font-bold font-mono uppercase cursor-pointer transition-all ${
                  isRecipientOverridden 
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                }`}
              >
                {isRecipientOverridden ? '🔄 Réinitialiser' : '✍️ Surcharger'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Raison sociale Client</label>
                <input
                  type="text"
                  value={destName}
                  disabled={!isRecipientOverridden}
                  onChange={(e) => setDestName(e.target.value)}
                  className={`w-full text-[11px] font-mono rounded-lg px-2.5 py-2 block border focus:outline-none transition-all disabled:opacity-50 ${
                    darkMode ? 'bg-[#1f2430] border-slate-800 text-white focus:border-orange-500' : 'bg-[#f4f6fb] border-slate-250 text-slate-900 focus:border-[#ff5000]'
                  }`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Pays de Destination</label>
                <input
                  type="text"
                  value={destCountry}
                  disabled={!isRecipientOverridden}
                  onChange={(e) => setDestCountry(e.target.value)}
                  className={`w-full text-[11px] font-mono rounded-lg px-2.5 py-2 block border focus:outline-none transition-all disabled:opacity-50 ${
                    darkMode ? 'bg-[#1f2430] border-slate-800 text-white focus:border-orange-500' : 'bg-[#f4f6fb] border-slate-250 text-slate-900 focus:border-[#ff5000]'
                  }`}
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Adresse Livraison complète</label>
                <input
                  type="text"
                  value={destAddress}
                  disabled={!isRecipientOverridden}
                  onChange={(e) => setDestAddress(e.target.value)}
                  className={`w-full text-[11px] font-mono rounded-lg px-2.5 py-2 block border focus:outline-none transition-all disabled:opacity-50 ${
                    darkMode ? 'bg-[#1f2430] border-slate-800 text-white focus:border-orange-500' : 'bg-[#f4f6fb] border-slate-250 text-slate-900 focus:border-[#ff5000]'
                  }`}
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Ville / Code Postal / Hub de Livraison</label>
                <input
                  type="text"
                  value={destZipCity}
                  disabled={!isRecipientOverridden}
                  onChange={(e) => setDestZipCity(e.target.value)}
                  className={`w-full text-[11px] font-mono rounded-lg px-2.5 py-2 block border focus:outline-none transition-all disabled:opacity-50 ${
                    darkMode ? 'bg-[#1f2430] border-slate-800 text-white focus:border-orange-500' : 'bg-[#f4f6fb] border-slate-250 text-slate-900 focus:border-[#ff5000]'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className={`p-5 rounded-xl border ${darkMode ? 'bg-[#161a23] border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
            <div className="flex items-center gap-2 pb-2 border-b border-dashed border-slate-850 dark:border-slate-800">
              <Truck className="w-3.5 h-3.5 text-orange-500" />
              <h3 className={`text-xs font-mono font-extrabold uppercase ${darkMode ? 'text-slate-200' : 'text-slate-705'}`}>
                3. TRANSPORT & IDENTIFICATION LOGISTIQUE
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Transporteur de colis</label>
                <select
                  value={carrier}
                  onChange={(e: any) => setCarrier(e.target.value)}
                  className={`w-full text-[11px] font-mono rounded-lg px-2.5 py-1.5 block border focus:outline-none cursor-pointer transition-all ${
                    darkMode ? 'bg-[#1f2430] border-slate-800 text-white focus:border-orange-500' : 'bg-[#f4f6fb] border-slate-250 text-slate-900 focus:border-[#ff5000]'
                  }`}
                >
                  <option value="DHL">DHL EXPRESS</option>
                  <option value="FEDEX">FEDEX FREIGHT</option>
                  <option value="UPS">UPS SAVER</option>
                  <option value="COLISSIMO">COLISSIMO LA POSTE</option>
                  <option value="CHRONOPOST">CHRONOPOST CLASSIQUE</option>
                  <option value="DPD">DPD EUROPE</option>
                  <option value="CUSTOM">AUTRE TRANSPORTEUR</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Code Zone de Tri / routage</label>
                <input
                  type="text"
                  value={routingZone}
                  onChange={(e) => setRoutingZone(e.target.value.toUpperCase())}
                  className={`w-full text-[11px] font-mono rounded-lg px-2.5 py-2 block border focus:outline-none transition-all ${
                    darkMode ? 'bg-[#1f2430] border-slate-800 text-white focus:border-orange-500' : 'bg-[#f4f6fb] border-slate-250 text-slate-900 focus:border-[#ff5000]'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Libellé d'En-tête Étiquette</label>
                <input
                  type="text"
                  value={customBranding}
                  onChange={(e) => setCustomBranding(e.target.value)}
                  className={`w-full text-[11px] font-mono rounded-lg px-2.5 py-2 block border focus:outline-none transition-all ${
                    darkMode ? 'bg-[#1f2430] border-slate-800 text-white focus:border-orange-500' : 'bg-[#f4f6fb] border-slate-250 text-slate-900 focus:border-[#ff5000]'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Simulacre Barcode</label>
                <select
                  value={barcodeType}
                  onChange={(e: any) => setBarcodeType(e.target.value)}
                  className={`w-full text-[11px] font-mono rounded-lg px-2.5 py-1.5 block border focus:outline-none cursor-pointer transition-all ${
                    darkMode ? 'bg-[#1f2430] border-slate-800 text-white focus:border-orange-500' : 'bg-[#f4f6fb] border-slate-250 text-slate-900 focus:border-[#ff5000]'
                  }`}
                >
                  <option value="CODE128">Standard Linéaire (Code 128)</option>
                  <option value="DATAMATRIX">Carré Matriciel (DataMatrix)</option>
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* PREVIEW AND SELECTION CONTROLLER SIDE (5 cols) */}
        <div className="xl:col-span-5 space-y-6">
          
          {/* A6 LIVE THERMAL RENDERING VIEW (high contrast) */}
          <div className="space-y-3.5">
            <h3 className={`text-xs font-mono font-bold tracking-tight uppercase flex items-center gap-1.5 ${darkMode ? 'text-slate-350' : 'text-slate-800'}`}>
              <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
              Rendu Visuel Réaliste A6 Thermique
            </h3>

            {visibleCartons.length === 0 ? (
              <div className={`p-8 border border-dashed rounded-xl text-center space-y-2 font-mono text-xs ${
                darkMode ? 'bg-[#161a23]/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-250 text-slate-600'
              }`}>
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto animate-pulse" />
                <p>Aucun colis généré à afficher.</p>
                <p className="text-[11px] text-slate-500">Saisissez des quantités solides ou mixtes sous l'onglet "Saisie Colisage" !</p>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Simulated Sticker Container */}
                <div className="flex flex-col items-center justify-center">
                  
                  {/* Sticky sheet card style */}
                  <div 
                    id="sticker-thermal-card-preview" 
                    className="aspect-[105/148] w-full max-w-[340px] px-3.5 py-4 bg-white text-black border-[3.5px] border-black flex flex-col justify-between shadow-xl select-none select-text rounded-2xs relative tracking-wide select-none"
                    style={{ fontFamily: 'monospace' }}
                  >
                    
                    {/* TOP SECTION: LOGO + CARRIER */}
                    <div className="flex items-center justify-between border-b-[2.5px] border-black pb-1.5">
                      <div>
                        <span className="font-sans font-black text-xs inline-block tracking-tighter text-black uppercase">{customBranding}</span>
                        <div className="text-[7px] font-mono leading-none tracking-tight opacity-75">SPECS LABELS THERMAL A6</div>
                      </div>
                      <div className="bg-black text-white px-2 py-0.5 font-sans font-extrabold text-[10px] tracking-wide rounded-xs">
                        {carrier} EXP
                      </div>
                    </div>

                    {/* SENDER & SHIP TO ADDRESS FIELDS */}
                    <div className="flex border-b-[2px] border-black text-[7.5px] min-height-[52px]">
                      <div className="w-1/2 border-r-[2px] border-black pr-1.5 pt-1 pb-1">
                        <div className="text-[6px] font-black underline mb-0.5">SENDER:</div>
                        <div className="font-extrabold">{senderName}</div>
                        <div className="truncate">{senderAddress}</div>
                        <div>{senderZipCity}</div>
                        <div className="font-extrabold">{senderCountry}</div>
                      </div>
                      
                      <div className="w-1/2 pl-1.5 pt-1 pb-1 relative">
                        <div className="text-[6px] font-black underline mb-0.5">SHIP TO:</div>
                        <div className="font-black text-[9px] leading-tight text-black line-clamp-1">{destName}</div>
                        <div className="line-clamp-2 leading-none mt-0.5 text-[7px]">{destAddress}</div>
                        <div className="font-extrabold mt-0.5">{destZipCity}</div>
                        <div className="font-black text-[8px] tracking-wider mt-0.5 uppercase">{destCountry}</div>

                        {/* Zone Stamp */}
                        <div className="absolute right-0 top-1 text-xs font-black border-2 border-black rounded px-1.5 py-0.5 bg-white flex items-center justify-center">
                          D
                        </div>
                      </div>
                    </div>

                    {/* INTERN METRICS */}
                    <div className="grid grid-cols-3 border-b-[2px] border-black text-[8px] bg-slate-100">
                      <div className="border-r-[1.5px] border-black p-1 text-center">
                        <div className="text-[5.5px] opacity-75">COMMANDE:</div>
                        <strong className="text-[8px] font-black block leading-none">{meta.order || '—'}</strong>
                      </div>
                      <div className="border-r-[1.5px] border-black p-1 text-center">
                        <div className="text-[5.5px] opacity-75">N° STYLE:</div>
                        <strong className="text-[8px] font-black block leading-none">{meta.styleNumber || '—'}</strong>
                      </div>
                      <div className="p-1 text-center">
                        <div className="text-[5.5px] opacity-75">PO CLIENT:</div>
                        <strong className="text-[8px] font-black block leading-none truncate">{meta.po || meta.refClient || '—'}</strong>
                      </div>
                    </div>

                    {/* COLOR AND SIZES GRID INFO */}
                    <div className="border-b-[2px] border-black p-1.5 bg-white">
                      <div className="flex items-center justify-between text-[8.5px] font-bold mb-1">
                        <div>COULEUR / COLOR: <strong className="text-[10px] font-black bg-slate-200 px-1 py-px rounded">{currentPreviewCarton.colorName}</strong></div>
                        <div>#{currentPreviewCarton.type === 'mixed' ? 'MIXTE' : 'SOLIDE'}</div>
                      </div>
                      <div className="text-[7.5px] font-mono font-bold leading-relaxed border border-slate-300 p-1 rounded-sm bg-slate-50/50 flex flex-wrap justify-center gap-x-1.5 gap-y-0.5">
                        {Object.entries(currentPreviewCarton.sizes).map(([sz, qty]) => (
                          <span key={sz} className="whitespace-nowrap"><span className="underline">{sz}</span>:&nbsp;<b>{qty}</b></span>
                        ))}
                      </div>
                    </div>

                    {/* WEIGHTS, CBM, SKUS AND QUANTITIES */}
                    <div className="grid grid-cols-2 border-b-[2px] border-black text-[8px] py-1">
                      <div className="border-r-[1.5px] border-black pr-1.5 flex flex-col justify-center">
                        <div className="leading-tight">POIDS NET: <b>{currentPreviewCarton.netWeight.toFixed(2)} KG</b></div>
                        <div className="leading-tight font-black text-[8.5px]">POIDS BRUT: <b>{currentPreviewCarton.grossWeight.toFixed(2)} KG</b></div>
                        <div className="leading-tight text-[7px]">VOL: &nbsp;<b>{currentPreviewCarton.cbm.toFixed(4)} m³</b></div>
                      </div>
                      <div className="pl-1.5 flex flex-col justify-center gap-px">
                        <div className="leading-tight text-[7px] truncate font-extrabold text-black">SKU: {currentPreviewCarton.sku}</div>
                        <div className="leading-tight text-[7px]">DIM: <b>{currentPreviewCarton.dimensions} CM</b></div>
                        <div className="text-[8.5px] font-black tracking-tight leading-none text-black mt-0.5 uppercase">QTE: {currentPreviewCarton.pcsPerCarton} PCS</div>
                      </div>
                    </div>

                    {/* TRANSIT STRIP BARCODE/STAGE */}
                    <div className="border-b-[2px] border-black py-1.5 px-1 bg-black text-white flex items-center justify-between text-[7px]">
                      <div>ROUTE INDEX:<br/><strong className="text-[9.5px] font-bold tracking-wider">{routingZone}</strong></div>
                      <div className="text-right">
                        <span>COLOR CTN:</span>
                        <div className="text-[11.5px] font-black leading-none mt-0.5">#{currentPreviewCarton.cartonNum} / {flattenedCartons.filter(c => c.colorName === currentPreviewCarton.colorName).length}</div>
                      </div>
                      <div className="text-right border-l border-white/40 pl-1.5">
                        <span>GLOBAL BOX:</span>
                        <div className="text-[10px] font-black leading-none mt-0.5">{currentPreviewCarton.globalCartonNum} / {flattenedCartons.length}</div>
                      </div>
                    </div>

                    {/* BARCODE DRAWING CANVAS (CSS) */}
                    <div className="pt-2 flex flex-col items-center justify-center">
                      {barcodeType === 'CODE128' ? (
                        <>
                          {/* Pseudo barcode graphic stripes */}
                          <div className="flex gap-[0.5px] w-full h-8 justify-center items-stretch overflow-hidden">
                            {Array.from({ length: 35 }).map((_, bIdx) => {
                              const stripeWidth = (bIdx % 4 === 0) ? '3px' : (bIdx % 2 === 0) ? '1px' : '1.5px';
                              const transparent = (bIdx % 5 === 1 && bIdx > 3 && bIdx < 31) ? 'opacity-0' : 'opacity-100';
                              return <div key={bIdx} className={`bg-black h-full ${transparent}`} style={{ width: stripeWidth }} />;
                            })}
                          </div>
                        </>
                      ) : (
                        <div className="w-8 h-8 bg-black p-0.5 flex flex-wrap justify-between items-between overflow-hidden gap-[0.5px]">
                          {Array.from({ length: 64 }).map((_, pixIdx) => {
                            const isBlack = (pixIdx * 7) % 3 !== 0;
                            return <div key={pixIdx} className={`w-[3px] h-[3px] ${isBlack ? 'bg-white' : 'bg-black'}`} />;
                          })}
                        </div>
                      )}
                      
                      <div className="text-[7.5px] font-bold tracking-widest uppercase text-black font-mono mt-1 select-text">
                        {`BAR-${meta.order || 'ORD'}-${currentPreviewCarton.colorName}-${currentPreviewCarton.cartonNum}`.toUpperCase().replace(/\s+/g, '-')}
                      </div>
                    </div>

                  </div>
                </div>

                {/* PREVIEW CONTROLS AND MULTI ACTION */}
                <div className="flex items-center justify-between gap-3 max-w-[340px] mx-auto">
                  <button
                    type="button"
                    onClick={handlePrevPreview}
                    className={`p-2.5 rounded-lg border cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${
                      darkMode ? 'border-slate-800 bg-slate-900 text-slate-300' : 'border-slate-350 bg-white text-slate-700 shadow-5xs'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="text-center font-mono">
                    <div className={`text-[10px] font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      Colis {previewIdx + 1} / {visibleCartons.length}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      (Modèle: {currentPreviewCarton.colorName})
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextPreview}
                    className={`p-2.5 rounded-lg border cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${
                      darkMode ? 'border-slate-800 bg-slate-900 text-slate-300' : 'border-slate-350 bg-white text-slate-700 shadow-5xs'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 max-w-[340px] mx-auto pt-1">
                  {/* SCAN SIMULATION TRIGGER */}
                  <button
                    type="button"
                    onClick={() => handleScanSimulation(currentPreviewCarton)}
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[10px] tracking-wider uppercase font-extrabold rounded-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer transition-all flex items-center justify-center gap-1 shadow-md shadow-blue-500/10"
                    title="Simule le bip sonore d'un lecteur de scanner de quai"
                  >
                    🚀 SIMULER SCAN BIP
                  </button>
                  
                  {/* Select this specific label selector helper */}
                  <button
                    type="button"
                    onClick={() => toggleSelectCarton(currentPreviewCarton.id)}
                    className={`py-2 px-3 border rounded-lg font-mono text-[10px] font-bold cursor-pointer transition-all ${
                      selectedCartonIds.has(currentPreviewCarton.id)
                        ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                        : 'bg-slate-500/10 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {selectedCartonIds.has(currentPreviewCarton.id) ? '✓ SÉLECTIONNÉ' : '✕ EXCLURE'}
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* CHECKLIST SELECTIONS / FILTERING AND BULK ACTIONS */}
          <div className={`p-4 rounded-xl border ${darkMode ? 'bg-[#161a23] border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-orange-500" />
                <h3 className={`text-xs font-mono font-bold uppercase ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  Filtre & Colis Individuels ({selectedCartonIds.size} / {flattenedCartons.length})
                </h3>
              </div>

              {/* Color filter */}
              <select
                value={colorFilter}
                onChange={(e) => {
                  setColorFilter(e.target.value);
                  setPreviewIdx(0);
                }}
                className={`text-[9px] font-mono rounded px-1.5 py-0.5 border focus:outline-none cursor-pointer ${
                  darkMode ? 'bg-[#1f2430] border-slate-800 text-white' : 'bg-[#f4f6fb] border-slate-250 text-slate-800'
                }`}
              >
                <option value="all">Tout voir ({flattenedCartons.length})</option>
                {Array.from(new Set(flattenedCartons.map(c => c.colorName))).map((colName) => (
                  <option key={colName} value={colName}>{colName}</option>
                ))}
              </select>
            </div>

            {/* Quick bulk action checkboxes */}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={selectAllVisible}
                className={`flex-1 py-1 px-2 border rounded font-mono text-[9px] font-bold hover:scale-[1.01] active:scale-[0.99] cursor-pointer transition-all ${
                  darkMode ? 'bg-[#1c2936] text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-600 border-blue-300'
                }`}
              >
                Tout cocher vue
              </button>
              <button
                type="button"
                onClick={deselectAllVisible}
                className={`flex-1 py-1 px-2 border rounded font-mono text-[9px] font-bold hover:scale-[1.01] active:scale-[0.99] cursor-pointer transition-all ${
                  darkMode ? 'bg-[#29161a] text-rose-450 border-rose-500/30' : 'bg-rose-50 text-rose-650 border-rose-300'
                }`}
              >
                Tout décocher vue
              </button>
            </div>

            {/* Box items list to check/uncheck */}
            <div className="max-h-[140px] overflow-y-auto pr-1 scrollbar-thin space-y-1.5 border border-dashed border-slate-800/80 rounded-lg p-2 bg-slate-900/10">
              {visibleCartons.length === 0 ? (
                <div className="text-[10px] text-center text-slate-500 font-mono py-4">Pas de colis à lister</div>
              ) : (
                visibleCartons.map((ctn) => (
                  <label 
                    key={ctn.id}
                    className={`flex items-center justify-between text-[10px] font-mono p-1 rounded transition-all cursor-pointer ${
                      selectedCartonIds.has(ctn.id)
                        ? darkMode ? 'bg-slate-800/50 text-emerald-400' : 'bg-slate-100 text-emerald-800 font-semibold'
                        : 'text-slate-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <input 
                        type="checkbox"
                        checked={selectedCartonIds.has(ctn.id)}
                        onChange={() => toggleSelectCarton(ctn.id)}
                        className="rounded accent-emerald-500 cursor-pointer"
                      />
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ctn.colorHex }} />
                      <span className="truncate"><b>{ctn.colorName}</b> • Colis #{ctn.cartonNum} ({ctn.pcsPerCarton} Pcs)</span>
                    </div>
                    <span className="text-[9px] opacity-80 text-right font-light">Gross: {ctn.grossWeight.toFixed(1)}kg</span>
                  </label>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
