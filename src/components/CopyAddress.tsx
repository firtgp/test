import {useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {TextInput} from '@astryxdesign/core/TextInput';
import {VStack} from '@astryxdesign/core/VStack';
import {CheckIcon, CopyIcon} from '@phosphor-icons/react';
import {useNotify} from '../app/hooks';

/**
 * «Скопировать адрес». Успех показывается только после реальной записи в буфер.
 * Если браузер отказал, адрес выводится в поле — его можно выделить и скопировать вручную.
 */
export function CopyAddress({address, label = 'Скопировать адрес'}: {address: string; label?: string}) {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const notify = useNotify();

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(address);
      setState('copied');
      notify.ok(`Адрес ${address} скопирован`);
      setTimeout(() => setState(s => (s === 'copied' ? 'idle' : s)), 2500);
    } catch {
      setState('manual');
    }
  }

  return (
    <VStack gap={2} hAlign="start">
      <Button
        label={state === 'copied' ? 'Скопировано' : label}
        variant="secondary"
        icon={state === 'copied' ? <CheckIcon size={18} weight="bold" /> : <CopyIcon size={18} />}
        clickAction={copy}
      />
      {state === 'manual' ? (
        <TextInput
          label="Не удалось скопировать автоматически — выделите адрес и скопируйте вручную"
          value={address}
          isReadOnly
          hasAutoFocus
          onChange={() => {}}
        />
      ) : null}
    </VStack>
  );
}
