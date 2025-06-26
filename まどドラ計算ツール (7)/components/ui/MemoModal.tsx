
import React, { useState } from 'react';
import { MemoEntry, MemoSectionKey } from '../../types'; 
import { Input } from './Input';
import { Button } from './Button';
// import { SmallButton } from './SmallButton'; // SmallButton is replaced by Button

interface MemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionKey: MemoSectionKey;
  sectionName: string;
  currentSectionValues: Record<string, string>;
  savedMemos: MemoEntry[]; 
  onSaveMemo: (sectionKey: MemoSectionKey, name: string, values: Record<string, string>) => { success: boolean, error?: string };
  onApplyMemo: (sectionKey: MemoSectionKey, values: Record<string, string>) => void;
  onDeleteMemo: (sectionKey: MemoSectionKey, memoId: string) => void;
}

export const MemoModal: React.FC<MemoModalProps> = ({
  isOpen,
  onClose,
  sectionKey,
  sectionName,
  currentSectionValues,
  savedMemos,
  onSaveMemo,
  onApplyMemo,
  onDeleteMemo,
}) => {
  const [memoName, setMemoName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [confirmingDelete, setConfirmingDelete] = useState<{ id: string; name: string } | null>(null);

  const handleSave = () => {
    setError('');
    const result = onSaveMemo(sectionKey, memoName, currentSectionValues);
    if (result.success) {
      setMemoName(''); 
    } else {
      setError(result.error || '保存に失敗しました。');
    }
  };

  const requestDelete = (memo: MemoEntry) => {
    setConfirmingDelete({ id: memo.id, name: memo.name });
  };

  const executeDelete = () => {
    if (confirmingDelete) {
      onDeleteMemo(sectionKey, confirmingDelete.id);
      setConfirmingDelete(null);
    }
  };

  const cancelDelete = () => {
    setConfirmingDelete(null);
  };


  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" 
      aria-modal="true" 
      role="dialog" 
      aria-labelledby="memo-modal-title"
    >
      <div className="bg-surface p-5 sm:p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col relative">
        <div className="flex justify-between items-center mb-4">
          <h3 id="memo-modal-title" className="text-xl font-semibold text-primary-light">
            メモ: {sectionName}
          </h3>
          <button 
            onClick={onClose} 
            className="text-on-surface-muted hover:text-on-surface text-2xl" 
            aria-label="メモモーダルを閉じる"
            disabled={!!confirmingDelete} // Disable close button during confirmation
          >
            &times;
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-700/50 rounded-md">
          <p className="text-sm text-on-surface-muted mb-1">現在の入力値セット: <strong className="text-on-surface">(詳細省略)</strong></p>
          <Input
            id="memoNameInput"
            label="メモ名"
            type="text"
            value={memoName}
            onChange={setMemoName}
            placeholder="例: 高火力セット"
            containerClassName="!mb-2"
            disabled={!!confirmingDelete}
          />
          {error && <p className="text-xs text-red-400 bg-red-900/50 p-1.5 rounded mb-2" role="alert">{error}</p>}
          <Button 
            onClick={handleSave} 
            variant="primary"
            size="sm" 
            className="w-full"
            disabled={!!confirmingDelete}
          >
            現在の入力値セットをこの名前で保存
          </Button>
        </div>

        <div className="flex-grow overflow-y-auto space-y-2 pr-1 border-t border-gray-700 pt-3">
          <h4 className="text-md font-semibold text-on-surface mb-2">保存済みメモ:</h4>
          {savedMemos.length === 0 ? (
            <p className="text-sm text-on-surface-muted">このセクションの保存済みメモはありません。</p>
          ) : (
            <ul className="space-y-2">
              {savedMemos.map((memo) => (
                <li 
                  key={memo.id} 
                  className="flex flex-col sm:flex-row justify-between sm:items-center p-2.5 bg-gray-600/70 rounded-md"
                >
                  <div className="flex-grow mb-2 sm:mb-0">
                    <span className="font-medium text-on-surface block sm:inline">{memo.name}</span>
                    <span className="text-xs text-on-surface-muted ml-0 sm:ml-2 block sm:inline">([セットデータ])</span>
                  </div>
                  <div className="flex space-x-2 flex-shrink-0">
                    <Button 
                      variant="primary"
                      size="sm"
                      onClick={() => onApplyMemo(sectionKey, memo.value)} 
                      className="text-xs py-1 px-2.5"
                      disabled={!!confirmingDelete}
                    >
                      適用
                    </Button>
                    <Button
                      size="sm"
                      variant="danger" // Using danger variant for delete button
                      onClick={() => requestDelete(memo)}
                      className="text-xs py-1 px-2.5" // Adjusted padding if needed
                      disabled={!!confirmingDelete}
                    >
                      削除
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {confirmingDelete && (
          <div className="absolute inset-0 bg-surface/90 flex flex-col items-center justify-center p-6 rounded-lg z-10">
            <p className="text-on-surface text-center mb-4 text-lg">
              本当にこのメモ「<strong className="text-primary-light">{confirmingDelete.name}</strong>」を削除しますか？
            </p>
            <div className="flex space-x-4">
              <Button onClick={executeDelete} variant="danger" size="md">はい</Button>
              <Button onClick={cancelDelete} variant="secondary" size="md">いいえ</Button>
            </div>
          </div>
        )}

        <Button 
          onClick={onClose} 
          variant="secondary"
          className="mt-6 w-full" 
          size="md"
          disabled={!!confirmingDelete}
        >
          閉じる
        </Button>
      </div>
    </div>
  );
};
