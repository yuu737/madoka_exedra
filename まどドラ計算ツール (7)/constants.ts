import { CharacterRole, MPRecoveryAction, ElementalWeakness, BattleMode, SelectOption } from './types';

export const ROLE_OPTIONS: SelectOption<CharacterRole>[] = [
  { value: CharacterRole.Attacker, label: 'アタッカー' },
  { value: CharacterRole.Breaker, label: 'ブレイカー' },
  { value: CharacterRole.Buffer, label: 'バッファー' },
  { value: CharacterRole.Debuffer, label: 'デバッファー' },
  { value: CharacterRole.Defender, label: 'ディフェンダー' },
  { value: CharacterRole.Healer, label: 'ヒーラー' },
];

export const ELEMENTAL_WEAKNESS_OPTIONS: SelectOption<ElementalWeakness>[] = [
  { value: ElementalWeakness.Weak, label: '弱点属性' },
  { value: ElementalWeakness.NonWeak, label: '弱点以外' },
];

export const BATTLE_MODE_OPTIONS: SelectOption<BattleMode>[] = [
  { value: BattleMode.Normal, label: '通常' },
  { value: BattleMode.Battle, label: 'バトルモード (非弱点時)' },
  { value: BattleMode.Nightmare, label: 'ナイトメアモード (非弱点時)' },
  { value: BattleMode.Chaos, label: 'カオスモード (非弱点時)' },
  { value: BattleMode.Custom, label: 'カスタム値入力 (非弱点時)' }, // Added Custom mode option
];

export const MP_RECOVERY_BASE: Record<MPRecoveryAction, number> = {
  [MPRecoveryAction.NormalAttack]: 15,
  [MPRecoveryAction.Skill]: 30,
  [MPRecoveryAction.TookDamageHighHP]: 5,
  [MPRecoveryAction.TookDamageMidHP]: 10,
  [MPRecoveryAction.TookDamageLowHP]: 15,
  [MPRecoveryAction.DoT]: 2,
  [MPRecoveryAction.UltimateUsed]: 5,
  [MPRecoveryAction.EnemyDefeated]: 10,
};

export const MP_RECOVERY_ACTION_OPTIONS: SelectOption<MPRecoveryAction>[] = Object.entries(MP_RECOVERY_BASE)
  .map(([key, value]) => ({
    value: key as MPRecoveryAction,
    label: `${key as MPRecoveryAction} (基本: ${value}MP)`
  }));

export const DEFAULT_CRIT_DAMAGE = 10; // %
export const DEFAULT_CRIT_RATE = 5; // % (Informational, not used in critical coefficient calc directly)

export const BREAK_BONUS_BY_ROLE: Record<CharacterRole, number> = {
  [CharacterRole.Breaker]: 20,
  [CharacterRole.Buffer]: 12,
  [CharacterRole.Debuffer]: 12,
  [CharacterRole.Defender]: 10,
  [CharacterRole.Healer]: 10,
  [CharacterRole.Attacker]: 5,
};