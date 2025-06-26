

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { ResultDisplay } from './ui/ResultDisplay';
import { BarChartIcon } from './ui/Icons';
import { ConfigurableNumericInputKey, NumericRangeSettings, FieldInputMode, ConfigurableBuffFieldKey, StatusCalcAbilityBuffFieldKey, MemoEntry, MemoSectionKey, StatusCalculatorMemoSectionKey, getInitialEmptySectionMemos } from '../types';
import { ToggleSwitch } from './ui/ToggleSwitch';
import { SmallButton } from './ui/SmallButton';
import { MemoModal } from './ui/MemoModal';

const parseInput = (value: string, defaultValue: number = 0): number => {
  const num = parseFloat(value);
  return isNaN(num) || !isFinite(num) ? defaultValue : num;
};

const parsePercentageStringGeneric = (str: string): number[] => {
    if (!str.trim()) return [];
    return str.split(',')
      .map(s => parseFloat(s.trim()))
      .filter(n => !isNaN(n) && isFinite(n));
};

const LOCAL_STORAGE_KEY_STATUS_CALC_MEMOS = 'statusCalculator_sectionMemos_v1';

// Memo section keys and field lists for StatusCalculator
const memoryStatusSectionMemoKey_sc: StatusCalculatorMemoSectionKey = 'memoryStats_sc';
const supportStatusSectionMemoKey_sc: StatusCalculatorMemoSectionKey = 'supportStats_sc';
const portraitStatusSectionMemoKey_sc: StatusCalculatorMemoSectionKey = 'portraitStats_sc';
const abilityBuffsSectionMemoKey_sc: StatusCalculatorMemoSectionKey = 'abilityBuffs_sc';

const memorySectionFields_sc: string[] = ['memHp_sc', 'memAtk_sc', 'memDef_sc', 'memSpd_sc'];
const supportSectionFields_sc: string[] = ['supHp_sc', 'supAtk_sc', 'supDef_sc', 'supRate_sc'];
const portraitSectionFields_sc: string[] = ['portHp_sc', 'portAtk_sc', 'portDef_sc'];
const abilityBuffsSectionFields_sc: string[] = ['abilHpBuff_sc', 'abilAtkBuff_sc', 'abilDefBuff_sc', 'abilSpdBuff_sc'];


interface StatusCalculatorProps {
  isAuthenticated: boolean;
  fieldInputModes: Record<ConfigurableBuffFieldKey, FieldInputMode>;
  fieldNumericRanges: Record<ConfigurableNumericInputKey, NumericRangeSettings>;
}

