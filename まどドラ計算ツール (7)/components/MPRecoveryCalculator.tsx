
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { ResultDisplay } from './ui/ResultDisplay';
import { ZapIcon } from './ui/Icons';
import { MP_RECOVERY_ACTION_OPTIONS, MP_RECOVERY_BASE } from '../constants';
import { SelectOption, MPRecoveryAction, FieldInputMode, MPRecoveryFieldKey, ConfigurableBuffFieldKey, NumericRangeSettings, ConfigurableNumericInputKey } from '../types';

interface MPRecoveryCalculatorProps {
  isAuthenticated: boolean;
  fieldInputModes: Record<ConfigurableBuffFieldKey, FieldInputMode>; 
  fieldNumericRanges: Record<ConfigurableNumericInputKey, NumericRangeSettings>;
}

const parsePercentageStringForMP = (str: string): number[] => {
  if (!str.trim()) return [];
  return str.split(',')
    .map(s => parseFloat(s.trim()))
    .filter(n => !isNaN(n) && isFinite(n));
};

export const MPRecoveryCalculator: React.FC<MPRecoveryCalculatorProps> = ({ 
  isAuthenticated,
  fieldInputModes,
  fieldNumericRanges
}) => {
  const [selectedAction, setSelectedAction] = useState<MPRecoveryAction>(MPRecoveryAction.NormalAttack);
  const [specificIncrease, setSpecificIncrease] = useState<string>('0');
  const [actionMpRecoveryBonus, setActionMpRecoveryBonus] = useState<string>(
    fieldInputModes.actionMpRecoveryBonus === 'split' ? '0,0' : '0'
  );
  const [dotTicks, setDotTicks] = useState<string>('1');

  const [skillTargetUltimateMpCost, setSkillTargetUltimateMpCost] = useState<string>('100');
  const [skillRecoveryEffectPercent, setSkillRecoveryEffectPercent] = useState<string>('10');
  const [skillEffectMpRecoveryBonus, setSkillEffectMpRecoveryBonus] = useState<string>(
    fieldInputModes.skillEffectMpRecoveryBonus === 'split' ? '0,0' : '0'
  );

  const configurableFields: {key: MPRecoveryFieldKey, state: string, setState: React.Dispatch<React.SetStateAction<string>>}[] = [
    { key: 'actionMpRecoveryBonus', state: actionMpRecoveryBonus, setState: setActionMpRecoveryBonus },
    { key: 'skillEffectMpRecoveryBonus', state: skillEffectMpRecoveryBonus, setState: setSkillEffectMpRecoveryBonus },
  ];

  const prevFieldInputModesRef = useRef<Record<MPRecoveryFieldKey, FieldInputMode>>(
    configurableFields.reduce((acc, conf) => {
      acc[conf.key] = fieldInputModes[conf.key];
      return acc;
    }, {} as Record<MPRecoveryFieldKey, FieldInputMode>)
  );

  useEffect(() => {
    configurableFields.forEach(config => {
      const fieldKey = config.key;
      const newMode = fieldInputModes[fieldKey];
      const oldMode = prevFieldInputModesRef.current[fieldKey];
      const currentLocalValue = config.state; 

      if (newMode !== oldMode) {
        prevFieldInputModesRef.current[fieldKey] = newMode;
        if (newMode === 'split') {
          const num = parseFloat(currentLocalValue);
          if (!isNaN(num)) {
            if (num === 0) config.setState("0,0");
            else if(!currentLocalValue.includes(',')) config.setState(num.toString());
          } else {
            config.setState("0,0"); 
          }
        } else { // newMode === 'total'
          const parts = parsePercentageStringForMP(currentLocalValue);
          const total = parts.reduce((sum, val) => sum + val, 0);
          config.setState(isFinite(total) ? total.toFixed(0) : "0");
        }
      }
    });
  }, [fieldInputModes, actionMpRecoveryBonus, skillEffectMpRecoveryBonus]); 


  const getParsedMPBonusCoefficient = (fieldKey: MPRecoveryFieldKey, valueStr: string): number => {
    const mode = fieldInputModes[fieldKey];
    if (mode === 'split') {
      return parsePercentageStringForMP(valueStr).reduce((sum, val) => sum + val, 0);
    }
    return parseFloat(valueStr) || 0;
  };

  const calculatedActionMpRecovery = useMemo(() => {
    const baseRecoveryForSelectedAction = MP_RECOVERY_BASE[selectedAction];
    const numSpecificIncrease = parseFloat(specificIncrease);
    const bonusValue = getParsedMPBonusCoefficient('actionMpRecoveryBonus', actionMpRecoveryBonus);
    const bonus = bonusValue / 100;
    const numDotTicks = parseInt(dotTicks, 10);

    const actualSpecificIncrease = isNaN(numSpecificIncrease) ? 0 : numSpecificIncrease;
    if (isNaN(baseRecoveryForSelectedAction) || isNaN(bonus)) return NaN;

    const flooredSpecificIncrease = Math.floor(actualSpecificIncrease);
    if (isNaN(flooredSpecificIncrease)) return NaN; 

    const baseRecoveryWithFlooredIncrease = baseRecoveryForSelectedAction + flooredSpecificIncrease;
    if (isNaN(baseRecoveryWithFlooredIncrease)) return NaN;
    
    let recoveryPerInstance = Math.floor(baseRecoveryWithFlooredIncrease * (1 + bonus));
    if (isNaN(recoveryPerInstance)) return NaN;
    
    if (selectedAction === MPRecoveryAction.DoT) {
      if (isNaN(numDotTicks) || numDotTicks <= 0) return NaN;
      return recoveryPerInstance * numDotTicks;
    }
    return recoveryPerInstance;
  }, [selectedAction, specificIncrease, actionMpRecoveryBonus, dotTicks, fieldInputModes]);

  const calculatedSkillEffectMpRecovery = useMemo(() => {
    const cost = parseFloat(skillTargetUltimateMpCost);
    const effectPercent = parseFloat(skillRecoveryEffectPercent) / 100;
    const bonusValue = getParsedMPBonusCoefficient('skillEffectMpRecoveryBonus', skillEffectMpRecoveryBonus);
    const bonusPercent = bonusValue / 100;

    if (isNaN(cost) || isNaN(effectPercent) || isNaN(bonusPercent) || cost < 0 || effectPercent < 0) {
      return NaN;
    }
    const baseRecoveryFromSkillEffect = cost * effectPercent;
    return Math.floor(baseRecoveryFromSkillEffect * (1 + bonusPercent));
  }, [skillTargetUltimateMpCost, skillRecoveryEffectPercent, skillEffectMpRecoveryBonus, fieldInputModes]);

  const renderMPBonusInput = (
    fieldKey: MPRecoveryFieldKey, 
    label: string, 
    value: string, 
    onChange: (val: string) => void
  ) => {
    const currentMode = fieldInputModes[fieldKey];
    const numericInput = currentMode === 'total';
    const placeholder = currentMode === 'split' ? "例: 10,5" : undefined;
    const displayUnit = currentMode === 'split' ? "% (複数バフ・デバフ時カンマ区切り)" : "%";
    
    const rangeKey: ConfigurableNumericInputKey = `${fieldKey}_mpCalc_total` as ConfigurableNumericInputKey;
    const ranges = fieldNumericRanges[rangeKey];
    const minVal = ranges ? parseFloat(ranges.min) : 0;
    const maxVal = ranges ? parseFloat(ranges.max) : 100;

    return (
      <Input
        id={fieldKey}
        label={label}
        numeric={numericInput}
        forceNumericKeyboard={currentMode === 'split'}
        type="text" 
        step={numericInput ? 1 : undefined} // Step is 1 for total mode
        min={numericInput ? minVal : undefined}
        max={numericInput ? maxVal : undefined}
        sliderMin={numericInput ? minVal : undefined}
        sliderMax={numericInput ? maxVal : undefined}
        value={value}
        onChange={onChange}
        unit={displayUnit}
        placeholder={placeholder}
        containerClassName="md:col-span-1"
      />
    );
  };

  const getInputRange = (key: ConfigurableNumericInputKey) => {
    const ranges = fieldNumericRanges[key];
    const defaultMin = 0; 
    const defaultMax = 100; 
    return {
      min: ranges ? parseFloat(ranges.min) : defaultMin,
      max: ranges ? parseFloat(ranges.max) : defaultMax,
    };
  };

  const specificIncreaseRanges = getInputRange('specificIncrease_mpCalc');
  const dotTicksRanges = getInputRange('dotTicks_mpCalc');
  const skillTargetUltimateMpCostRanges = getInputRange('skillTargetUltimateMpCost_mpCalc');
  const skillRecoveryEffectPercentRanges = getInputRange('skillRecoveryEffectPercent_mpCalc');

  return (
    <Card title="MP回復量計算" icon={<ZapIcon className="w-6 h-6" aria-hidden="true" />}>
      <div>
        <h3 className="text-lg font-semibold text-primary-light mb-3 border-b border-gray-700 pb-2">アクション別MP回復</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4 items-end">
          <Select
            id="mpRecoveryAction"
            label="MP回復アクション"
            value={selectedAction}
            onChange={e => setSelectedAction(e.target.value as MPRecoveryAction)}
            options={MP_RECOVERY_ACTION_OPTIONS}
            containerClassName="md:col-span-1"
          />
          <Input
            id="specificIncrease_mpCalc"
            label="固有上昇"
            numeric={true} step={1} 
            min={specificIncreaseRanges.min} max={specificIncreaseRanges.max}
            sliderMin={specificIncreaseRanges.min} sliderMax={specificIncreaseRanges.max}
            value={specificIncrease}
            onChange={setSpecificIncrease}
            unit="MP"
            containerClassName="md:col-span-1"
          />
          {renderMPBonusInput('actionMpRecoveryBonus', 'MP回復効率 (アクション別)', actionMpRecoveryBonus, setActionMpRecoveryBonus)}
          
          {selectedAction === MPRecoveryAction.DoT && (
            <Input
              id="dotTicks_mpCalc"
              label="継続ダメージ回数"
              numeric={true} step={1} 
              min={dotTicksRanges.min} max={dotTicksRanges.max}
              sliderMin={dotTicksRanges.min} sliderMax={dotTicksRanges.max}
              value={dotTicks}
              onChange={setDotTicks}
              containerClassName="md:col-span-1"
            />
          )}
        </div>
        <div className="mt-6">
          <ResultDisplay label="計算されたMP回復量 (アクション別)" value={isNaN(calculatedActionMpRecovery) ? "---" : calculatedActionMpRecovery.toString()} unit="MP" />
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-700">
        <h3 className="text-lg font-semibold text-primary-light mb-3 border-b border-gray-700 pb-2">戦闘スキル効果によるMPコスト回復効果(例かえで)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
          <Input
            id="skillTargetUltimateMpCost_mpCalc"
            label="必殺の必要MP(例かえでの選択先)"
            numeric={true} step={1} 
            min={skillTargetUltimateMpCostRanges.min} max={skillTargetUltimateMpCostRanges.max}
            sliderMin={skillTargetUltimateMpCostRanges.min} sliderMax={skillTargetUltimateMpCostRanges.max}
            value={skillTargetUltimateMpCost}
            onChange={setSkillTargetUltimateMpCost}
          />
          <Input
            id="skillRecoveryEffectPercent_mpCalc"
            label="回復効果(例かえでの戦闘スキル)"
            numeric={true} step={1} 
            min={skillRecoveryEffectPercentRanges.min} max={skillRecoveryEffectPercentRanges.max}
            sliderMin={skillRecoveryEffectPercentRanges.min} sliderMax={skillRecoveryEffectPercentRanges.max}
            value={skillRecoveryEffectPercent}
            onChange={setSkillRecoveryEffectPercent}
            unit="%"
          />
          {renderMPBonusInput('skillEffectMpRecoveryBonus', 'MP回復効率', skillEffectMpRecoveryBonus, setSkillEffectMpRecoveryBonus)}
        </div>
        <div className="mt-6">
          <ResultDisplay label="回復するMP量 (戦闘スキル効果)" value={isNaN(calculatedSkillEffectMpRecovery) ? "---" : calculatedSkillEffectMpRecovery.toString()} unit="MP" />
        </div>
      </div>

      {isAuthenticated && (
        <div className="mt-8 p-3 bg-gray-800 rounded-md text-sm text-on-surface-muted">
          <h4 className="font-semibold text-gray-300 mb-1">計算ルール (共通):</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>MP回復効率 +X% は、「アクション基本回復量」と「小数点以下を切り捨てた固有上昇値」の合計に対して適用されます (アクション別MP回復の場合)。</li>
            <li>戦闘スキル効果によるMP回復の場合、MP回復効率は (対象のMPコスト * 回復効果割合) の結果に対して適用されます。</li>
            <li>最終的な回復量は小数点以下切り捨てられます。</li>
            <li>アクション別MP回復の例: 通常攻撃(基本15MP) + 固有上昇(5.7MP)、MP回復効率+10% の場合:
              <ol className="list-decimal list-inside ml-4">
                <li>固有上昇 5.7MP はまず floor(5.7) = 5MP として扱います。</li>
                <li>次に、(基本15MP + 処理後固有上昇5MP) = 20MP にMP回復効率を適用します: 20MP * (1 + 0.10) = 22MP。</li>
                <li>最終結果を切り捨てます: floor(22) = 22MP。</li>
              </ol>
            </li>
            <li>複数回の継続ダメージは、1回あたりの計算された回復量 x 回数で計算されます。</li>
          </ul>
        </div>
      )}
    </Card>
  );
};
