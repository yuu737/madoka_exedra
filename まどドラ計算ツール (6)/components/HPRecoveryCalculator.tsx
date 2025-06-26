
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { ResultDisplay } from './ui/ResultDisplay';
import { HeartIcon } from './ui/Icons';
import { FieldInputMode, HPRecoveryFieldKey, ConfigurableBuffFieldKey, NumericRangeSettings, ConfigurableNumericInputKey, MemoEntry, MemoSectionKey, HPRecoveryCalculatorMemoSectionKey } from '../types';
import { MemoModal } from './ui/MemoModal';

const parsePercentageStringHP = (str: string): number[] => {
  if (!str.trim()) return [];
  return str.split(',')
    .map(s => parseFloat(s.trim()))
    .filter(n => !isNaN(n) && isFinite(n));
};

interface HPRecoveryCalculatorProps {
  isAuthenticated: boolean;
  fieldInputModes: Record<ConfigurableBuffFieldKey, FieldInputMode>;
  fieldNumericRanges: Record<ConfigurableNumericInputKey, NumericRangeSettings>;
}

const LOCAL_STORAGE_KEY_HP_RECOVERY_MEMOS = 'hpRecoveryCalculator_sectionMemos_v1';
const hpRecoverySectionMemoKey_hprc: HPRecoveryCalculatorMemoSectionKey = 'hpRecoverySetup_hpCalc';
const hpRecoveryFields_hprc: string[] = [
  'baseHp_hprc', 
  'skillMultiplier_hprc', 
  'fixedValue_hprc', 
  'hpRecBuffs_hprc', 
  'hpRecDebuffs_hprc'
];