export const StatusCalculator: React.FC<StatusCalculatorProps> = ({
  isAuthenticated,
  fieldInputModes,
  fieldNumericRanges
}) => {
  // --- Main Target States ---
  const [memoryHp, setMemoryHp] = useState<string>('0');
  const [memoryAttack, setMemoryAttack] = useState<string>('0');
  const [memoryDefense, setMemoryDefense] = useState<string>('0');
  const [memorySpeed, setMemorySpeed] = useState<string>('0');

  const [supportHp, setSupportHp] = useState<string>('0');
  const [supportAttack, setSupportAttack] = useState<string>('0');
  const [supportDefense, setSupportDefense] = useState<string>('0');
  const [supportReflectionRate, setSupportReflectionRate] = useState<string>('0');

  const [abilityHpBuff, setAbilityHpBuff] = useState<string>(fieldInputModes.abilityHpBuff_sc === 'split' ? '0,0' : '0');
  const [abilityAttackBuff, setAbilityAttackBuff] = useState<string>(fieldInputModes.abilityAttackBuff_sc === 'split' ? '0,0' : '0');
  const [abilityDefenseBuff, setAbilityDefenseBuff] = useState<string>(fieldInputModes.abilityDefenseBuff_sc === 'split' ? '0,0' : '0');
  const [abilitySpeedBuff, setAbilitySpeedBuff] = useState<string>(fieldInputModes.abilitySpeedBuff_sc === 'split' ? '0,0' : '0');
  
  const [portraitHp, setPortraitHp] = useState<string>('0');
  const [portraitAttack, setPortraitAttack] = useState<string>('0');
  const [portraitDefense, setPortraitDefense] = useState<string>('0');

  // --- Comparison Target States ---
  const [isComparing, setIsComparing] = useState<boolean>(false);

  const [memoryHp_compare, setMemoryHp_compare] = useState<string>('0');
  const [memoryAttack_compare, setMemoryAttack_compare] = useState<string>('0');
  const [memoryDefense_compare, setMemoryDefense_compare] = useState<string>('0');
  const [memorySpeed_compare, setMemorySpeed_compare] = useState<string>('0');

  const [supportHp_compare, setSupportHp_compare] = useState<string>('0');
  const [supportAttack_compare, setSupportAttack_compare] = useState<string>('0');
  const [supportDefense_compare, setSupportDefense_compare] = useState<string>('0');
  const [supportReflectionRate_compare, setSupportReflectionRate_compare] = useState<string>('0');

  const [abilityHpBuff_compare, setAbilityHpBuff_compare] = useState<string>(fieldInputModes.abilityHpBuff_sc === 'split' ? '0,0' : '0');
  const [abilityAttackBuff_compare, setAbilityAttackBuff_compare] = useState<string>(fieldInputModes.abilityAttackBuff_sc === 'split' ? '0,0' : '0');
  const [abilityDefenseBuff_compare, setAbilityDefenseBuff_compare] = useState<string>(fieldInputModes.abilityDefenseBuff_sc === 'split' ? '0,0' : '0');
  const [abilitySpeedBuff_compare, setAbilitySpeedBuff_compare] = useState<string>(fieldInputModes.abilitySpeedBuff_sc === 'split' ? '0,0' : '0');
  
  const [portraitHp_compare, setPortraitHp_compare] = useState<string>('0');
  const [portraitAttack_compare, setPortraitAttack_compare] = useState<string>('0');
  const [portraitDefense_compare, setPortraitDefense_compare] = useState<string>('0');

  // --- Memo State ---
  const [isMemoModalOpen_sc, setIsMemoModalOpen_sc] = useState<boolean>(false);
  const [activeMemoContext_sc, setActiveMemoContext_sc] = useState<{
    sectionKey: StatusCalculatorMemoSectionKey; // Use specific type for context
    sectionName: string;
    currentValues: Record<string, string>;
  } | null>(null);

  const [sectionMemos_sc, setSectionMemos_sc] = useState<Record<MemoSectionKey, MemoEntry[]>>(getInitialEmptySectionMemos());
  const isMemoFeatureEnabled_sc = true; // Component-specific flag

  // Memo State Accessors
  const memoStateAccessors_sc: Record<string, { get: () => string, set: (val: string) => void }> = useMemo(() => ({
    'memHp_sc': { get: () => memoryHp, set: setMemoryHp },
    'memAtk_sc': { get: () => memoryAttack, set: setMemoryAttack },
    'memDef_sc': { get: () => memoryDefense, set: setMemoryDefense },
    'memSpd_sc': { get: () => memorySpeed, set: setMemorySpeed },
    'supHp_sc': { get: () => supportHp, set: setSupportHp },
    'supAtk_sc': { get: () => supportAttack, set: setSupportAttack },
    'supDef_sc': { get: () => supportDefense, set: setSupportDefense },
    'supRate_sc': { get: () => supportReflectionRate, set: setSupportReflectionRate },
    'portHp_sc': { get: () => portraitHp, set: setPortraitHp },
    'portAtk_sc': { get: () => portraitAttack, set: setPortraitAttack },
    'portDef_sc': { get: () => portraitDefense, set: setPortraitDefense },
    'abilHpBuff_sc': { get: () => abilityHpBuff, set: setAbilityHpBuff },
    'abilAtkBuff_sc': { get: () => abilityAttackBuff, set: setAbilityAttackBuff },
    'abilDefBuff_sc': { get: () => abilityDefenseBuff, set: setAbilityDefenseBuff },
    'abilSpdBuff_sc': { get: () => abilitySpeedBuff, set: setAbilitySpeedBuff },
  }), [
    memoryHp, memoryAttack, memoryDefense, memorySpeed,
    supportHp, supportAttack, supportDefense, supportReflectionRate,
    portraitHp, portraitAttack, portraitDefense,
    abilityHpBuff, abilityAttackBuff, abilityDefenseBuff, abilitySpeedBuff,
  ]);
  
  // Load memos from localStorage
  useEffect(() => {
    if (isMemoFeatureEnabled_sc) {
      const newMemosState = getInitialEmptySectionMemos();
      try {
        const storedMemos = localStorage.getItem(LOCAL_STORAGE_KEY_STATUS_CALC_MEMOS);
        if (storedMemos) {
          const parsedMemosFromStorage = JSON.parse(storedMemos) as Partial<Record<StatusCalculatorMemoSectionKey, MemoEntry[]>>;
          if (parsedMemosFromStorage && typeof parsedMemosFromStorage === 'object') {
            if (Array.isArray(parsedMemosFromStorage[memoryStatusSectionMemoKey_sc])) {
              newMemosState[memoryStatusSectionMemoKey_sc] = parsedMemosFromStorage[memoryStatusSectionMemoKey_sc];
            }
            if (Array.isArray(parsedMemosFromStorage[supportStatusSectionMemoKey_sc])) {
              newMemosState[supportStatusSectionMemoKey_sc] = parsedMemosFromStorage[supportStatusSectionMemoKey_sc];
            }
            if (Array.isArray(parsedMemosFromStorage[portraitStatusSectionMemoKey_sc])) {
              newMemosState[portraitStatusSectionMemoKey_sc] = parsedMemosFromStorage[portraitStatusSectionMemoKey_sc];
            }
            if (Array.isArray(parsedMemosFromStorage[abilityBuffsSectionMemoKey_sc])) {
              newMemosState[abilityBuffsSectionMemoKey_sc] = parsedMemosFromStorage[abilityBuffsSectionMemoKey_sc];
            }
          }
        }
        setSectionMemos_sc(newMemosState);
      } catch (error) {
        console.error("Failed to load status calculator memos from localStorage:", error);
        setSectionMemos_sc(getInitialEmptySectionMemos()); // Fallback on error
      }
    }
  }, [isMemoFeatureEnabled_sc]);

  // Save memos to localStorage (only StatusCalculator specific memos)
  useEffect(() => {
    if (isMemoFeatureEnabled_sc) {
      const statusCalcMemosToStore: Partial<Record<StatusCalculatorMemoSectionKey, MemoEntry[]>> = {
        [memoryStatusSectionMemoKey_sc]: sectionMemos_sc[memoryStatusSectionMemoKey_sc],
        [supportStatusSectionMemoKey_sc]: sectionMemos_sc[supportStatusSectionMemoKey_sc],
        [portraitStatusSectionMemoKey_sc]: sectionMemos_sc[portraitStatusSectionMemoKey_sc],
        [abilityBuffsSectionMemoKey_sc]: sectionMemos_sc[abilityBuffsSectionMemoKey_sc],
      };
      localStorage.setItem(LOCAL_STORAGE_KEY_STATUS_CALC_MEMOS, JSON.stringify(statusCalcMemosToStore));
    }
  }, [sectionMemos_sc, isMemoFeatureEnabled_sc]);


  // --- Mode Change Handling for Main Target ---
  const abilityBuffFields: {
    key: StatusCalcAbilityBuffFieldKey;
    state: string;
    setState: React.Dispatch<React.SetStateAction<string>>;
    compareState: string; 
    setCompareState: React.Dispatch<React.SetStateAction<string>>; 
  }[] = useMemo(() => [
    { key: 'abilityHpBuff_sc', state: abilityHpBuff, setState: setAbilityHpBuff, compareState: abilityHpBuff_compare, setCompareState: setAbilityHpBuff_compare },
    { key: 'abilityAttackBuff_sc', state: abilityAttackBuff, setState: setAbilityAttackBuff, compareState: abilityAttackBuff_compare, setCompareState: setAbilityAttackBuff_compare },
    { key: 'abilityDefenseBuff_sc', state: abilityDefenseBuff, setState: setAbilityDefenseBuff, compareState: abilityDefenseBuff_compare, setCompareState: setAbilityDefenseBuff_compare },
    { key: 'abilitySpeedBuff_sc', state: abilitySpeedBuff, setState: setAbilitySpeedBuff, compareState: abilitySpeedBuff_compare, setCompareState: setAbilitySpeedBuff_compare },
  ], [
    abilityHpBuff, abilityAttackBuff, abilityDefenseBuff, abilitySpeedBuff,
    abilityHpBuff_compare, abilityAttackBuff_compare, abilityDefenseBuff_compare, abilitySpeedBuff_compare
  ]);

  const prevFieldInputModesRefSC = useRef<Record<StatusCalcAbilityBuffFieldKey, FieldInputMode>>(
    {} as Record<StatusCalcAbilityBuffFieldKey, FieldInputMode>
  );

  useEffect(() => { 
    const initialModes = {} as Record<StatusCalcAbilityBuffFieldKey, FieldInputMode>;
    abilityBuffFields.forEach(config => {
      initialModes[config.key] = fieldInputModes[config.key];
    });
    prevFieldInputModesRefSC.current = initialModes;
  }, []); 

  useEffect(() => {
    abilityBuffFields.forEach(config => {
      const fieldKey = config.key;
      const newMode = fieldInputModes[fieldKey];
      const oldMode = prevFieldInputModesRefSC.current?.[fieldKey];
      
      const updateStateForMode = (currentVal: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
        if (newMode === 'split') {
          const num = parseFloat(currentVal);
          if (!isNaN(num)) {
            if (num === 0) setter("0,0");
            else if (!currentVal.includes(',')) setter(num.toString());
          } else {
            setter("0,0");
          }
        } else { 
          const parts = parsePercentageStringGeneric(currentVal);
          const totalValue = parts.reduce((sum, val) => sum + val, 0);
          setter(isFinite(totalValue) ? parseFloat(totalValue.toFixed(2)).toString() : "0");
        }
      };

      if (newMode !== oldMode && oldMode !== undefined) {
        if(prevFieldInputModesRefSC.current) prevFieldInputModesRefSC.current[fieldKey] = newMode;
        updateStateForMode(config.state, config.setState);
        updateStateForMode(config.compareState, config.setCompareState); 
      } else if (oldMode === undefined && prevFieldInputModesRefSC.current) {
        prevFieldInputModesRefSC.current[fieldKey] = newMode;
      }
    });
  }, [fieldInputModes, abilityBuffFields]);

  const getParsedBuffSumPercentage = (buffKey: StatusCalcAbilityBuffFieldKey, valueStr: string): number => {
    const mode = fieldInputModes[buffKey];
    if (mode === 'split') {
      return parsePercentageStringGeneric(valueStr).reduce((sum, val) => sum + val, 0);
    }
    return parseInput(valueStr, 0);
  };

  const calculateFinalStats = (
    mHp: string, mAtk: string, mDef: string, mSpd: string,
    sHp: string, sAtk: string, sDef: string, sRefRate: string,
    pHp: string, pAtk: string, pDef: string,
    aHpBuff: string, aAtkBuff: string, aDefBuff: string, aSpdBuff: string
  ) => {
    const numMemoryHp = parseInput(mHp);
    const numMemoryAttack = parseInput(mAtk);
    const numMemoryDefense = parseInput(mDef);
    const numMemorySpeed = parseInput(mSpd);

    const numSupportHp = parseInput(sHp);
    const numSupportAttack = parseInput(sAtk);
    const numSupportDefense = parseInput(sDef);
    const numSupportReflectionRate = parseInput(sRefRate) / 100;

    const numPortraitHp = parseInput(pHp);
    const numPortraitAttack = parseInput(pAtk);
    const numPortraitDefense = parseInput(pDef);

    const sumAbilityHpBuffDecimal = getParsedBuffSumPercentage('abilityHpBuff_sc', aHpBuff) / 100;
    const sumAbilityAttackBuffDecimal = getParsedBuffSumPercentage('abilityAttackBuff_sc', aAtkBuff) / 100;
    const sumAbilityDefenseBuffDecimal = getParsedBuffSumPercentage('abilityDefenseBuff_sc', aDefBuff) / 100;
    const sumAbilitySpeedBuffDecimal = getParsedBuffSumPercentage('abilitySpeedBuff_sc', aSpdBuff) / 100;

    const effectiveSupportHp = numSupportHp * numSupportReflectionRate;
    const effectiveSupportAttack = numSupportAttack * numSupportReflectionRate;
    const effectiveSupportDefense = numSupportDefense * numSupportReflectionRate;

    const baseHp_BeforeAbility = numMemoryHp + effectiveSupportHp + numPortraitHp;
    const baseAttack_BeforeAbility = numMemoryAttack + effectiveSupportAttack + numPortraitAttack;
    const baseDefense_BeforeAbility = numMemoryDefense + effectiveSupportDefense + numPortraitDefense;
    const baseSpeed_BeforeAbility = numMemorySpeed; 

    const baseHpForDisplay = Math.floor(baseHp_BeforeAbility); 
    const baseAttackForDisplay = Math.floor(baseAttack_BeforeAbility);
    const baseDefenseForDisplay = Math.floor(baseDefense_BeforeAbility);
    const baseSpeedForDisplay = Math.floor(baseSpeed_BeforeAbility);

    const calcFinalHp = Math.floor(baseHp_BeforeAbility * (1 + sumAbilityHpBuffDecimal));
    const calcFinalAttack = Math.floor(baseAttack_BeforeAbility * (1 + sumAbilityAttackBuffDecimal));
    const calcFinalDefense = Math.floor(baseDefense_BeforeAbility * (1 + sumAbilityDefenseBuffDecimal));
    const calcFinalSpeed = Math.floor(baseSpeed_BeforeAbility * (1 + sumAbilitySpeedBuffDecimal)); 
    
    const calcChangeFromAbilityAttack = calcFinalAttack - baseAttackForDisplay;
    const calcChangeFromAbilityDefense = calcFinalDefense - baseDefenseForDisplay;
    const calcChangeFromAbilitySpeed = calcFinalSpeed - baseSpeedForDisplay;

    return {
      finalHp: calcFinalHp,
      finalAttack: calcFinalAttack,
      finalDefense: calcFinalDefense,
      finalSpeed: calcFinalSpeed,
      baseHpForDisplay: baseHpForDisplay, 
      baseAttackForDisplay: baseAttackForDisplay,
      changeFromAbilityAttack: calcChangeFromAbilityAttack,
      baseDefenseForDisplay: baseDefenseForDisplay,
      changeFromAbilityDefense: calcChangeFromAbilityDefense,
      baseSpeedForDisplay: baseSpeedForDisplay,
      changeFromAbilitySpeed: calcChangeFromAbilitySpeed,
    };
  };

  const finalStats = useMemo(() => calculateFinalStats(
    memoryHp, memoryAttack, memoryDefense, memorySpeed,
    supportHp, supportAttack, supportDefense, supportReflectionRate,
    portraitHp, portraitAttack, portraitDefense,
    abilityHpBuff, abilityAttackBuff, abilityDefenseBuff, abilitySpeedBuff
  ), [
    memoryHp, memoryAttack, memoryDefense, memorySpeed,
    supportHp, supportAttack, supportDefense, supportReflectionRate,
    portraitHp, portraitAttack, portraitDefense,
    abilityHpBuff, abilityAttackBuff, abilityDefenseBuff, abilitySpeedBuff,
    fieldInputModes 
  ]);

  const finalStats_compare = useMemo(() => {
    if (!isComparing) return null;
    return calculateFinalStats(
      memoryHp_compare, memoryAttack_compare, memoryDefense_compare, memorySpeed_compare,
      supportHp_compare, supportAttack_compare, supportDefense_compare, supportReflectionRate_compare,
      portraitHp_compare, portraitAttack_compare, portraitDefense_compare,
      abilityHpBuff_compare, abilityAttackBuff_compare, abilityDefenseBuff_compare, abilitySpeedBuff_compare
    );
  }, [
    isComparing,
    memoryHp_compare, memoryAttack_compare, memoryDefense_compare, memorySpeed_compare,
    supportHp_compare, supportAttack_compare, supportDefense_compare, supportReflectionRate_compare,
    portraitHp_compare, portraitAttack_compare, portraitDefense_compare,
    abilityHpBuff_compare, abilityAttackBuff_compare, abilityDefenseBuff_compare, abilitySpeedBuff_compare,
    fieldInputModes 
  ]);
  
  // Memo handlers
  const handleOpenMemoModalForSection_sc = (
    sectionKey: StatusCalculatorMemoSectionKey, // Use specific type for opening
    sectionName: string,
    fieldKeys: string[]
  ) => {
    if (!isMemoFeatureEnabled_sc) return;
    const currentValues: Record<string, string> = {};
    fieldKeys.forEach(key => {
      const accessor = memoStateAccessors_sc[key];
      if (accessor) {
        currentValues[key] = accessor.get();
      } else {
        console.warn(`No memo state accessor found for key ${key} in section ${sectionName} for Status Calculator`);
        currentValues[key] = '';
      }
    });
    setActiveMemoContext_sc({ sectionKey, sectionName, currentValues });
    setIsMemoModalOpen_sc(true);
  };
  
  const handleSaveSectionMemo_sc = (
    sectionKey: MemoSectionKey, // MemoModal provides global MemoSectionKey
    memoName: string,
    valuesToSave: Record<string, string>
  ): { success: boolean, error?: string } => {
    if (!memoName.trim()) {
      return { success: false, error: "メモ名は必須です。" };
    }
    const currentMemosForSection = sectionMemos_sc[sectionKey] || [];
    if (currentMemosForSection.some(memo => memo.name === memoName.trim())) {
      return { success: false, error: "同じ名前のメモが既に存在します。" };
    }
    const newMemo: MemoEntry = { 
      id: Date.now().toString(), 
      name: memoName.trim(), 
      value: valuesToSave 
    };
    setSectionMemos_sc(prev => ({
      ...prev,
      [sectionKey]: [newMemo, ...(prev[sectionKey] || [])]
    }));
    return { success: true };
  };

  const handleApplySectionMemo_sc = (
    sectionKey: MemoSectionKey, // MemoModal provides global MemoSectionKey
    valuesToApply: Record<string, string>
  ) => {
    Object.entries(valuesToApply).forEach(([key, value]) => {
      const accessor = memoStateAccessors_sc[key];
      if (accessor) {
        accessor.set(value);
      } else {
         console.warn(`No memo state setter found for key ${key} while applying memo for section ${sectionKey} in Status Calculator`);
      }
    });
    setIsMemoModalOpen_sc(false);
  };

  const handleDeleteSectionMemo_sc = (sectionKey: MemoSectionKey, memoId: string) => { // MemoModal provides global MemoSectionKey
    setSectionMemos_sc(prev => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).filter(memo => memo.id !== memoId)
    }));
  };

  const renderSimpleInput = (
    fieldKey: ConfigurableNumericInputKey,
    label: string,
    value: string,
    onChange: (val: string) => void,
    isCompareInput: boolean = false,
    unit?: string
  ) => {
    const range = fieldNumericRanges[fieldKey] || { min: '0', max: '10000' };
    const minVal = parseFloat(range.min);
    const maxVal = parseFloat(range.max);
    const inputId = isCompareInput ? `${fieldKey}_compare_sc` : `${fieldKey}_sc`;
    return (
      <Input
        id={inputId}
        label={label}
        numeric
        type="text"
        step={1}
        min={isNaN(minVal) ? undefined : minVal}
        max={isNaN(maxVal) ? undefined : maxVal}
        sliderMin={isNaN(minVal) ? undefined : minVal}
        sliderMax={isNaN(maxVal) ? undefined : maxVal}
        value={value}
        onChange={onChange}
        unit={unit}
        containerClassName="mb-3"
      />
    );
  };
  
  const renderBuffInput = (
    buffFieldKey: StatusCalcAbilityBuffFieldKey,
    label: string,
    value: string,
    onChange: (val: string) => void,
    isCompareInput: boolean = false
  ) => {
    const currentMode = fieldInputModes[buffFieldKey];
    const numericInput = currentMode === 'total';
    const placeholder = currentMode === 'split' ? "例: 20,10" : undefined;
    const displayUnit = currentMode === 'split' ? "% (カンマ区切り)" : "%";
    
    const rangeKeyForTotalMode = `${buffFieldKey}_total` as ConfigurableNumericInputKey;
    const range = fieldNumericRanges[rangeKeyForTotalMode] || { min: '0', max: '100' };
    const minVal = parseFloat(range.min);
    const maxVal = parseFloat(range.max);
    const inputId = isCompareInput ? `${buffFieldKey}_compare_sc` : `${buffFieldKey}_sc`;

    return (
      <Input
        id={inputId}
        label={label}
        numeric={numericInput}
        forceNumericKeyboard={currentMode === 'split'}
        type="text"
        step={numericInput ? 1 : undefined}
        min={numericInput ? (isNaN(minVal) ? undefined : minVal) : undefined}
        max={numericInput ? (isNaN(maxVal) ? undefined : maxVal) : undefined}
        sliderMin={numericInput ? (isNaN(minVal) ? undefined : minVal) : undefined}
        sliderMax={numericInput ? (isNaN(maxVal) ? undefined : maxVal) : undefined}
        value={value}
        onChange={onChange}
        unit={displayUnit}
        placeholder={placeholder}
        containerClassName="mb-3"
      />
    );
  };

  const handleCopyMemoryStats = () => {
    setMemoryHp_compare(memoryHp);
    setMemoryAttack_compare(memoryAttack);
    setMemoryDefense_compare(memoryDefense);
    setMemorySpeed_compare(memorySpeed);
  };

  const MemoButton = ({ sectionKey, sectionName, fieldKeys }: { sectionKey: StatusCalculatorMemoSectionKey, sectionName: string, fieldKeys: string[] }) => (
    <button
      onClick={() => handleOpenMemoModalForSection_sc(sectionKey, sectionName, fieldKeys)}
      className="ml-auto px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded shadow-md transition-colors h-7 self-center"
      aria-label={`${sectionName}に関するメモを管理`}
      title="このセクションの値をメモする"
    >
      凸
    </button>
  );

  const renderInputSection = (isCompare: boolean) => {
    const s = isCompare ? {
      memoryHp: memoryHp_compare, setMemoryHp: setMemoryHp_compare,
      memoryAttack: memoryAttack_compare, setMemoryAttack: setMemoryAttack_compare,
      memoryDefense: memoryDefense_compare, setMemoryDefense: setMemoryDefense_compare,
      memorySpeed: memorySpeed_compare, setMemorySpeed: setMemorySpeed_compare,
      supportHp: supportHp_compare, setSupportHp: setSupportHp_compare,
      supportAttack: supportAttack_compare, setSupportAttack: setSupportAttack_compare,
      supportDefense: supportDefense_compare, setSupportDefense: setSupportDefense_compare,
      supportReflectionRate: supportReflectionRate_compare, setSupportReflectionRate: setSupportReflectionRate_compare,
      portraitHp: portraitHp_compare, setPortraitHp: setPortraitHp_compare,
      portraitAttack: portraitAttack_compare, setPortraitAttack: setPortraitAttack_compare,
      portraitDefense: portraitDefense_compare, setPortraitDefense: setPortraitDefense_compare,
      abilityHpBuff: abilityHpBuff_compare, setAbilityHpBuff: setAbilityHpBuff_compare,
      abilityAttackBuff: abilityAttackBuff_compare, setAbilityAttackBuff: setAbilityAttackBuff_compare,
      abilityDefenseBuff: abilityDefenseBuff_compare, setAbilityDefenseBuff: setAbilityDefenseBuff_compare,
      abilitySpeedBuff: abilitySpeedBuff_compare, setAbilitySpeedBuff: setAbilitySpeedBuff_compare,
    } : {
      memoryHp, setMemoryHp, memoryAttack, setMemoryAttack, memoryDefense, setMemoryDefense, memorySpeed, setMemorySpeed,
      supportHp, setSupportHp, supportAttack, setSupportAttack, supportDefense, setSupportDefense, supportReflectionRate, setSupportReflectionRate,
      portraitHp, setPortraitHp, portraitAttack, setPortraitAttack, portraitDefense, setPortraitDefense,
      abilityHpBuff, setAbilityHpBuff, abilityAttackBuff, setAbilityAttackBuff, abilityDefenseBuff, setAbilityDefenseBuff, abilitySpeedBuff, setAbilitySpeedBuff,
    };

    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-x-6 gap-y-0 ${isCompare ? 'mt-6 pt-4 border-t border-gray-700' : ''}`}>
        <div className="space-y-0">
          <div className="p-3 border border-gray-700 rounded-lg mb-4">
            <div className="flex justify-between items-center mb-2 border-b border-gray-600 pb-1">
              <h3 className="text-md font-semibold text-primary-light">
                キオクのステータス {isCompare && "(比較対象)"}
              </h3>
              {isCompare && (
                <SmallButton
                  label="主対象コピー"
                  onClick={handleCopyMemoryStats}
                  className="ml-2 !py-0.5 !text-xs" 
                />
              )}
              {!isCompare && isMemoFeatureEnabled_sc && (
                <MemoButton sectionKey={memoryStatusSectionMemoKey_sc} sectionName="キオクのステータス" fieldKeys={memorySectionFields_sc} />
              )}
            </div>
            {renderSimpleInput('memoryHp_sc', 'HP', s.memoryHp, s.setMemoryHp, isCompare)}
            {renderSimpleInput('memoryAttack_sc', '攻撃力', s.memoryAttack, s.setMemoryAttack, isCompare)}
            {renderSimpleInput('memoryDefense_sc', '防御力', s.memoryDefense, s.setMemoryDefense, isCompare)}
            {renderSimpleInput('memorySpeed_sc', 'スピード', s.memorySpeed, s.setMemorySpeed, isCompare)}
          </div>
          <div className="p-3 border border-gray-700 rounded-lg">
            <div className="flex justify-between items-center mb-2 border-b border-gray-600 pb-1">
                <h3 className="text-md font-semibold text-primary-light">サポートキオクのステータス {isCompare && "(比較対象)"}</h3>
                {!isCompare && isMemoFeatureEnabled_sc && (
                    <MemoButton sectionKey={supportStatusSectionMemoKey_sc} sectionName="サポートキオクのステータス" fieldKeys={supportSectionFields_sc} />
                )}
            </div>
            {renderSimpleInput('supportHp_sc', 'HP', s.supportHp, s.setSupportHp, isCompare)}
            {renderSimpleInput('supportAttack_sc', '攻撃力', s.supportAttack, s.setSupportAttack, isCompare)}
            {renderSimpleInput('supportDefense_sc', '防御力', s.supportDefense, s.setSupportDefense, isCompare)}
            {renderSimpleInput('supportReflectionRate_sc', 'ステータス反映率', s.supportReflectionRate, s.setSupportReflectionRate, isCompare, '%')}
          </div>
        </div>
        
        <div className="space-y-0">
          <div className="p-3 border border-gray-700 rounded-lg mb-4">
             <div className="flex justify-between items-center mb-2 border-b border-gray-600 pb-1">
                <h3 className="text-md font-semibold text-primary-light">ポートレイト {isCompare && "(比較対象)"}</h3>
                {!isCompare && isMemoFeatureEnabled_sc && (
                    <MemoButton sectionKey={portraitStatusSectionMemoKey_sc} sectionName="ポートレイト" fieldKeys={portraitSectionFields_sc} />
                )}
            </div>
            {renderSimpleInput('portraitHp_sc', 'HP', s.portraitHp, s.setPortraitHp, isCompare)}
            {renderSimpleInput('portraitAttack_sc', '攻撃力', s.portraitAttack, s.setPortraitAttack, isCompare)}
            {renderSimpleInput('portraitDefense_sc', '防御力', s.portraitDefense, s.setPortraitDefense, isCompare)}
          </div>
          <div className="p-3 border border-gray-700 rounded-lg">
            <div className="flex justify-between items-center mb-2 border-b border-gray-600 pb-1">
                <h3 className="text-md font-semibold text-primary-light">アビリティ(サポートとポートレイトの効果） {isCompare && "(比較対象)"}</h3>
                {!isCompare && isMemoFeatureEnabled_sc && (
                    <MemoButton sectionKey={abilityBuffsSectionMemoKey_sc} sectionName="アビリティ" fieldKeys={abilityBuffsSectionFields_sc} />
                )}
            </div>
            {renderBuffInput('abilityHpBuff_sc', 'HPバフ', s.abilityHpBuff, s.setAbilityHpBuff, isCompare)}
            {renderBuffInput('abilityAttackBuff_sc', '攻撃力バフ', s.abilityAttackBuff, s.setAbilityAttackBuff, isCompare)}
            {renderBuffInput('abilityDefenseBuff_sc', '防御力バフ', s.abilityDefenseBuff, s.setAbilityDefenseBuff, isCompare)}
            {renderBuffInput('abilitySpeedBuff_sc', 'スピードバフ', s.abilitySpeedBuff, s.setAbilitySpeedBuff, isCompare)}
          </div>
        </div>
      </div>
    );
  };
  
  const titleActions = (
    <ToggleSwitch
      id="statusCalcCompareToggle"
      label="比較"
      srLabel={false}
      checked={isComparing}
      onChange={setIsComparing}
      size="sm"
    />
  );

  return (
    <>
    <Card title="ステータス計算" icon={<BarChartIcon className="w-6 h-6" />} titleActions={titleActions}>
      {renderInputSection(false)}
      {isComparing && renderInputSection(true)}

      <div className="mt-6 pt-4 border-t border-gray-700">
        <h3 className="text-lg font-semibold text-primary-light mb-3">最終ステータス</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ResultDisplay label="最終HP" value={finalStats.finalHp.toString()} valueClassName="text-secondary-light" />
          <ResultDisplay 
            label="最終攻撃力" 
            value={finalStats.finalAttack.toString()} 
            baseValue={finalStats.baseAttackForDisplay.toString()}
            changeValue={finalStats.changeFromAbilityAttack.toString()}
            changeValueColor={finalStats.changeFromAbilityAttack >= 0 ? 'text-blue-400' : 'text-red-400'}
            totalValueLabel="計"
            valueClassName="text-secondary-light"
          />
          <ResultDisplay 
            label="最終防御力" 
            value={finalStats.finalDefense.toString()}
            baseValue={finalStats.baseDefenseForDisplay.toString()}
            changeValue={finalStats.changeFromAbilityDefense.toString()}
            changeValueColor={finalStats.changeFromAbilityDefense >= 0 ? 'text-blue-400' : 'text-red-400'}
            totalValueLabel="計"
            valueClassName="text-secondary-light"
          />
          <ResultDisplay 
            label="最終スピード" 
            value={finalStats.finalSpeed.toString()}
            baseValue={finalStats.baseSpeedForDisplay.toString()}
            changeValue={finalStats.changeFromAbilitySpeed.toString()}
            changeValueColor={finalStats.changeFromAbilitySpeed >= 0 ? 'text-blue-400' : 'text-red-400'}
            totalValueLabel="計"
            valueClassName="text-secondary-light"
          />
        </div>
      </div>

      {isComparing && finalStats_compare && (
        <>
            <div className="mt-4 pt-4 border-t border-gray-600">
                <h3 className="text-lg font-semibold text-primary-light mb-3">最終ステータス (比較対象)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <ResultDisplay label="最終HP (比較)" value={finalStats_compare.finalHp.toString()} valueClassName="text-on-surface" />
                    <ResultDisplay label="最終攻撃力 (比較)" value={finalStats_compare.finalAttack.toString()} valueClassName="text-on-surface" />
                    <ResultDisplay label="最終防御力 (比較)" value={finalStats_compare.finalDefense.toString()} valueClassName="text-on-surface" />
                    <ResultDisplay label="最終スピード (比較)" value={finalStats_compare.finalSpeed.toString()} valueClassName="text-on-surface" />
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-600">
                <h3 className="text-lg font-semibold text-primary-light mb-3">ステータス差分 (主対象 - 比較対象)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {(['Hp', 'Attack', 'Defense', 'Speed'] as const).map(statKey => {
                        const diff = finalStats[`final${statKey}`] - finalStats_compare[`final${statKey}`];
                        const diffColor = diff > 0 ? 'text-blue-400' : diff < 0 ? 'text-red-400' : 'text-on-surface-muted';
                        return (
                            <ResultDisplay 
                                key={`diff-${statKey}`}
                                label={`${statKey} 差分`} 
                                value={`${diff > 0 ? '+' : ''}${diff}`} 
                                valueClassName={diffColor} 
                            />
                        );
                    })}
                </div>
            </div>
        </>
      )}

      {isAuthenticated && (
         <div className="mt-4 p-3 bg-gray-800 rounded-md text-xs text-on-surface-muted">
          <h4 className="font-semibold text-gray-300 mb-1">計算式概要:</h4>
          <p>有効サポートHP/攻/防 = サポートキオクHP/攻/防 * (サポート反映率 / 100)</p>
          <p>アビリティバフ適用前HP/攻/防 = キオクHP/攻/防 + 有効サポートHP/攻/防 + ポートレイトHP/攻/防(フラット)</p>
          <p>アビリティバフ適用前スピード = キオクスピード + ポートレイトスピード(フラット) ※現在はポートレイトにフラットスピード入力なし</p>
          <p>アビリティバフは、まず入力されたパーセンテージが合計され（例: "10,5" なら15%）、その後(1 + 合計%/100)の乗数として適用されます。</p>
          <p className="font-mono">最終HP = floor(アビリティバフ適用前HP * (1 + ΣアビリティHPバフ% / 100))</p>
          <p className="font-mono">最終攻撃力 = floor(アビリティバフ適用前攻撃力 * (1 + Σアビリティ攻撃力バフ% / 100))</p>
          <p className="font-mono">最終防御力 = floor(アビリティバフ適用前防御力 * (1 + Σアビリティ防御力バフ% / 100))</p>
          <p className="font-mono">最終スピード = floor(アビリティバフ適用前スピード * (1 + Σアビリティスピードバフ% / 100))</p>
        </div>
      )}
    </Card>
    {isMemoFeatureEnabled_sc && isMemoModalOpen_sc && activeMemoContext_sc && (
        <MemoModal
          isOpen={isMemoModalOpen_sc}
          onClose={() => setIsMemoModalOpen_sc(false)}
          sectionKey={activeMemoContext_sc.sectionKey} // This is StatusCalculatorMemoSectionKey, assignable to MemoSectionKey
          sectionName={activeMemoContext_sc.sectionName}
          currentSectionValues={activeMemoContext_sc.currentValues}
          savedMemos={sectionMemos_sc[activeMemoContext_sc.sectionKey] || []} // Accessing specific part of global state
          onSaveMemo={handleSaveSectionMemo_sc}
          onApplyMemo={handleApplySectionMemo_sc}
          onDeleteMemo={handleDeleteSectionMemo_sc}
        />
    )}
    </>
  );
};