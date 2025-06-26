
import React, { useState, useEffect, useMemo } from 'react';
import { DamageCalculator } from './components/DamageCalculator';
import { MPRecoveryCalculator } from './components/MPRecoveryCalculator';
import { HPRecoveryCalculator } from './components/HPRecoveryCalculator'; // Added HPRecoveryCalculator
import { StatusCalculator } from './components/StatusCalculator'; // Added StatusCalculator
import { BreakCalculator } from './components/BreakCalculator';
import { ActionValueCalculator } from './components/ActionValueCalculator';
import { CalculatorIcon, ShieldLockIcon } from './components/ui/Icons'; 
import { Input } from './components/ui/Input';
import { Button } from './components/ui/Button';
import { ToggleSwitch } from './components/ui/ToggleSwitch';
import { SegmentedControl } from './components/ui/SegmentedControl';
import { ConfigurableBuffFieldKey, FieldInputMode, ConfigurableNumericInputKey, NumericRangeSettings, ConfigurableNumericFieldDefinition, StatusCalcAbilityBuffFieldKey } from './types';
import { CalculatorFab } from './components/ui/CalculatorFab';
import { CalculatorModal } from './components/ui/CalculatorModal';

const CORRECT_PASSWORD = "フォローしろや";

interface ConfigurableBuffFieldDefinition {
  key: ConfigurableBuffFieldKey;
  label: string;
}

const allConfigurableBuffFields: ConfigurableBuffFieldDefinition[] = [
  // DamageCalculator
  { key: 'attackBuffs', label: '攻撃力バフ (ダメージ計算)' },
  { key: 'attackDebuffs', label: '攻撃力デバフ (ダメージ計算)' },
  { key: 'damageDealtUp', label: '与ダメージアップ (ダメージ計算)' },
  { key: 'abilityDamageUp', label: '弱点属性に対し与ダメージアップ (ダメージ計算)' },
  { key: 'critDamage', label: 'クリティカルダメージ (ダメージ計算)' },
  { key: 'defenseBuffs', label: '防御力バフ (ダメージ計算)' },
  { key: 'defenseDebuffs', label: '防御力デバフ (ダメージ計算)' },
  { key: 'damageTaken', label: '受けるダメージ修飾 (ダメージ計算)' },
  // MPRecoveryCalculator
  { key: 'actionMpRecoveryBonus', label: 'MP回復効率 (アクション別)' },
  { key: 'skillEffectMpRecoveryBonus', label: 'MP回復効率 (スキル効果)' },
  // HPRecoveryCalculator
  { key: 'maxHpBuffs', label: '最大HP増加バフ (HP回復計算)' },
  { key: 'maxHpDebuffs', label: '最大HP増加デバフ (HP回復計算)' },
  { key: 'hpRecoveryBuffs', label: 'HP回復バフ (HP回復計算)' },
  { key: 'hpRecoveryDebuffs', label: 'HP回復デバフ (HP回復計算)' },
  // StatusCalculator
  { key: 'abilityHpBuff_sc', label: 'HPバフ (アビリティ/ステータス計算)' },
  { key: 'abilityAttackBuff_sc', label: '攻撃力バフ (アビリティ/ステータス計算)' },
  { key: 'abilityDefenseBuff_sc', label: '防御力バフ (アビリティ/ステータス計算)' },
  { key: 'abilitySpeedBuff_sc', label: 'スピードバフ (アビリティ/ステータス計算)' },
];

