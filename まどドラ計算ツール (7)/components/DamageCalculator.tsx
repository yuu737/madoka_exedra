
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { ResultDisplay } from './ui/ResultDisplay';
import { SwordsIcon } from './ui/Icons';
import { ELEMENTAL_WEAKNESS_OPTIONS, BATTLE_MODE_OPTIONS } from '../constants';
import { SelectOption, ElementalWeakness, BattleMode, FieldInputMode, DamageCalcFieldKey, ConfigurableBuffFieldKey, NumericRangeSettings, ConfigurableNumericInputKey, MemoEntry, MemoSectionKey, getInitialEmptySectionMemos } from '../types';
import { bisection } from '../utils/math';
import { SmallButton } from './ui/SmallButton';
import { ToggleSwitch } from './ui/ToggleSwitch';
import { Button } from './ui/Button';
import { MemoModal } from './ui/MemoModal';

const parsePercentageString = (str: string): number[] => {
  if (!str.trim()) return [];
  return str.split(',')
    .map(s => parseFloat(s.trim()))
    .filter(n => !isNaN(n) && isFinite(n));
};

interface HardcodedPreset extends SelectOption<string> {
  defense: string; // The actual numerical defense value
}

interface CustomPreset {
  id: string; 
  name: string;
  value: string; 
}

const initialHardcodedPresets: HardcodedPreset[] = [
  { label: 'キレートビッグフェリスのうわさ Nightmare', value: 'kbn_nm', defense: '1900' },
  { label: '人工知能のうわさ Nightmare', value: 'ai_nm', defense: '1500' },
  { label: '針の魔女 Nightmare', value: 'needle_witch_nm', defense: '1300' },
  { label: '舞台装置の魔女(奇数ターン) Nightmare', value: 'stage_odd_nm', defense: '1800' },
  { label: '舞台装置の魔女(偶数ターン) Nightmare', value: 'stage_even_nm', defense: '9039.74' },
  { label: '鳥かごの魔女 Nightmare', value: 'birdcage_witch_nm', defense: '1500' },
  { label: '委員長の魔女 Nightmare', value: 'chairman_witch_nm', defense: '1300' },
  { label: '芸術家の魔女 Nightmare', value: 'artist_witch_nm', defense: '1600' },
  { label: '人魚の魔女 Nightmare', value: 'mermaid_witch_nm', defense: '1000' },
  { label: '犬の魔女 Nightmare', value: 'dog_witch_nm', defense: '1300' },
  { label: '影の魔女 Nightmare', value: 'shadow_witch_nm', defense: '600' },
  { label: '銀の魔女 Nightmare', value: 'silver_witch_nm', defense: '3800' },
  { label: '落書きの魔女 Nightmare', value: 'graffiti_witch_nm', defense: '1000' },
  { label: 'ハコの魔女 Nightmare', value: 'box_witch_nm', defense: '1000' },
  { label: 'お菓子の魔女 Nightmare', value: 'sweets_witch_nm', defense: '900' },
  { label: '暗闇の魔女 Nightmare', value: 'darkness_witch_nm', defense: '1000' },
  { label: '薔薇園の魔女 Nightmare', value: 'rosegarden_witch_nm', defense: '1000' },
  { label: '薔薇園の魔女Chaos', value: 'rosegarden_witch_chaos', defense: '2000' },
];

const LOCAL_STORAGE_KEY_CUSTOM_PRESETS = 'damageCalculator_customBaseDefensePresets';
const LOCAL_STORAGE_KEY_SECTION_MEMOS = 'damageCalculator_sectionMemos_v1'; // Unified key

interface DamageCalculatorProps {
  isAuthenticated: boolean;
  fieldInputModes: Record<ConfigurableBuffFieldKey, FieldInputMode>; 
  fieldNumericRanges: Record<ConfigurableNumericInputKey, NumericRangeSettings>;
  showReverseCalcButtons: boolean; 
}

const isElementalWeak = (ew: ElementalWeakness): boolean => ew === ElementalWeakness.Weak;

// Memo section keys and field lists
const attackerSectionMemoKey: MemoSectionKey = 'attackerStatus_dmgCalc';
const defenderSectionMemoKey: MemoSectionKey = 'defenderStatus_dmgCalc';

const attackerStatusSectionMemoFields: string[] = [
  'baseAttack_attacker',
  'skillMultiplier_attacker',
  'attackBuffs_attacker',
  'attackDebuffs_attacker',
  'damageDealtUp_attacker',
  'abilityDamageUp_attacker',
  'critDamage_attacker',
];

const defenderStatusSectionMemoFields: string[] = [
  'selectedBaseDefensePreset_defender',
  'customBaseDefense_defender',
  'battleMode_defender',
  'customBattleModeMultiplier_defender',
  'defenseBuffs_defender',
  'defenseDebuffs_defender',
  'damageTaken_defender',
  'breakBonus_defender',
];


