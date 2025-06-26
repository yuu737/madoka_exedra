

export interface SelectOption<T = string> {
  value: T;
  label: string;
}

export enum CharacterRole {
  Attacker = 'アタッカー',
  Breaker = 'ブレイカー',
  Buffer = 'バッファー',
  Debuffer = 'デバッファー',
  Defender = 'ディフェンダー',
  Healer = 'ヒーラー',
}

export enum ElementalWeakness {
  Weak = '弱点属性',
  NonWeak = '弱点以外',
}

export enum BattleMode {
  Normal = '通常',
  Battle = 'バトルモード',
  Nightmare = 'ナイトメアモード',
  Chaos = 'カオスモード',
  Custom = 'カスタム値入力',
}

export enum MPRecoveryAction {
  NormalAttack = '通常攻撃',
  Skill = '戦闘スキル',
  TookDamageHighHP = '被弾 (HP40%以上)',
  TookDamageMidHP = '被弾 (HP10%～40%)',
  TookDamageLowHP = '被弾 (HP0%～HP10%)',
  DoT = '継続ダメージ',
  UltimateUsed = '必殺技使用後',
  EnemyDefeated = '敵撃破',
}

// --- Types for Global Buff Input Mode Configuration ---
export type FieldInputMode = 'split' | 'total';

export type DamageCalcFieldKey =
  | 'attackBuffs' | 'attackDebuffs' | 'damageDealtUp'
  | 'abilityDamageUp' | 'critDamage' | 'defenseBuffs'
  | 'defenseDebuffs' | 'damageTaken';

export type MPRecoveryFieldKey =
  | 'actionMpRecoveryBonus' | 'skillEffectMpRecoveryBonus';

export type HPRecoveryFieldKey =
  | 'maxHpBuffs' | 'maxHpDebuffs' | 'hpRecoveryBuffs' | 'hpRecoveryDebuffs';

export type StatusCalcAbilityBuffFieldKey =
  | 'abilityHpBuff_sc'
  | 'abilityAttackBuff_sc'
  | 'abilityDefenseBuff_sc'
  | 'abilitySpeedBuff_sc';

export type ConfigurableBuffFieldKey = DamageCalcFieldKey | MPRecoveryFieldKey | HPRecoveryFieldKey | StatusCalcAbilityBuffFieldKey;

// --- Types for Global Numeric Input Range Configuration ---
export interface NumericRangeSettings {
  min: string;
  max: string;
}

export type ConfigurableNumericInputKey =
  // DamageCalculator
  | 'baseAttack_dmgCalc'
  | 'skillMultiplier_dmgCalc'
  | 'attackBuffs_dmgCalc_total'
  | 'attackDebuffs_dmgCalc_total'
  | 'damageDealtUp_dmgCalc_total'
  | 'abilityDamageUp_dmgCalc_total'
  | 'critDamage_dmgCalc_total'
  | 'defenseBuffs_dmgCalc_total'
  | 'defenseDebuffs_dmgCalc_total'
  | 'damageTaken_dmgCalc_total'
  | 'customBaseDefense_dmgCalc'
  | 'customBattleModeMultiplier_dmgCalc'
  | 'breakBonus_dmgCalc'
  | 'otherMultiplier_dmgCalc'
  | 'targetFinalDamage_dmgCalc'
  // MPRecoveryCalculator
  | 'specificIncrease_mpCalc'
  | 'actionMpRecoveryBonus_mpCalc_total'
  | 'dotTicks_mpCalc'
  | 'skillTargetUltimateMpCost_mpCalc'
  | 'skillRecoveryEffectPercent_mpCalc'
  | 'skillEffectMpRecoveryBonus_mpCalc_total'
  // HPRecoveryCalculator
  | 'baseHp_hpCalc'
  | 'maxHpBuffs_hpCalc_total' // Note: This key might be for range setting of the total value
  | 'maxHpDebuffs_hpCalc_total' // Note: This key might be for range setting of the total value
  | 'skillMultiplier_hpCalc'
  | 'fixedValue_hpCalc'
  | 'hpRecoveryBuffs_hpCalc_total'
  | 'hpRecoveryDebuffs_hpCalc_total'
  // ActionValueCalculator
  | 'currentTimelinePosition_avCalc'
  | 'characterSpeed_avCalc'
  | 'targetInitialAV_avCalc'
  | 'currentAVForModification_avCalc'
  | 'actionValueBonus_avCalc'
  | 'targetModifiedAV_avCalc'
  // StatusCalculator
  | 'memoryHp_sc'
  | 'memoryAttack_sc'
  | 'memoryDefense_sc'
  | 'memorySpeed_sc'
  | 'supportHp_sc'
  | 'supportAttack_sc'
  | 'supportDefense_sc'
  | 'supportReflectionRate_sc'
  | 'portraitHp_sc'
  | 'portraitAttack_sc'
  | 'portraitDefense_sc'
  | 'abilityHpBuff_sc_total'
  | 'abilityAttackBuff_sc_total'
  | 'abilityDefenseBuff_sc_total'
  | 'abilitySpeedBuff_sc_total';

export interface ConfigurableNumericFieldDefinition {
  key: ConfigurableNumericInputKey;
  label: string;
  calculator: 'damage' | 'mp' | 'hp' | 'action' | 'status';
  defaultMin: string;
  defaultMax: string;
}

// --- Types for Memo Feature ---

// Specific memo section keys for DamageCalculator
export type DamageCalculatorMemoSectionKey =
  | 'attackerStatus_dmgCalc'
  | 'defenderStatus_dmgCalc';

// Specific memo section keys for StatusCalculator
export type StatusCalculatorMemoSectionKey =
  | 'memoryStats_sc'
  | 'supportStats_sc'
  | 'portraitStats_sc'
  | 'abilityBuffs_sc';

// Specific memo section keys for HPRecoveryCalculator
export type HPRecoveryCalculatorMemoSectionKey =
  | 'hpRecoverySetup_hpCalc';

// Combined MemoSectionKey for use in common components like MemoModal
export type MemoSectionKey =
  | DamageCalculatorMemoSectionKey
  | StatusCalculatorMemoSectionKey
  | HPRecoveryCalculatorMemoSectionKey;

export interface MemoEntry {
  id: string;
  name: string;
  value: Record<string, string>; // Changed from string to Record<string, string>
}

export const ALL_MEMO_SECTION_KEYS: MemoSectionKey[] = [
  'attackerStatus_dmgCalc',
  'defenderStatus_dmgCalc',
  'memoryStats_sc',
  'supportStats_sc',
  'portraitStats_sc',
  'abilityBuffs_sc',
  'hpRecoverySetup_hpCalc',
];

export const getInitialEmptySectionMemos = (): Record<MemoSectionKey, MemoEntry[]> => {
  const initialState = {} as Record<MemoSectionKey, MemoEntry[]>;
  for (const key of ALL_MEMO_SECTION_KEYS) {
    initialState[key] = [];
  }
  return initialState;
};
