
import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { ResultDisplay } from './ui/ResultDisplay';
import { FastForwardIcon } from './ui/Icons';
import { SmallButton } from './ui/SmallButton';
import { bisection } from '../utils/math';

interface ActionValueCalculatorProps {
  // fieldNumericRanges: Record<ConfigurableNumericInputKey, NumericRangeSettings>; // Removed
}

export const ActionValueCalculator: React.FC<ActionValueCalculatorProps> = (/* { fieldNumericRanges } */) => {
  const [currentPosition, setCurrentPosition] = useState<string>('5000'); // 0-10000
  const [characterSpeed, setCharacterSpeed] = useState<string>('120');
  const [actionValueBonus, setActionValueBonus] = useState<string>('0'); // %
  const [avForModification, setAvForModification] = useState<string>('30');

  const [targetInitialAV, setTargetInitialAV] = useState<string>('');
  const [targetModifiedAV, setTargetModifiedAV] = useState<string>('');
  const [initialAVError, setInitialAVError] = useState<string | null>(null);
  const [modifiedAVError, setModifiedAVError] = useState<string | null>(null);

  const parseInputAsFloat = (value: string, defaultValue: number = NaN): number => {
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  };
  
  const parseInputAsInt = (value: string, defaultValue: number = NaN): number => {
    const num = parseInt(value, 10);
    return isNaN(num) ? defaultValue : num;
  };

  const calculateInitialAV = (pos: number, speed: number): number => {
    if (isNaN(pos) || isNaN(speed) || speed <= 0 || pos < 0 || pos > 10000) {
      return NaN;
    }
    return Math.floor((10000 - pos) / speed);
  };
  
  const calculateModifiedAV = (currentAV: number, speed: number, bonusPercent: number): { reduction: number, newAV: number } => {
    if (isNaN(currentAV) || isNaN(speed) || isNaN(bonusPercent) || speed <= 0) {
        return { reduction: NaN, newAV: NaN };
    }
    const reduction = Math.floor((10000 / speed) * (bonusPercent / 100));
    const newAV = Math.floor(currentAV - reduction);
    return { reduction, newAV };
  };

  const initialActionValueFromPositionFloat = useMemo(() => {
    return calculateInitialAV(parseInputAsFloat(currentPosition), parseInputAsFloat(characterSpeed));
  }, [currentPosition, characterSpeed]);

  const modifiedActionValue = useMemo(() => {
    return calculateModifiedAV(
      parseInputAsFloat(avForModification), 
      parseInputAsFloat(characterSpeed), 
      parseInputAsFloat(actionValueBonus)
    );
  }, [avForModification, characterSpeed, actionValueBonus]);

  const performReverseInitialAV = (fieldToSolve: 'currentPosition' | 'characterSpeed1') => {
    setInitialAVError(null);
    const targetAV = parseInputAsInt(targetInitialAV);
    if (isNaN(targetAV)) {
      setInitialAVError("有効な目標行動値を入力してください。");
      return;
    }

    const numCurrentPosition = parseInputAsFloat(currentPosition);
    const numCharacterSpeed = parseInputAsFloat(characterSpeed);

    try {
      if (fieldToSolve === 'currentPosition') {
        if (isNaN(numCharacterSpeed) || numCharacterSpeed <= 0) throw new Error("有効な速度が必要です。");
        
        const objectiveFn = (pos: number) => calculateInitialAV(pos, numCharacterSpeed) - targetAV;
        
        const valAtMinPos = calculateInitialAV(0, numCharacterSpeed);
        const valAtMaxPos = calculateInitialAV(10000, numCharacterSpeed);

        if ((objectiveFn(0) < 0 && objectiveFn(10000) < 0 && valAtMinPos < targetAV) || 
            (objectiveFn(0) > 0 && objectiveFn(10000) > 0 && valAtMaxPos > targetAV)) {
             if (targetAV > valAtMinPos) throw new Error(`目標行動値が高すぎます。現在の速度では最大でも ${valAtMinPos} です。`);
             if (targetAV < valAtMaxPos) throw new Error(`目標行動値が低すぎます。現在の速度では最小でも ${valAtMaxPos} です。`);
        }

        const resultPos = bisection(objectiveFn, 0, 10000, 0.5, 100); 

        if (resultPos !== null) {
          const finalPos = Math.round(resultPos);
          if (calculateInitialAV(finalPos, numCharacterSpeed) === targetAV) {
            setCurrentPosition(finalPos.toString());
          } else if (calculateInitialAV(finalPos - 1, numCharacterSpeed) === targetAV) {
            setCurrentPosition((finalPos - 1).toString());
          } else if (calculateInitialAV(finalPos + 1, numCharacterSpeed) === targetAV) {
            setCurrentPosition((finalPos + 1).toString());
          } else {
            throw new Error(`現在の位置を解決できませんでした。試行値: ${finalPos} (AV: ${calculateInitialAV(finalPos, numCharacterSpeed)})`);
          }
        } else {
          throw new Error("現在の位置の解を見つけられませんでした。目標値が範囲外か、速度が極端である可能性があります。");
        }
      } else if (fieldToSolve === 'characterSpeed1') {
        if (isNaN(numCurrentPosition) || numCurrentPosition < 0 || numCurrentPosition > 10000) throw new Error("有効な現在の位置が必要です。");
        if (targetAV < 0 && numCurrentPosition < 10000) throw new Error("目標行動値が0未満の場合、通常は位置が10000である必要があります。");
        
        const objectiveFn = (speed: number) => calculateInitialAV(numCurrentPosition, speed) - targetAV;
        
        const minSpeed = 1, maxSpeed = 2000; 
        const valAtMinSpeed = calculateInitialAV(numCurrentPosition, minSpeed);
        const valAtMaxSpeed = calculateInitialAV(numCurrentPosition, maxSpeed);

        if (targetAV > valAtMinSpeed && valAtMinSpeed !== targetAV) throw new Error(`目標行動値が高すぎます。この位置では速度${minSpeed}でもAV ${valAtMinSpeed} です。`);
        if (targetAV < valAtMaxSpeed && valAtMaxSpeed !== targetAV && numCurrentPosition < 10000) throw new Error(`目標行動値が低すぎます。この位置では速度${maxSpeed}でもAV ${valAtMaxSpeed} です。`);
        
        const resultSpeed = bisection(objectiveFn, minSpeed, maxSpeed, 0.1, 100);
        if (resultSpeed !== null) {
          const finalSpeed = parseFloat(resultSpeed.toFixed(2));
          if (Math.abs(calculateInitialAV(numCurrentPosition, finalSpeed) - targetAV) <=1) { 
            setCharacterSpeed(finalSpeed.toString());
          } else {
             const roundedSpeed = Math.round(finalSpeed);
             if (calculateInitialAV(numCurrentPosition, roundedSpeed) === targetAV){
                setCharacterSpeed(roundedSpeed.toString());
             } else {
                throw new Error(`速度を解決できませんでした。試行値: ${finalSpeed.toFixed(2)} (AV: ${calculateInitialAV(numCurrentPosition, finalSpeed)})`);
             }
          }
        } else {
          throw new Error("速度の解を見つけられませんでした。目標値が範囲外か、位置が極端である可能性があります。");
        }
      }
    } catch (e: any) {
      setInitialAVError(e.message || "逆算中に不明なエラーが発生しました。");
    }
  };

  const performReverseModifiedAV = (fieldToSolve: 'avForModification' | 'characterSpeed2' | 'actionValueBonus') => {
    setModifiedAVError(null);
    const targetAV = parseInputAsInt(targetModifiedAV);

    if (isNaN(targetAV)) {
      setModifiedAVError("有効な目標新行動値を入力してください。");
      return;
    }

    const numAvForModification = parseInputAsFloat(avForModification);
    const numCharacterSpeed = parseInputAsFloat(characterSpeed);
    const numActionValueBonus = parseInputAsFloat(actionValueBonus);

    try {
      if (fieldToSolve === 'avForModification') {
        if (isNaN(numCharacterSpeed) || numCharacterSpeed <= 0) throw new Error("有効な速度が必要です。");
        if (isNaN(numActionValueBonus)) throw new Error("有効な行動値ボーナスが必要です。");

        const reduction = Math.floor((10000 / numCharacterSpeed) * (numActionValueBonus / 100));
        if (isNaN(reduction)) throw new Error("短縮量を計算できません。");
        
        const newAvMod = targetAV + reduction;
        if (newAvMod < 0) throw new Error("計算された変更前の行動値が負になります。");
        setAvForModification(newAvMod.toString());

      } else if (fieldToSolve === 'characterSpeed2') {
        if (isNaN(numAvForModification)) throw new Error("有効な変更前の行動値が必要です。");
        if (isNaN(numActionValueBonus)) throw new Error("有効な行動値ボーナスが必要です。");

        const objectiveFn = (speed: number) => calculateModifiedAV(numAvForModification, speed, numActionValueBonus).newAV - targetAV;
        
        const minSpeed = 1, maxSpeed = 2000;
        const valAtMinSpeed = calculateModifiedAV(numAvForModification, minSpeed, numActionValueBonus).newAV;
        const valAtMaxSpeed = calculateModifiedAV(numAvForModification, maxSpeed, numActionValueBonus).newAV;

        if ( (targetAV > valAtMaxSpeed && targetAV < valAtMinSpeed) || 
             (targetAV < valAtMaxSpeed && targetAV > valAtMinSpeed) ) { 
             if (targetAV < valAtMinSpeed && !isNaN(valAtMinSpeed)) throw new Error(`目標新行動値が低すぎます。速度${minSpeed}でもAV ${valAtMinSpeed} です。`);
             if (targetAV > valAtMaxSpeed && !isNaN(valAtMaxSpeed)) throw new Error(`目標新行動値が高すぎます。速度${maxSpeed}でもAV ${valAtMaxSpeed} です。`);
        }


        const resultSpeed = bisection(objectiveFn, minSpeed, maxSpeed, 0.1, 100);
        if (resultSpeed !== null) {
          const finalSpeed = parseFloat(resultSpeed.toFixed(2));
          if (Math.abs(calculateModifiedAV(numAvForModification, finalSpeed, numActionValueBonus).newAV - targetAV) <=1) {
             setCharacterSpeed(finalSpeed.toString());
          } else {
            const roundedSpeed = Math.round(finalSpeed);
            if (calculateModifiedAV(numAvForModification, roundedSpeed, numActionValueBonus).newAV === targetAV){
               setCharacterSpeed(roundedSpeed.toString());
            } else {
               throw new Error(`速度を解決できませんでした。試行値: ${finalSpeed.toFixed(2)}`);
            }
          }
        } else {
          throw new Error("速度の解を見つけられませんでした。");
        }
      } else if (fieldToSolve === 'actionValueBonus') {
        if (isNaN(numAvForModification)) throw new Error("有効な変更前の行動値が必要です。");
        if (isNaN(numCharacterSpeed) || numCharacterSpeed <= 0) throw new Error("有効な速度が必要です。");

        const objectiveFn = (bonus: number) => calculateModifiedAV(numAvForModification, numCharacterSpeed, bonus).newAV - targetAV;
        
        const minBonus = -100, maxBonus = 500; 
        const valAtMinBonus = calculateModifiedAV(numAvForModification, numCharacterSpeed, minBonus).newAV;
        const valAtMaxBonus = calculateModifiedAV(numAvForModification, numCharacterSpeed, maxBonus).newAV;

        if (targetAV > valAtMinBonus && !isNaN(valAtMinBonus)) throw new Error(`目標新行動値が高すぎます。ボーナス${minBonus}%でもAV ${valAtMinBonus} です。`);
        if (targetAV < valAtMaxBonus && !isNaN(valAtMaxBonus)) throw new Error(`目標新行動値が低すぎます。ボーナス${maxBonus}%でもAV ${valAtMaxBonus} です。`);

        const resultBonus = bisection(objectiveFn, minBonus, maxBonus, 0.1, 100);
        if (resultBonus !== null) {
          const finalBonus = parseFloat(resultBonus.toFixed(2));
           if (Math.abs(calculateModifiedAV(numAvForModification, numCharacterSpeed, finalBonus).newAV - targetAV) <=1) {
            setActionValueBonus(finalBonus.toString());
          } else {
            throw new Error(`行動値ボーナスを解決できませんでした。試行値: ${finalBonus.toFixed(2)}`);
          }
        } else {
          throw new Error("行動値ボーナスの解を見つけられませんでした。");
        }
      }
    } catch (e: any) {
      setModifiedAVError(e.message || "逆算中に不明なエラーが発生しました。");
    }
  };

  const currentPositionDefaultMin = 0, currentPositionDefaultMax = 10000;
  const characterSpeedDefaultMin = 1, characterSpeedDefaultMax = 2000;
  const targetInitialAVDefaultMin = 0, targetInitialAVDefaultMax = 10000;
  const currentAVForModificationDefaultMin = 0, currentAVForModificationDefaultMax = 10000;
  const actionValueBonusDefaultMin = -100, actionValueBonusDefaultMax = 500;
  const targetModifiedAVDefaultMin = 0, targetModifiedAVDefaultMax = 10000;


  return (
    <Card title="行動値計算" icon={<FastForwardIcon className="w-6 h-6" aria-hidden="true" />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        
        <div className="space-y-3 p-4 border border-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-primary-light mb-3 border-b border-gray-600 pb-2">① 行動値の基本計算</h3>
          
          <div className="flex items-end">
            <Input id="currentTimelinePosition_avCalc" label="現在の位置 (0-10000)" numeric={true} step={1} 
                   min={currentPositionDefaultMin} max={currentPositionDefaultMax} 
                   sliderMin={currentPositionDefaultMin} sliderMax={currentPositionDefaultMax}
                   value={currentPosition} onChange={setCurrentPosition} containerClassName="flex-grow !mb-0"/>
            <SmallButton label="逆算" onClick={() => performReverseInitialAV('currentPosition')} />
          </div>
          
          <div className="flex items-end">
            <Input id="characterSpeed_avCalc" label="速度" numeric={true} step={1} 
                   min={characterSpeedDefaultMin} max={characterSpeedDefaultMax} 
                   sliderMin={characterSpeedDefaultMin} sliderMax={characterSpeedDefaultMax}
                   value={characterSpeed} onChange={setCharacterSpeed} containerClassName="flex-grow !mb-0"/>
            <SmallButton label="逆算" onClick={() => performReverseInitialAV('characterSpeed1')} />
          </div>
          
          <ResultDisplay label="計算された行動値" value={isNaN(initialActionValueFromPositionFloat) ? "---" : Math.floor(initialActionValueFromPositionFloat).toString()} />

          <div className="mt-3 pt-3 border-t border-gray-600 space-y-2">
            <Input 
                id="targetInitialAV_avCalc" 
                label="目標行動値" 
                numeric={true} step={1} 
                min={targetInitialAVDefaultMin} max={targetInitialAVDefaultMax}
                sliderMin={targetInitialAVDefaultMin} sliderMax={targetInitialAVDefaultMax}
                value={targetInitialAV} 
                onChange={setTargetInitialAV}
                placeholder="例: 30"
                containerClassName="!mb-1"
            />
            {initialAVError && <p className="text-xs text-red-400 bg-red-900/50 p-1 rounded !mt-0">{initialAVError}</p>}
          </div>
        </div>
        
        <div className="space-y-3 p-4 border border-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-primary-light mb-3 border-b border-gray-600 pb-2">② 行動値+%による短縮計算</h3>
          
          <div className="flex items-end">
            <Input id="currentAVForModification_avCalc" label="現在の行動値 (短縮適用前)" numeric={true} step={1} 
                   min={currentAVForModificationDefaultMin} max={currentAVForModificationDefaultMax} 
                   sliderMin={currentAVForModificationDefaultMin} sliderMax={currentAVForModificationDefaultMax}
                   value={avForModification} onChange={setAvForModification} containerClassName="flex-grow !mb-0"/>
            <SmallButton label="逆算" onClick={() => performReverseModifiedAV('avForModification')} />
          </div>

          <div className="flex items-end">
             <Input id="characterSpeed_avCalc_mod" label="速度 (①と同じ値を入力推奨)" numeric={true} step={1} 
                    min={characterSpeedDefaultMin} max={characterSpeedDefaultMax} 
                    sliderMin={characterSpeedDefaultMin} sliderMax={characterSpeedDefaultMax}
                    value={characterSpeed} onChange={setCharacterSpeed} containerClassName="flex-grow !mb-0"/>
             <SmallButton label="逆算" onClick={() => performReverseModifiedAV('characterSpeed2')} />
          </div>
          
          <div className="flex items-end">
            <Input id="actionValueBonus_avCalc" label="行動値ボーナス" numeric={true} step={1} 
                   min={actionValueBonusDefaultMin} max={actionValueBonusDefaultMax} 
                   sliderMin={actionValueBonusDefaultMin} sliderMax={actionValueBonusDefaultMax}
                   value={actionValueBonus} onChange={setActionValueBonus} unit="%" containerClassName="flex-grow !mb-0"/>
            <SmallButton label="逆算" onClick={() => performReverseModifiedAV('actionValueBonus')} />
          </div>
          
          <ResultDisplay label="行動値短縮量" value={isNaN(modifiedActionValue.reduction) ? "---" : modifiedActionValue.reduction.toString()} />
          <ResultDisplay label="新しい行動値" value={isNaN(modifiedActionValue.newAV) ? "---" : modifiedActionValue.newAV.toString()} className="mt-2" />
        
          <div className="mt-3 pt-3 border-t border-gray-600 space-y-2">
            <Input 
                id="targetModifiedAV_avCalc" 
                label="目標新行動値" 
                numeric={true} step={1} 
                min={targetModifiedAVDefaultMin} max={targetModifiedAVDefaultMax}
                sliderMin={targetModifiedAVDefaultMin} sliderMax={targetModifiedAVDefaultMax}
                value={targetModifiedAV} 
                onChange={setTargetModifiedAV}
                placeholder="例: 15"
                containerClassName="!mb-1"
            />
            {modifiedAVError && <p className="text-xs text-red-400 bg-red-900/50 p-1 rounded !mt-0">{modifiedAVError}</p>}
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-3 bg-gray-800 rounded-md text-sm text-on-surface-muted">
        <h4 className="font-semibold text-gray-300 mb-1">補足情報:</h4>
        <ul className="list-disc list-inside space-y-1">
            <>
              <li>行動値 = floor((10000 - 現在の位置) / 速度)</li>
              <li>行動値短縮量 = floor((10000 / 速度) * (行動値ボーナス% / 100))</li>
              <li>新しい行動値 = floor(短縮適用前の行動値 - 行動値短縮量)</li>
            </>
          <li>行動値が同時に0になった場合は、編成で左にいるキャラから順に行動します。</li>
          <li>逆算機能は、目標値を達成するための一つの解を提示します。特にステップ関数（floor）が絡む計算では、複数の入力値が同じ結果を生むことがあります。</li>
        </ul>
      </div>
    </Card>
  );
};