export const DamageCalculator: React.FC<DamageCalculatorProps> = ({ 
  isAuthenticated, 
  fieldInputModes, 
  fieldNumericRanges,
  showReverseCalcButtons 
}) => {
  const [baseAttack, setBaseAttack] = useState<string>('1000');
  const [skillMultiplier, setSkillMultiplier] = useState<string>('100');
  const [attackBuffs, setAttackBuffs] = useState<string>(fieldInputModes.attackBuffs === 'split' ? '0,0' : '0');
  const [attackDebuffs, setAttackDebuffs] = useState<string>(fieldInputModes.attackDebuffs === 'split' ? '0,0' : '0');
  const [defenseBuffs, setDefenseBuffs] = useState<string>(fieldInputModes.defenseBuffs === 'split' ? '0,0' : '0');
  const [defenseDebuffs, setDefenseDebuffs] = useState<string>(fieldInputModes.defenseDebuffs === 'split' ? '0,0' : '0');
  const [damageDealtUp, setDamageDealtUp] = useState<string>(fieldInputModes.damageDealtUp === 'split' ? '0,0' : '0');
  const [abilityDamageUp, setAbilityDamageUp] = useState<string>(fieldInputModes.abilityDamageUp === 'split' ? '0,0' : '0');
  const [damageTaken, setDamageTaken] = useState<string>(fieldInputModes.damageTaken === 'split' ? '0,0' : '0');
  const [critDamage, setCritDamage] = useState<string>(fieldInputModes.critDamage === 'split' ? '0,0' : '0');
  
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [selectedBaseDefensePreset, setSelectedBaseDefensePreset] = useState<string>(initialHardcodedPresets[0]?.value || 'custom');
  const [customBaseDefense, setCustomBaseDefense] = useState<string>('');
  const [isPresetModalOpen, setIsPresetModalOpen] = useState<boolean>(false);
  const [editingPreset, setEditingPreset] = useState<CustomPreset | null>(null);
  const [presetFormName, setPresetFormName] = useState<string>('');
  const [presetFormValue, setPresetFormValue] = useState<string>('');
  const [presetFormError, setPresetFormError] = useState<string>('');
  const [confirmingDeletePreset, setConfirmingDeletePreset] = useState<{ id: string; name: string } | null>(null);


  const [elementalWeakness, setElementalWeakness] = useState<ElementalWeakness>(ElementalWeakness.NonWeak);
  const [battleMode, setBattleMode] = useState<BattleMode>(BattleMode.Nightmare);
  const [customBattleModeMultiplier, setCustomBattleModeMultiplier] = useState<string>('1.0');
  const [breakBonus, setBreakBonus] = useState<string>('0');
  const [otherMultiplier, setOtherMultiplier] = useState<string>('1');
  const [targetFinalDamage, setTargetFinalDamage] = useState<string>('');
  const [reverseCalcError, setReverseCalcError] = useState<string | null>(null);

  const [isMemoModalOpen, setIsMemoModalOpen] = useState<boolean>(false);
  const [activeMemoContext, setActiveMemoContext] = useState<{ 
    sectionKey: MemoSectionKey; 
    sectionName: string; 
    currentValues: Record<string, string>;
  } | null>(null);
  const [sectionMemos, setSectionMemos] = useState<Record<MemoSectionKey, MemoEntry[]>>(getInitialEmptySectionMemos());
  const isMemoFeatureEnabled = true;

  // Accessors for state variables used by the memo feature
  const memoStateAccessors: Record<string, { get: () => string, set: (val: string) => void }> = useMemo(() => ({
    // Attacker Status Fields
    'baseAttack_attacker': { get: () => baseAttack, set: setBaseAttack },
    'skillMultiplier_attacker': { get: () => skillMultiplier, set: setSkillMultiplier },
    'attackBuffs_attacker': { get: () => attackBuffs, set: setAttackBuffs },
    'attackDebuffs_attacker': { get: () => attackDebuffs, set: setAttackDebuffs },
    'damageDealtUp_attacker': { get: () => damageDealtUp, set: setDamageDealtUp },
    'abilityDamageUp_attacker': { get: () => abilityDamageUp, set: setAbilityDamageUp },
    'critDamage_attacker': { get: () => critDamage, set: setCritDamage },
    // Defender Status Fields
    'selectedBaseDefensePreset_defender': { get: () => selectedBaseDefensePreset, set: setSelectedBaseDefensePreset },
    'customBaseDefense_defender': { get: () => customBaseDefense, set: setCustomBaseDefense },
    'battleMode_defender': { get: () => battleMode, set: (val: string) => setBattleMode(val as BattleMode) },
    'customBattleModeMultiplier_defender': { get: () => customBattleModeMultiplier, set: setCustomBattleModeMultiplier },
    'defenseBuffs_defender': { get: () => defenseBuffs, set: setDefenseBuffs },
    'defenseDebuffs_defender': { get: () => defenseDebuffs, set: setDefenseDebuffs },
    'damageTaken_defender': { get: () => damageTaken, set: setDamageTaken },
    'breakBonus_defender': { get: () => breakBonus, set: setBreakBonus },
  }), [
    baseAttack, skillMultiplier, attackBuffs, attackDebuffs, damageDealtUp, abilityDamageUp, critDamage,
    selectedBaseDefensePreset, customBaseDefense, battleMode, customBattleModeMultiplier,
    defenseBuffs, defenseDebuffs, damageTaken, breakBonus
  ]);
  
  // Accessors for ConfigurableNumericInputKeys (used for range settings)
  const numericInputStateAccessors: Partial<Record<ConfigurableNumericInputKey, {get: () => string, set: (val: string) => void}>> = {
    'baseAttack_dmgCalc': { get: () => baseAttack, set: setBaseAttack },
    'skillMultiplier_dmgCalc': { get: () => skillMultiplier, set: setSkillMultiplier },
    'attackBuffs_dmgCalc_total': { get: () => attackBuffs, set: setAttackBuffs },
    'attackDebuffs_dmgCalc_total': { get: () => attackDebuffs, set: setAttackDebuffs },
    'damageDealtUp_dmgCalc_total': { get: () => damageDealtUp, set: setDamageDealtUp },
    'abilityDamageUp_dmgCalc_total': { get: () => abilityDamageUp, set: setAbilityDamageUp },
    'critDamage_dmgCalc_total': { get: () => critDamage, set: setCritDamage },
    'defenseBuffs_dmgCalc_total': { get: () => defenseBuffs, set: setDefenseBuffs },
    'defenseDebuffs_dmgCalc_total': { get: () => defenseDebuffs, set: setDefenseDebuffs },
    'damageTaken_dmgCalc_total': { get: () => damageTaken, set: setDamageTaken },
    'customBaseDefense_dmgCalc': { get: () => customBaseDefense, set: setCustomBaseDefense },
    'customBattleModeMultiplier_dmgCalc': { get: () => customBattleModeMultiplier, set: setCustomBattleModeMultiplier },
    'breakBonus_dmgCalc': { get: () => breakBonus, set: setBreakBonus },
    'otherMultiplier_dmgCalc': { get: () => otherMultiplier, set: setOtherMultiplier },
    'targetFinalDamage_dmgCalc': { get: () => targetFinalDamage, set: setTargetFinalDamage },
  };


  interface AffectedFieldConfigDefinition {
    key: DamageCalcFieldKey;
    setState: React.Dispatch<React.SetStateAction<string>>;
    type: 'additive' | 'multiplicative_debuff' | 'additive_special';
  }

  const affectedBuffFieldDefinitions: AffectedFieldConfigDefinition[] = useMemo(() => [
    { key: 'attackBuffs', setState: setAttackBuffs, type: 'additive' },
    { key: 'attackDebuffs', setState: setAttackDebuffs, type: 'multiplicative_debuff' },
    { key: 'damageDealtUp', setState: setDamageDealtUp, type: 'additive' },
    { key: 'abilityDamageUp', setState: setAbilityDamageUp, type: 'additive_special' },
    { key: 'critDamage', setState: setCritDamage, type: 'additive' },
    { key: 'defenseBuffs', setState: setDefenseBuffs, type: 'additive' },
    { key: 'defenseDebuffs', setState: setDefenseDebuffs, type: 'multiplicative_debuff' },
    { key: 'damageTaken', setState: setDamageTaken, type: 'additive' },
  ], [setAttackBuffs, setAttackDebuffs, setDamageDealtUp, setAbilityDamageUp, setCritDamage, setDefenseBuffs, setDefenseDebuffs, setDamageTaken]);
  
  const prevFieldInputModesRef = useRef<Record<DamageCalcFieldKey, FieldInputMode>>(
    affectedBuffFieldDefinitions.reduce((acc, conf) => {
      acc[conf.key] = fieldInputModes[conf.key];
      return acc;
    }, {} as Record<DamageCalcFieldKey, FieldInputMode>)
  );

  useEffect(() => {
    const currentLocalValues: Record<DamageCalcFieldKey, string> = {
        attackBuffs, attackDebuffs, damageDealtUp, abilityDamageUp, critDamage,
        defenseBuffs, defenseDebuffs, damageTaken
    };
    
    affectedBuffFieldDefinitions.forEach(config => {
      const fieldKey = config.key;
      const newMode = fieldInputModes[fieldKey];
      const oldMode = prevFieldInputModesRef.current[fieldKey]; 
      const currentLocalValue = currentLocalValues[fieldKey];

      if (newMode !== oldMode) { 
        prevFieldInputModesRef.current[fieldKey] = newMode; 

        if (newMode === 'split') {
          const num = parseFloat(currentLocalValue);
          if (!isNaN(num)) {
              if (num === 0) config.setState("0,0");
              else if (!currentLocalValue.includes(',')) config.setState(num.toString()); 
          } else {
              config.setState("0,0"); 
          }
        } else { 
          const parts = parsePercentageString(currentLocalValue);
          let totalValue = 0;
          if (config.type === 'multiplicative_debuff') {
            const product = parts.map(p => 1 - p / 100).reduce((prod, val) => prod * val, 1);
            totalValue = (1 - product) * 100;
          } else { 
            totalValue = parts.reduce((sum, val) => sum + val, 0);
          }
          config.setState(isFinite(totalValue) ? parseFloat(totalValue.toFixed(2)).toString() : "0");
        }
      }
    });
  }, [
    fieldInputModes, 
    attackBuffs, attackDebuffs, damageDealtUp, abilityDamageUp, critDamage,
    defenseBuffs, defenseDebuffs, damageTaken,
    affectedBuffFieldDefinitions
  ]);


  useEffect(() => {
    try {
      const storedPresets = localStorage.getItem(LOCAL_STORAGE_KEY_CUSTOM_PRESETS);
      if (storedPresets) {
        const parsedPresets = JSON.parse(storedPresets);
        if (Array.isArray(parsedPresets)) {
            const validPresets = parsedPresets.filter(p => 
                typeof p.id === 'string' && 
                typeof p.name === 'string' && 
                typeof p.value === 'string' && 
                !isNaN(parseFloat(p.value)) && parseFloat(p.value) > 0
            );
            setCustomPresets(validPresets);
        }
      }
    } catch (error) {
        console.error("Failed to load custom presets from localStorage:", error);
    }
    if (isMemoFeatureEnabled) {
      const newMemosState = getInitialEmptySectionMemos();
      try {
        const storedMemos = localStorage.getItem(LOCAL_STORAGE_KEY_SECTION_MEMOS);
        if (storedMemos) {
          const parsedMemosFromStorage = JSON.parse(storedMemos);
          // Only load memos for keys relevant to DamageCalculator that are present in storage
          if (parsedMemosFromStorage && typeof parsedMemosFromStorage === 'object') {
            if (Array.isArray(parsedMemosFromStorage[attackerSectionMemoKey])) {
              newMemosState[attackerSectionMemoKey] = parsedMemosFromStorage[attackerSectionMemoKey];
            }
            if (Array.isArray(parsedMemosFromStorage[defenderSectionMemoKey])) {
              newMemosState[defenderSectionMemoKey] = parsedMemosFromStorage[defenderSectionMemoKey];
            }
          }
        }
        setSectionMemos(newMemosState);
      } catch (error) {
        console.error("Failed to load section memos from localStorage:", error);
        setSectionMemos(getInitialEmptySectionMemos()); // Fallback to empty state
      }
    }
  }, [isMemoFeatureEnabled]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_CUSTOM_PRESETS, JSON.stringify(customPresets));
  }, [customPresets]);

  useEffect(() => {
    if (isMemoFeatureEnabled) {
      // Store only the relevant sections for this calculator to localStorage
      const memosToStore: Partial<Record<MemoSectionKey, MemoEntry[]>> = {
        [attackerSectionMemoKey]: sectionMemos[attackerSectionMemoKey],
        [defenderSectionMemoKey]: sectionMemos[defenderSectionMemoKey],
      };
      localStorage.setItem(LOCAL_STORAGE_KEY_SECTION_MEMOS, JSON.stringify(memosToStore));
    }
  }, [sectionMemos, isMemoFeatureEnabled]);


  const allBaseDefenseOptions = useMemo((): SelectOption<string>[] => {
    return [
      { label: 'カスタム値入力', value: 'custom' },
      ...initialHardcodedPresets.map(p => ({ label: p.label, value: p.value })), 
      ...customPresets.map(p => ({ 
        label: p.name, 
        value: p.id,
      }))
    ];
  }, [customPresets]);
  
  const baseDefenseFloat = useMemo(() => {
    if (selectedBaseDefensePreset === 'custom') {
      return parseFloat(customBaseDefense) || 0;
    }
    const selectedCustomPreset = customPresets.find(p => p.id === selectedBaseDefensePreset);
    if (selectedCustomPreset) {
      return parseFloat(selectedCustomPreset.value) || 0;
    }
    const selectedHardcodedPreset = initialHardcodedPresets.find(p => p.value === selectedBaseDefensePreset);
    if (selectedHardcodedPreset) {
      return parseFloat(selectedHardcodedPreset.defense) || 0;
    }
    return 0; 
  }, [selectedBaseDefensePreset, customBaseDefense, customPresets]);

  const handleOpenPresetModal = () => {
    setPresetFormError(''); 
    if (selectedBaseDefensePreset === 'custom') {
        setEditingPreset(null);
        setPresetFormName('');
        setPresetFormValue('');
    } else {
        const customPresetSelected = customPresets.find(p => p.id === selectedBaseDefensePreset);
        if (customPresetSelected) {
            setEditingPreset(customPresetSelected);
            setPresetFormName(customPresetSelected.name);
            setPresetFormValue(customPresetSelected.value);
        } else {
            const hardcodedPresetSelected = initialHardcodedPresets.find(p => p.value === selectedBaseDefensePreset);
            if (hardcodedPresetSelected) {
                setEditingPreset(null); 
                setPresetFormName(hardcodedPresetSelected.label.replace(" Nightmare", "").replace("Chaos", "")); 
                setPresetFormValue(hardcodedPresetSelected.defense); 
            } else {
                setEditingPreset(null);
                setPresetFormName('');
                setPresetFormValue('');
            }
        }
    }
    setIsPresetModalOpen(true);
  };

  const handleSavePreset = () => {
    if (!presetFormName.trim()) {
      setPresetFormError("プリセット名を入力してください。");
      return;
    }
    const numericValue = parseFloat(presetFormValue);
    if (isNaN(numericValue) || numericValue <= 0) {
      setPresetFormError("有効な正の数値を入力してください。");
      return;
    }
    const otherCustomPresets = editingPreset 
        ? customPresets.filter(p => p.id !== editingPreset.id) 
        : customPresets;
    if (otherCustomPresets.some(p => p.name.trim().toLowerCase() === presetFormName.trim().toLowerCase())) {
        setPresetFormError("このカスタムプリセット名は既に使用されています。");
        return;
    }
    
    let newPresetId = Date.now().toString();
    if (editingPreset) { 
      const updatedPresets = customPresets.map(p => 
        p.id === editingPreset.id ? { ...p, name: presetFormName.trim(), value: numericValue.toString() } : p
      );
      setCustomPresets(updatedPresets);
      newPresetId = editingPreset.id; 
    } else { 
      const newPreset: CustomPreset = { id: newPresetId, name: presetFormName.trim(), value: numericValue.toString() };
      setCustomPresets(prev => [...prev, newPreset]);
    }
    setSelectedBaseDefensePreset(newPresetId);
    setEditingPreset(null);
    setPresetFormName('');
    setPresetFormValue('');
    setPresetFormError('');
  };

  const handleEditPreset = (preset: CustomPreset) => {
    setEditingPreset(preset);
    setPresetFormName(preset.name);
    setPresetFormValue(preset.value);
    setPresetFormError('');
    setConfirmingDeletePreset(null); // Clear any pending delete confirmation
  };

  const requestDeletePreset = (preset: CustomPreset) => {
    setConfirmingDeletePreset({ id: preset.id, name: preset.name });
  };
  
  const executeDeletePreset = () => {
    if (!confirmingDeletePreset) return;
    const presetIdToDelete = confirmingDeletePreset.id;
    setCustomPresets(prev => prev.filter(p => p.id !== presetIdToDelete));
    if (selectedBaseDefensePreset === presetIdToDelete) {
      setSelectedBaseDefensePreset(initialHardcodedPresets[0]?.value || 'custom'); 
      setCustomBaseDefense('');
    }
    if (editingPreset?.id === presetIdToDelete) { 
        setEditingPreset(null);
        setPresetFormName('');
        setPresetFormValue('');
        setPresetFormError('');
    }
    setConfirmingDeletePreset(null);
  };
  
  const cancelDeletePreset = () => {
    setConfirmingDeletePreset(null);
  };


  const numBaseAttackFloat = useMemo(() => parseFloat(baseAttack) || 0, [baseAttack]);
  const numSkillMultiplierFloat = useMemo(() => (parseFloat(skillMultiplier) || 0) / 100, [skillMultiplier]);

  const calculatedBasicDamageFloat = useMemo(() => {
    if (isNaN(numBaseAttackFloat) || isNaN(numSkillMultiplierFloat) || numBaseAttackFloat <= 0 || numSkillMultiplierFloat < 0) return NaN;
    return numBaseAttackFloat * numSkillMultiplierFloat * (Math.pow(numBaseAttackFloat / 124, 1.2) + 12) / 20;
  }, [numBaseAttackFloat, numSkillMultiplierFloat]);
  
  const getParsedCoefficient = (fieldKey: DamageCalcFieldKey, valueStr: string): number => {
    const mode = fieldInputModes[fieldKey];
    if (mode === 'split') {
      return parsePercentageString(valueStr).reduce((sum, val) => sum + val, 0);
    }
    return parseFloat(valueStr) || 0;
  };

  const getParsedMultiplicativeDebuffCoefficient = (fieldKey: DamageCalcFieldKey, valueStr: string): number => {
    const mode = fieldInputModes[fieldKey];
    if (mode === 'split') {
      return parsePercentageString(valueStr).map(p => 1 - p / 100).reduce((prod, val) => prod * val, 1);
    }
    return 1 - (parseFloat(valueStr) || 0) / 100;
  };
  
  const defenseRelatedMultipliers = useMemo(() => {
    const sumOfAttackBuffPercentages = getParsedCoefficient('attackBuffs', attackBuffs) / 100;
    const totalAttackMultiplierProductDebuffs = getParsedMultiplicativeDebuffCoefficient('attackDebuffs', attackDebuffs);
    const sumOfDefenseBuffPercentages = getParsedCoefficient('defenseBuffs', defenseBuffs) / 100;
    const totalDefenseMultiplierProductDebuffs = getParsedMultiplicativeDebuffCoefficient('defenseDebuffs', defenseDebuffs);
    
    const totalAttackMultiplier = (1 + sumOfAttackBuffPercentages) * totalAttackMultiplierProductDebuffs;
    const totalDefenseMultiplier = (1 + sumOfDefenseBuffPercentages) * totalDefenseMultiplierProductDebuffs;
    
    return { totalAttackMultiplier, totalDefenseMultiplier };
  }, [attackBuffs, attackDebuffs, defenseBuffs, defenseDebuffs, fieldInputModes]);

  const finalAttackPowerForDefenseCoeffFloat = useMemo(() => {
    return numBaseAttackFloat * defenseRelatedMultipliers.totalAttackMultiplier;
  }, [numBaseAttackFloat, defenseRelatedMultipliers]);

  const finalDefensePowerAfterBuffsDebuffsFloat = useMemo(() => {
    return baseDefenseFloat * defenseRelatedMultipliers.totalDefenseMultiplier;
  }, [baseDefenseFloat, defenseRelatedMultipliers]);

  const defenseCoefficientFloat = useMemo(() => {
    if (isNaN(finalAttackPowerForDefenseCoeffFloat) || isNaN(baseDefenseFloat) || finalAttackPowerForDefenseCoeffFloat < 0 || baseDefenseFloat < 0) return NaN;
    const totalDefensePowerFloat = finalDefensePowerAfterBuffsDebuffsFloat; 
    if (isNaN(totalDefensePowerFloat) || totalDefensePowerFloat + 10 === 0) return NaN;
    const calculatedCoefficient = ((finalAttackPowerForDefenseCoeffFloat + 10) / (totalDefensePowerFloat + 10)) * 0.12;
    if (isNaN(calculatedCoefficient)) return NaN;
    return Math.min(calculatedCoefficient, 2);
  }, [finalAttackPowerForDefenseCoeffFloat, baseDefenseFloat, finalDefensePowerAfterBuffsDebuffsFloat]);

  const damageDealtCoefficientFloat = useMemo(() => (1 + getParsedCoefficient('damageDealtUp', damageDealtUp) / 100), [damageDealtUp, fieldInputModes]);
  const abilityDamageUpCoefficientFloat = useMemo(() => getParsedCoefficient('abilityDamageUp', abilityDamageUp) / 100, [abilityDamageUp, fieldInputModes]);
  const damageTakenCoefficientFloat = useMemo(() => (1 + getParsedCoefficient('damageTaken', damageTaken) / 100), [damageTaken, fieldInputModes]);
  const criticalCoefficientFloat = useMemo(() => (1 + getParsedCoefficient('critDamage', critDamage) / 100), [critDamage, fieldInputModes]);

  const elementalResistanceCoefficientFloat = useMemo(() => {
    if (isElementalWeak(elementalWeakness)) return 1.2;
    if (battleMode === BattleMode.Custom) {
      const customMult = parseFloat(customBattleModeMultiplier);
      return isNaN(customMult) || customMult < 0 ? 1.0 : customMult;
    }
    switch (battleMode) {
      case BattleMode.Battle: return 0.9;
      case BattleMode.Nightmare: return 0.7;
      case BattleMode.Chaos: return 0.2;
      default: return 1.0;
    }
  }, [elementalWeakness, battleMode, customBattleModeMultiplier]);

  const breakBonusCoefficientFloat = useMemo(() => {
    const numBreakBonus = parseFloat(breakBonus);
    if (isNaN(numBreakBonus) || numBreakBonus === 0) return 1; 
    return numBreakBonus / 100;
  }, [breakBonus]);

  const numOtherMultiplierFloat = useMemo(() => (parseFloat(otherMultiplier) || 1), [otherMultiplier]);

  const finalDamageFloat = useMemo(() => {
    const commonProduct = calculatedBasicDamageFloat * 
                         defenseCoefficientFloat *    
                         damageDealtCoefficientFloat *
                         damageTakenCoefficientFloat *
                         criticalCoefficientFloat *   
                         breakBonusCoefficientFloat;  

    if (isNaN(commonProduct) || isNaN(numOtherMultiplierFloat) || isNaN(elementalResistanceCoefficientFloat) || isNaN(abilityDamageUpCoefficientFloat)) {
        return NaN;
    }
    const isAbilityDamageUpActive = abilityDamageUpCoefficientFloat !== 0 && !isNaN(abilityDamageUpCoefficientFloat);
    if (isAbilityDamageUpActive && isElementalWeak(elementalWeakness)) {
        const combinedFactor = elementalResistanceCoefficientFloat + abilityDamageUpCoefficientFloat;
        if (isNaN(combinedFactor)) return NaN;
        return commonProduct * numOtherMultiplierFloat * combinedFactor;
    } else { 
        return commonProduct * numOtherMultiplierFloat * elementalResistanceCoefficientFloat;
    }
  }, [
    calculatedBasicDamageFloat, defenseCoefficientFloat, damageDealtCoefficientFloat, damageTakenCoefficientFloat,
    criticalCoefficientFloat, breakBonusCoefficientFloat, numOtherMultiplierFloat, elementalResistanceCoefficientFloat,
    abilityDamageUpCoefficientFloat, elementalWeakness 
  ]);
  
  const criticalCoefficientNonCritFloat = useMemo(() => 1.0, []); 

  const finalDamageNonCritFloat = useMemo(() => {
    const commonProduct = calculatedBasicDamageFloat * 
                         defenseCoefficientFloat *    
                         damageDealtCoefficientFloat *
                         damageTakenCoefficientFloat *
                         criticalCoefficientNonCritFloat * 
                         breakBonusCoefficientFloat;  

    if (isNaN(commonProduct) || isNaN(numOtherMultiplierFloat) || isNaN(elementalResistanceCoefficientFloat) || isNaN(abilityDamageUpCoefficientFloat)) {
        return NaN;
    }
    const isAbilityDamageUpActive = abilityDamageUpCoefficientFloat !== 0 && !isNaN(abilityDamageUpCoefficientFloat);
    if (isAbilityDamageUpActive && isElementalWeak(elementalWeakness)) {
        const combinedFactor = elementalResistanceCoefficientFloat + abilityDamageUpCoefficientFloat;
        if (isNaN(combinedFactor)) return NaN;
        return commonProduct * numOtherMultiplierFloat * combinedFactor;
    } else { 
        return commonProduct * numOtherMultiplierFloat * elementalResistanceCoefficientFloat;
    }
  }, [
    calculatedBasicDamageFloat, defenseCoefficientFloat, damageDealtCoefficientFloat, damageTakenCoefficientFloat,
    criticalCoefficientNonCritFloat, breakBonusCoefficientFloat, numOtherMultiplierFloat, elementalResistanceCoefficientFloat,
    abilityDamageUpCoefficientFloat, elementalWeakness 
  ]);

  const isCritDamageInputNonZero = useMemo(() => {
    const critDmgValue = getParsedCoefficient('critDamage', critDamage);
    return !isNaN(critDmgValue) && critDmgValue !== 0;
  }, [critDamage, fieldInputModes]);

  const getEffectiveResistanceFactorForReverseCalc = useCallback(() => {
    const isAbilityDamageUpActive = abilityDamageUpCoefficientFloat !== 0 && !isNaN(abilityDamageUpCoefficientFloat);
    if (isAbilityDamageUpActive && isElementalWeak(elementalWeakness)) {
        if (isNaN(elementalResistanceCoefficientFloat)) return NaN; 
        return elementalResistanceCoefficientFloat + abilityDamageUpCoefficientFloat;
    }
    return elementalResistanceCoefficientFloat;
  }, [elementalResistanceCoefficientFloat, abilityDamageUpCoefficientFloat, elementalWeakness]);

  const performReverseCalculation = (fieldToSolve: string) => {
    setReverseCalcError(null);
    const numTargetFinalDamage = parseFloat(targetFinalDamage);

    if (isNaN(numTargetFinalDamage) || numTargetFinalDamage <= 0) {
      setReverseCalcError("有効な目標最終ダメージを入力してください。");
      return;
    }
    
    const currentSkillMultiplierForReverse = numSkillMultiplierFloat; 
    const currentBaseDefenseForReverse = baseDefenseFloat;

    const F1_state = calculatedBasicDamageFloat; 
    const F2_state = defenseCoefficientFloat;   
    const F3 = damageDealtCoefficientFloat;
    const F4 = damageTakenCoefficientFloat;
    const F5 = criticalCoefficientFloat;
    const F6 = breakBonusCoefficientFloat;
    const F7 = numOtherMultiplierFloat;
    const F8_elemental = elementalResistanceCoefficientFloat;
    const F9_ability = abilityDamageUpCoefficientFloat; 

    const currentEffectiveF8F9Factor = getEffectiveResistanceFactorForReverseCalc();
    if (isNaN(currentEffectiveF8F9Factor)) {
      setReverseCalcError("属性耐性係数または「弱点属性に対し与ダメージアップ」係数が無効です。");
      return;
    }
    
    try {
        const setFieldAsString = (
          setter: React.Dispatch<React.SetStateAction<string>>,
          value: number, 
          fieldKey: DamageCalcFieldKey | null,
          precision: number = 2,
        ) => {
            const formattedValueStr = parseFloat(value.toFixed(precision)).toString();

            if (fieldKey && fieldInputModes[fieldKey] === 'total') {
                 setter(formattedValueStr);
            } else if (fieldKey && fieldInputModes[fieldKey] === 'split') {
                 setter(prevStr => {
                    const trimmedPrevStr = prevStr.trim();
                    if (!trimmedPrevStr) {
                        return formattedValueStr;
                    }
                    const prevParts = parsePercentageString(trimmedPrevStr);
                    const isPrevEffectivelyZero = prevParts.length === 0 || 
                                                  prevParts.every(p => Math.abs(p) < 0.001);

                    if (isPrevEffectivelyZero) {
                        return formattedValueStr;
                    } else {
                        return `${trimmedPrevStr},${formattedValueStr}`;
                    }
                 });
            } else {
                setter(formattedValueStr);
            }
        };
        if (fieldToSolve === 'skillMultiplier') {
            if (isNaN(numBaseAttackFloat) || numBaseAttackFloat <= 0) throw new Error("逆算のために有効な基礎攻撃力が必要です。");
            const basicDamageFactorWithoutSkillMult = numBaseAttackFloat * (Math.pow(numBaseAttackFloat / 124, 1.2) + 12) / 20;
            if (basicDamageFactorWithoutSkillMult === 0 || isNaN(basicDamageFactorWithoutSkillMult)) throw new Error("基礎攻撃力の計算要素が無効です。");
            
            const otherCoeffsProd = F2_state * F3 * F4 * F5 * F6 * F7 * currentEffectiveF8F9Factor;
            if (otherCoeffsProd === 0 || isNaN(otherCoeffsProd)) throw new Error("他の係数との組み合わせで逆算できません。");

            const requiredSkillMultiplierValue = numTargetFinalDamage / (basicDamageFactorWithoutSkillMult * otherCoeffsProd);
            if (isNaN(requiredSkillMultiplierValue) || requiredSkillMultiplierValue < 0) throw new Error("スキル倍率を計算できませんでした。");
            setSkillMultiplier((requiredSkillMultiplierValue * 100).toFixed(2));
        }
        else if (fieldToSolve === 'baseAttack' || fieldToSolve === 'defCoefBaseAttack') { 
            if (isNaN(currentSkillMultiplierForReverse) || currentSkillMultiplierForReverse <= 0) throw new Error("逆算のために有効なスキル倍率が必要です。");
            if (isNaN(currentBaseDefenseForReverse) || currentBaseDefenseForReverse < 0) throw new Error("逆算のために有効な基礎防御力が必要です。");

            const productOfOtherFixedCoeffs = F3 * F4 * F5 * F6 * F7 * currentEffectiveF8F9Factor;
            if (productOfOtherFixedCoeffs === 0 || isNaN(productOfOtherFixedCoeffs)) {
                 throw new Error("他の固定係数との組み合わせで逆算できません (積が0またはNaN)。");
            }

            const objectiveFn = (currentXBaseAttack: number): number => {
                if (currentXBaseAttack <= 0) return Number.MAX_VALUE; 
                const tempF1 = currentXBaseAttack * currentSkillMultiplierForReverse * (Math.pow(currentXBaseAttack / 124, 1.2) + 12) / 20;
                if (isNaN(tempF1)) return Number.MAX_VALUE;
                const tempFinalAttackPowerForDefCoeff = currentXBaseAttack * defenseRelatedMultipliers.totalAttackMultiplier;
                const tempTotalDefensePower = currentBaseDefenseForReverse * defenseRelatedMultipliers.totalDefenseMultiplier;
                if (isNaN(tempFinalAttackPowerForDefCoeff) || isNaN(tempTotalDefensePower) || (tempTotalDefensePower + 10 === 0 && tempFinalAttackPowerForDefCoeff +10 !==0) ) return Number.MAX_VALUE;
                if (tempTotalDefensePower + 10 === 0 && tempFinalAttackPowerForDefCoeff + 10 === 0) return -numTargetFinalDamage; 
                let tempF2 = ((tempFinalAttackPowerForDefCoeff + 10) / (tempTotalDefensePower + 10)) * 0.12;
                tempF2 = Math.min(tempF2, 2);
                if (isNaN(tempF2)) return Number.MAX_VALUE;
                const calculatedTotalDamage = tempF1 * tempF2 * productOfOtherFixedCoeffs;
                if (isNaN(calculatedTotalDamage)) return Number.MAX_VALUE;
                return calculatedTotalDamage - numTargetFinalDamage;
            };
            const minBA = 1, maxBA = 100000, tol = 0.1; 
            const fMin = objectiveFn(minBA), fMax = objectiveFn(maxBA);
            if (fMin * fMax > 0 && Math.abs(fMin) > tol && Math.abs(fMax) > tol) {
                 if (fMin === Number.MAX_VALUE && fMax === Number.MAX_VALUE) throw new Error(`基礎攻撃力の目的関数が範囲 [${minBA}-${maxBA}] で常に無効な値を返します。スキル倍率や防御力等の他の値を確認してください。`);
                 throw new Error(`基礎攻撃力の解探索範囲 [${minBA}-${maxBA}] で解の兆候が見つかりません (f(min)=${fMin === Number.MAX_VALUE ? "INF" : fMin.toFixed(0)}, f(max)=${fMax === Number.MAX_VALUE ? "INF" : fMax.toFixed(0)})。目標値が高すぎるか低すぎるか、他の入力値が極端である可能性があります。`);
            }
            const resultBaseAttack = bisection(objectiveFn, minBA, maxBA, tol);
            if (resultBaseAttack !== null && resultBaseAttack > 0) setBaseAttack(resultBaseAttack.toFixed(2));
            else throw new Error(`基礎攻撃力を計算できませんでした (bisection結果: ${resultBaseAttack}, f(min)=${fMin === Number.MAX_VALUE ? "INF" : fMin.toFixed(0)}, f(max)=${fMax === Number.MAX_VALUE ? "INF" : fMax.toFixed(0)})。`);

        }
        else if (fieldToSolve === 'damageDealtUp') { 
            const denominator = F1_state * F2_state * F4 * F5 * F6 * F7 * currentEffectiveF8F9Factor;
            if (denominator === 0 || isNaN(denominator)) throw new Error("他の係数の積が0または無効なため、与ダメージアップを逆算できません。");
            const requiredCoefficient = numTargetFinalDamage / denominator; 
            let requiredTotalPercentageSum = (requiredCoefficient - 1) * 100;
            if (isNaN(requiredTotalPercentageSum)) throw new Error("必要な与ダメージアップ合計(%)を計算できませんでした。");
            
            if (fieldInputModes.damageDealtUp === 'split') { 
                const existingSum = parsePercentageString(damageDealtUp).reduce((sum, val) => sum + val, 0);
                requiredTotalPercentageSum -= existingSum; 
            }
            setFieldAsString(setDamageDealtUp, requiredTotalPercentageSum, 'damageDealtUp');
        }
         else if (fieldToSolve === 'abilityDamageUp') {
            const pCommon = F1_state * F2_state * F3 * F4 * F5 * F6;
            if (isNaN(pCommon) || isNaN(F7) || F7 === 0) throw new Error("基本係数またはその他係数が無効なため、「弱点属性に対し与ダメージアップ」を逆算できません。");
            const denominatorForF9 = pCommon * F7;
            if (denominatorForF9 === 0) throw new Error("係数の積が0のため、「弱点属性に対し与ダメージアップ」を逆算できません。");
            
            let required_combined_elemental_factor = numTargetFinalDamage / denominatorForF9;
            if (isNaN(required_combined_elemental_factor)) throw new Error("必要な有効耐性係数を計算できませんでした (NaN)。");
            
            let required_ability_damage_up_direct_coefficient: number;
            if (isElementalWeak(elementalWeakness)) {
                 required_ability_damage_up_direct_coefficient = required_combined_elemental_factor - F8_elemental;
            } else {
                 required_ability_damage_up_direct_coefficient = required_combined_elemental_factor - F8_elemental; 
                 if (required_ability_damage_up_direct_coefficient > 0.0001 && !isElementalWeak(elementalWeakness)) {
                     setReverseCalcError("警告: 「弱点属性に対し与ダメージアップ」は通常、弱点属性時にのみ加算されます。");
                 }
            }

            if (isNaN(required_ability_damage_up_direct_coefficient)) throw new Error("必要な「弱点属性に対し与ダメージアップ」係数を計算できませんでした (NaN)。");

            let requiredTotalPercentageSum = required_ability_damage_up_direct_coefficient * 100;
            if (isNaN(requiredTotalPercentageSum)) throw new Error("必要な「弱点属性に対し与ダメージアップ」合計(%)を計算できませんでした。");

            if (fieldInputModes.abilityDamageUp === 'split') { 
                const existingSum = parsePercentageString(abilityDamageUp).reduce((sum, val) => sum + val, 0);
                requiredTotalPercentageSum -= existingSum;
            }
            setFieldAsString(setAbilityDamageUp, requiredTotalPercentageSum, 'abilityDamageUp', 1); 
        }
        else if (fieldToSolve === 'damageTaken') { 
            const denominator = F1_state * F2_state * F3 * F5 * F6 * F7 * currentEffectiveF8F9Factor;
            if (denominator === 0 || isNaN(denominator)) throw new Error("他の係数の積が0または無効です。");
            const requiredCoef = numTargetFinalDamage / denominator;
            let resultVal = (requiredCoef - 1) * 100;
            if (isNaN(resultVal)) throw new Error("受けるダメージ修飾を計算できませんでした。");
             if (fieldInputModes.damageTaken === 'split') { 
                const existingSum = parsePercentageString(damageTaken).reduce((sum, val) => sum + val, 0);
                resultVal -= existingSum;
            }
            setFieldAsString(setDamageTaken, resultVal, 'damageTaken');
        }
        else if (fieldToSolve === 'critDamage') { 
            const denominator = F1_state * F2_state * F3 * F4 * F6 * F7 * currentEffectiveF8F9Factor;
            if (denominator === 0 || isNaN(denominator)) throw new Error("他の係数の積が0または無効です。");
            const requiredCoef = numTargetFinalDamage / denominator;
            let resultVal = (requiredCoef - 1) * 100;
            if (isNaN(resultVal)) throw new Error("クリティカルダメージを計算できませんでした。");
            if (fieldInputModes.critDamage === 'split') { 
                const existingSum = parsePercentageString(critDamage).reduce((sum, val) => sum + val, 0);
                resultVal -= existingSum;
            }
            setFieldAsString(setCritDamage, resultVal, 'critDamage');
        }
        else if (fieldToSolve === 'breakBonus') { 
            const denominator = F1_state * F2_state * F3 * F4 * F5 * F7 * currentEffectiveF8F9Factor;
            if (denominator === 0 || isNaN(denominator)) throw new Error("他の係数の積が0または無効です。");
            const requiredCoef = numTargetFinalDamage / denominator;
            const resultVal = requiredCoef * 100; 
            if (isNaN(resultVal) || resultVal < 0) throw new Error("ブレイクボーナスを計算できませんでした。結果が負または無効です。");
            setBreakBonus(resultVal.toFixed(2));
        }
        else if (fieldToSolve === 'otherMultiplier') { 
            const denominator = F1_state * F2_state * F3 * F4 * F5 * F6 * currentEffectiveF8F9Factor;
            if (denominator === 0 || isNaN(denominator)) throw new Error("他の係数の積が0または無効です。");
            const resultVal = numTargetFinalDamage / denominator;
            if (isNaN(resultVal) || resultVal < 0) throw new Error("その他係数を計算できませんでした。");
            setOtherMultiplier(resultVal.toFixed(4));
        }
        else if (fieldToSolve === 'customBaseDefense') {
            if (selectedBaseDefensePreset !== 'custom') throw new Error("カスタム基礎防御力の逆算は、「カスタム値入力」が選択されている場合のみ可能です。");
            if (isNaN(numBaseAttackFloat) || numBaseAttackFloat <= 0) throw new Error("逆算のために有効な「基礎攻撃力」が必要です。");
            const productWithoutDefenseCoeff = F1_state * F3 * F4 * F5 * F6 * F7 * currentEffectiveF8F9Factor;
            if (isNaN(productWithoutDefenseCoeff) || productWithoutDefenseCoeff === 0) throw new Error("基本ダメージまたは他の乗数が無効なため、基礎防御力を逆算できません。");
            let requiredDefenseCoefficientValue = numTargetFinalDamage / productWithoutDefenseCoeff;
            if (requiredDefenseCoefficientValue > 2.000001) throw new Error("目標ダメージを達成するには防御係数が2.0を超える必要があり、不可能です。");
            if (requiredDefenseCoefficientValue <= 0) throw new Error("目標ダメージまたは他の係数が0または負のため、有効な防御係数を逆算できません。");
            requiredDefenseCoefficientValue = Math.min(requiredDefenseCoefficientValue, 2); 
            const target_DC_Internal_Ratio = requiredDefenseCoefficientValue / 0.12;
            if (isNaN(target_DC_Internal_Ratio) || target_DC_Internal_Ratio < 0) throw new Error("防御係数の内部目標値を計算できません。要求防御係数が0または負の可能性があります。");
            if (target_DC_Internal_Ratio === 0) throw new Error("要求される防御係数比率が0のため、除算エラーを回避しました。");
            const currentTotalAttackPower = numBaseAttackFloat * defenseRelatedMultipliers.totalAttackMultiplier; 
            const { totalDefenseMultiplier } = defenseRelatedMultipliers; 
            if (isNaN(totalDefenseMultiplier) || totalDefenseMultiplier === 0) throw new Error("防御力乗数(基礎防御力除く)が0または無効なため、カスタム基礎防御力を計算できません。");
            let calcCustomBaseDefense = (((currentTotalAttackPower + 10) / target_DC_Internal_Ratio) - 10) / totalDefenseMultiplier;
            if (isNaN(calcCustomBaseDefense) || calcCustomBaseDefense <= 0) throw new Error(`カスタム基礎防御力を計算できませんでした。計算結果が0以下または無効です (計算値: ${calcCustomBaseDefense?.toFixed(2)})。`);
            setCustomBaseDefense(calcCustomBaseDefense.toFixed(2));
        } else if (['attackBuffs', 'attackDebuffs', 'defenseBuffs', 'defenseDebuffs'].includes(fieldToSolve)) {
            const productWithoutDefenseCoeff = F1_state * F3 * F4 * F5 * F6 * F7 * currentEffectiveF8F9Factor;
            if (isNaN(productWithoutDefenseCoeff) || productWithoutDefenseCoeff === 0) throw new Error("基本ダメージまたは他の乗数が無効なため、防御関連係数を逆算できません。");
            let requiredDefenseCoefficientValue = numTargetFinalDamage / productWithoutDefenseCoeff;
            if (requiredDefenseCoefficientValue > 2.000001)  throw new Error("目標ダメージを達成するには防御係数が2.0を超える必要があり、不可能です。");
            if (requiredDefenseCoefficientValue <= 0) throw new Error("目標ダメージまたは他の係数が0または負のため、有効な防御係数を逆算できません。");
            requiredDefenseCoefficientValue = Math.min(requiredDefenseCoefficientValue, 2); 
            const target_DC_Internal_Ratio = requiredDefenseCoefficientValue / 0.12;
            if (isNaN(target_DC_Internal_Ratio) || target_DC_Internal_Ratio < 0) throw new Error("防御係数の内部目標値を計算できません。");
            
            const currentSumExistingAtkBuffs_decimal = fieldInputModes.attackBuffs === 'total' ? (parseFloat(attackBuffs) || 0) / 100 : parsePercentageString(attackBuffs).reduce((s, v) => s + v / 100, 0);
            const currentProdExistingAtkDebuffs_factor = fieldInputModes.attackDebuffs === 'total' ? (1 - (parseFloat(attackDebuffs) || 0) / 100) : parsePercentageString(attackBuffs).reduce((p, v) => p * (1 - v / 100), 1);
            const currentSumExistingDefBuffs_decimal = fieldInputModes.defenseBuffs === 'total' ? (parseFloat(defenseBuffs) || 0) / 100 : parsePercentageString(defenseBuffs).reduce((s, v) => s + v / 100, 0);
            const currentProdExistingDefDebuffs_factor = fieldInputModes.defenseDebuffs === 'total' ? (1 - (parseFloat(defenseDebuffs) || 0) / 100) : parsePercentageString(defenseDebuffs).reduce((p, v) => p * (1 - v / 100), 1);
            
            let calculatedValue: number | null = null;
            let setStateFunc: React.Dispatch<React.SetStateAction<string>> | null = null;
            let fieldKeyForReverse: DamageCalcFieldKey | null = null;

            if (fieldToSolve === 'attackBuffs') {
                fieldKeyForReverse = 'attackBuffs';
                setStateFunc = setAttackBuffs;
                const totalDefensiveSide = (currentBaseDefenseForReverse * (1 + currentSumExistingDefBuffs_decimal) * currentProdExistingDefDebuffs_factor) + 10;
                const lhs = target_DC_Internal_Ratio * totalDefensiveSide - 10;
                const rhs_factor_base = numBaseAttackFloat * currentProdExistingAtkDebuffs_factor; 
                if (rhs_factor_base === 0 && lhs !== 0) throw new Error("攻撃力係数(デバフ適用後)が0のため、攻撃力バフを計算できません。");
                if (rhs_factor_base === 0 && lhs === 0) throw new Error("計算不定: 攻撃力係数が0で、目標も0です。");
                const requiredTotalBuffFactor = lhs / rhs_factor_base; 
                calculatedValue = (requiredTotalBuffFactor - (1 + (fieldInputModes.attackBuffs === 'split' ? currentSumExistingAtkBuffs_decimal : 0) )) * 100;
            } else if (fieldToSolve === 'attackDebuffs') {
                fieldKeyForReverse = 'attackDebuffs';
                setStateFunc = setAttackDebuffs;
                const totalDefensiveSide = (currentBaseDefenseForReverse * (1 + currentSumExistingDefBuffs_decimal) * currentProdExistingDefDebuffs_factor) + 10;
                const lhs = target_DC_Internal_Ratio * totalDefensiveSide - 10;
                const numerator_attack_fixed_buffs = numBaseAttackFloat * (1 + currentSumExistingAtkBuffs_decimal); 
                if (numerator_attack_fixed_buffs === 0 && lhs !==0) throw new Error("攻撃力係数(バフ適用後)が0のため、攻撃力デバフを計算できません。");
                if (numerator_attack_fixed_buffs === 0 && lhs === 0) throw new Error("計算不定: 攻撃力係数が0で、目標も0です。");
                const requiredTotalDebuffProductFactor = lhs / numerator_attack_fixed_buffs; 
                const baseDebuffFactor = fieldInputModes.attackDebuffs === 'split' ? currentProdExistingAtkDebuffs_factor : 1;
                if (baseDebuffFactor === 0 && requiredTotalDebuffProductFactor !== 0) throw new Error("既存の攻撃デバフ積が0のため、追加デバフを計算できません。");
                const requiredNewDebuffFactor = baseDebuffFactor === 0 ? (requiredTotalDebuffProductFactor === 0 ? 1 : (requiredTotalDebuffProductFactor > 0 ? Number.MIN_VALUE : Number.MAX_VALUE )) : requiredTotalDebuffProductFactor / baseDebuffFactor;
                calculatedValue = (1 - requiredNewDebuffFactor) * 100;
                if (calculatedValue >= 100 || calculatedValue < -500) throw new Error(`攻撃力デバフの計算結果が無効または非現実的です (計算値: ${calculatedValue?.toFixed(2)}%)。`);
            } else if (fieldToSolve === 'defenseBuffs') {
                fieldKeyForReverse = 'defenseBuffs';
                setStateFunc = setDefenseBuffs;
                const totalOffensiveSide = (numBaseAttackFloat * (1 + currentSumExistingAtkBuffs_decimal) * currentProdExistingAtkDebuffs_factor) + 10; 
                if (target_DC_Internal_Ratio === 0) throw new Error("目標防御係数比率が0のため、防御力バフを計算できません。");
                const lhs_defbuff = (totalOffensiveSide / target_DC_Internal_Ratio) - 10;
                const denominator_defense_fixed_debuffs = currentBaseDefenseForReverse * currentProdExistingDefDebuffs_factor;
                if (denominator_defense_fixed_debuffs === 0 && lhs_defbuff !== 0 ) throw new Error("防御力係数(基礎・デバフ適用後)が0のため、防御力バフを計算できません。");
                if (denominator_defense_fixed_debuffs === 0 && lhs_defbuff === 0 ) throw new Error("計算不定: 防御力係数が0で、目標も0です。");
                const requiredTotalBuffFactor = lhs_defbuff / denominator_defense_fixed_debuffs; 
                calculatedValue = (requiredTotalBuffFactor - (1 + (fieldInputModes.defenseBuffs === 'split' ? currentSumExistingDefBuffs_decimal : 0))) * 100;
            } else if (fieldToSolve === 'defenseDebuffs') {
                fieldKeyForReverse = 'defenseDebuffs';
                setStateFunc = setDefenseDebuffs;
                const totalOffensiveSide = (numBaseAttackFloat * (1 + currentSumExistingAtkBuffs_decimal) * currentProdExistingAtkDebuffs_factor) + 10; 
                if (target_DC_Internal_Ratio === 0) throw new Error("目標防御係数比率が0のため、防御力デバフを計算できません。");
                const lhs_defdebuff = (totalOffensiveSide / target_DC_Internal_Ratio) - 10;
                const denominator_defense_fixed_buffs = currentBaseDefenseForReverse * (1 + currentSumExistingDefBuffs_decimal);
                if (denominator_defense_fixed_buffs === 0 && lhs_defdebuff !==0) throw new Error("防御力係数(基礎・バフ適用後)が0のため、防御力デバフを計算できません。");
                if (denominator_defense_fixed_buffs === 0 && lhs_defdebuff === 0) throw new Error("計算不定: 防御力係数が0で、目標も0です。");
                const requiredTotalDebuffProductFactor = lhs_defdebuff / denominator_defense_fixed_buffs; 
                const baseDebuffFactor = fieldInputModes.defenseDebuffs === 'split' ? currentProdExistingDefDebuffs_factor : 1;
                if (baseDebuffFactor === 0 && requiredTotalDebuffProductFactor !== 0) throw new Error("既存の防御デバフ積が0のため、追加デバフを計算できません。");
                const requiredNewDebuffFactor = baseDebuffFactor === 0 ? (requiredTotalDebuffProductFactor === 0 ? 1 : (requiredTotalDebuffProductFactor > 0 ? Number.MIN_VALUE : Number.MAX_VALUE)) : requiredTotalDebuffProductFactor / baseDebuffFactor;
                calculatedValue = (1 - requiredNewDebuffFactor) * 100;
                if (calculatedValue >= 100 || calculatedValue < -500) throw new Error(`防御力デバフの計算結果が無効または非現実的です (計算値: ${calculatedValue?.toFixed(2)}%)。`);
            }
            if (calculatedValue === null || isNaN(calculatedValue)) throw new Error(`${fieldToSolve} の計算結果が無効です。`);
            if (setStateFunc && fieldKeyForReverse) setFieldAsString(setStateFunc, calculatedValue, fieldKeyForReverse);

        }
        else if (fieldToSolve === 'customBattleModeMultiplier') {
            if (isElementalWeak(elementalWeakness) || battleMode !== BattleMode.Custom) throw new Error("カスタム属性耐性係数の逆算は、「弱点以外」かつ「カスタム値入力」が選択されている場合のみ可能です。");
            const commonProductWithoutElementalOrAbility = F1_state * F2_state * F3 * F4 * F5 * F6 * F7;
            if (isNaN(commonProductWithoutElementalOrAbility) || commonProductWithoutElementalOrAbility === 0) throw new Error("基本ダメージまたは他の係数が無効なため、カスタム属性耐性係数を逆算できません。");
            const targetEffectiveResistanceFactor = numTargetFinalDamage / commonProductWithoutElementalOrAbility;
            if (isNaN(targetEffectiveResistanceFactor)) throw new Error("目標有効耐性係数を計算できませんでした。");
            let requiredCustomMultiplier: number;
            const isAbilityDamageUpActive = F9_ability !== 0 && !isNaN(F9_ability) && isElementalWeak(elementalWeakness); 
            if (isAbilityDamageUpActive) requiredCustomMultiplier = targetEffectiveResistanceFactor - F9_ability;
            else requiredCustomMultiplier = targetEffectiveResistanceFactor;
            if (isNaN(requiredCustomMultiplier) || requiredCustomMultiplier < 0) throw new Error(`計算されたカスタム属性耐性係数が無効または負です (計算値: ${requiredCustomMultiplier?.toFixed(4)})。「弱点属性に対し与ダメージアップ」の値が影響している可能性があります。`);
            setCustomBattleModeMultiplier(requiredCustomMultiplier.toFixed(4));
        }

    } catch (e: any) {
        setReverseCalcError(e.message || "逆算中に不明なエラーが発生しました。");
    }
  };

  const isCriticalHitDisplay = criticalCoefficientFloat > 1.00001; 
  const finalDamageValueClassName = `text-2xl ${isCriticalHitDisplay ? 'text-secondary-light' : 'text-on-surface'}`;
  
  const handleOpenMemoModalForSection = (
    sectionKey: MemoSectionKey,
    sectionName: string,
    fieldKeys: string[] // Changed from ConfigurableNumericInputKey[]
  ) => {
    if (!isMemoFeatureEnabled) return;
    const currentValues: Record<string, string> = {};
    fieldKeys.forEach(key => {
      const accessor = memoStateAccessors[key]; // Use memoStateAccessors
      if (accessor) {
        currentValues[key] = accessor.get();
      } else {
        console.warn(`No memo state accessor found for key ${key} in section ${sectionName}`);
        currentValues[key] = ''; // Default to empty string if accessor not found
      }
    });
    setActiveMemoContext({ sectionKey, sectionName, currentValues });
    setIsMemoModalOpen(true);
  };
  
  const handleSaveSectionMemo = (
    sectionKey: MemoSectionKey,
    memoName: string,
    valuesToSave: Record<string, string> // valuesToSave now Record<string, string>
  ): { success: boolean, error?: string } => {
    if (!memoName.trim()) {
      return { success: false, error: "メモ名は必須です。" };
    }
    const currentMemosForSection = sectionMemos[sectionKey] || [];
    if (currentMemosForSection.some(memo => memo.name === memoName.trim())) {
      return { success: false, error: "同じ名前のメモが既に存在します。" };
    }
    const newMemo: MemoEntry = { 
      id: Date.now().toString(), 
      name: memoName.trim(), 
      value: valuesToSave 
    };
    setSectionMemos(prev => ({
      ...prev,
      [sectionKey]: [newMemo, ...(prev[sectionKey] || [])]
    }));
    return { success: true };
  };

  const handleApplySectionMemo = (
    sectionKey: MemoSectionKey, 
    valuesToApply: Record<string, string> // valuesToApply now Record<string, string>
  ) => {
    Object.entries(valuesToApply).forEach(([key, value]) => {
      const accessor = memoStateAccessors[key]; // Use memoStateAccessors
      if (accessor) {
        accessor.set(value);
      } else {
         console.warn(`No memo state setter found for key ${key} while applying memo for section ${sectionKey}`);
      }
    });
    setIsMemoModalOpen(false);
  };

  const handleDeleteSectionMemo = (sectionKey: MemoSectionKey, memoId: string) => {
    setSectionMemos(prev => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).filter(memo => memo.id !== memoId)
    }));
  };


  const renderCommonInput = (
    fieldConfigKey: ConfigurableNumericInputKey, 
    label: string, 
    value: string, 
    onChange: (val: string) => void, 
    unit: string | undefined,
    reverseCalcKey: string,
    defaultStep: number,
    defaultMinRange: number,
    defaultMaxRange: number
  ) => {
    const isBuffFieldKeyTest = (key: string): key is DamageCalcFieldKey => 
      ['attackBuffs', 'attackDebuffs', 'damageDealtUp', 
       'abilityDamageUp', 'critDamage', 'defenseBuffs', 
       'defenseDebuffs', 'damageTaken'].includes(key.replace('_dmgCalc_total', ''));

    const baseBuffKey = fieldConfigKey.replace('_dmgCalc_total', '') as DamageCalcFieldKey;
    const currentMode = isBuffFieldKeyTest(fieldConfigKey) ? fieldInputModes[baseBuffKey] : 'total';
    
    const numericInput = !isBuffFieldKeyTest(fieldConfigKey) || currentMode === 'total';
    const inputType = 'text';
    const placeholder = isBuffFieldKeyTest(fieldConfigKey) && currentMode === 'split' ? "例: 20,10" : undefined;
    const displayUnit = numericInput || !isBuffFieldKeyTest(fieldConfigKey) 
                        ? unit 
                        : (currentMode === 'split' ? "% (複数バフ・デバフ時カンマ区切り)" : "%");
    
    const currentRangeSetting = fieldNumericRanges[fieldConfigKey];
    const stepVal = defaultStep; 
    const minVal = currentRangeSetting ? parseFloat(currentRangeSetting.min) : defaultMinRange;
    const maxVal = currentRangeSetting ? parseFloat(currentRangeSetting.max) : defaultMaxRange;

    return (
        <div className="flex items-end mb-3">
            <Input 
                id={fieldConfigKey} 
                label={label} 
                numeric={numericInput}
                forceNumericKeyboard={isBuffFieldKeyTest(fieldConfigKey) && currentMode === 'split'}
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
                containerClassName="flex-grow !mb-0"
            />
            {showReverseCalcButtons && <SmallButton label="逆算" onClick={() => performReverseCalculation(reverseCalcKey)} />}
        </div>
    );
  }
  
  const renderBaseAttackInput = (idSuffix: string = '') => renderCommonInput('baseAttack_dmgCalc', "基礎攻撃力 (キャラ+ポートレイト+サポート)青文字は使わない", baseAttack, setBaseAttack, undefined, idSuffix === 'Auth' ? 'defCoefBaseAttack' : 'baseAttack', 1, 0, 6000);
  const renderSkillMultiplierInput = () => renderCommonInput("skillMultiplier_dmgCalc", "スキル倍率", skillMultiplier, setSkillMultiplier, "%", "skillMultiplier", 1, 0, 500);
  const renderAttackBuffsInput = () => renderCommonInput("attackBuffs_dmgCalc_total", "攻撃力バフ", attackBuffs, setAttackBuffs, "%", "attackBuffs", 1, 0, 200);
  const renderAttackDebuffsInput = () => renderCommonInput("attackDebuffs_dmgCalc_total", "攻撃力デバフ", attackDebuffs, setAttackDebuffs, "%", "attackDebuffs", 1, 0, 99);
  const renderDefenseBuffsInput = () => renderCommonInput("defenseBuffs_dmgCalc_total", "防御力バフ", defenseBuffs, setDefenseBuffs, "%", "defenseBuffs", 1, 0, 200);
  const renderDefenseDebuffsInput = () => renderCommonInput("defenseDebuffs_dmgCalc_total", "防御力デバフ", defenseDebuffs, setDefenseDebuffs, "%", "defenseDebuffs", 1, 0, 99);
  const renderDamageDealtUpInput = () => renderCommonInput("damageDealtUp_dmgCalc_total", "与ダメージアップ", damageDealtUp, setDamageDealtUp, "%", "damageDealtUp", 1, 0, 200);
  const renderAbilityDamageUpInput = () => renderCommonInput("abilityDamageUp_dmgCalc_total", "弱点属性に対し与ダメージアップ", abilityDamageUp, setAbilityDamageUp, "%", "abilityDamageUp", 0.1, 0, 60);
  const renderDamageTakenInput = () => renderCommonInput("damageTaken_dmgCalc_total", "受けるダメージ修飾", damageTaken, setDamageTaken, "%", "damageTaken", 1, 0, 100); 
  const renderCritDamageInput = () => renderCommonInput("critDamage_dmgCalc_total", "クリティカルダメージ", critDamage, setCritDamage, "%", "critDamage", 1, 0, 100);
  const renderBreakBonusInput = () => renderCommonInput("breakBonus_dmgCalc", "ブレイクボーナス", breakBonus, setBreakBonus, "%", "breakBonus", 1, 100, 1000);
  const renderOtherMultiplierInput = () => renderCommonInput("otherMultiplier_dmgCalc", "その他係数", otherMultiplier, setOtherMultiplier, undefined, "otherMultiplier", 1, 0, 100);

  const renderBaseDefenseInputs = () => {
    const rangeSettings = fieldNumericRanges.customBaseDefense_dmgCalc;
    const minVal = rangeSettings ? parseFloat(rangeSettings.min) : 0;
    const maxVal = rangeSettings ? parseFloat(rangeSettings.max) : 6000; 
    return (
        <>
        <div className="flex items-end mb-3">
            <Select id="baseDefensePreset" label="基礎防御力" value={selectedBaseDefensePreset} onChange={e => { const value = e.target.value; setSelectedBaseDefensePreset(value); if (value === 'custom') setCustomBaseDefense(''); }} options={allBaseDefenseOptions} containerClassName="flex-grow !mb-0" />
            <SmallButton label="管理" onClick={handleOpenPresetModal} />
        </div>
        {selectedBaseDefensePreset === 'custom' && (
            <div className="flex items-end mt-2 mb-3">
            <Input id="customBaseDefense_dmgCalc" label="カスタム基礎防御力" numeric step={1} 
                    min={isNaN(minVal) ? undefined : minVal} 
                    max={isNaN(maxVal) ? undefined : maxVal} 
                    sliderMin={isNaN(minVal) ? undefined : minVal}
                    sliderMax={isNaN(maxVal) ? undefined : maxVal}
                    value={customBaseDefense} onChange={setCustomBaseDefense} placeholder="例: 1500" containerClassName="flex-grow !mb-0" />
            {showReverseCalcButtons && <SmallButton label="逆算" onClick={() => performReverseCalculation('customBaseDefense')} />}
            </div>
        )}
        </>
    );
  };

  const renderElementalWeaknessSelect = () => <Select id="elementalWeakness" label="属性" value={elementalWeakness} onChange={e => setElementalWeakness(e.target.value as ElementalWeakness)} options={ELEMENTAL_WEAKNESS_OPTIONS} containerClassName="mb-3"/>;
  const renderBattleModeSelects = () => {
    const rangeSettings = fieldNumericRanges.customBattleModeMultiplier_dmgCalc;
    const minVal = rangeSettings ? parseFloat(rangeSettings.min) : 0;
    const maxVal = rangeSettings ? parseFloat(rangeSettings.max) : 10;
    return (
        <div className="mb-3"> 
        <Select id="battleMode" label="バトルモード (非弱点時)" value={battleMode} onChange={e => setBattleMode(e.target.value as BattleMode)} options={BATTLE_MODE_OPTIONS} disabled={isElementalWeak(elementalWeakness)} containerClassName="mb-1"/>
        {!isElementalWeak(elementalWeakness) && battleMode === BattleMode.Custom && (
            <div className="flex items-end mt-1">
            <Input id="customBattleModeMultiplier_dmgCalc" label="カスタム属性耐性係数" numeric step={1} 
                    min={isNaN(minVal) ? undefined : minVal} 
                    max={isNaN(maxVal) ? undefined : maxVal} 
                    sliderMin={isNaN(minVal) ? undefined : minVal} 
                    sliderMax={isNaN(maxVal) ? undefined : maxVal} 
                    value={customBattleModeMultiplier} onChange={setCustomBattleModeMultiplier} placeholder="例: 0.5 (係数を直接入力)" containerClassName="flex-grow !mb-0" />
            {showReverseCalcButtons && <SmallButton label="逆算" onClick={() => performReverseCalculation('customBattleModeMultiplier')} />}
            </div>
        )}
        </div>
    );
  };
  
  const informationalParagraph = (
    <p className="text-xs text-on-surface-muted mt-3 mb-1">
      注: 各係数表示は上記入力に基づく自動計算値です。ブレイクボーナスは入力値X%に対して係数 (X/100) として計算 (例: 入力20%なら係数0.2、入力120%なら係数1.2)。入力0%または空欄の場合は係数1となります。「弱点属性に対し与ダメージアップ」が入力されている場合 (係数が0でない場合) 、かつ「弱点属性」が選択されている場合、最終ダメージ計算時に属性耐性係数とこの係数が合計されて乗算されます。この係数は入力値の合計%/100です。非弱点時に「カスタム値入力」を選択した場合、入力された値が直接属性耐性係数として使用されます（無効な場合は1.0）。
    </p>
  );

  return (
    <>
    <Card 
        title="ダメージ計算" 
        icon={<SwordsIcon className="w-6 h-6" aria-hidden="true" />}
    >
      {!isAuthenticated ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 mb-6">
            <div className="space-y-3 p-4 border border-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold text-primary-light border-b border-gray-600 pb-2 mb-3 flex justify-between items-center">
                <span>攻撃キャラの状態</span>
                {isMemoFeatureEnabled && (
                  <button
                    onClick={() => handleOpenMemoModalForSection(attackerSectionMemoKey, "攻撃キャラの状態", attackerStatusSectionMemoFields)}
                    className="ml-auto px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded shadow-md transition-colors h-7 self-center"
                    aria-label="攻撃キャラの状態に関するメモを管理"
                    title="このセクションの値をメモする"
                  >
                    凸
                  </button>
                )}
              </h3>
              {renderBaseAttackInput()}
              {renderAttackBuffsInput()}
              {renderAttackDebuffsInput()}
              <div className="p-2 bg-gray-700/30 rounded-md my-2"> 
                <span className="text-sm text-on-surface-muted">攻撃力 (バフ/デバフ適用後): </span>
                {(() => {
                  if (isNaN(numBaseAttackFloat) || isNaN(finalAttackPowerForDefenseCoeffFloat)) return <span className="font-semibold text-lg text-secondary-DEFAULT">---</span>;
                  const displayedBase = Math.floor(numBaseAttackFloat);
                  const changeAmountFloat = finalAttackPowerForDefenseCoeffFloat - numBaseAttackFloat;
                  const displayedChangeVal = Math.floor(changeAmountFloat);
                  const signCharacter = displayedChangeVal >= 0 ? '+' : '−';
                  const displayedChangeAbsolute = Math.abs(displayedChangeVal).toString();
                  return ( <span className="font-semibold text-lg text-secondary-DEFAULT"> {displayedBase.toString()} <span className={`ml-1 ${displayedChangeVal >= 0 ? 'text-blue-500' : 'text-red-500'}`}> {signCharacter}{displayedChangeAbsolute} </span> <span className="text-xs text-on-surface-muted ml-1"> (計: {Math.floor(finalAttackPowerForDefenseCoeffFloat)}) </span> </span> );
                })()}
              </div>
              {renderSkillMultiplierInput()}
              {renderDamageDealtUpInput()}
              {renderAbilityDamageUpInput()}
              {renderElementalWeaknessSelect()}
              {renderCritDamageInput()} 
            </div>
            <div className="space-y-3 p-4 border border-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold text-primary-light border-b border-gray-600 pb-2 mb-3 flex justify-between items-center">
                <span>防御キャラの状態</span>
                 {isMemoFeatureEnabled && (
                  <button
                    onClick={() => handleOpenMemoModalForSection(defenderSectionMemoKey, "防御キャラの状態", defenderStatusSectionMemoFields)}
                    className="ml-auto px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded shadow-md transition-colors h-7 self-center"
                    aria-label="防御キャラの状態に関するメモを管理"
                    title="このセクションの値をメモする"
                  >
                    凸
                  </button>
                )}
              </h3>
              {renderBaseDefenseInputs()}
              {renderBattleModeSelects()} 
              {renderDefenseBuffsInput()}
              {renderDefenseDebuffsInput()}
              <div className="p-2 bg-gray-700/30 rounded-md my-2"> 
                <span className="text-sm text-on-surface-muted">防御力 (バフ/デバフ適用後): </span>
                {(() => {
                  if (isNaN(baseDefenseFloat) || isNaN(finalDefensePowerAfterBuffsDebuffsFloat)) return <span className="font-semibold text-lg text-secondary-DEFAULT">---</span>;
                  const displayedBase = Math.floor(baseDefenseFloat);
                  const changeAmountFloat = finalDefensePowerAfterBuffsDebuffsFloat - baseDefenseFloat;
                  const displayedChangeVal = Math.floor(changeAmountFloat);
                  const signCharacter = displayedChangeVal >= 0 ? '+' : '−';
                  const displayedChangeAbsolute = Math.abs(displayedChangeVal).toString();
                  return ( <span className="font-semibold text-lg text-secondary-DEFAULT"> {displayedBase.toString()} <span className={`ml-1 ${displayedChangeVal >= 0 ? 'text-blue-500' : 'text-red-500'}`}> {signCharacter}{displayedChangeAbsolute} </span> <span className="text-xs text-on-surface-muted ml-1"> (計: {Math.floor(finalDefensePowerAfterBuffsDebuffsFloat)}) </span> </span> );
                })()}
              </div>
              {renderDamageTakenInput()}
              {renderBreakBonusInput()}
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
          <div className="space-y-3 p-4 border border-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold text-primary-light border-b border-gray-600 pb-2 mb-3 flex justify-between items-center">
               <span>基本ダメージ計算</span>
                {isMemoFeatureEnabled && ( 
                  <button
                    onClick={() => handleOpenMemoModalForSection(attackerSectionMemoKey, "攻撃キャラの状態", attackerStatusSectionMemoFields)}
                    className="ml-auto px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded shadow-md transition-colors h-7 self-center"
                    aria-label="攻撃キャラの状態に関するメモを管理"
                    title="このセクションの値をメモする"
                  >
                    凸
                  </button>
                )}
            </h3>
            {renderBaseAttackInput('Auth')}
            {renderSkillMultiplierInput()}
            {isAuthenticated && <ResultDisplay label="計算された基本ダメージ" value={isNaN(calculatedBasicDamageFloat) ? "---" : calculatedBasicDamageFloat.toFixed(0)} />}
          </div>
          <div className="space-y-3 p-4 border border-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold text-primary-light border-b border-gray-600 pb-2 mb-3 flex justify-between items-center">
              <span>防御係数計算</span>
               {isMemoFeatureEnabled && (
                  <button
                    onClick={() => handleOpenMemoModalForSection(defenderSectionMemoKey, "防御キャラの状態", defenderStatusSectionMemoFields)}
                    className="ml-auto px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded shadow-md transition-colors h-7 self-center"
                    aria-label="防御キャラの状態に関するメモを管理"
                    title="このセクションの値をメモする"
                  >
                    凸
                  </button>
                )}
            </h3>
             <div className="flex items-end mb-3">
                <Input id="baseAttack_dmgCalc_auth" label="基礎攻撃力 (防御係数用)" numeric step={1} 
                    min={parseFloat(fieldNumericRanges.baseAttack_dmgCalc?.min || '0')} 
                    max={parseFloat(fieldNumericRanges.baseAttack_dmgCalc?.max || '6000')} 
                    sliderMin={parseFloat(fieldNumericRanges.baseAttack_dmgCalc?.min || '0')} 
                    sliderMax={parseFloat(fieldNumericRanges.baseAttack_dmgCalc?.max || '6000')} 
                    value={baseAttack} onChange={setBaseAttack} containerClassName="flex-grow !mb-0"/>
                {showReverseCalcButtons && <SmallButton label="逆算" onClick={() => performReverseCalculation('defCoefBaseAttack')} />}
            </div>
            {renderAttackBuffsInput()}
            {renderAttackDebuffsInput()}
            {renderBaseDefenseInputs()}
            {renderDefenseBuffsInput()}
            {renderDefenseDebuffsInput()}
            {isAuthenticated && <ResultDisplay label="計算された防御係数" value={isNaN(defenseCoefficientFloat) ? "---" : defenseCoefficientFloat.toFixed(4)} />}
          </div>
          <div className="md:col-span-2 space-y-3 p-4 border border-gray-700 rounded-lg mt-4">
              <h3 className="text-lg font-semibold text-primary-light border-b border-gray-600 pb-2 mb-3">各種係数</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                  {renderDamageDealtUpInput()}
                  {renderAbilityDamageUpInput()}
                  {renderDamageTakenInput()}
                  {renderCritDamageInput()}
                  {renderElementalWeaknessSelect()}
                  {renderBattleModeSelects()}
                  {renderBreakBonusInput()}
                  <div className="md:col-start-1">{isAuthenticated && renderOtherMultiplierInput()}</div>
              </div>
              {isAuthenticated && informationalParagraph}
              {isAuthenticated && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
                    <div className="p-3 bg-gray-700/50 rounded-md shadow">
                      <span className="text-sm text-on-surface-muted">最終攻撃力 (防御係数用): </span>
                      {(() => {
                        if (isNaN(numBaseAttackFloat) || isNaN(finalAttackPowerForDefenseCoeffFloat)) return <span className="font-semibold text-lg text-secondary-DEFAULT">---</span>;
                        const displayedBase = Math.floor(numBaseAttackFloat); 
                        const changeAmountFloat = finalAttackPowerForDefenseCoeffFloat - numBaseAttackFloat; 
                        const displayedChangeVal = Math.floor(changeAmountFloat);
                        const signCharacter = displayedChangeVal >= 0 ? '+' : '−';
                        const displayedChangeAbsolute = Math.abs(displayedChangeVal).toString();
                        return ( <span className="font-semibold text-lg text-secondary-DEFAULT"> {displayedBase.toString()} <span className={`ml-1 ${displayedChangeVal >= 0 ? 'text-blue-500' : 'text-red-500'}`}> {signCharacter}{displayedChangeAbsolute} </span> </span> );
                      })()}
                    </div>
                    <ResultDisplay label="与ダメ係数" value={isNaN(damageDealtCoefficientFloat) ? "---" : damageDealtCoefficientFloat.toFixed(4)} />
                    <ResultDisplay label="アビ与ダメ係数" value={isNaN(abilityDamageUpCoefficientFloat) ? "---" : abilityDamageUpCoefficientFloat.toFixed(4)} />
                    <ResultDisplay label="被ダメ係数" value={isNaN(damageTakenCoefficientFloat) ? "---" : damageTakenCoefficientFloat.toFixed(4)} />
                    <ResultDisplay label="クリ係数" value={isNaN(criticalCoefficientFloat) ? "---" : criticalCoefficientFloat.toFixed(4)} />
                    <ResultDisplay label="属性耐性係数" value={isNaN(elementalResistanceCoefficientFloat) ? "---" : elementalResistanceCoefficientFloat.toFixed(4)} />
                    <ResultDisplay label="ブレイク係数" value={isNaN(breakBonusCoefficientFloat) ? "---" : breakBonusCoefficientFloat.toFixed(4)} />
                </div>
              )}
          </div>
        </div>
      )}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="mb-4 p-4 bg-gray-700/30 rounded-lg">
            <h4 className="text-md font-semibold text-primary-light mb-2">逆算機能</h4>
            <Input id="targetFinalDamage_dmgCalc" label="目標最終ダメージ" numeric step={1} 
                   min={parseFloat(fieldNumericRanges.targetFinalDamage_dmgCalc?.min || '0')} 
                   max={parseFloat(fieldNumericRanges.targetFinalDamage_dmgCalc?.max || '1000000')} 
                   sliderMin={parseFloat(fieldNumericRanges.targetFinalDamage_dmgCalc?.min || '0')} 
                   sliderMax={parseFloat(fieldNumericRanges.targetFinalDamage_dmgCalc?.max || '1000000')} 
                   value={targetFinalDamage} onChange={setTargetFinalDamage} placeholder="例: 50000" containerClassName="!mb-2" />
            {reverseCalcError && <p className="mt-1 text-xs text-red-400 bg-red-900/50 p-2 rounded">{reverseCalcError}</p>}
             <p className="text-xs text-on-surface-muted mt-1"> 目標ダメージを入力後、計算したい項目の「逆算」ボタンを押してください。 バフ/デバフ系、与ダメージアップ、「弱点属性に対し与ダメージアップ」の逆算は、各入力モード設定に応じて適用されます。「複数バフ・デバフ時カンマ区切り」モードで既存の値がある場合、計算された値が新たなカンマ区切りの値として追加されます。「合計」モード時は合計値として上書きされます。 </p>
        </div>
        
        <ResultDisplay 
          label={`最終ダメージ予測${isCritDamageInputNonZero ? " (クリティカル時)" : ""}`} 
          value={isNaN(finalDamageFloat) ? "---" : Math.ceil(finalDamageFloat).toString()} 
          className="bg-primary-dark/30" 
          valueClassName={finalDamageValueClassName} 
        />
        {isCritDamageInputNonZero && (
          <ResultDisplay 
            label="最終ダメージ予測 (通常時)" 
            value={isNaN(finalDamageNonCritFloat) ? "---" : Math.ceil(finalDamageNonCritFloat).toString()} 
            className="mt-2 bg-gray-700/50"
            valueClassName="text-2xl text-on-surface"
          />
        )}
        <p className="text-xs text-on-surface-muted mt-2">
          注: クリティカルダメージが0%より大きい場合、(クリティカル時)と(通常時)の両方のダメージが表示されます。
          クリティカル時のダメージは黄色で表示されます。最終ダメージは小数点以下切り上げで表示されます。
        </p>
      </div>
      
      {isPresetModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" aria-modal="true" role="dialog" aria-labelledby="preset-modal-title">
          <div className="bg-surface p-5 sm:p-6 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col relative"> {/* Added relative for positioning confirmation */}
            <div className="flex justify-between items-center mb-4">
              <h3 id="preset-modal-title" className="text-xl font-semibold text-primary-light">{editingPreset ? "プリセット編集" : "プリセット追加"}</h3>
              <button onClick={() => { setIsPresetModalOpen(false); setEditingPreset(null); setPresetFormError(''); setConfirmingDeletePreset(null); }} className="text-on-surface-muted hover:text-on-surface text-2xl" aria-label="プリセット管理モーダルを閉じる" disabled={!!confirmingDeletePreset}>&times;</button>
            </div>
            
            {!confirmingDeletePreset && (
              <>
                <div className="space-y-3 mb-4">
                  <Input id="presetName" label="プリセット名" type="text" value={presetFormName} onChange={setPresetFormName} containerClassName="!mb-1" aria-describedby={presetFormError ? "presetFormErrorText" : undefined} aria-invalid={!!presetFormError} />
                  <Input id="presetValue" label="基礎防御力値" numeric step={1} min={0} max={50000} value={presetFormValue} onChange={setPresetFormValue} containerClassName="!mb-1" aria-describedby={presetFormError ? "presetFormErrorText" : undefined} aria-invalid={!!presetFormError} />
                  {presetFormError && <p id="presetFormErrorText" className="text-xs text-red-400 bg-red-900/50 p-2 rounded" role="alert">{presetFormError}</p>}
                  <div className="flex gap-2">
                    <Button onClick={handleSavePreset} variant="primary" className="w-full" size="sm"> {editingPreset ? "更新" : "追加"} </Button>
                    {editingPreset && ( <Button onClick={() => { setEditingPreset(null); setPresetFormName(''); setPresetFormValue(''); setPresetFormError(''); }} variant="secondary" className="w-full" size="sm" type="button" > キャンセル </Button> )}
                  </div>
                </div>
                <div className="flex-grow overflow-y-auto border-t border-gray-700 pt-3">
                  <h4 id="custom-presets-list-heading" className="text-lg font-semibold text-primary-light mb-2">カスタムプリセット一覧</h4>
                  {customPresets.length === 0 ? ( <p className="text-on-surface-muted text-sm">カスタムプリセットはありません。</p> ) : (
                    <ul className="space-y-2" aria-labelledby="custom-presets-list-heading">
                      {customPresets.map(preset => (
                        <li key={preset.id} className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                          <div> <span className="font-medium">{preset.name}</span> <span className="text-sm text-on-surface-muted ml-2">({preset.value})</span> </div>
                          <div className="space-x-2">
                            <Button onClick={() => handleEditPreset(preset)} size="sm" className="text-xs !py-1 !px-2 bg-secondary-DEFAULT hover:bg-secondary-light text-black" aria-label={`プリセット「${preset.name}」を編集`} >編集</Button>
                            <Button onClick={() => requestDeletePreset(preset)} variant="danger" size="sm" className="text-xs !py-1 !px-2" aria-label={`プリセット「${preset.name}」を削除`} >削除</Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}

            {confirmingDeletePreset && (
              <div className="absolute inset-x-4 inset-y-1/3 bg-gray-800/95 flex flex-col items-center justify-center p-6 rounded-lg z-10 shadow-2xl">
                <p className="text-on-surface text-center mb-6 text-lg">
                  本当にこのプリセット「<strong className="text-primary-light">{confirmingDeletePreset.name}</strong>」を削除しますか？
                </p>
                <div className="flex space-x-4">
                  <Button onClick={executeDeletePreset} variant="danger" size="md">はい</Button>
                  <Button onClick={cancelDeletePreset} variant="secondary" size="md">いいえ</Button>
                </div>
              </div>
            )}
             <Button onClick={() => { setIsPresetModalOpen(false); setEditingPreset(null); setPresetFormError(''); setConfirmingDeletePreset(null); }} variant="secondary" className="mt-4 w-full" size="md" type="button" disabled={!!confirmingDeletePreset}> 閉じる </Button>
          </div>
        </div>
      )}
    </Card>
    {isMemoFeatureEnabled && isMemoModalOpen && activeMemoContext && (
        <MemoModal
          isOpen={isMemoModalOpen}
          onClose={() => setIsMemoModalOpen(false)}
          sectionKey={activeMemoContext.sectionKey}
          sectionName={activeMemoContext.sectionName}
          currentSectionValues={activeMemoContext.currentValues}
          savedMemos={sectionMemos[activeMemoContext.sectionKey] || []}
          onSaveMemo={handleSaveSectionMemo}
          onApplyMemo={handleApplySectionMemo}
          onDeleteMemo={handleDeleteSectionMemo}
        />
      )}
    </>
  );
};
