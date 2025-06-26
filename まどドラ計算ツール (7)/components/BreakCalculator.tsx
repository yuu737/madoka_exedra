
import React from 'react';
import { Card } from './ui/Card';
import { AtomIcon } from './ui/Icons';
import { ROLE_OPTIONS, BREAK_BONUS_BY_ROLE } from '../constants';
// CharacterRole type import is not strictly needed here anymore as we iterate ROLE_OPTIONS
// import { CharacterRole } from '../types';

interface BreakCalculatorProps {
  isAuthenticated: boolean;
}

export const BreakCalculator: React.FC<BreakCalculatorProps> = ({ isAuthenticated }) => {
  return (
    <Card title="ブレイク関連" icon={<AtomIcon className="w-6 h-6" aria-hidden="true" />}>
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm text-left text-on-surface-muted">
          <thead className="text-xs text-on-surface uppercase bg-gray-700/75">
            <tr>
              <th scope="col" className="px-4 py-3 border-r border-gray-600">
                キャラクターロール
              </th>
              <th scope="col" className="px-4 py-3 text-center">
                ブレイクボーナス (%)
              </th>
            </tr>
          </thead>
          <tbody>
            {ROLE_OPTIONS.map((roleOption) => (
              <tr 
                key={roleOption.value} 
                className="bg-surface border-b last:border-b-0 border-gray-700 hover:bg-gray-700/50 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-on-surface whitespace-nowrap border-r border-gray-600">
                  {roleOption.label}
                </td>
                <td className="px-4 py-3 text-center text-secondary-DEFAULT font-semibold">
                  {BREAK_BONUS_BY_ROLE[roleOption.value]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAuthenticated && (
        <div className="mt-6 p-3 bg-gray-800 rounded-md text-sm text-on-surface-muted">
          <h4 className="font-semibold text-gray-300 mb-1">補足情報:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>ブレイクボーナスは攻撃の種類に関わらず、ロールで固定されています。</li>
            <li>ブレイカーのみ戦闘スキルレベルや必殺技レベルの増加でブレイクゲージの削減量が増加します。</li>
            <li>ブレイクゲージ削減量の効果は、現在(2025/5/11時点)のところスキルレベル増加等で増加することはありません。</li>
          </ul>
        </div>
      )}
    </Card>
  );
};