export const HPRecoveryCalculator: React.FC<HPRecoveryCalculatorProps> = ({
  isAuthenticated,
  fieldInputModes,
  fieldNumericRanges
}) => {
  const [baseHp, setBaseHp] = useState<string>('3000'); // This state now represents "Healer HP"
  const [maxHpBuffs, setMaxHpBuffs] = useState<string>(
    fieldInputModes.maxHpBuffs === 'split' ? '0,0' : '0'
  );
  const [maxHpDebuffs, setMaxHpDebuffs] = useState<string>(
    fieldInputModes.maxHpDebuffs === 'split' ? '0,0' : '0'
  );
  const [skillMultiplier, setSkillMultiplier] = useState<string>('10');
  const [fixedValue, setFixedValue] = useState<string>('100');
  const [hpRecoveryBuffs, setHpRecoveryBuffs] = useState<string>(
    fieldInputModes.hpRecoveryBuffs === 'split' ? '0,0' : '0'
  );
  const [hpRecoveryDebuffs, setHpRecoveryDebuffs] = useState<string>(
    fieldInputModes.hpRecoveryDebuffs === 'split' ? '0,0' : '0'
  );
  
  // --- Memo State ---
  const [isMemoModalOpen_hprc, setIsMemoModalOpen_hprc] = useState<boolean>(false);
  const [activeMemoContext_hprc, setActiveMemoContext_hprc] = useState<{
    sectionKey: HPRecoveryCalculatorMemoSectionKey;
    sectionName: string;
    currentValues: Record<string, string>;
  } | null>(null);

  const [sectionMemos_hprc, setSectionMemos_hprc] = useState<Record<MemoSectionKey, MemoEntry[]>>({
    'attackerStatus_dmgCalc': [], 
    'defenderStatus_dmgCalc': [], 
    'memoryStats_sc': [],
    'supportStats_sc': [],
    'portraitStats_sc': [],
    'abilityBuffs_sc': [],
    [hpRecoverySectionMemoKey_hprc]: [],
  });
  const isMemoFeatureEnabled_hprc = true;

  // Memo State Accessors
  const memoStateAccessors_hprc: Record<string, { get: () => string, set: (val: string) => void }> = useMemo(() => ({
    'baseHp_hprc': { get: () => baseHp, set: setBaseHp },
    'skillMultiplier_hprc': { get: () => skillMultiplier, set: setSkillMultiplier },
    'fixedValue_hprc': { get: () => fixedValue, set: setFixedValue },
    'hpRecBuffs_hprc': { get: () => hpRecoveryBuffs, set: setHpRecoveryBuffs },
    'hpRecDebuffs_hprc': { get: () => hpRecoveryDebuffs, set: setHpRecoveryDebuffs },
  }), [baseHp, skillMultiplier, fixedValue, hpRecoveryBuffs, hpRecoveryDebuffs]);

  // Load memos from localStorage
  useEffect(() => {
    if (isMemoFeatureEnabled_hprc) {
      const initialFullState: Record<MemoSectionKey, MemoEntry[]> = {
        'attackerStatus_dmgCalc': [], 'defenderStatus_dmgCalc': [], 
        'memoryStats_sc': [], 'supportStats_sc': [], 'portraitStats_sc': [], 'abilityBuffs_sc': [],
        [hpRecoverySectionMemoKey_hprc]: [],
      };
      try {
        const storedMemos = localStorage.getItem(LOCAL_STORAGE_KEY_HP_RECOVERY_MEMOS);
        if (storedMemos) {
          const parsedHpRecoveryMemos = JSON.parse(storedMemos) as Partial<Record<HPRecoveryCalculatorMemoSectionKey, MemoEntry[]>>;
          initialFullState[hpRecoverySectionMemoKey_hprc] = parsedHpRecoveryMemos[hpRecoverySectionMemoKey_hprc] || [];
          setSectionMemos_hprc(initialFullState);
        } else {
           setSectionMemos_hprc(initialFullState);
        }
      } catch (error) {
        console.error("Failed to load HP recovery calculator memos from localStorage:", error);
         setSectionMemos_hprc(initialFullState);
      }
    }
  }, [isMemoFeatureEnabled_hprc]);

  // Save memos to localStorage
  useEffect(() => {
    if (isMemoFeatureEnabled_hprc) {
      const hpRecoveryMemosToStore: Partial<Record<HPRecoveryCalculatorMemoSectionKey, MemoEntry[]>> = {
        [hpRecoverySectionMemoKey_hprc]: sectionMemos_hprc[hpRecoverySectionMemoKey_hprc],
      };
      localStorage.setItem(LOCAL_STORAGE_KEY_HP_RECOVERY_MEMOS, JSON.stringify(hpRecoveryMemosToStore));
    }
  }, [sectionMemos_hprc, isMemoFeatureEnabled_hprc]);
  

  type CurrentHPConfigurableFieldKey = 'maxHpBuffs' | 'maxHpDebuffs' | 'hpRecoveryBuffs' | 'hpRecoveryDebuffs';
  
  const hpConfigurableFields: {
    key: CurrentHPConfigurableFieldKey;
    state: string;
    setState: React.Dispatch<React.SetStateAction<string>>;
    type: 'additive' | 'multiplicative_debuff';
  }[] = useMemo(() => [
    { key: 'maxHpBuffs', state: maxHpBuffs, setState: setMaxHpBuffs, type: 'additive' },
    { key: 'maxHpDebuffs', state: maxHpDebuffs, setState: setMaxHpDebuffs, type: 'multiplicative_debuff' },
    { key: 'hpRecoveryBuffs', state: hpRecoveryBuffs, setState: setHpRecoveryBuffs, type: 'additive' },
    { key: 'hpRecoveryDebuffs', state: hpRecoveryDebuffs, setState: setHpRecoveryDebuffs, type: 'multiplicative_debuff' },
  ], [maxHpBuffs, maxHpDebuffs, hpRecoveryBuffs, hpRecoveryDebuffs]); 

  const prevFieldInputModesRefHp = useRef<Record<CurrentHPConfigurableFieldKey, FieldInputMode>>(
    {} as Record<CurrentHPConfigurableFieldKey, FieldInputMode> 
  );
  
  useEffect(() => {
    const initialModes = {} as Record<CurrentHPConfigurableFieldKey, FieldInputMode>;
    hpConfigurableFields.forEach(config => {
      initialModes[config.key] = fieldInputModes[config.key];
    });
    prevFieldInputModesRefHp.current = initialModes;
  }, []); 

  useEffect(() => {
    hpConfigurableFields.forEach(config => {
        const fieldKey = config.key;
        const newMode = fieldInputModes[fieldKey];
        const oldMode = prevFieldInputModesRefHp.current?.[fieldKey]; 
        const currentLocalValue = config.state;

        if (newMode !== oldMode && oldMode !== undefined) { 
            if(prevFieldInputModesRefHp.current) prevFieldInputModesRefHp.current[fieldKey] = newMode;

            if (newMode === 'split') {
                const num = parseFloat(currentLocalValue);
                if (!isNaN(num)) {
                    if (num === 0) config.setState("0,0");
                    else if (!currentLocalValue.includes(',')) config.setState(num.toString());
                } else {
                    config.setState("0,0");
                }
            } else { 
                const parts = parsePercentageStringHP(currentLocalValue);
                let totalValue = 0;
                if (config.type === 'multiplicative_debuff') {
                    const product = parts.map(p => 1 - p / 100).reduce((prod, val) => prod * val, 1);
                    totalValue = (1 - product) * 100;
                } else { 
                    totalValue = parts.reduce((sum, val) => sum + val, 0);
                }
                config.setState(isFinite(totalValue) ? parseFloat(totalValue.toFixed(2)).toString() : "0");
            }
        } else if (oldMode === undefined && prevFieldInputModesRefHp.current) {
             prevFieldInputModesRefHp.current[fieldKey] = newMode;
        }
    });
  }, [fieldInputModes, hpConfigurableFields]);


  const getParsedHpCoefficient = (fieldKey: CurrentHPConfigurableFieldKey, valueStr: string, type: 'additive' | 'multiplicative_debuff'): number => {
    const mode = fieldInputModes[fieldKey];
    const parsedPercentages = parsePercentageStringHP(valueStr);

    if (type === 'additive') {
      const sum = mode === 'total' ? (parseFloat(valueStr) || 0) : parsedPercentages.reduce((s, v) => s + v, 0);
      return 1 + sum / 100;
    } else { 
      return mode === 'total' ? (1 - (parseFloat(valueStr) || 0) / 100) : parsedPercentages.map(p => 1 - p / 100).reduce((prod, val) => prod * val, 1);
    }
  };

  const numBaseHpFloat = useMemo(() => parseFloat(baseHp) || 0, [baseHp]); // "baseHp" state is now "Healer HP"

  const finalHpFloat = useMemo(() => {
    const totalMaxHpBuffMult = getParsedHpCoefficient('maxHpBuffs', maxHpBuffs, 'additive');
    const totalMaxHpDebuffMult = getParsedHpCoefficient('maxHpDebuffs', maxHpDebuffs, 'multiplicative_debuff');
    const calculated = numBaseHpFloat * totalMaxHpBuffMult * totalMaxHpDebuffMult;
    return isNaN(calculated) ? 0 : calculated;
  }, [numBaseHpFloat, maxHpBuffs, maxHpDebuffs, fieldInputModes]);

  const numSkillMultiplierFloat = useMemo(() => (parseFloat(skillMultiplier) || 0) / 100, [skillMultiplier]);
  const numFixedValueFloat = useMemo(() => parseFloat(fixedValue) || 0, [fixedValue]);

  const calculatedHpRecoveryFloat = useMemo(() => {
    const totalHpRecoveryBuffMult = getParsedHpCoefficient('hpRecoveryBuffs', hpRecoveryBuffs, 'additive');
    const totalHpRecoveryDebuffMult = getParsedHpCoefficient('hpRecoveryDebuffs', hpRecoveryDebuffs, 'multiplicative_debuff');

    const recoveryBase = finalHpFloat * numSkillMultiplierFloat + numFixedValueFloat;
    const finalRecovery = recoveryBase * totalHpRecoveryBuffMult * totalHpRecoveryDebuffMult;
    
    if (isNaN(finalRecovery)) return NaN;
    return Math.ceil(finalRecovery);
  }, [finalHpFloat, numSkillMultiplierFloat, numFixedValueFloat, hpRecoveryBuffs, hpRecoveryDebuffs, fieldInputModes]);

  // Memo handlers
  const handleOpenMemoModalForSection_hprc = (
    sectionKey: HPRecoveryCalculatorMemoSectionKey,
    sectionName: string,
    fieldKeys: string[]
  ) => {
    if (!isMemoFeatureEnabled_hprc) return;
    const currentValues: Record<string, string> = {};
    fieldKeys.forEach(key => {
      const accessor = memoStateAccessors_hprc[key];
      if (accessor) {
        currentValues[key] = accessor.get();
      } else {
        console.warn(`No memo state accessor found for key ${key} in section ${sectionName} for HP Recovery Calculator`);
        currentValues[key] = '';
      }
    });
    setActiveMemoContext_hprc({ sectionKey, sectionName, currentValues });
    setIsMemoModalOpen_hprc(true);
  };
  
  const handleSaveSectionMemo_hprc = (
    sectionKey: MemoSectionKey,
    memoName: string,
    valuesToSave: Record<string, string>
  ): { success: boolean, error?: string } => {
    if (!memoName.trim()) {
      return { success: false, error: "メモ名は必須です。" };
    }
    const currentMemosForSection = sectionMemos_hprc[sectionKey] || [];
    if (currentMemosForSection.some(memo => memo.name === memoName.trim())) {
      return { success: false, error: "同じ名前のメモが既に存在します。" };
    }
    const newMemo: MemoEntry = { 
      id: Date.now().toString(), 
      name: memoName.trim(), 
      value: valuesToSave 
    };
    setSectionMemos_hprc(prev => ({
      ...prev,
      [sectionKey]: [newMemo, ...(prev[sectionKey] || [])]
    }));
    return { success: true };
  };

  const handleApplySectionMemo_hprc = (
    sectionKey: MemoSectionKey,
    valuesToApply: Record<string, string>
  ) => {
    Object.entries(valuesToApply).forEach(([key, value]) => {
      const accessor = memoStateAccessors_hprc[key];
      if (accessor) {
        accessor.set(value);
      } else {
         console.warn(`No memo state setter found for key ${key} while applying memo for section ${sectionKey} in HP Recovery Calculator`);
      }
    });
    setIsMemoModalOpen_hprc(false);
  };

  const handleDeleteSectionMemo_hprc = (sectionKey: MemoSectionKey, memoId: string) => {
    setSectionMemos_hprc(prev => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).filter(memo => memo.id !== memoId)
    }));
  };

  const renderHpInput = (
    configKey: ConfigurableNumericInputKey,
    buffFieldKey: CurrentHPConfigurableFieldKey | null,
    label: string,
    value: string,
    onChange: (val: string) => void,
    unit: string | undefined,
    defaultStep: number,
    defaultMinRange: number,
    defaultMaxRange: number
  ) => {
    const currentMode = buffFieldKey ? fieldInputModes[buffFieldKey] : 'total';
    const numericInput = !buffFieldKey || currentMode === 'total';
    const inputType = 'text';
    const placeholder = buffFieldKey && currentMode === 'split' ? "例: 10,5" : undefined;
    const displayUnit = numericInput || !buffFieldKey
                        ? unit
                        : (currentMode === 'split' ? "% (複数バフ・デバフ時カンマ区切り)" : "%");
    
    const currentRangeSetting = fieldNumericRanges[configKey];
    const stepVal = defaultStep;
    const minVal = currentRangeSetting ? parseFloat(currentRangeSetting.min) : defaultMinRange;
    const maxVal = currentRangeSetting ? parseFloat(currentRangeSetting.max) : defaultMaxRange;

    return (
        <Input
            id={configKey}
            label={label}
            numeric={numericInput}
            forceNumericKeyboard={!!buffFieldKey && currentMode === 'split'}
            type={inputType as 'text'}
            step={numericInput ? stepVal : undefined}
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
  
  return (
    <>
    <Card title="HP回復量計算" icon={<HeartIcon className="w-6 h-6" aria-hidden="true" />}>
      <div className="space-y-0 p-4 border border-gray-700 rounded-lg">
        <div className="flex justify-between items-center mb-3 border-b border-gray-600 pb-2">
            <h3 className="text-lg font-semibold text-primary-light">HP回復量計算</h3>
            {isMemoFeatureEnabled_hprc && (
                <button
                    onClick={() => handleOpenMemoModalForSection_hprc(hpRecoverySectionMemoKey_hprc, "HP回復量計算", hpRecoveryFields_hprc)}
                    className="ml-auto px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded shadow-md transition-colors h-7 self-center"
                    aria-label="HP回復量計算セクションのメモを管理"
                    title="このセクションの値をメモする"
                >
                    凸
                </button>
            )}
        </div>
        {renderHpInput('baseHp_hpCalc', null, "ヒーラーHP", baseHp, setBaseHp, undefined, 1, 0, 20000)}
        {renderHpInput('skillMultiplier_hpCalc', null, "スキル倍率", skillMultiplier, setSkillMultiplier, "%", 1, 0, 50)}
        {renderHpInput('fixedValue_hpCalc', null, "固定値", fixedValue, setFixedValue, undefined, 1, 0, 100)}
        {renderHpInput('hpRecoveryBuffs_hpCalc_total', 'hpRecoveryBuffs', "HP回復バフ", hpRecoveryBuffs, setHpRecoveryBuffs, "%", 1, 0, 200)}
        {renderHpInput('hpRecoveryDebuffs_hpCalc_total', 'hpRecoveryDebuffs', "HP回復デバフ", hpRecoveryDebuffs, setHpRecoveryDebuffs, "%", 1, 0, 99)}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-700">
        <ResultDisplay
            label="計算されたHP回復量"
            value={isNaN(calculatedHpRecoveryFloat) ? "---" : calculatedHpRecoveryFloat.toString()}
            unit="HP"
            className="bg-primary-dark/30"
            valueClassName="text-2xl text-secondary-light"
        />
        <p className="text-xs text-on-surface-muted mt-2">
          注: 最終的なHP回復量は小数点以下切り上げで表示されます。
        </p>
      </div>
      {isAuthenticated && (
        <div className="mt-6 p-3 bg-gray-800 rounded-md text-sm text-on-surface-muted">
          <h4 className="font-semibold text-gray-300 mb-1">計算式:</h4>
          <p className="font-mono text-xs"><code>HP回復量 = ceil((最終HP * スキル倍率% / 100 + 固定値) * HP回復バフ係数 * HP回復デバフ係数)</code></p>
          <p className="font-mono text-xs mt-1"><code>最終HP = ヒーラーHP * 最大HPバフ係数 * 最大HPデバフ係数</code></p>
           <p className="mt-1">各バフ係数は `(1 + Σバフ%/100)`、各デバフ係数は `Π(1 - デバフ%/100)` で計算されます (合計モード時は入力値を直接使用)。</p>
        </div>
      )}
    </Card>
    {isMemoFeatureEnabled_hprc && isMemoModalOpen_hprc && activeMemoContext_hprc && (
        <MemoModal
          isOpen={isMemoModalOpen_hprc}
          onClose={() => setIsMemoModalOpen_hprc(false)}
          sectionKey={activeMemoContext_hprc.sectionKey}
          sectionName={activeMemoContext_hprc.sectionName}
          currentSectionValues={activeMemoContext_hprc.currentValues}
          savedMemos={sectionMemos_hprc[activeMemoContext_hprc.sectionKey] || []}
          onSaveMemo={handleSaveSectionMemo_hprc}
          onApplyMemo={handleApplySectionMemo_hprc}
          onDeleteMemo={handleDeleteSectionMemo_hprc}
        />
    )}
    </>
  );
};