const allConfigurableNumericFieldDefinitions: ConfigurableNumericFieldDefinition[] = [
  // DamageCalculator Fields
  { key: 'baseAttack_dmgCalc', label: '基礎攻撃力 (ダメージ計算)', calculator: 'damage', defaultMin: '0', defaultMax: '6000' },
  { key: 'skillMultiplier_dmgCalc', label: 'スキル倍率 (ダメージ計算)', calculator: 'damage', defaultMin: '0', defaultMax: '500' },
  { key: 'attackBuffs_dmgCalc_total', label: '攻撃力バフ (合計モード時)', calculator: 'damage', defaultMin: '0', defaultMax: '200' },
  { key: 'attackDebuffs_dmgCalc_total', label: '攻撃力デバフ (合計モード時)', calculator: 'damage', defaultMin: '0', defaultMax: '99' },
  { key: 'damageDealtUp_dmgCalc_total', label: '与ダメージアップ (合計モード時)', calculator: 'damage', defaultMin: '0', defaultMax: '200' },
  { key: 'abilityDamageUp_dmgCalc_total', label: '弱点属性に対し与ダメージアップ (合計モード時)', calculator: 'damage', defaultMin: '0', defaultMax: '60' },
  { key: 'critDamage_dmgCalc_total', label: 'クリティカルダメージ (合計モード時)', calculator: 'damage', defaultMin: '0', defaultMax: '100' },
  { key: 'defenseBuffs_dmgCalc_total', label: '防御力バフ (合計モード時)', calculator: 'damage', defaultMin: '0', defaultMax: '200' },
  { key: 'defenseDebuffs_dmgCalc_total', label: '防御力デバフ (合計モード時)', calculator: 'damage', defaultMin: '0', defaultMax: '99' },
  { key: 'damageTaken_dmgCalc_total', label: '受けるダメージ修飾 (合計モード時)', calculator: 'damage', defaultMin: '0', defaultMax: '100' },
  { key: 'customBaseDefense_dmgCalc', label: 'カスタム基礎防御力 (ダメージ計算)', calculator: 'damage', defaultMin: '0', defaultMax: '6000' },
  { key: 'customBattleModeMultiplier_dmgCalc', label: 'カスタム属性耐性係数 (ダメージ計算)', calculator: 'damage', defaultMin: '0', defaultMax: '10' },
  { key: 'breakBonus_dmgCalc', label: 'ブレイクボーナス (ダメージ計算)', calculator: 'damage', defaultMin: '100', defaultMax: '1000' }, 
  { key: 'otherMultiplier_dmgCalc', label: 'その他係数 (ダメージ計算)', calculator: 'damage', defaultMin: '0', defaultMax: '100' },
  { key: 'targetFinalDamage_dmgCalc', label: '目標最終ダメージ (ダメージ計算)', calculator: 'damage', defaultMin: '0', defaultMax: '1000000' },
  
  // MPRecoveryCalculator Fields
  { key: 'specificIncrease_mpCalc', label: '固有上昇 (MP回復)', calculator: 'mp', defaultMin: '0', defaultMax: '100' },
  { key: 'actionMpRecoveryBonus_mpCalc_total', label: 'MP回復効率 (アクション別/合計モード時)', calculator: 'mp', defaultMin: '0', defaultMax: '100' },
  { key: 'dotTicks_mpCalc', label: '継続ダメージ回数 (MP回復)', calculator: 'mp', defaultMin: '0', defaultMax: '100' },
  { key: 'skillTargetUltimateMpCost_mpCalc', label: '必殺の必要MP (MP回復)', calculator: 'mp', defaultMin: '0', defaultMax: '150' },
  { key: 'skillRecoveryEffectPercent_mpCalc', label: '回復効果% (MP回復)', calculator: 'mp', defaultMin: '0', defaultMax: '100' },
  { key: 'skillEffectMpRecoveryBonus_mpCalc_total', label: 'MP回復効率 (スキル効果/合計モード時)', calculator: 'mp', defaultMin: '0', defaultMax: '100' },

  // HPRecoveryCalculator Fields
  { key: 'baseHp_hpCalc', label: 'ヒーラーHP (HP回復計算)', calculator: 'hp', defaultMin: '0', defaultMax: '20000' }, 
  { key: 'maxHpBuffs_hpCalc_total', label: '最大HP増加バフ (合計モード時)', calculator: 'hp', defaultMin: '0', defaultMax: '200' },
  { key: 'maxHpDebuffs_hpCalc_total', label: '最大HP増加デバフ (合計モード時)', calculator: 'hp', defaultMin: '0', defaultMax: '99' },
  { key: 'skillMultiplier_hpCalc', label: 'スキル倍率 (HP回復計算)', calculator: 'hp', defaultMin: '0', defaultMax: '50' },
  { key: 'fixedValue_hpCalc', label: '固定値 (HP回復計算)', calculator: 'hp', defaultMin: '0', defaultMax: '100' },
  { key: 'hpRecoveryBuffs_hpCalc_total', label: 'HP回復バフ (合計モード時)', calculator: 'hp', defaultMin: '0', defaultMax: '200' },
  { key: 'hpRecoveryDebuffs_hpCalc_total', label: 'HP回復デバフ (合計モード時)', calculator: 'hp', defaultMin: '0', defaultMax: '99' },

  // ActionValueCalculator Fields
  { key: 'currentTimelinePosition_avCalc', label: '現在の位置 (行動値)', calculator: 'action', defaultMin: '0', defaultMax: '10000' },
  { key: 'characterSpeed_avCalc', label: '速度 (行動値)', calculator: 'action', defaultMin: '1', defaultMax: '2000' },
  { key: 'targetInitialAV_avCalc', label: '目標行動値 (行動値)', calculator: 'action', defaultMin: '0', defaultMax: '10000' },
  { key: 'currentAVForModification_avCalc', label: '現在の行動値 (短縮適用前)', calculator: 'action', defaultMin: '0', defaultMax: '10000' },
  { key: 'actionValueBonus_avCalc', label: '行動値ボーナス (行動値)', calculator: 'action', defaultMin: '-100', defaultMax: '500' },
  { key: 'targetModifiedAV_avCalc', label: '目標新行動値 (行動値)', calculator: 'action', defaultMin: '0', defaultMax: '10000' },

  // StatusCalculator Fields
  { key: 'memoryHp_sc', label: 'キオクHP (ステータス計算)', calculator: 'status', defaultMin: '0', defaultMax: '10000' },
  { key: 'memoryAttack_sc', label: 'キオク攻撃力 (ステータス計算)', calculator: 'status', defaultMin: '0', defaultMax: '5000' },
  { key: 'memoryDefense_sc', label: 'キオク防御力 (ステータス計算)', calculator: 'status', defaultMin: '0', defaultMax: '5000' },
  { key: 'memorySpeed_sc', label: 'キオクスピード (ステータス計算)', calculator: 'status', defaultMin: '0', defaultMax: '150' },
  { key: 'supportHp_sc', label: 'サポートキオクHP (ステータス計算)', calculator: 'status', defaultMin: '0', defaultMax: '10000' },
  { key: 'supportAttack_sc', label: 'サポートキオク攻撃力 (ステータス計算)', calculator: 'status', defaultMin: '0', defaultMax: '5000' },
  { key: 'supportDefense_sc', label: 'サポートキオク防御力 (ステータス計算)', calculator: 'status', defaultMin: '0', defaultMax: '5000' },
  { key: 'supportReflectionRate_sc', label: 'サポート反映率 (ステータス計算)', calculator: 'status', defaultMin: '0', defaultMax: '25' },
  { key: 'portraitHp_sc', label: 'ポートレイトHP (ステータス計算)', calculator: 'status', defaultMin: '0', defaultMax: '1500' },
  { key: 'portraitAttack_sc', label: 'ポートレイト攻撃力 (ステータス計算)', calculator: 'status', defaultMin: '0', defaultMax: '500' },
  { key: 'portraitDefense_sc', label: 'ポートレイト防御力 (ステータス計算)', calculator: 'status', defaultMin: '0', defaultMax: '500' },
  // Ability Buffs (Total Mode for Range Settings)
  { key: 'abilityHpBuff_sc_total', label: 'HPバフ (アビリティ/合計モード時)', calculator: 'status', defaultMin: '0', defaultMax: '200' },
  { key: 'abilityAttackBuff_sc_total', label: '攻撃力バフ (アビリティ/合計モード時)', calculator: 'status', defaultMin: '0', defaultMax: '200' },
  { key: 'abilityDefenseBuff_sc_total', label: '防御力バフ (アビリティ/合計モード時)', calculator: 'status', defaultMin: '0', defaultMax: '200' },
  { key: 'abilitySpeedBuff_sc_total', label: 'スピードバフ (アビリティ/合計モード時)', calculator: 'status', defaultMin: '0', defaultMax: '100' },
];


export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false); 
  const [passwordAttempt, setPasswordAttempt] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [showAdminCodeForm, setShowAdminCodeForm] = useState<boolean>(false);

  const [isGlobalBuffSettingsModalOpen, setIsGlobalBuffSettingsModalOpen] = useState<boolean>(false);
  const [fieldInputModes, setFieldInputModes] = useState<Record<ConfigurableBuffFieldKey, FieldInputMode>>({
    attackBuffs: 'split',
    attackDebuffs: 'split',
    damageDealtUp: 'split',
    abilityDamageUp: 'total', 
    critDamage: 'total',      
    defenseBuffs: 'split',
    defenseDebuffs: 'split',
    damageTaken: 'split',
    actionMpRecoveryBonus: 'split', 
    skillEffectMpRecoveryBonus: 'split',
    // HP Recovery
    maxHpBuffs: 'split',
    maxHpDebuffs: 'split',
    hpRecoveryBuffs: 'split',
    hpRecoveryDebuffs: 'split',
    // Status Calculator Ability Buffs
    abilityHpBuff_sc: 'split',
    abilityAttackBuff_sc: 'split',
    abilityDefenseBuff_sc: 'split',
    abilitySpeedBuff_sc: 'split',
  });

  const [isNumericRangeSettingsModalOpen, setIsNumericRangeSettingsModalOpen] = useState<boolean>(false);
  const [fieldNumericRanges, setFieldNumericRanges] = useState<Record<ConfigurableNumericInputKey, NumericRangeSettings>>(
    () => {
      const initialRanges = {} as Record<ConfigurableNumericInputKey, NumericRangeSettings>;
      allConfigurableNumericFieldDefinitions
        .filter(def => def.calculator !== 'action') 
        .forEach(def => {
          initialRanges[def.key] = {
            min: def.defaultMin, 
            max: def.defaultMax,
          };
      });
      return initialRanges;
    }
  );
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);
  const [showReverseCalcButtons, setShowReverseCalcButtons] = useState<boolean>(false);


  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordAttempt === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError('');
      setPasswordAttempt(''); 
    } else {
      setAuthError('管理コードが正しくありません。');
      setIsAuthenticated(false); 
    }
  };

  const openGlobalBuffSettingsModal = () => setIsGlobalBuffSettingsModalOpen(true);
  const openNumericRangeSettingsModal = () => setIsNumericRangeSettingsModalOpen(true);

  const handleFieldModeChangeInModal = (fieldKey: ConfigurableBuffFieldKey, newMode: FieldInputMode) => {
    setFieldInputModes(prev => ({ ...prev, [fieldKey]: newMode }));
  };

  const handleNumericRangeChangeInModal = (fieldKey: ConfigurableNumericInputKey, rangeKey: keyof NumericRangeSettings, value: string) => {
    setFieldNumericRanges(prev => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        [rangeKey]: value,
      }
    }));
  };
  
  const displayableNumericFieldDefinitions = useMemo(() => {
    return allConfigurableNumericFieldDefinitions.filter(def => 
      def.calculator !== 'action' &&
      def.key !== 'maxHpBuffs_hpCalc_total' && 
      def.key !== 'maxHpDebuffs_hpCalc_total'
    );
  }, []);


  return (
    <>
      <div 
        className={`min-h-screen bg-background text-on-surface p-4 sm:p-8 font-sans antialiased transition-all duration-300 ease-in-out`}
      >
        {/* Page Title Section - Vertical Stack, Centered */}
        <div className="mb-6 sm:mb-8 flex flex-col items-center">
          {/* Admin Section is now part of normal flow, after footer */}
          
          {/* Title Section Wrapper */}
          <div className="w-full text-center">
            <div className="inline-block"> 
              <div className="flex items-center justify-center space-x-3 mb-2">
                <CalculatorIcon className="h-10 w-10 text-primary-DEFAULT" aria-hidden="true" />
                <h1 className="text-4xl sm:text-5xl font-bold text-primary-light">まどドラ計算ツール</h1>
              </div>
              <p className="text-md text-on-surface-muted mb-1">ほむらちゃほむほむ作</p>
            </div>
          </div>
        </div>
        
        {/* Global Controls Section - Placed between Title and Calculators, aligned right */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-8 sm:mb-12 justify-end w-full">
          <Button 
            size="sm" 
            onClick={openNumericRangeSettingsModal}
            className="bg-on-surface text-background hover:bg-gray-300 text-xs sm:text-sm px-2 sm:px-3 w-full sm:w-auto"
          >
            下限上限設定
          </Button>
          <Button 
            size="sm" 
            onClick={openGlobalBuffSettingsModal}
            className="bg-on-surface text-background hover:bg-gray-300 text-xs sm:text-sm px-2 sm:px-3 w-full sm:w-auto"
          >
            バフ等入力設定
          </Button>
          <div className="w-full sm:w-auto">
            <ToggleSwitch
                id="globalReverseCalcToggle"
                label="逆算機能" 
                srLabel={false} 
                checked={showReverseCalcButtons}
                onChange={setShowReverseCalcButtons}
                size="sm"
            />
          </div>
        </div>
        
        <main className="space-y-12 max-w-5xl mx-auto">
          <DamageCalculator 
            isAuthenticated={isAuthenticated}
            fieldInputModes={fieldInputModes} 
            fieldNumericRanges={fieldNumericRanges}
            showReverseCalcButtons={showReverseCalcButtons}
          />
          <StatusCalculator
            isAuthenticated={isAuthenticated}
            fieldInputModes={fieldInputModes}
            fieldNumericRanges={fieldNumericRanges}
          />
          <HPRecoveryCalculator
            isAuthenticated={isAuthenticated}
            fieldInputModes={fieldInputModes}
            fieldNumericRanges={fieldNumericRanges}
          />
          <MPRecoveryCalculator 
            isAuthenticated={isAuthenticated}
            fieldInputModes={fieldInputModes} 
            fieldNumericRanges={fieldNumericRanges}
          />
          <BreakCalculator isAuthenticated={isAuthenticated} />
          {isAuthenticated && <ActionValueCalculator />}
        </main>

        <footer className="text-center mt-16 py-8 border-t border-surface text-on-surface-muted text-sm">
          <p>計算ツールのご利用ありがとうございます。</p>
          <div className="mt-4 space-y-1">
            <p>当サイトは「ほむらちゃほむほむ」が独自に作成したコンテンツを提供しております。</p>
            <p>当サイトが掲載しているデータの無断使用・無断転載は固くお断りしております。あとできればXフォローして。</p>
          </div>
        </footer>

        {/* Admin Section Wrapper (conditionally rendered, part of normal flow, after footer) */}
        {isClient && !isAuthenticated && (
          <div className="mt-8 py-3 sm:py-4"> {/* Removed fixed positioning, added top margin */}
            <div className="w-full max-w-xs sm:max-w-sm"> {/* Max width for the content */}
              <div className="flex flex-col items-center sm:items-start gap-3">
                <ToggleSwitch
                  id="adminCodeToggle"
                  label="管理コード入力表示"
                  checked={showAdminCodeForm}
                  onChange={setShowAdminCodeForm}
                  size="sm"
                />
                {showAdminCodeForm && (
                  <div className="bg-surface p-3 rounded-lg shadow-xl opacity-75 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 w-full">
                    <form onSubmit={handleAuthSubmit}>
                      <div className="flex items-center mb-2">
                        <ShieldLockIcon className="w-5 h-5 mr-2 text-primary-light" />
                        <h4 className="text-sm font-semibold text-on-surface">管理コード入力</h4>
                      </div>
                      <Input
                        id="passwordAttempt"
                        label=""
                        type="text"
                        value={passwordAttempt}
                        onChange={setPasswordAttempt}
                        placeholder="コードを入力"
                        containerClassName="!mb-2"
                        aria-label="管理コード"
                      />
                      <Button type="submit" size="sm" className="w-full">
                        解除
                      </Button>
                      {authError && <p className="mt-2 text-xs text-red-400">{authError}</p>}
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div> {/* End of min-h-screen container */}


      {isGlobalBuffSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" aria-modal="true" role="dialog" aria-labelledby="global-buff-settings-modal-title">
          <div className="bg-surface p-5 sm:p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 id="global-buff-settings-modal-title" className="text-xl font-semibold text-primary-light">バフ等入力設定</h3>
              <button onClick={() => setIsGlobalBuffSettingsModalOpen(false)} className="text-on-surface-muted hover:text-on-surface text-2xl" aria-label="設定モーダルを閉じる">&times;</button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-4 pr-2">
              {allConfigurableBuffFields.map(field => (
                <div key={field.key} className="flex flex-col sm:flex-row justify-between sm:items-center p-2 bg-gray-700/50 rounded">
                  <span className="text-on-surface text-sm mb-2 sm:mb-0 sm:mr-4">{field.label}:</span>
                  <SegmentedControl<FieldInputMode>
                    options={[{ label: '複数バフ・デバフ時カンマ区切り', value: 'split' }, { label: '合計', value: 'total' }]}
                    value={fieldInputModes[field.key]}
                    onChange={(newMode) => handleFieldModeChangeInModal(field.key, newMode)}
                    size="sm"
                  />
                </div>
              ))}
            </div>
            <Button onClick={() => setIsGlobalBuffSettingsModalOpen(false)} variant="secondary" className="mt-6 w-full" size="md">
              閉じる
            </Button>
          </div>
        </div>
      )}

      {isNumericRangeSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[60]" aria-modal="true" role="dialog" aria-labelledby="numeric-range-settings-modal-title">
          <div className="bg-surface p-5 sm:p-6 rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 id="numeric-range-settings-modal-title" className="text-xl font-semibold text-primary-light">数値入力範囲設定</h3>
              <button onClick={() => setIsNumericRangeSettingsModalOpen(false)} className="text-on-surface-muted hover:text-on-surface text-2xl" aria-label="数値入力範囲設定モーダルを閉じる">&times;</button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-3 pr-2">
              <p className="text-xs text-on-surface-muted mb-3">各数値入力フィールドの「±」ボタン操作時およびスライダー操作時の下限(Min)/上限(Max)を設定します。<strong>テキスト直接入力時は、ここでの下限・上限設定は適用されません。</strong></p>
              <div className="grid grid-cols-1 gap-y-4">
                {displayableNumericFieldDefinitions.map(def => (
                  <div key={def.key} className="p-3 bg-gray-700/50 rounded-md">
                    <label className="block text-sm font-semibold text-on-surface mb-2">{def.label}</label>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                      <Input
                        id={`${def.key}-minRange`}
                        label="Min"
                        type="text"
                        value={fieldNumericRanges[def.key]?.min ?? def.defaultMin}
                        onChange={(val) => handleNumericRangeChangeInModal(def.key, 'min', val)}
                        containerClassName="!mb-0"
                      />
                      <Input
                        id={`${def.key}-maxRange`}
                        label="Max"
                        type="text"
                        value={fieldNumericRanges[def.key]?.max ?? def.defaultMax}
                        onChange={(val) => handleNumericRangeChangeInModal(def.key, 'max', val)}
                        containerClassName="!mb-0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={() => setIsNumericRangeSettingsModalOpen(false)} variant="secondary" className="mt-6 w-full" size="md">
              閉じる
            </Button>
          </div>
        </div>
      )}
      <CalculatorFab onOpen={() => setIsCalculatorOpen(true)} />
      {isCalculatorOpen && 
        <CalculatorModal 
          onClose={() => setIsCalculatorOpen(false)}
        />
      }
    </>
  );
};
